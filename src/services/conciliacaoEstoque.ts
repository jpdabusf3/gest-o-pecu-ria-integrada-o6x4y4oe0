import pb from '@/lib/pocketbase/client'
import { registrarAuditLog, getDispositivoId } from './auditoria'
import { EstoqueInsumoRecord, getEstoqueInsumos, salvarItemEstoque } from './fechamento'

export interface ItemConciliacaoInput {
  insumo_id?: string
  produto: string
  categoria?: string
  saldo_sistema: number
  unidade_sistema: string
  contagem_fisica: number
  unidade_contada: 'kg' | 'saco' | 'l' | 'dose' | 'un'
  preco_unitario: number
  justificativa?: string
}

export interface ItemConciliacaoCalculado extends ItemConciliacaoInput {
  id?: string
  contagem_em_kg: number
  saldo_em_kg: number
  diferenca_qtd: number // física - sistema (na unidade do sistema / kg)
  diferenca_pct: number // (diferenca / sistema) * 100
  diferenca_rs: number // diferenca_qtd * preco_unitario
  dentro_tolerancia: boolean
  ajustado?: boolean
}

export interface ConciliacaoEstoqueRecord {
  id: string
  data_conciliacao: string
  periodo_mes: string
  responsavel_id: string
  responsavel_nome: string
  total_itens: number
  total_divergentes: number
  total_divergencia_rs: number
  status: 'pendente' | 'justificada' | 'ajustada' | 'concluida'
  observacoes_gerais?: string
  protocolo_audit_id?: string
  ajuste_gerado: boolean
  created: string
  updated?: string
  itens?: ItemConciliacaoCalculado[]
}

export interface RegistrarConciliacaoParams {
  periodo_mes: string
  usuario: {
    id: string
    nome: string
    perfil: string
  }
  tolerancia_pct?: number // padrão: 2%
  itens: ItemConciliacaoInput[]
  observacoes_gerais?: string
}

/**
 * 1 saco de sal/mineral = 30 kg (regra canônica do projeto)
 */
export function converterParaKg(qtd: number, unidade: string): number {
  const u = (unidade || '').trim().toLowerCase()
  if (u === 'saco' || u === 'sc' || u === 'scs') {
    return Number((qtd * 30).toFixed(2))
  }
  return Number(qtd.toFixed(2))
}

/**
 * Converte kg para sacos (1 saco = 30 kg)
 */
export function converterKgParaSaco(kg: number): number {
  return Number((kg / 30).toFixed(2))
}

/**
 * Calcula divergências entre contagem física e saldo do sistema
 */
export function calcularDivergenciaItem(
  item: ItemConciliacaoInput,
  toleranciaPct: number = 2.0,
): ItemConciliacaoCalculado {
  const unidadeSys = (item.unidade_sistema || 'kg').toLowerCase()
  const unidadeContada = (item.unidade_contada || 'kg').toLowerCase()

  // Converte ambas para kg se forem relacionadas a peso/saco
  const isPesoOuSaco =
    ['kg', 'saco', 'sc'].includes(unidadeSys) && ['kg', 'saco', 'sc'].includes(unidadeContada)

  let saldoEmKg = item.saldo_sistema
  let contagemEmKg = item.contagem_fisica

  if (isPesoOuSaco) {
    saldoEmKg = converterParaKg(item.saldo_sistema, unidadeSys)
    contagemEmKg = converterParaKg(item.contagem_fisica, unidadeContada)
  }

  // Diferença em quantidade na base comparável (kg quando aplicável, senão qtd pura)
  const diferencaQtd = isPesoOuSaco
    ? Number((contagemEmKg - saldoEmKg).toFixed(2))
    : Number((item.contagem_fisica - item.saldo_sistema).toFixed(2))

  const baseDivisor = isPesoOuSaco ? saldoEmKg : item.saldo_sistema
  const diferencaPct =
    baseDivisor !== 0
      ? Number(((diferencaQtd / Math.abs(baseDivisor)) * 100).toFixed(2))
      : diferencaQtd !== 0
        ? 100
        : 0

  // Preço unitário ajustado para kg se a unidade do sistema era saco
  let precoPorKgOuUn = item.preco_unitario || 0
  if (unidadeSys === 'saco' && isPesoOuSaco && precoPorKgOuUn > 0) {
    precoPorKgOuUn = precoPorKgOuUn / 30
  }

  const diferencaRs = Number((diferencaQtd * precoPorKgOuUn).toFixed(2))
  const dentroTolerancia = Math.abs(diferencaPct) <= Math.abs(toleranciaPct)

  return {
    ...item,
    contagem_em_kg: contagemEmKg,
    saldo_em_kg: saldoEmKg,
    diferenca_qtd: diferencaQtd,
    diferenca_pct: diferencaPct,
    diferenca_rs: diferencaRs,
    dentro_tolerancia: dentroTolerancia,
    justificativa: item.justificativa || '',
  }
}

/**
 * Salva a contagem física e divergências no PocketBase com auditoria append-only
 */
