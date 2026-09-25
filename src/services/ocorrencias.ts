import pb from '@/lib/pocketbase/client'
import { registrarAuditLog, getDispositivoId } from './auditoria'
import { criarNotificacaoSistema } from './notificacoesSistema'
import { registrarMovimentacaoRebanho } from './fechamento'
import { updateLot, getLot } from './lots'

export type UrgenciaOcorrencia = 'informativo' | 'requer_acao_hoje'
export type StatusOcorrencia = 'registrada' | 'em_analise' | 'resolvida' | 'cancelada'

export interface CampoTipoConfig {
  nome: string
  label: string
  tipo: 'text' | 'textarea' | 'number' | 'select'
  opcoes?: string[]
  obrigatorio?: boolean
}

export interface TipoOcorrenciaRecord {
  id: string
  codigo: string
  nome: string
  icone: string
  categoria?: string
  campos?: CampoTipoConfig[]
  ativo: boolean
  criado_por?: string
  created: string
  updated: string
}

export interface OcorrenciaRecord {
  id: string
  uuid_dispositivo: string
  tipo: string
  data_hora_dispositivo: string
  data_hora_servidor?: string
  usuario_id: string
  usuario_nome?: string
  perfil: string
  lote_id?: string
  lote_nome?: string
  pasto_id?: string
  animal_id?: string
  campos_especificos?: Record<string, any>
  foto?: string
  geolocalizacao?: {
    latitude?: number
    longitude?: number
    precisao?: number
  }
  urgencia: UrgenciaOcorrencia
  status: StatusOcorrencia
  cancelado_em?: string
  cancelado_por?: string
  motivo_cancelamento?: string
  resolvido_em?: string
  resolvido_por?: string
  resolucao_observacao?: string
  aprovado_em?: string
  aprovado_por?: string
  evento_correcao_id?: string
  conflito_sinalizado?: boolean
  conflito_detalhes?: string
  sincronizado?: boolean
  created: string
  updated: string
}

export interface CriarOcorrenciaInput {
  uuid_dispositivo?: string
  tipo: string
  data_hora_dispositivo?: string
  usuario_id: string
  usuario_nome?: string
  perfil: string
  lote_id?: string
  lote_nome?: string
  pasto_id?: string
  animal_id?: string
  campos_especificos?: Record<string, any>
  fotoFile?: File | null
  geolocalizacao?: {
    latitude?: number
    longitude?: number
    precisao?: number
  }
  urgencia: UrgenciaOcorrencia
  status?: StatusOcorrencia
  origemOffline?: boolean
}

// -------------------------------------------------------------
// CATÁLOGO DE TIPOS DE OCORRÊNCIA
// -------------------------------------------------------------

export async function getTiposOcorrencia(): Promise<TipoOcorrenciaRecord[]> {
  try {
    const list = await pb.collection('tipos_ocorrencia').getFullList<TipoOcorrenciaRecord>({
      filter: 'ativo = true',
      sort: 'nome',
    })
    return list
  } catch (err) {
    console.warn('Erro ao obter tipos_ocorrencia do PocketBase:', err)
    return []
  }
}

export async function criarTipoOcorrenciaCustom(input: {
  codigo: string
  nome: string
  icone: string
  categoria?: string
  campos: CampoTipoConfig[]
  criado_por?: string
}): Promise<TipoOcorrenciaRecord> {
  const payload = {
    codigo: input.codigo.trim().toLowerCase().replace(/\s+/g, '_'),
    nome: input.nome.trim(),
    icone: input.icone || 'Tag',
    categoria: input.categoria || 'personalizado',
    campos: input.campos || [],
    ativo: true,
    criado_por: input.criado_por || 'gestor',
  }
  return await pb.collection('tipos_ocorrencia').create<TipoOcorrenciaRecord>(payload)
}

// -------------------------------------------------------------
// CONSULTA E GESTÃO DE OCORRÊNCIAS
// -------------------------------------------------------------

