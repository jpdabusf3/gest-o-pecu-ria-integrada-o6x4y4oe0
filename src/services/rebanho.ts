import pb from '@/lib/pocketbase/client'
import { getDispositivoId, registrarAuditLog } from '@/services/auditoria'

// =============================================================
// Módulo de Atualização Manual do Rebanho — serviço de dados real
// PocketBase (Skip Cloud). Nenhum dado fictício.
// =============================================================

export type CategoriaRebanho =
  | 'bezerro'
  | 'garrote'
  | 'novilho'
  | 'boi'
  | 'novilha'
  | 'vaca'
  | 'touro'

export type SexoRebanho = 'macho' | 'femea'
export type FaseRebanho = 'cria' | 'recria' | 'engorda' | 'confinamento'
export type StatusRebanho = 'ativo' | 'transferido' | 'vendido' | 'morto' | 'inativo'

/** Faixa plausível de peso vivo (kg) por categoria — ALERTA, não bloqueio */
export const FAIXA_PESO_CATEGORIA: Record<CategoriaRebanho, [number, number]> = {
  bezerro: [120, 250],
  garrote: [180, 330],
  novilho: [250, 400],
  boi: [400, 600],
  novilha: [180, 350],
  vaca: [350, 550],
  touro: [600, 1000],
}

export const CATEGORIAS_LABEL: Record<CategoriaRebanho, string> = {
  bezerro: 'Bezerro(a)',
  garrote: 'Garrote',
  novilho: 'Novilho',
  boi: 'Boi',
  novilha: 'Novilha',
  vaca: 'Vaca (Matriz)',
  touro: 'Touro',
}

export const STATUS_LABEL: Record<StatusRebanho, string> = {
  ativo: 'Ativo',
  transferido: 'Transferido',
  vendido: 'Vendido',
  morto: 'Morto',
  inativo: 'Inativo',
}

export const FASE_LABEL: Record<FaseRebanho, string> = {
  cria: 'Cria',
  recria: 'Recria',
  engorda: 'Engorda',
  confinamento: 'Confinamento',
}

// -------------------------------------------------------------
// TIPOS DAS COLEÇÕES
// -------------------------------------------------------------

export interface PastoRebanhoRecord {
  id: string
  nome: string
  fazenda?: string
  area_ha: number
  capacidade_ua_ha: number
  observacoes?: string
  criado_por?: string
  created: string
  updated: string
}

export interface LoteRebanhoRecord {
  id: string
  name: string
  category: string
  sex: 'macho' | 'femea'
  headcount: number
  peso_medio_atual?: number
  pasto_atual_id?: string
  pasto_atual?: string
  data_entrada?: string
  fase_atual?: 'cria' | 'recria' | 'engorda' | 'tip_rip' | 'confinamento'
  status: 'active' | 'sold' | 'abated' | 'inativo'
  created: string
  updated: string
}

export interface AnimalIndividualRecord {
  id: string
  brinco: string
  categoria: CategoriaRebanho
  sexo: SexoRebanho
  peso_kg: number
  ecc?: number
  data_entrada?: string
  observacoes?: string
  status: StatusRebanho
  pasto_atual_id?: string
  lote_id?: string
  registrado_por?: string
  registrado_por_id?: string
  created: string
  updated: string
}

export interface MovimentacaoPastoRecord {
  id: string
  lote_id?: string
  lote_nome?: string
  animal_id?: string
  qtd_cabecas: number
  pasto_origem_id?: string
  pasto_destino_id?: string
  pasto_origem_nome?: string
  pasto_destino_nome?: string
  data: string
  responsavel_id?: string
  responsavel_nome?: string
  motivo?: string
  created: string
  updated: string
}

// -------------------------------------------------------------
// FATOS DE DOMÍNIO (memória do projeto)
// -------------------------------------------------------------
export const KG_POR_ARROBA_VIVA = 30
export const KG_POR_ARROBA_CARCACA = 15

// -------------------------------------------------------------
// CONSULTAS
// -------------------------------------------------------------