export async function salvarConciliacaoEstoque(
  params: RegistrarConciliacaoParams,
): Promise<ConciliacaoEstoqueRecord | null> {
  const tol = params.tolerancia_pct ?? 2.0
  const itensCalculados = params.itens.map((i) => calcularDivergenciaItem(i, tol))

  const divergentes = itensCalculados.filter((i) => !i.dentro_tolerancia)
  const totalDivergenciaRs = itensCalculados.reduce((acc, cur) => acc + cur.diferenca_rs, 0)

  const hoje = new Date().toISOString()
  const dataConciliacao = hoje.slice(0, 10)

  try {
    // 1. Criar cabeçalho da conciliação
    const concRecord = await pb.collection('conciliacoes_estoque').create({
      data_conciliacao: dataConciliacao,
      periodo_mes: params.periodo_mes || hoje.slice(0, 7),
      responsavel_id: params.usuario.id,
      responsavel_nome: params.usuario.nome,
      total_itens: itensCalculados.length,
      total_divergentes: divergentes.length,
      total_divergencia_rs: Number(totalDivergenciaRs.toFixed(2)),
      status: divergentes.length === 0 ? 'concluida' : 'pendente',
      observacoes_gerais: params.observacoes_gerais || '',
      ajuste_gerado: false,
    })

    // 2. Criar itens vinculados
    const itensSalvos: ItemConciliacaoCalculado[] = []
    for (const it of itensCalculados) {
      const rec = await pb.collection('itens_conciliacao_estoque').create({
        conciliacao_id: concRecord.id,
        insumo_id: it.insumo_id || '',
        produto: it.produto,
        categoria: it.categoria || '',
        saldo_sistema: it.saldo_sistema,
        unidade_sistema: it.unidade_sistema,
        contagem_fisica: it.contagem_fisica,
        unidade_contada: it.unidade_contada,
        contagem_em_kg: it.contagem_em_kg,
        diferenca_qtd: it.diferenca_qtd,
        diferenca_pct: it.diferenca_pct,
        diferenca_rs: it.diferenca_rs,
        preco_unitario: it.preco_unitario,
        dentro_tolerancia: it.dentro_tolerancia,
        justificativa: it.justificativa || '',
        ajustado: false,
      })
      itensSalvos.push({
        ...it,
        id: rec.id,
      })
    }

    // 3. Registrar trilha de auditoria append-only
    const audit = await registrarAuditLog({
      tipo_evento: 'criacao',
      usuario_id: params.usuario.id,
      usuario_nome: params.usuario.nome,
      perfil: params.usuario.perfil,
      origem: 'online',
      referencia_tipo: 'conciliacao_estoque',
      referencia_id: concRecord.id,
      motivo: `Conciliação de estoque realizada para o período ${params.periodo_mes}. Itens: ${itensSalvos.length}, Divergências fora de tolerância: ${divergentes.length}, Impacto: R$ ${totalDivergenciaRs.toFixed(2)}.`,
      payload_antes: {
        total_itens: itensSalvos.length,
        periodo_mes: params.periodo_mes,
      },
      payload_depois: {
        conciliacao_id: concRecord.id,
        divergencias: divergentes.map((d) => ({
          produto: d.produto,
          sistema: d.saldo_sistema,
          fisico: d.contagem_fisica,
          diferenca_qtd: d.diferenca_qtd,
          diferenca_rs: d.diferenca_rs,
          justificativa: d.justificativa,
        })),
        total_divergencia_rs: totalDivergenciaRs,
      },
    })

    if (audit) {
      await pb.collection('conciliacoes_estoque').update(concRecord.id, {
        protocolo_audit_id: audit.evento_id,
      })
    }

    return {
      id: concRecord.id,
      data_conciliacao: concRecord.data_conciliacao,
      periodo_mes: concRecord.periodo_mes,
      responsavel_id: concRecord.responsavel_id,
      responsavel_nome: concRecord.responsavel_nome,
      total_itens: concRecord.total_itens,
      total_divergentes: concRecord.total_divergentes,
      total_divergencia_rs: concRecord.total_divergencia_rs,
      status: concRecord.status,
      observacoes_gerais: concRecord.observacoes_gerais,
      protocolo_audit_id: audit?.evento_id || '',
      ajuste_gerado: false,
      created: concRecord.created,
      updated: concRecord.updated,
      itens: itensSalvos,
    }
  } catch (err) {
    console.error('Erro ao salvar conciliação de estoque:', err)
    return null
  }
}

/**
 * Ajusta o estoque pela contagem física (gerando movimentação pelo fluxo oficial e auditoria encadeada)
 */
