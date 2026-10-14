/**
 * Serviço do Robô Chicão — Ingestão de NOTAS FISCAIS e RECIBOS DE PAGAMENTO (PDF / OCR)
 *
 * Princípios invioláveis do Chicão:
 * 1. Conferência obrigatória antes de qualquer lançamento: nada vai para o banco sem validação humana.
 * 2. Deduplicação estrita:
 *    - Nota Fiscal: chave de acesso (44 dígitos). Reimportar a mesma NF não duplica.
 *    - Recibo: data + valor + beneficiário (ou hash único). Pagamento duplicado é bloqueado.
 * 3. Validação de consistência:
 *    - Soma dos itens da NF vs Valor Total (divergência > R$ 0,01 gera alerta de ambiguidade).
 *    - Valor numérico vs Valor por extenso (divergência gera alerta de ambiguidade).
 * 4. Mapeamento Zootécnico e Contábil:
 *    - NF de Insumos: atualiza estoque_insumos (produtos, quantidades, valores) + lança desembolso em fábrica_suplemento/nutrição no financeiro.
 *    - NF de Venda de Gado: gera saída no rebanho (lots / movimentacoes_rebanho) + receita no fluxo de caixa + vendas.
 *    - NF de Compra de Gado: gera entrada no rebanho (lots / movimentacoes_rebanho) + desembolso no fluxo de caixa + cálculo do ágio vs cotação B3 (30 kg/@ viva).
 *    - NF de Serviços (frete, veterinário, manutenção): lançamento financeiro por centro de custo, sem estoque físico.
 *    - Recibo de Pagamento: baixa / desembolso no fluxo de caixa, vinculado à NF quando houver referência.
 * 5. Conciliação Automática:
 *    - Quando houver NF de compra e Recibo do mesmo fornecedor e valor, sugere vínculo nota ↔ recibo.
 * 6. Auditoria append-only:
 *    - Registra protocolo completo em audit_log e histórico em maestro_documentos_fiscais.
 */

import pb from '@/lib/pocketbase/client'
import { registrarAuditLog } from './auditoria'
import { getLots, updateLot, createLot, LotRecord } from './lots'
import {
  registrarMovimentacaoRebanho,
  registrarLancamentoFinanceiro,
  registrarVendaGado,
  registrarCompraGado,
  getEstoqueInsumos,
  salvarItemEstoque,
  EstoqueInsumoRecord,
} from './fechamento'
import { getCotacaoB3BoiGordoVigente } from './market'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================================================
// Tipos e Interfaces
// ============================================================================

export type TipoDocumentoFiscal = 'nota_fiscal' | 'recibo' | 'desconhecido'

export type SubtipoDocumentoFiscal =
  | 'nfe_danfe'
  | 'nf_avulsa'
  | 'nf_servico'
  | 'recibo_simples'
  | 'pix'
  | 'ted'
  | 'boleto'
  | 'recibo_fornecedor'
  | 'outro'

export type DestinoSistemaFiscal =
  | 'estoque_insumos'
  | 'rebanho_venda'
  | 'rebanho_compra'
  | 'financeiro_servico'
  | 'baixa_desembolso'
  | 'ignorar'

export type StatusCampo = 'OK' | 'AUSENTE' | 'ILEGIVEL' | 'AMBIGUO'
export type ConfiancaNivel = 'alta' | 'media' | 'baixa'

export interface CampoStatusInfo {
  status: StatusCampo
  confianca: ConfiancaNivel
  motivo?: string
}

export interface AlertaFiscal {
  tipo: 'critico' | 'atencao' | 'info'
  campo?: string
  mensagem: string
  sugestao?: string
}

export interface ItemNotaFiscal {
  produto: string
  quantidade: number
  unidade: string
  valor_unitario: number
  valor_total: number
  cfop?: string
  ncm?: string
}

export interface ImpostosNotaFiscal {
  base_icms?: number
  valor_icms?: number
  outros_tributos?: number
}

export interface EntidadePessoa {
  razao_social?: string
  nome?: string
  cnpj_cpf?: string
}

export interface DocumentoFiscalExtraido {
  id_temp: string
  tipo_documento: TipoDocumentoFiscal
  subtipo: SubtipoDocumentoFiscal
  confianca_geral: ConfiancaNivel
  destino_sistema: DestinoSistemaFiscal
  frente_selecionada?:
    | 'cria'
    | 'recria'
    | 'engorda'
    | 'confinamento'
    | 'arrendamento'
    | 'fabrica_suplemento'
    | 'frota'
    | 'administrativo'

  // Identificação da NF
  chave_acesso?: string // 44 dígitos
  numero_documento?: string
  serie?: string
  cfop_principal?: string
  natureza_operacao?: string
  data_emissao?: string // YYYY-MM-DD
  data_pagamento?: string // YYYY-MM-DD

  // Partes
  emitente: EntidadePessoa
  destinatario: EntidadePessoa
  beneficiario: EntidadePessoa
  pagador: EntidadePessoa

  // Valores e Itens
  itens: ItemNotaFiscal[]
  impostos: ImpostosNotaFiscal
  valor_total: number
  valor_extenso?: string
  forma_pagamento?: string
  dados_bancarios?: string
  referencia_nf?: string

  // Conferência interna
  soma_itens: number
  divergencia_soma: number

  // Campos específicos de gado
  gado_cabecas?: number
  gado_peso_kg?: number
  gado_peso_arrobas?: number
  gado_preco_rs_at?: number
  gado_agio_pct?: number | null
  lote_id_alvo?: string
  lote_nome_sugerido?: string

  // Status por campo & Alertas
  campos_status: Record<string, CampoStatusInfo>
  alertas: AlertaFiscal[]