export async function getPastosRebanho(): Promise<PastoRebanhoRecord[]> {
  try {
    return await pb.collection('pastos_rebanho').getFullList<PastoRebanhoRecord>({
      sort: 'nome',
    })
  } catch (e) {
    console.warn('Erro ao carregar pastos_rebanho:', e)
    return []
  }
}

export async function criarPastoRebanho(data: {
  nome: string
  area_ha: number
  capacidade_ua_ha: number
  fazenda?: string
  observacoes?: string
  criado_por?: string
}): Promise<PastoRebanhoRecord> {
  const nomeTrim = data.nome?.trim()
  if (!nomeTrim) {
    throw new Error('O nome do pasto é obrigatório.')
  }
  const area = Number(data.area_ha)
  if (!Number.isFinite(area) || area < 0.1) {
    throw new Error('A área deve ser de pelo menos 0,1 ha.')
  }
  const cap = Number(data.capacidade_ua_ha)
  if (!Number.isFinite(cap) || cap < 0.1) {
    throw new Error('A capacidade de suporte deve ser de pelo menos 0,1 UA/ha.')
  }
  if (cap > 20) {
    throw new Error('A capacidade de suporte não pode exceder 20 UA/ha.')
  }

  const payload: Record<string, unknown> = {
    nome: nomeTrim,
    area_ha: area,
    capacidade_ua_ha: cap,
  }
  if (data.fazenda?.trim()) payload.fazenda = data.fazenda.trim()
  if (data.observacoes?.trim()) payload.observacoes = data.observacoes.trim()
  if (data.criado_por?.trim()) payload.criado_por = data.criado_por.trim()

  return await pb.collection('pastos_rebanho').create<PastoRebanhoRecord>(payload)
}

export async function excluirPastoRebanho(id: string): Promise<boolean> {
  return await pb.collection('pastos_rebanho').delete(id)
}

export async function atualizarPastoRebanho(
  id: string,
  data: Partial<{
    nome: string
    area_ha: number
    capacidade_ua_ha: number
    fazenda: string
    observacoes: string
  }>,
): Promise<PastoRebanhoRecord> {
  const payload: Record<string, unknown> = {}
  if (data.nome !== undefined) payload.nome = data.nome.trim()
  if (data.area_ha !== undefined) payload.area_ha = Number(data.area_ha)
  if (data.capacidade_ua_ha !== undefined) payload.capacidade_ua_ha = Number(data.capacidade_ua_ha)
  if (data.fazenda !== undefined) payload.fazenda = data.fazenda.trim()
  if (data.observacoes !== undefined) payload.observacoes = data.observacoes.trim()

  return await pb.collection('pastos_rebanho').update<PastoRebanhoRecord>(id, payload)
}

export async function getLotesRebanho(): Promise<LoteRebanhoRecord[]> {
  try {
    // Carrega TODOS os lotes (inclusive inativos): o filtro de status da tela
    // é quem decide o que aparece — inativos saem da contagem, mas ficam no histórico.
    return await pb.collection('lots').getFullList<LoteRebanhoRecord>({
      sort: '-created',
    })
  } catch (e) {
    console.warn('Erro ao carregar lotes do rebanho:', e)
    return []
  }
}

export async function getAnimaisIndividuais(): Promise<AnimalIndividualRecord[]> {
  try {
    return await pb.collection('animais_individuais').getFullList<AnimalIndividualRecord>({
      sort: 'brinco',
    })
  } catch (e) {
    console.warn('Erro ao carregar animais_individuais:', e)
    return []
  }
}

export async function getMovimentacoesPasto(): Promise<MovimentacaoPastoRecord[]> {
  try {
    return await pb.collection('movimentacoes_pasto').getFullList<MovimentacaoPastoRecord>({
      sort: '-data',
    })
  } catch (e) {
    console.warn('Erro ao carregar movimentacoes_pasto:', e)
    return []
  }
}

// -------------------------------------------------------------
// CRIAÇÃO / EDIÇÃO
// -------------------------------------------------------------