export async function getOcorrencias(filtros?: {
  tipo?: string
  lote_id?: string
  urgencia?: string
  status?: string
  usuario_id?: string
}): Promise<OcorrenciaRecord[]> {
  try {
    const parts: string[] = []
    if (filtros?.tipo && filtros.tipo !== 'todos') {
      parts.push(`tipo = '${filtros.tipo}'`)
    }
    if (filtros?.lote_id && filtros.lote_id !== 'todos') {
      parts.push(`lote_id = '${filtros.lote_id}'`)
    }
    if (filtros?.urgencia && filtros.urgencia !== 'todos') {
      parts.push(`urgencia = '${filtros.urgencia}'`)
    }
    if (filtros?.status && filtros.status !== 'todos') {
      parts.push(`status = '${filtros.status}'`)
    }
    if (filtros?.usuario_id) {
      parts.push(`usuario_id = '${filtros.usuario_id}'`)
    }

    const filter = parts.join(' && ')
    const list = await pb.collection('ocorrencias').getFullList<OcorrenciaRecord>({
      filter,
      // Ordenação: timestamp do servidor desc
      sort: '-data_hora_servidor,-created',
    })
    return list
  } catch (err) {
    console.warn('Erro ao buscar ocorrencias:', err)
    return []
  }
}

/**
 * Criação da ocorrência com Idempotência (uuid_dispositivo), Trilha de Auditoria,
 * Disparo de Notificações in-app (se requer_acao_hoje) e Atualização de Lotes/Rebanho.
 */