export async function aplicarAjusteEstoqueFisico(
  conciliacaoId: string,
  usuario: { id: string; nome: string; perfil: string },
): Promise<{ sucesso: boolean; ajustados: number; mensagem: string }> {
  try {
    const conc = await pb.collection('conciliacoes_estoque').getOne(conciliacaoId)
    if (!conc) {
      return { sucesso: false, ajustados: 0, mensagem: 'Conciliação não encontrada.' }
    }

    const itens = await pb
      .collection('itens_conciliacao_estoque')
      .getFullList<any>({ filter: `conciliacao_id = "${conciliacaoId}"` })

    const itensEstoqueAtuais = await getEstoqueInsumos()
    let ajustados = 0
    const snapshotAntes: any[] = []
    const snapshotDepois: any[] = []

    for (const item of itens) {
      // Ajustar saldo final da coleção estoque_insumos para a contagem física convertida
      const estoqueMatch = itensEstoqueAtuais.find(
        (e) => (item.insumo_id && e.id === item.insumo_id) || e.produto === item.produto,
      )

      if (estoqueMatch) {
        snapshotAntes.push({
          id: estoqueMatch.id,
          produto: estoqueMatch.produto,
          estoque_final: estoqueMatch.estoque_final,
        })

        // Se unidade do estoque for saco e a contagem foi em saco ou kg, calcular correspondente
        let novoEstoqueFinal = item.contagem_fisica
        if (estoqueMatch.unidade === 'saco' && item.unidade_contada === 'kg') {
          novoEstoqueFinal = converterKgParaSaco(item.contagem_fisica)
        } else if (estoqueMatch.unidade === 'kg' && item.unidade_contada === 'saco') {
          novoEstoqueFinal = converterParaKg(item.contagem_fisica, 'saco')
        }

        // Atualiza item do estoque preservando histórico de entradas e recalculando saídas ou novo saldo
        const diferenca = novoEstoqueFinal - (estoqueMatch.estoque_final || 0)
        let novasSaidas = (estoqueMatch.saidas || 0) - diferenca
        if (novasSaidas < 0) {
          novasSaidas = 0
        }

        await salvarItemEstoque({
          id: estoqueMatch.id,
          produto: estoqueMatch.produto,
          codigo: estoqueMatch.codigo,
          unidade: estoqueMatch.unidade,
          categoria: estoqueMatch.categoria,
          estoque_inicial: estoqueMatch.estoque_inicial,
          entradas: estoqueMatch.entradas,
          saidas: Number(novasSaidas.toFixed(2)),
          estoque_final: Number(novoEstoqueFinal.toFixed(2)),
          preco_unitario: estoqueMatch.preco_unitario,
          periodo_mes: estoqueMatch.periodo_mes || conc.periodo_mes,
        })

        await pb.collection('itens_conciliacao_estoque').update(item.id, { ajustado: true })

        snapshotDepois.push({
          id: estoqueMatch.id,
          produto: estoqueMatch.produto,
          estoque_final_ajustado: novoEstoqueFinal,
          diferenca_aplicada: diferenca,
        })
        ajustados++
      }
    }

    // Marca conciliação como ajustada
    await pb.collection('conciliacoes_estoque').update(conciliacaoId, {
      status: 'ajustada',
      ajuste_gerado: true,
    })

    // Auditoria encadeada com motivo explícito
    await registrarAuditLog({
      tipo_evento: 'correcao',
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      perfil: usuario.perfil,
      origem: 'online',
      referencia_tipo: 'conciliacao_ajuste_estoque',
      referencia_id: conciliacaoId,
      motivo: `Ajuste oficial de estoque gerado a partir da Conciliação #${conciliacaoId} (período ${conc.periodo_mes}). Itens ajustados: ${ajustados}. Registro anterior preservado via encadeamento.`,
      payload_antes: {
        conciliacao_id: conciliacaoId,
        estoque_antes: snapshotAntes,
      },
      payload_depois: {
        conciliacao_id: conciliacaoId,
        estoque_ajustado: snapshotDepois,
        data_ajuste: new Date().toISOString(),
      },
    })

    return {
      sucesso: true,
      ajustados,
      mensagem: `${ajustados} insumo(s) ajustado(s) com sucesso com trilha de auditoria encadeada.`,
    }
  } catch (err: any) {
    console.error('Erro ao aplicar ajuste de estoque:', err)
    return {
      sucesso: false,
      ajustados: 0,
      mensagem: `Falha ao aplicar ajuste: ${err.message || 'Erro no banco de dados'}`,
    }
  }
}

/**
 * Consulta histórico de conciliações anteriores
 */
export async function getHistoricoConciliacoes(): Promise<ConciliacaoEstoqueRecord[]> {
  try {
    const records = await pb
      .collection('conciliacoes_estoque')
      .getFullList<ConciliacaoEstoqueRecord>({
        sort: '-data_conciliacao',
      })

    // Carregar itens de cada conciliação
    const results: ConciliacaoEstoqueRecord[] = []
    for (const r of records) {
      let itens: any[] = []
      try {
        itens = await pb.collection('itens_conciliacao_estoque').getFullList({
          filter: `conciliacao_id = "${r.id}"`,
        })
      } catch {
        /* intentionally ignored */
      }
      results.push({
        ...r,
        itens,
      })
    }

    return results
  } catch (err) {
    console.warn('Erro ao carregar histórico de conciliações:', err)
    return []
  }
}