export async function criarLoteRebanho(data: {
  name: string
  categoria: CategoriaRebanho
  sexo: SexoRebanho
  qtd_cabecas: number
  peso_medio_kg: number
  pasto_atual_id: string
  pasto_atual: string
  data_entrada: string
  fase: FaseRebanho
  registrado_por: string
  registrado_por_id: string
}): Promise<LoteRebanhoRecord> {
  return await pb.collection('lots').create<LoteRebanhoRecord>({
    name: data.name,
    sector:
      data.fase === 'confinamento' || data.fase === 'engorda'
        ? 'engorda'
        : (data.fase as 'cria' | 'recria' | 'engorda'),
    sex: data.sexo,
    category: CATEGORIAS_LABEL[data.categoria],
    initial_weight: data.peso_medio_kg,
    final_weight: 0,
    entry_date: data.data_entrada,
    exit_date: '',
    value_per_animal: 0,
    status: 'active',
    headcount: data.qtd_cabecas,
    peso_entrada_medio: data.peso_medio_kg,
    peso_medio_atual: data.peso_medio_kg,
    data_entrada: data.data_entrada,
    pasto_atual: data.pasto_atual,
    pasto_atual_id: data.pasto_atual_id,
    fase_atual: data.fase,
    frente: data.fase === 'confinamento' ? 'engorda' : data.fase,
    is_arrendamento: false,
    gmd_alvo_g_dia: 0,
  })
}

export async function atualizarLoteRebanho(
  id: string,
  data: {
    name?: string
    headcount?: number
    peso_medio_kg?: number
    pasto_atual_id?: string
    pasto_atual?: string
    fase?: FaseRebanho
  },
): Promise<LoteRebanhoRecord> {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.headcount !== undefined) payload.headcount = data.headcount
  if (data.peso_medio_kg !== undefined) {
    payload.peso_medio_atual = data.peso_medio_kg
    payload.peso_entrada_medio = data.peso_medio_kg
  }
  if (data.pasto_atual_id !== undefined) payload.pasto_atual_id = data.pasto_atual_id
  if (data.pasto_atual !== undefined) payload.pasto_atual = data.pasto_atual
  if (data.fase !== undefined) payload.fase_atual = data.fase
  return await pb.collection('lots').update<LoteRebanhoRecord>(id, payload)
}

export async function criarAnimalIndividual(data: {
  brinco: string
  categoria: CategoriaRebanho
  sexo: SexoRebanho
  peso_kg: number
  ecc?: number
  data_entrada: string
  observacoes?: string
  pasto_atual_id: string
  registrado_por: string
  registrado_por_id: string
}): Promise<AnimalIndividualRecord> {
  return await pb.collection('animais_individuais').create<AnimalIndividualRecord>({
    brinco: data.brinco.trim(),
    categoria: data.categoria,
    sexo: data.sexo,
    peso_kg: data.peso_kg,
    ecc: data.ecc,
    data_entrada: data.data_entrada,
    observacoes: data.observacoes || '',
    status: 'ativo',
    pasto_atual_id: data.pasto_atual_id,
    registrado_por: data.registrado_por,
    registrado_por_id: data.registrado_por_id,
  })
}

export async function atualizarAnimalIndividual(
  id: string,
  data: {
    peso_kg?: number
    ecc?: number
    observacoes?: string
    pasto_atual_id?: string
  },
): Promise<AnimalIndividualRecord> {
  return await pb.collection('animais_individuais').update<AnimalIndividualRecord>(id, data)
}

export async function mudarStatusAnimalIndividual(
  id: string,
  novoStatus: StatusRebanho,
): Promise<AnimalIndividualRecord> {
  return await pb.collection('animais_individuais').update<AnimalIndividualRecord>(id, {
    status: novoStatus,
  })
}

export async function mudarStatusLote(
  id: string,
  novoStatus: 'active' | 'sold' | 'abated' | 'inativo',
): Promise<LoteRebanhoRecord> {
  return await pb.collection('lots').update<LoteRebanhoRecord>(id, { status: novoStatus })
}

// -------------------------------------------------------------
// TRANSFERÊNCIA DE PASTO (único caminho para mudar de pasto)
// -------------------------------------------------------------