export async function criarOcorrencia(input: CriarOcorrenciaInput): Promise<OcorrenciaRecord> {
  const uuid = input.uuid_dispositivo || crypto.randomUUID()
  const horaDispositivo = input.data_hora_dispositivo || new Date().toISOString()
  const horaServidor = new Date().toISOString()

  // 1. Idempotência: verificar se já existe com esse uuid_dispositivo
  try {
    const existente = await pb
      .collection('ocorrencias')
      .getFirstListItem<OcorrenciaRecord>(`uuid_dispositivo = '${uuid}'`)
    if (existente) {
      return existente
    }
  } catch {
    /* Não existe, segue a criação */
  }

  // Fogo sempre requer ação hoje
  const urgenciaEfetiva = input.tipo === 'fogo' ? 'requer_acao_hoje' : input.urgencia

  const payload: any = {
    uuid_dispositivo: uuid,
    tipo: input.tipo,
    data_hora_dispositivo: horaDispositivo,
    data_hora_servidor: horaServidor,
    usuario_id: input.usuario_id,
    usuario_nome: input.usuario_nome || '',
    perfil: input.perfil,
    lote_id: input.lote_id || null,
    lote_nome: input.lote_nome || '',
    pasto_id: input.pasto_id || '',
    animal_id: input.animal_id || '',
    campos_especificos: input.campos_especificos || {},
    geolocalizacao: input.geolocalizacao || null,
    urgencia: urgenciaEfetiva,
    status: input.status || 'registrada',
    sincronizado: true,
  }

  let created: OcorrenciaRecord
  if (input.fotoFile) {
    const formData = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        formData.append(k, JSON.stringify(v))
      } else {
        formData.append(k, String(v ?? ''))
      }
    })
    formData.append('foto', input.fotoFile)
    created = await pb.collection('ocorrencias').create<OcorrenciaRecord>(formData)
  } else {
    created = await pb.collection('ocorrencias').create<OcorrenciaRecord>(payload)
  }

  // 2. Gravar no audit_log (APPEND-ONLY)
  await registrarAuditLog({
    evento_id: crypto.randomUUID(),
    tipo_evento: 'criacao',
    usuario_id: input.usuario_id,
    usuario_nome: input.usuario_nome,
    perfil: input.perfil,
    payload_antes: null,
    payload_depois: created,
    timestamp_dispositivo: horaDispositivo,
    origem: input.origemOffline ? 'offline' : 'online',
    dispositivo_id: getDispositivoId(),
    geolocalizacao: input.geolocalizacao,
    referencia_tipo: 'ocorrencia',
    referencia_id: created.id,
    lote_id: input.lote_id,
    pasto_id: input.pasto_id,
    motivo: 'Registro de ocorrência no campo',
  })

  // 3. Efeitos colaterais automáticos:
  // - MORTE: atualiza contagem do lote e alimenta movimentacoes_rebanho (tipo morte)
  if (input.tipo === 'morte_animal' && input.lote_id) {
    try {
      const lote = await getLot(input.lote_id)
      if (lote) {
        const novoHeadcount = Math.max(0, (lote.headcount || 1) - 1)
        await updateLot(input.lote_id, { headcount: novoHeadcount })
        await registrarMovimentacaoRebanho({
          data: horaServidor,
          frente: (lote.frente as any) || 'engorda',
          lote_id: lote.id,
          tipo: 'morte',
          qtd_cabecas: 1,
          documento: `OB-MORTE-${created.id.slice(-6)}`,
          observacoes: `Morte registrada em campo: ${input.campos_especificos?.possivel_causa || 'Não especificada'}. Brinco: ${input.campos_especificos?.brinco || input.animal_id || 'S/N'}.`,
        })
      }
    } catch (err) {
      console.warn('Erro ao atualizar lote por morte:', err)
    }
  }

  // - NASCIMENTO: alimenta movimentacoes_rebanho (tipo nascimento) e incrementa lote se houver
  if (input.tipo === 'nascimento') {
    try {
      if (input.lote_id) {
        const lote = await getLot(input.lote_id)
        if (lote) {
          await updateLot(input.lote_id, { headcount: (lote.headcount || 0) + 1 })
          await registrarMovimentacaoRebanho({
            data: horaServidor,
            frente: (lote.frente as any) || 'cria',
            lote_id: lote.id,
            tipo: 'nascimento',
            qtd_cabecas: 1,
            sexo: input.campos_especificos?.sexo_bezerro === 'Fêmea' ? 'femea' : 'macho',
            documento: `NASC-${created.id.slice(-6)}`,
            observacoes: `Nascimento registrado em campo. Matriz: ${input.campos_especificos?.matriz_identificacao || 'S/N'}. Condição: ${input.campos_especificos?.condicao_nascimento || 'Normal'}.`,
          })
        }
      }
    } catch (err) {
      console.warn('Erro ao registrar nascimento no rebanho:', err)
    }
  }

  // - MUDANÇA DE LOTE DE PASTO: atualiza localização (pasto_atual) do lote
  if (
    input.tipo === 'mudanca_lote_pasto' &&
    input.lote_id &&
    input.campos_especificos?.pasto_entrada
  ) {
    try {
      await updateLot(input.lote_id, {
        pasto_atual: input.campos_especificos.pasto_entrada,
      })
    } catch (err) {
      console.warn('Erro ao atualizar pasto do lote:', err)
    }
  }

  // 4. Notificação in-app para o gestor se urgência "requer_acao_hoje" ou tipo "fogo"
  if (urgenciaEfetiva === 'requer_acao_hoje') {
    try {
      const tituloNotif =
        input.tipo === 'fogo'
          ? '🔥 ALERTA CRÍTICO: INCÊNDIO EM CAMPO'
          : '⚠️ Ocorrência Requer Ação Hoje'
      const msg =
        input.tipo === 'fogo'
          ? `Incêndio reportado por ${input.usuario_nome || 'Operador'}! Área: ${input.campos_especificos?.area_afetada_descricao || ''}. Pastos: ${input.campos_especificos?.pastos_ameacados || ''}.`
          : `Ocorrência (${input.tipo}) registrada por ${input.usuario_nome || 'Equipe'}: "${input.campos_especificos?.descricao || input.campos_especificos?.item_manutencao || 'Ver detalhes'}".`

      await criarNotificacaoSistema({
        titulo: tituloNotif,
        mensagem: msg,
        tipo: 'geral',
        severidade: input.tipo === 'fogo' ? 'critica' : 'alta',
        lido: false,
        destinatario_role: 'gestor',
        link_destino: '/campo',
        referencia_id: created.id,
      })
    } catch (err) {
      console.warn('Erro ao criar notificação de ocorrência:', err)
    }
  }

  return created
}

// -------------------------------------------------------------
// CORREÇÃO (NUNCA É EDIÇÃO: novo evento encadeado que referencia o original)
// -------------------------------------------------------------