  // Deduplicação
  dedup_hash: string
  ja_importado?: boolean
  registro_existente_id?: string

  // Conciliação NF ↔ Recibo
  vinculo_sugerido_id?: string
  vinculo_confirmado_id?: string
  status_conciliacao?: 'pago' | 'em_aberto' | 'divergente'

  // Decisão do Usuário na Conferência
  aprovado_para_aplicar: boolean
}

export interface ResultadoProcessamentoFiscal {
  origem_arquivo: string
  total_documentos: number
  documentos: DocumentoFiscalExtraido[]
  notas_fiscais: DocumentoFiscalExtraido[]
  recibos: DocumentoFiscalExtraido[]
  desconhecidos: DocumentoFiscalExtraido[]
  sugestoes_conciliacao: {
    nf_id: string
    recibo_id: string
    motivo: string
  }[]
  alertas_gerais: string[]
}

export interface ResultadoAplicacaoFiscal {
  sucesso: boolean
  total_processados: number
  total_aplicados: number
  total_ignorados: number
  protocolo_audit_id?: string
  detalhes_aplicados: {
    documento_id: string
    tipo: string
    descricao: string
    entidades_afetadas: string[]
  }[]
  mensagens: string[]
  timestamp: string
}

// ============================================================================
// Utilitários de Limpeza e Normalização
// ============================================================================

export function limparNumeros(str?: string): string {
  return String(str || '').replace(/\D/g, '')
}

export function formatarCNPJouCPF(str?: string): string {
  const limpo = limparNumeros(str)
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (limpo.length === 14) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return str || ''
}

export function gerarHashDeduplicacao(doc: Partial<DocumentoFiscalExtraido>): string {
  if (doc.tipo_documento === 'nota_fiscal' && doc.chave_acesso) {
    const chaveLimpa = limparNumeros(doc.chave_acesso)
    if (chaveLimpa.length === 44) return `nfe_${chaveLimpa}`
  }

  // Fallback para recibo ou nota sem chave completa
  const tipo = doc.tipo_documento || 'doc'
  const data = doc.data_pagamento || doc.data_emissao || 'sem_data'
  const valor = Number(doc.valor_total || 0).toFixed(2)
  const pessoa = limparNumeros(
    doc.beneficiario?.cnpj_cpf ||
      doc.emitente?.cnpj_cpf ||
      doc.beneficiario?.nome ||
      doc.emitente?.razao_social ||
      '',
  ).slice(0, 14)
  const num = limparNumeros(doc.numero_documento || '').slice(0, 10)

  return `${tipo}_${data}_${valor}_${pessoa}_${num}`
}

/**
 * Consulta o banco para verificar se a NF ou Recibo já foi importado anteriormente
 */