export async function transferirParaPasto(params: {
  tipo: 'lote' | 'animal'
  registroId: string
  nomeRegistro: string
  qtdCabecas: number
  pastoOrigemId: string
  pastoOrigemNome: string
  pastoDestinoId: string
  pastoDestinoNome: string
  data: string
  motivo?: string
  usuarioId: string
  usuarioNome: string
  perfil: string
}): Promise<void> {
  // 1. Atualiza a localização do registro (exatamente um pasto)
  if (params.tipo === 'lote') {
    await pb.collection('lots').update(params.registroId, {
      pasto_atual_id: params.pastoDestinoId,
      pasto_atual: params.pastoDestinoNome,
    })
  } else {
    await pb.collection('animais_individuais').update(params.registroId, {
      pasto_atual_id: params.pastoDestinoId,
    })
  }

  // 2. Registra a movimentação (append-only)
  await pb.collection('movimentacoes_pasto').create({
    lote_id: params.tipo === 'lote' ? params.registroId : undefined,
    lote_nome: params.tipo === 'lote' ? params.nomeRegistro : undefined,
    animal_id: params.tipo === 'animal' ? params.registroId : undefined,
    qtd_cabecas: params.qtdCabecas,
    pasto_origem_id: params.pastoOrigemId,
    pasto_destino_id: params.pastoDestinoId,
    pasto_origem_nome: params.pastoOrigemNome,
    pasto_destino_nome: params.pastoDestinoNome,
    data: params.data,
    responsavel_id: params.usuarioId,
    responsavel_nome: params.usuarioNome,
    motivo: params.motivo || '',
  })

  // 3. Trilha de auditoria append-only (mudanca_status)
  try {
    await registrarAuditLog({
      tipo_evento: 'mudanca_status',
      usuario_id: params.usuarioId,
      usuario_nome: params.usuarioNome,
      perfil: params.perfil,
      payload_antes: { pasto_atual_id: params.pastoOrigemId },
      payload_depois: { pasto_atual_id: params.pastoDestinoId },
      referencia_tipo: params.tipo === 'lote' ? 'lote' : 'animal',
      referencia_id: params.registroId,
      pasto_id: params.pastoDestinoId,
      motivo: `Transferência de pasto: ${params.pastoOrigemNome} → ${params.pastoDestinoNome}`,
    })
  } catch (e) {
    console.warn('Falha ao registrar auditoria da transferência:', e)
  }
}

// -------------------------------------------------------------
// TRILHA DE AUDITORIA (append-only) — cadastro e correção
// -------------------------------------------------------------

export interface UsuarioAudit {
  id: string
  nome: string
  perfil: string
}

/** Snapshot do usuário logado para gravar nos eventos (padrão Modo Campo) */
export function usuarioAuditAtual(): UsuarioAudit {
  const auth = pb.authStore.record as { id?: string; name?: string; role?: string } | undefined
  return {
    id: auth?.id || 'anonimo',
    nome: auth?.name || 'Usuário',
    perfil: auth?.role || 'gestor',
  }
}

export async function auditarRebanho(params: {
  tipo_evento: 'criacao' | 'correcao' | 'mudanca_status'
  payload_antes?: Record<string, unknown>
  payload_depois: Record<string, unknown>
  referencia_tipo: 'lote' | 'animal'
  referencia_id: string
  pasto_id?: string
  motivo?: string
}): Promise<void> {
  try {
    const u = usuarioAuditAtual()
    await registrarAuditLog({
      tipo_evento: params.tipo_evento,
      usuario_id: u.id,
      usuario_nome: u.nome,
      perfil: u.perfil,
      payload_antes: params.payload_antes,
      payload_depois: params.payload_depois,
      referencia_tipo: params.referencia_tipo,
      referencia_id: params.referencia_id,
      pasto_id: params.pasto_id || '',
      motivo: params.motivo || '',
      dispositivo_id: getDispositivoId(),
    })
  } catch (e) {
    console.warn('Falha ao gravar audit_log do rebanho:', e)
  }
}

// -------------------------------------------------------------
// CONSISTÊNCIA: contagens por pasto / fazenda
// -------------------------------------------------------------