export async function corrigirOcorrencia(params: {
  ocorrenciaOriginalId: string
  camposAtualizados: Record<string, any>
  usuario_id: string
  usuario_nome: string
  perfil: string
  motivo_correcao: string
}): Promise<OcorrenciaRecord> {
  const original = await pb
    .collection('ocorrencias')
    .getOne<OcorrenciaRecord>(params.ocorrenciaOriginalId)

  // Mesclar campos específicos
  const camposNovos = {
    ...(original.campos_especificos || {}),
    ...params.camposAtualizados,
  }

  // Gera o evento de correção no audit_log
  const eventoCorrecaoId = crypto.randomUUID()

  // Atualiza o registro vigente com ponteiro do evento de correção
  const atualizado = await pb
    .collection('ocorrencias')
    .update<OcorrenciaRecord>(params.ocorrenciaOriginalId, {
      campos_especificos: camposNovos,
      evento_correcao_id: eventoCorrecaoId,
      updated: new Date().toISOString(),
    })

  // Registra no audit_log a alteração antes/depois mantendo o original intacto
  await registrarAuditLog({
    evento_id: eventoCorrecaoId,
    tipo_evento: 'correcao',
    usuario_id: params.usuario_id,
    usuario_nome: params.usuario_nome,
    perfil: params.perfil,
    payload_antes: original,
    payload_depois: atualizado,
    timestamp_dispositivo: new Date().toISOString(),
    origem: 'online',
    dispositivo_id: getDispositivoId(),
    referencia_tipo: 'ocorrencia',
    referencia_id: original.id,
    lote_id: original.lote_id,
    pasto_id: original.pasto_id,
    motivo: params.motivo_correcao || 'Correção de valor operacional',
  })

  return atualizado
}

// -------------------------------------------------------------
// RESOLVER OCORRÊNCIA (Apenas Capataz ou Gestor; autor não pode resolver urgente se for o próprio)
// -------------------------------------------------------------

export async function resolverOcorrencia(params: {
  id: string
  usuario_id: string
  usuario_nome: string
  perfil: string
  observacao?: string
}): Promise<OcorrenciaRecord> {
  const original = await pb.collection('ocorrencias').getOne<OcorrenciaRecord>(params.id)

  // Validação: ocorrência urgente não pode ser resolvida pelo próprio autor
  if (
    original.urgencia === 'requer_acao_hoje' &&
    original.usuario_id === params.usuario_id &&
    params.perfil !== 'gestor' &&
    params.perfil !== 'proprietario'
  ) {
    throw new Error(
      'Ocorrência urgente não pode ser resolvida pelo próprio autor. Apenas Capataz ou Gestor.',
    )
  }

  const agora = new Date().toISOString()
  const atualizado = await pb.collection('ocorrencias').update<OcorrenciaRecord>(params.id, {
    status: 'resolvida',
    resolvido_em: agora,
    resolvido_por: params.usuario_nome,
    resolucao_observacao: params.observacao || 'Marcada como resolvida',
  })

  await registrarAuditLog({
    evento_id: crypto.randomUUID(),
    tipo_evento: 'mudanca_status',
    usuario_id: params.usuario_id,
    usuario_nome: params.usuario_nome,
    perfil: params.perfil,
    payload_antes: { status: original.status },
    payload_depois: { status: 'resolvida', resolucao: params.observacao },
    timestamp_dispositivo: agora,
    origem: 'online',
    dispositivo_id: getDispositivoId(),
    referencia_tipo: 'ocorrencia',
    referencia_id: original.id,
    motivo: params.observacao || 'Resolução de ocorrência',
  })

  return atualizado
}

// -------------------------------------------------------------
// CANCELAMENTO LÓGICO COM MOTIVO OBRIGATÓRIO (NADA É APAGADO)
// -------------------------------------------------------------

export async function cancelarOcorrencia(params: {
  id: string
  usuario_id: string
  usuario_nome: string
  perfil: string
  motivo_cancelamento: string
}): Promise<OcorrenciaRecord> {
  if (!params.motivo_cancelamento || params.motivo_cancelamento.trim().length < 5) {
    throw new Error('Motivo de cancelamento obrigatório (mínimo 5 caracteres).')
  }

  const original = await pb.collection('ocorrencias').getOne<OcorrenciaRecord>(params.id)
  const agora = new Date().toISOString()

  const atualizado = await pb.collection('ocorrencias').update<OcorrenciaRecord>(params.id, {
    status: 'cancelada',
    cancelado_em: agora,
    cancelado_por: params.usuario_nome,
    motivo_cancelamento: params.motivo_cancelamento.trim(),
  })

  await registrarAuditLog({
    evento_id: crypto.randomUUID(),
    tipo_evento: 'cancelamento',
    usuario_id: params.usuario_id,
    usuario_nome: params.usuario_nome,
    perfil: params.perfil,
    payload_antes: original,
    payload_depois: atualizado,
    timestamp_dispositivo: agora,
    origem: 'online',
    dispositivo_id: getDispositivoId(),
    referencia_tipo: 'ocorrencia',
    referencia_id: original.id,
    motivo: params.motivo_cancelamento,
  })

  return atualizado
}