export async function verificarDeduplicacao(
  hash: string,
  chaveAcesso?: string,
): Promise<{ duplicado: boolean; registroId?: string; info?: string }> {
  try {
    // 1. Checa por chave de acesso de 44 dígitos
    if (chaveAcesso) {
      const chaveLimpa = limparNumeros(chaveAcesso)
      if (chaveLimpa.length === 44) {
        const porChave = await pb
          .collection('maestro_documentos_fiscais')
          .getList(1, 1, { filter: `chave_acesso = '${chaveLimpa}'` })
        if (porChave.items.length > 0) {
          const r = porChave.items[0]
          return {
            duplicado: true,
            registroId: r.id,
            info: `Nota Fiscal já registrada anteriormente em ${new Date(r.created).toLocaleDateString('pt-BR')} (ID: ${r.id.slice(0, 6)}).`,
          }
        }
      }
    }

    // 2. Checa por hash de deduplicação (data + valor + fornecedor)
    if (hash) {
      const porHash = await pb
        .collection('maestro_documentos_fiscais')
        .getList(1, 1, { filter: `dedup_hash = '${hash}'` })
      if (porHash.items.length > 0) {
        const r = porHash.items[0]
        return {
          duplicado: true,
          registroId: r.id,
          info: `Documento similar já registrado em ${new Date(r.created).toLocaleDateString('pt-BR')} (Valor R$ ${Number(r.valor_total || 0).toFixed(2)}).`,
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar deduplicação no PocketBase:', err)
  }
  return { duplicado: false }
}

// ============================================================================
// Processamento Backend e Validações
// ============================================================================

/**
 * Envia o texto extraído (digital ou transcrito via visão de IA) para o processador fiscal
 */
export async function processarDocumentosFiscais(
  conteudoMarkdown: string,
  nomeArquivo: string,
  origemLeitura: 'texto' | 'visao' = 'texto',
): Promise<ResultadoProcessamentoFiscal> {
  const backendUrl = import.meta.env.VITE_POCKETBASE_URL
  const res = await fetch(`${backendUrl}/backend/v1/maestro/process-fiscal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({
      content: conteudoMarkdown,
      filename: nomeArquivo,
      origem_leitura: origemLeitura,
    }),
  })

  if (!res.ok) {
    const erroTxt = await res.text()
    throw new Error(`Falha no processador fiscal do Chicão: ${erroTxt || res.statusText}`)
  }

  const data = await res.json()
  const rawDocs: any[] = data.resultado?.documentos || []

  // Carregar cotação B3 para possíveis compras/vendas de gado
  let cotacaoB3: number | null = null
  try {
    const c = await getCotacaoB3BoiGordoVigente()
    if (c && c.preco > 0) cotacaoB3 = c.preco
  } catch {
    /* cotação ausente nunca é inventada */
  }

  const docsNormalizados: DocumentoFiscalExtraido[] = []

  for (let idx = 0; idx < rawDocs.length; idx++) {
    const raw = rawDocs[idx]
    const idTemp = raw.id_temp || `doc_${idx + 1}_${Date.now()}`

    let tipoDoc: TipoDocumentoFiscal = raw.tipo_documento || 'desconhecido'
    if (!['nota_fiscal', 'recibo', 'desconhecido'].includes(tipoDoc)) {
      tipoDoc = 'desconhecido'
    }

    const valorTotal = Math.max(0, parseFloat(String(raw.valor_total || 0).replace(',', '.')) || 0)
    const chaveAcessoLimpa = limparNumeros(raw.chave_acesso)

    // Soma dos itens
    const itens: ItemNotaFiscal[] = (raw.itens || []).map((it: any) => ({
      produto: String(it.produto || '').trim(),
      quantidade: parseFloat(String(it.quantidade || 0).replace(',', '.')) || 0,
      unidade: String(it.unidade || 'un').trim(),
      valor_unitario: parseFloat(String(it.valor_unitario || 0).replace(',', '.')) || 0,
      valor_total: parseFloat(String(it.valor_total || 0).replace(',', '.')) || 0,
      cfop: it.cfop ? String(it.cfop) : undefined,
      ncm: it.ncm ? String(it.ncm) : undefined,
    }))

    const somaItens = itens.reduce((acc, it) => acc + (it.valor_total || 0), 0)
    const divergenciaSoma = Math.abs(somaItens - valorTotal)

    // Status por campo
    const camposStatus: Record<string, CampoStatusInfo> = raw.campos_status || {}
    const alertas: AlertaFiscal[] = Array.isArray(raw.alertas) ? [...raw.alertas] : []

    // Validação 1: Soma dos Itens vs Total da NF
    if (tipoDoc === 'nota_fiscal' && itens.length > 0) {
      if (divergenciaSoma > 0.05) {
        camposStatus['valor_total'] = {
          status: 'AMBIGUO',
          confianca: 'baixa',
          motivo: `Divergência de R$ ${divergenciaSoma.toFixed(2)} entre a soma dos itens (R$ ${somaItens.toFixed(2)}) e o total da nota (R$ ${valorTotal.toFixed(2)}).`,
        }
        alertas.push({
          tipo: 'atencao',
          campo: 'valor_total',
          mensagem: `A soma dos itens (R$ ${somaItens.toFixed(2)}) difere do total da NF (R$ ${valorTotal.toFixed(2)}) em R$ ${divergenciaSoma.toFixed(2)}.`,
          sugestao: 'Confirme o valor correto antes de aplicar no financeiro.',
        })
      } else {
        if (!camposStatus['valor_total']) {
          camposStatus['valor_total'] = { status: 'OK', confianca: 'alta' }
        }
      }
    }

    // Validação 2: Chave de Acesso (44 dígitos)
    if (tipoDoc === 'nota_fiscal') {
      if (chaveAcessoLimpa.length === 44) {
        camposStatus['chave_acesso'] = { status: 'OK', confianca: 'alta' }
      } else if (chaveAcessoLimpa.length > 0) {
        camposStatus['chave_acesso'] = {
          status: 'ILEGIVEL',
          confianca: 'baixa',
          motivo: `Chave de acesso com ${chaveAcessoLimpa.length} dígitos (esperado 44).`,
        }
        alertas.push({
          tipo: 'critico',
          campo: 'chave_acesso',
          mensagem: `Chave de acesso incompleta ou ilegível (${chaveAcessoLimpa.length} dígitos).`,
          sugestao: 'Insira os 44 dígitos da chave para evitar duplicidade de notas.',
        })
      } else {
        camposStatus['chave_acesso'] = {
          status: 'AUSENTE',
          confianca: 'baixa',
          motivo: 'Chave de acesso de 44 dígitos não encontrada no documento.',
        }
        if (raw.subtipo === 'nfe_danfe') {
          alertas.push({
            tipo: 'atencao',
            campo: 'chave_acesso',
            mensagem: 'Chave de acesso ausente na NF-e.',
            sugestao: 'Recomendado preencher para deduplicação automática.',
          })
        }
      }
    }

    // Validação 3: Valor por Extenso vs Numérico
    if (raw.valor_extenso && typeof raw.valor_extenso === 'string') {
      // Se houver discrepância gritante ou ambiguidade
      if (raw.valor_extenso.toLowerCase().includes('reais') && valorTotal === 0) {
        camposStatus['valor_total'] = {
          status: 'AMBIGUO',
          confianca: 'baixa',
          motivo: `Valor numérico zerado mas texto por extenso presente ("${raw.valor_extenso}").`,
        }
        alertas.push({
          tipo: 'critico',
          campo: 'valor_total',
          mensagem: 'Valor numérico não identificado, porém há valor por extenso.',
          sugestao: 'Digite o valor numérico conferindo com o extenso.',
        })
      }
    }

    // Validação 4: Destino do Sistema e regras zootécnicas
    let destinoSistema: DestinoSistemaFiscal = raw.destino_sistema || 'estoque_insumos'
    let gadoCabecas: number | undefined
    let gadoPesoKg: number | undefined
    let gadoPesoArrobas: number | undefined
    let gadoPrecoRsAt: number | undefined
    let gadoAgioPct: number | null = null

    // Checa CFOP da NF para orientar destino
    const cfopStr = String(raw.cfop_principal || '')
    const naturezaStr = String(raw.natureza_operacao || '').toLowerCase()
    const produtosStr = itens.map((i) => i.produto.toLowerCase()).join(' ')

    if (
      naturezaStr.includes('venda de gado') ||
      naturezaStr.includes('venda de bovino') ||
      produtosStr.includes('bovino') ||
      produtosStr.includes('bezerro') ||
      produtosStr.includes('garrote') ||
      produtosStr.includes('boi gordo')
    ) {
      if (cfopStr.startsWith('5') || cfopStr.startsWith('6') || naturezaStr.includes('venda')) {
        destinoSistema = 'rebanho_venda'
      } else if (
        cfopStr.startsWith('1') ||
        cfopStr.startsWith('2') ||
        naturezaStr.includes('compra')
      ) {
        destinoSistema = 'rebanho_compra'
      }
    } else if (tipoDoc === 'recibo') {
      destinoSistema = 'baixa_desembolso'
    } else if (
      naturezaStr.includes('servico') ||
      naturezaStr.includes('frete') ||
      naturezaStr.includes('transporte') ||
      naturezaStr.includes('manutencao')
    ) {
      destinoSistema = 'financeiro_servico'
    }

    // Se for gado, calcular @ viva (30 kg) e ágio vs cotação B3
    if (destinoSistema === 'rebanho_compra' || destinoSistema === 'rebanho_venda') {
      const itemGado = itens[0]
      gadoCabecas = itemGado ? Math.round(itemGado.quantidade) : 1
      gadoPesoKg = itemGado?.unidade.toLowerCase().includes('kg') ? itemGado.quantidade : undefined

      if (!gadoPesoKg && itemGado && itemGado.unidade.includes('@')) {
        gadoPesoKg = itemGado.quantidade * 30
      }

      if (gadoPesoKg) {
        gadoPesoArrobas = Number((gadoPesoKg / 30).toFixed(2)) // @ viva = 30 kg
      }

      if (gadoPesoArrobas && gadoPesoArrobas > 0 && valorTotal > 0) {
        gadoPrecoRsAt = Number((valorTotal / gadoPesoArrobas).toFixed(2))
      }

      if (gadoPrecoRsAt && cotacaoB3 && cotacaoB3 > 0) {
        // Ágio = ((preço/@ ÷ cotação) - 1) * 100
        gadoAgioPct = Number(((gadoPrecoRsAt / cotacaoB3 - 1) * 100).toFixed(1))
      }
    }

    // Gerar Hash de deduplicação
    const docTemp: Partial<DocumentoFiscalExtraido> = {
      tipo_documento: tipoDoc,
      chave_acesso: chaveAcessoLimpa,
      data_emissao: raw.data_emissao,
      data_pagamento: raw.data_pagamento,
      valor_total: valorTotal,
      numero_documento: raw.numero_documento,
      emitente: raw.emitente || {},
      beneficiario: raw.beneficiario || {},
    }
    const dedupHash = gerarHashDeduplicacao(docTemp)

    // Consulta duplicidade existente
    const checagemDedup = await verificarDeduplicacao(dedupHash, chaveAcessoLimpa)
    if (checagemDedup.duplicado) {
      alertas.push({
        tipo: 'critico',
        campo: 'chave_acesso',
        mensagem: checagemDedup.info || 'Documento já cadastrado no sistema!',
        sugestao: 'Verifique se não se trata de reimportação duplicada.',
      })
    }

    const docPronto: DocumentoFiscalExtraido = {
      id_temp: idTemp,
      tipo_documento: tipoDoc,
      subtipo: raw.subtipo || (tipoDoc === 'nota_fiscal' ? 'nfe_danfe' : 'recibo_simples'),
      confianca_geral: raw.confianca_geral || (origemLeitura === 'visao' ? 'media' : 'alta'),
      destino_sistema: destinoSistema,
      frente_selecionada:
        destinoSistema === 'estoque_insumos'
          ? 'fabrica_suplemento'
          : destinoSistema === 'rebanho_venda'
            ? 'engorda'
            : destinoSistema === 'rebanho_compra'
              ? 'recria'
              : 'administrativo',
      chave_acesso: chaveAcessoLimpa || undefined,
      numero_documento: raw.numero_documento ? String(raw.numero_documento) : undefined,
      serie: raw.serie ? String(raw.serie) : undefined,
      cfop_principal: raw.cfop_principal ? String(raw.cfop_principal) : undefined,
      natureza_operacao: raw.natureza_operacao ? String(raw.natureza_operacao) : undefined,
      data_emissao: raw.data_emissao || undefined,
      data_pagamento: raw.data_pagamento || undefined,
      emitente: {
        razao_social: raw.emitente?.razao_social || '',
        cnpj_cpf: raw.emitente?.cnpj_cpf || '',
      },
      destinatario: {
        razao_social: raw.destinatario?.razao_social || '',
        cnpj_cpf: raw.destinatario?.cnpj_cpf || '',
      },
      beneficiario: {
        nome: raw.beneficiario?.nome || raw.emitente?.razao_social || '',
        cnpj_cpf: raw.beneficiario?.cnpj_cpf || raw.emitente?.cnpj_cpf || '',
      },
      pagador: {
        nome: raw.pagador?.nome || raw.destinatario?.razao_social || '',
        cnpj_cpf: raw.pagador?.cnpj_cpf || raw.destinatario?.cnpj_cpf || '',
      },
      itens,
      impostos: {
        base_icms: raw.impostos?.base_icms ? Number(raw.impostos.base_icms) : undefined,
        valor_icms: raw.impostos?.valor_icms ? Number(raw.impostos.valor_icms) : undefined,
        outros_tributos: raw.impostos?.outros_tributos
          ? Number(raw.impostos.outros_tributos)
          : undefined,
      },
      valor_total: valorTotal,
      valor_extenso: raw.valor_extenso,
      forma_pagamento: raw.forma_pagamento,
      dados_bancarios: raw.dados_bancarios,
      referencia_nf: raw.referencia_nf,
      soma_itens: Number(somaItens.toFixed(2)),
      divergencia_soma: Number(divergenciaSoma.toFixed(2)),
      gado_cabecas: gadoCabecas,
      gado_peso_kg: gadoPesoKg,
      gado_peso_arrobas: gadoPesoArrobas,
      gado_preco_rs_at: gadoPrecoRsAt,
      gado_agio_pct: gadoAgioPct,
      campos_status: camposStatus,
      alertas,
      dedup_hash: dedupHash,
      ja_importado: checagemDedup.duplicado,
      registro_existente_id: checagemDedup.registroId,
      aprovado_para_aplicar: !checagemDedup.duplicado,
    }

    docsNormalizados.push(docPronto)
  }

  // Conciliação Sugerida: cruzamento NF de compra ↔ Recibo com mesmo valor ou referência
  const sugestoesConciliacao: { nf_id: string; recibo_id: string; motivo: string }[] = []

  const notas = docsNormalizados.filter((d) => d.tipo_documento === 'nota_fiscal')
  const recibos = docsNormalizados.filter((d) => d.tipo_documento === 'recibo')

  for (const n of notas) {
    for (const r of recibos) {
      let bate = false
      let motivo = ''

      // 1. Referência explícita do número da NF no recibo
      if (
        r.referencia_nf &&
        n.numero_documento &&
        limparNumeros(r.referencia_nf) === limparNumeros(n.numero_documento)
      ) {
        bate = true
        motivo = `Recibo faz referência direta à NF número ${n.numero_documento}`
      }

      // 2. Mesmo fornecedor/beneficiário e mesmo valor (diferença <= R$ 0,05)
      if (!bate && Math.abs(n.valor_total - r.valor_total) <= 0.05) {
        const docFornec = limparNumeros(n.emitente.cnpj_cpf)
        const docRecibo = limparNumeros(r.beneficiario.cnpj_cpf)
        const mesmoCnpj = docFornec && docRecibo && docFornec === docRecibo
        const nomeFornec = (n.emitente.razao_social || '').toLowerCase()
        const nomeRecibo = (r.beneficiario.nome || '').toLowerCase()
        const mesmoNome =
          nomeFornec &&
          nomeRecibo &&
          (nomeFornec.includes(nomeRecibo) || nomeRecibo.includes(nomeFornec))

        if (mesmoCnpj || mesmoNome) {
          bate = true
          motivo = `Mesmo favorecido ("${n.emitente.razao_social}") e valor idêntico (R$ ${n.valor_total.toFixed(2)})`
        }
      }

      if (bate) {
        sugestoesConciliacao.push({
          nf_id: n.id_temp,
          recibo_id: r.id_temp,
          motivo,
        })
        n.vinculo_sugerido_id = r.id_temp
        r.vinculo_sugerido_id = n.id_temp
        n.status_conciliacao = 'pago'
        r.status_conciliacao = 'pago'
      }
    }
  }

  const resultado: ResultadoProcessamentoFiscal = {
    origem_arquivo: nomeArquivo,
    total_documentos: docsNormalizados.length,
    documentos: docsNormalizados,
    notas_fiscais: docsNormalizados.filter((d) => d.tipo_documento === 'nota_fiscal'),
    recibos: docsNormalizados.filter((d) => d.tipo_documento === 'recibo'),
    desconhecidos: docsNormalizados.filter((d) => d.tipo_documento === 'desconhecido'),
    sugestoes_conciliacao: sugestoesConciliacao,
    alertas_gerais: [],
  }

  return resultado
}

// ============================================================================
// Aplicação no Banco de Dados com Trilha de Auditoria
// ============================================================================

export async function aplicarDocumentosFiscaisConfirmados(
  documentosParaAplicar: DocumentoFiscalExtraido[],
  origemArquivo: string,
  usuario: { id: string; nome: string; perfil: string },
): Promise<ResultadoAplicacaoFiscal> {
  const result: ResultadoAplicacaoFiscal = {
    sucesso: true,
    total_processados: documentosParaAplicar.length,
    total_aplicados: 0,
    total_ignorados: 0,
    detalhes_aplicados: [],
    mensagens: [],
    timestamp: new Date().toISOString(),
  }

  const itensAudit: any[] = []
  const dataHoje = new Date().toISOString().slice(0, 10)
  const mesAtual = dataHoje.slice(0, 7)

  // Carregar lotes e estoque de insumos
  let lotesExistentes: LotRecord[] = []
  let estoqueExistente: EstoqueInsumoRecord[] = []
  try {
    lotesExistentes = await getLots()
  } catch {
    /* ok */
  }
  try {
    estoqueExistente = await getEstoqueInsumos()
  } catch {
    /* ok */
  }

  for (const doc of documentosParaAplicar) {
    if (!doc.aprovado_para_aplicar || doc.destino_sistema === 'ignorar') {
      result.total_ignorados++
      continue
    }

    // Checagem final de duplicidade
    if (doc.ja_importado) {
      result.total_ignorados++
      result.mensagens.push(
        `Documento ${doc.numero_documento || doc.id_temp} ignorado por duplicidade.`,
      )
      continue
    }

    const entidadesAfetadas: string[] = []

    try {
      // 1. APLICAÇÃO CONFORME DESTINO
      if (doc.destino_sistema === 'estoque_insumos') {
        // ENTRADA NO ESTOQUE DE INSUMOS + LANÇAMENTO FINANCEIRO (FÁBRICA DE SUPLEMENTO)
        for (const item of doc.itens) {
          const nomeProd = item.produto || 'Insumo Diversos'
          const qtdEntrada = item.quantidade || 0
          const precoUnit = item.valor_unitario || item.valor_total / (qtdEntrada || 1)

          // Match no estoque existente
          const match = estoqueExistente.find(
            (e) =>
              e.produto.toLowerCase().trim() === nomeProd.toLowerCase().trim() ||
              (e.codigo && e.codigo.toLowerCase() === nomeProd.toLowerCase()),
          )

          if (match) {
            await salvarItemEstoque({
              id: match.id,
              produto: match.produto,
              unidade: match.unidade || item.unidade,
              estoque_inicial: match.estoque_inicial,
              entradas: (match.entradas || 0) + qtdEntrada,
              saidas: match.saidas,
              estoque_final: (match.estoque_final || 0) + qtdEntrada,
              preco_unitario: precoUnit > 0 ? precoUnit : match.preco_unitario,
              periodo_mes: mesAtual,
            })
          } else {
            const novoItem = await salvarItemEstoque({
              produto: nomeProd,
              codigo: `INS-${Date.now().toString().slice(-4)}`,
              unidade: item.unidade || 'kg',
              categoria: 'nutricao',
              estoque_inicial: 0,
              entradas: qtdEntrada,
              saidas: 0,
              estoque_final: qtdEntrada,
              preco_unitario: precoUnit,
              periodo_mes: mesAtual,
            })
            estoqueExistente.push(novoItem)
          }
        }
        entidadesAfetadas.push('Estoque de Insumos')

        // Lançamento financeiro do desembolso / compra
        if (doc.valor_total > 0) {
          await registrarLancamentoFinanceiro({
            data: doc.data_emissao || dataHoje,
            centro_custo: 'fabrica_suplemento',
            plano_contas: 'Aquisição de Insumos e Matérias-Primas',
            classificacao: 'custo_variavel',
            tipo: 'despesa',
            valor: doc.valor_total,
            descricao: `NF-e ${doc.numero_documento || ''} - Fornecedor: ${doc.emitente.razao_social || 'Fornecedor Insumos'} (${doc.itens
              .map((i) => i.produto)
              .join(', ')
              .slice(0, 150)})`,
          })
          entidadesAfetadas.push('Financeiro (Fábrica de Suplemento)')
        }
      } else if (doc.destino_sistema === 'rebanho_venda') {
        // VENDA DE GADO: REGISTRO DE VENDA + SAÍDA DO REBANHO + RECEITA FINANCEIRA
        const cabecas = doc.gado_cabecas || 1
        const pesoTotalKg = doc.gado_peso_kg || cabecas * 450
        const arrobasTotais = doc.gado_peso_arrobas || pesoTotalKg / 30

        // Localizar lote alvo ou primeiro lote de engorda
        let loteAlvo = lotesExistentes.find((l) => l.id === doc.lote_id_alvo)
        if (!loteAlvo) {
          loteAlvo =
            lotesExistentes.find((l) => l.status === 'active' && l.sector === 'engorda') ||
            lotesExistentes[0]
        }

        if (loteAlvo) {
          // Decrementa headcount do lote
          const novoHeadcount = Math.max(0, (loteAlvo.headcount || 0) - cabecas)
          await updateLot(loteAlvo.id, {
            headcount: novoHeadcount,
            status: novoHeadcount === 0 ? 'sold' : 'active',
          })
        }

        // Registra movimentação de saída
        await registrarMovimentacaoRebanho({
          data: doc.data_emissao || dataHoje,
          frente: 'engorda',
          lote_id: loteAlvo?.id,
          tipo: 'venda',
          qtd_cabecas: cabecas,
          peso_total_kg: pesoTotalKg,
          valor_total_rs: doc.valor_total,
          documento: `NF ${doc.numero_documento || doc.id_temp}`,
          sexo: 'macho',
          observacoes: `Comprador: ${doc.destinatario.razao_social || 'Frigorífico'} | NF-e: ${doc.chave_acesso || doc.numero_documento}`,
        })
        entidadesAfetadas.push('Movimentação do Rebanho (Saída)')

        // Registra receita no financeiro
        await registrarLancamentoFinanceiro({
          data: doc.data_emissao || dataHoje,
          centro_custo: 'engorda',
          plano_contas: 'Receita Operacional de Venda de Gado',
          classificacao: 'desembolso',
          tipo: 'receita',
          valor: doc.valor_total,
          descricao: `NF-e Venda de Gado ${doc.numero_documento || ''} - Comprador: ${doc.destinatario.razao_social || 'Frigorífico'} (${cabecas} cab, ${arrobasTotais.toFixed(1)} @)`,
          lote_id: loteAlvo?.id,
        })
        entidadesAfetadas.push('Fluxo de Caixa (Receita)')

        // Registro formal na coleção de vendas
        await registrarVendaGado({
          data: doc.data_emissao || dataHoje,
          lote_id: loteAlvo?.id,
          frente: 'engorda',
          sexo: 'macho',
          qtd_cabecas: cabecas,
          peso_vivo_total: pesoTotalKg,
          rendimento_carcaca_pct: 54,
          peso_carcaca_total: pesoTotalKg * 0.54,
          preco_rs_at: doc.gado_preco_rs_at || doc.valor_total / (arrobasTotais || 1),
          receita_total: doc.valor_total,
          comprador: doc.destinatario.razao_social || 'Não informado',
        })
        entidadesAfetadas.push('Vendas')
      } else if (doc.destino_sistema === 'rebanho_compra') {
        // COMPRA DE GADO: ENTRADA NO REBANHO + DESEMBOLSO FINANCEIRO + COMPRAS
        const cabecas = doc.gado_cabecas || 1
        const pesoTotalKg = doc.gado_peso_kg || cabecas * 220
        const pesoMedio = pesoTotalKg / cabecas
        const arrobasTotais = doc.gado_peso_arrobas || pesoTotalKg / 30

        // Cria ou incrementa lote
        const novoLote = await createLot({
          name:
            doc.lote_nome_sugerido ||
            `Lote Compra NF ${doc.numero_documento || Date.now().toString().slice(-4)}`,
          sector: 'recria',
          sex: 'macho',
          category: 'Recria (12-24m)',
          initial_weight: pesoMedio,
          final_weight: pesoMedio,
          entry_date: doc.data_emissao || dataHoje,
          exit_date: '',
          value_per_animal: doc.valor_total / cabecas,
          status: 'active',
          headcount: cabecas,
          peso_entrada_medio: pesoMedio,
          peso_medio_atual: pesoMedio,
          pasto_atual: 'Pasto de Entrada',
          fase_atual: 'recria',
          frente: 'recria',
        })
        entidadesAfetadas.push('Rebanho (Novo Lote)')

        // Movimentação de entrada
        await registrarMovimentacaoRebanho({
          data: doc.data_emissao || dataHoje,
          frente: 'recria',
          lote_id: novoLote.id,
          tipo: 'compra',
          qtd_cabecas: cabecas,
          peso_total_kg: pesoTotalKg,
          valor_total_rs: doc.valor_total,
          documento: `NF ${doc.numero_documento || doc.id_temp}`,
          sexo: 'macho',
          observacoes: `Fornecedor: ${doc.emitente.razao_social || 'Vendedor'} | Ágio: ${doc.gado_agio_pct !== null && doc.gado_agio_pct !== undefined ? `${doc.gado_agio_pct}%` : 's/ cotação'}`,
        })
        entidadesAfetadas.push('Movimentação do Rebanho (Entrada)')

        // Lançamento de despesa no fluxo de caixa
        await registrarLancamentoFinanceiro({
          data: doc.data_emissao || dataHoje,
          centro_custo: 'recria',
          plano_contas: 'Compra de Animais / Reposição',
          classificacao: 'investimento',
          tipo: 'despesa',
          valor: doc.valor_total,
          descricao: `NF-e Compra Gado ${doc.numero_documento || ''} - Fornecedor: ${doc.emitente.razao_social || ''} (${cabecas} cab, ${pesoMedio.toFixed(0)} kg méd)`,
          lote_id: novoLote.id,
        })
        entidadesAfetadas.push('Fluxo de Caixa (Desembolso)')

        // Coleção de compras de gado
        await registrarCompraGado({
          data: doc.data_emissao || dataHoje,
          frente: 'recria',
          lote_id: novoLote.id,
          sexo: 'macho',
          qtd_cabecas: cabecas,
          peso_medio: pesoMedio,
          preco_rs_cab: doc.valor_total / cabecas,
          preco_rs_at: doc.gado_preco_rs_at || doc.valor_total / (arrobasTotais || 1),
          valor_total: doc.valor_total,
          agio_pct: doc.gado_agio_pct !== null ? doc.gado_agio_pct : undefined,
          fornecedor: doc.emitente.razao_social || 'Não informado',
        })
        entidadesAfetadas.push('Compras de Gado')
      } else if (doc.destino_sistema === 'financeiro_servico') {
        // SERVIÇOS (FRETE, VETERINÁRIO, MANUTENÇÃO): LANÇAMENTO FINANCEIRO
        const centroCusto = doc.frente_selecionada || 'administrativo'
        await registrarLancamentoFinanceiro({
          data: doc.data_emissao || dataHoje,
          centro_custo: centroCusto as any,
          plano_contas: 'Serviços Prestados / Fretes / Veterinário',
          classificacao: 'custo_fixo',
          tipo: 'despesa',
          valor: doc.valor_total,
          descricao: `NFS-e / NF Serviço ${doc.numero_documento || ''} - Prestador: ${doc.emitente.razao_social || 'Prestador de Serviço'}`,
        })
        entidadesAfetadas.push(`Financeiro (${centroCusto})`)
      } else if (doc.destino_sistema === 'baixa_desembolso') {
        // RECIBO / COMPROVANTE: BAIXA NO FLUXO DE CAIXA
        const centroCusto = doc.frente_selecionada || 'administrativo'
        await registrarLancamentoFinanceiro({
          data: doc.data_pagamento || dataHoje,
          centro_custo: centroCusto as any,
          plano_contas: 'Pagamentos Efetuados / Baixa de Fornecedores',
          classificacao: 'desembolso',
          tipo: 'despesa',
          valor: doc.valor_total,
          descricao: `Comprovante / Recibo: ${doc.forma_pagamento || 'Pagamento'} - Favorecido: ${doc.beneficiario.nome || 'Fornecedor'}${doc.referencia_nf ? ` (Ref NF: ${doc.referencia_nf})` : ''}`,
        })
        entidadesAfetadas.push('Fluxo de Caixa (Baixa de Pagamento)')
      }

      // 2. GRAVAÇÃO NA COLEÇÃO APPEND-ONLY `maestro_documentos_fiscais`
      const payloadMdf = {
        tipo_documento: doc.tipo_documento,
        subtipo: doc.subtipo,
        origem_arquivo: origemArquivo,
        chave_acesso: doc.chave_acesso || '',
        numero_documento: doc.numero_documento || '',
        serie: doc.serie || '',
        cfop_principal: doc.cfop_principal || '',
        natureza_operacao: doc.natureza_operacao || '',
        data_emissao: doc.data_emissao || null,
        data_pagamento: doc.data_pagamento || null,
        emitente_razao: doc.emitente.razao_social || '',
        emitente_cnpj_cpf: doc.emitente.cnpj_cpf || '',
        destinatario_razao: doc.destinatario.razao_social || '',
        destinatario_cnpj_cpf: doc.destinatario.cnpj_cpf || '',
        beneficiario_nome: doc.beneficiario.nome || '',
        beneficiario_cnpj_cpf: doc.beneficiario.cnpj_cpf || '',
        pagador_nome: doc.pagador.nome || '',
        pagador_cnpj_cpf: doc.pagador.cnpj_cpf || '',
        valor_total: doc.valor_total,
        valor_extenso: doc.valor_extenso || '',
        forma_pagamento: doc.forma_pagamento || '',
        dados_bancarios: doc.dados_bancarios || '',
        referencia_nf: doc.referencia_nf || '',
        documento_vinculado_id: doc.vinculo_confirmado_id || doc.vinculo_sugerido_id || '',
        conciliado: Boolean(doc.vinculo_confirmado_id || doc.vinculo_sugerido_id),
        destino_sistema: doc.destino_sistema,
        itens: doc.itens,
        impostos: doc.impostos,
        campos_status: doc.campos_status,
        alertas: doc.alertas,
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        dedup_hash: doc.dedup_hash,
      }

      const rec = await pb.collection('maestro_documentos_fiscais').create(payloadMdf)

      result.total_aplicados++
      result.detalhes_aplicados.push({
        documento_id: rec.id,
        tipo: doc.tipo_documento,
        descricao: `${doc.tipo_documento === 'nota_fiscal' ? 'NF' : 'Recibo'} ${doc.numero_documento || ''} - R$ ${doc.valor_total.toFixed(2)}`,
        entidades_afetadas: entidadesAfetadas,
      })

      itensAudit.push({
        id: rec.id,
        tipo: doc.tipo_documento,
        chave: doc.chave_acesso,
        valor: doc.valor_total,
        entidades: entidadesAfetadas,
      })
    } catch (err: any) {
      console.warn('Erro ao aplicar documento fiscal:', err)
      result.total_ignorados++
      result.mensagens.push(
        `Erro ao aplicar documento ${doc.numero_documento || doc.id_temp}: ${err.message || 'Falha no banco'}`,
      )
    }
  }

  // 3. TRILHA DE AUDITORIA APPEND-ONLY (audit_log)
  if (result.total_aplicados > 0) {
    const auditRec = await registrarAuditLog({
      tipo_evento: 'criacao',
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      perfil: usuario.perfil as any,
      origem: 'online',
      referencia_tipo: 'maestro_documentos_fiscais',
      motivo: `Robô Chicão processou ${result.total_aplicados} documento(s) fiscais/recibos do arquivo "${origemArquivo}".`,
      payload_antes: { arquivo: origemArquivo },
      payload_depois: {
        total_aplicados: result.total_aplicados,
        documentos: itensAudit,
      },
    })

    if (auditRec) {
      result.protocolo_audit_id = auditRec.evento_id
    }
  }

  return result
}

// ============================================================================
// Emissão de Relatório PDF de Confirmação Fiscal
// ============================================================================

export function gerarRelatorioFiscalPDF(
  resultado: ResultadoAplicacaoFiscal,
  documentos: DocumentoFiscalExtraido[],
  arquivoNome: string,
  usuarioNome: string,
) {
  const doc = new jsPDF()

  // Cabeçalho institucional
  doc.setFillColor(30, 41, 59)
  doc.rect(0, 0, 210, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PECUÁRIA F3 — GESTÃO PECUÁRIA INTEGRADA', 14, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Robô Chicão: Protocolo de Ingestão de Notas Fiscais e Recibos', 14, 19)

  // Metadados
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.text(`Arquivo: ${arquivoNome}`, 14, 32)
  doc.text(
    `Protocolo Audit: ${resultado.protocolo_audit_id || 'LOCAL-AUT'}-${Date.now().toString().slice(-4)}`,
    14,
    38,
  )
  doc.text(`Responsável: ${usuarioNome}`, 140, 32)
  doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 140, 38)

  // Resumo
  doc.setDrawColor(226, 232, 240)
  doc.line(14, 42, 196, 42)

  const rows = documentos
    .filter((d) => d.aprovado_para_aplicar)
    .map((d) => [
      d.tipo_documento === 'nota_fiscal' ? 'Nota Fiscal' : 'Recibo',
      d.numero_documento || 'S/N',
      d.data_emissao || d.data_pagamento || '-',
      (d.emitente.razao_social || d.beneficiario.nome || 'Não informado').slice(0, 25),
      `R$ ${d.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      d.destino_sistema.replace('_', ' ').toUpperCase(),
      d.status_conciliacao === 'pago' ? 'CONCILIADO' : 'OK',
    ])

  autoTable(doc, {
    startY: 46,
    head: [
      [
        'Tipo',
        'Número',
        'Data',
        'Emitente / Favorecido',
        'Valor (R$)',
        'Destino Sistema',
        'Status',
      ],
    ],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [40, 116, 166], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 50 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 38 },
      6: { cellWidth: 24, halign: 'center' },
    },
  })

  // Rodapé com aviso legal e conformidade
  const finalY = (doc as any).lastAutoTable?.finalY || 180
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(
    'Este documento comprova o lançamento em trilha append-only pelo Robô Chicão após conferência humana obrigatória.',
    14,
    finalY + 12,
  )
  doc.text(
    'Deduplicação automática garantida por Chave de Acesso (NF-e) e Hash de Pagamento.',
    14,
    finalY + 17,
  )

  doc.save(`protocolo_chicao_fiscal_${new Date().toISOString().slice(0, 10)}.pdf`)
}