export interface ContagemPorPasto {
  pastoId: string
  nome: string
  areaHa: number
  capacidadeUaHa: number
  cabecasAtivas: number
  lotacaoUaHa: number
  capacidadeUaTotal: number
  pctOcupacao: number
  acimaCapacidade: boolean
  lotes: LoteRebanhoRecord[]
  animais: AnimalIndividualRecord[]
}

export interface ConsistenciaRebanho {
  porPasto: ContagemPorPasto[]
  totalFazenda: number
  totalEsperado: number
  faltam: number
  excedem: number
  pctProgresso: number
}

export function calcularConsistencia(
  pastos: PastoRebanhoRecord[],
  lotes: LoteRebanhoRecord[],
  animais: AnimalIndividualRecord[],
  totalEsperado: number,
): ConsistenciaRebanho {
  const porPasto: ContagemPorPasto[] = pastos.map((p) => {
    const lotesDoPasto = lotes.filter((l) => l.pasto_atual_id === p.id && l.status === 'active')
    const animaisDoPasto = animais.filter((a) => a.pasto_atual_id === p.id && a.status === 'ativo')
    const cabLotes = lotesDoPasto.reduce((acc, l) => acc + (l.headcount || 0), 0)
    const cabecas = cabLotes + animaisDoPasto.length
    const capacidadeUaTotal = p.area_ha * p.capacidade_ua_ha
    const lotacaoUaHa = p.area_ha > 0 ? cabecas / p.area_ha : 0
    return {
      pastoId: p.id,
      nome: p.nome,
      areaHa: p.area_ha,
      capacidadeUaHa: p.capacidade_ua_ha,
      cabecasAtivas: cabecas,
      lotacaoUaHa,
      capacidadeUaTotal,
      pctOcupacao: capacidadeUaTotal > 0 ? (lotacaoUaHa / p.capacidade_ua_ha) * 100 : 0,
      acimaCapacidade: lotacaoUaHa > p.capacidade_ua_ha,
      lotes: lotesDoPasto,
      animais: animaisDoPasto,
    }
  })

  const totalFazenda = porPasto.reduce((acc, p) => acc + p.cabecasAtivas, 0)
  const faltam = totalEsperado > 0 ? Math.max(0, totalEsperado - totalFazenda) : 0
  const excedem = totalEsperado > 0 ? Math.max(0, totalFazenda - totalEsperado) : 0
  const pctProgresso = totalEsperado > 0 ? (totalFazenda / totalEsperado) * 100 : 0

  return { porPasto, totalFazenda, totalEsperado, faltam, excedem, pctProgresso }
}

/** Resumo consolidado para o painel: por categoria e por sexo */
export function resumoRebanho(
  lotes: LoteRebanhoRecord[],
  animais: AnimalIndividualRecord[],
): { porCategoria: Record<string, number>; porSexo: { machos: number; femeas: number } } {
  const porCategoria: Record<string, number> = {}
  const porSexo = { machos: 0, femeas: 0 }

  lotes
    .filter((l) => l.status === 'active')
    .forEach((l) => {
      // o lote carrega a categoria legível gravada no cadastro
      porCategoria[l.category || 'Outros'] =
        (porCategoria[l.category || 'Outros'] || 0) + (l.headcount || 0)
      if (l.sex === 'macho') porSexo.machos += l.headcount || 0
      else porSexo.femeas += l.headcount || 0
    })

  animais
    .filter((a) => a.status === 'ativo')
    .forEach((a) => {
      const label = CATEGORIAS_LABEL[a.categoria] || a.categoria
      porCategoria[label] = (porCategoria[label] || 0) + 1
      if (a.sexo === 'macho') porSexo.machos += 1
      else porSexo.femeas += 1
    })

  return { porCategoria, porSexo }
}

/** Verifica duplicidade de brinco no sistema (bloqueio de cadastro) */
export function isBrincoDuplicado(
  brinco: string,
  animais: AnimalIndividualRecord[],
  ignorarId?: string,
): boolean {
  const normalizado = brinco.trim().toLowerCase()
  return animais.some((a) => a.brinco.trim().toLowerCase() === normalizado && a.id !== ignorarId)
}
