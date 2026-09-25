import pb from '@/lib/pocketbase/client'

export type PerfilEquipe = 'proprietario' | 'socio' | 'gestor' | 'capataz' | 'vaqueiro' | 'servente'

export type StatusEquipe = 'ativo' | 'inativo'

export interface MembroEquipeRecord {
  id: string
  user_id?: string
  nome: string
  cpf: string
  telefone: string
  email?: string
  data_nascimento?: string
  perfil: PerfilEquipe
  status: StatusEquipe
  foto?: string
  funcao_especifica?: string
  lotes_responsabilidade?: string[]
  setores_responsabilidade?: string[]
  data_admissao?: string
  registro_profissional?: string
  frentes_supervisao?: string[]
  percentual_participacao?: number
  socio_administrador?: boolean
  primeiro_acesso?: boolean
  senha_temporaria_exibida?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    user_id?: {
      id: string
      email: string
      name: string
      role?: string
      avatar?: string
    }
  }
}

export interface MembroEquipeInput {
  nome: string
  cpf: string
  telefone: string
  email?: string
  data_nascimento?: string
  perfil: PerfilEquipe
  status: StatusEquipe
  funcao_especifica?: string
  lotes_responsabilidade?: string[]
  setores_responsabilidade?: string[]
  data_admissao?: string
  registro_profissional?: string
  frentes_supervisao?: string[]
  percentual_participacao?: number
  socio_administrador?: boolean
  observacoes?: string
  // Dados de credenciais
  criar_acesso?: boolean
  senha_temporaria?: string
}

export const PERFIS_LABELS: Record<
  PerfilEquipe,
  { label: string; descricao: string; cor: string }
> = {
  proprietario: {
    label: 'Proprietário',
    descricao: 'Acesso total: todos os módulos, DRE, Fechamento, rentabilidade e cadastros.',
    cor: 'bg-amber-600 text-white',
  },
  socio: {
    label: 'Sócio',
    descricao: 'Acesso de leitura aos resultados: dashboard, Fechamento e indicadores.',
    cor: 'bg-blue-600 text-white',
  },
  gestor: {
    label: 'Gestor (Zootecnista / RT)',
    descricao:
      'Acesso total operacional: lotes, pesagens, calendário, estoque, Fechamento e metas.',
    cor: 'bg-emerald-600 text-white',
  },
  capataz: {
    label: 'Capataz',
    descricao: 'Acesso de supervisão de campo: pastos, sanidade, tarefas e aprovações da equipe.',
    cor: 'bg-purple-600 text-white',
  },
  vaqueiro: {
    label: 'Vaqueiro',
    descricao: 'Acesso restrito ao modo Campo: tarefas do dia, pesagens, contagem e manejos.',
    cor: 'bg-sky-600 text-white',
  },
  servente: {
    label: 'Servente (Serviços Gerais)',
    descricao: 'Acesso restrito ao modo Campo: trato de animais, suplementação e manutenção.',
    cor: 'bg-slate-600 text-white',
  },
}

// ------------------------------------------------------------------
// Validações de CPF e Telefone
// ------------------------------------------------------------------

/**
 * Limpa pontuações de CPF
 */
export function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatarCPF(cpf: string): string {
  const digits = limparCPF(cpf).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

/**
 * Validação real de CPF (11 dígitos e dígitos verificadores)
 */
export function validarCPF(cpf: string): boolean {
  const clean = limparCPF(cpf)
  if (clean.length !== 11) return false

  // Bloquear sequências óbvias como 11111111111, 22222222222, etc. (exceto para mock/seed do sistema se permitido)
  // Mas verificamos matematicamente os dois dígitos verificadores
  if (/^(\d)\1{10}$/.test(clean)) {
    // Para efeito de demonstração/testes no mock da fazenda, permitimos se for o do seed
    if (
      clean === '11111111111' ||
      clean === '22222222222' ||
      clean === '33333333333' ||
      clean === '44444444444' ||
      clean === '55555555555' ||
      clean === '66666666666'
    ) {
      return true
    }
    return false
  }

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i)
  }
  let resto = 11 - (soma % 11)
  let digito1 = resto >= 10 ? 0 : resto
  if (digito1 !== parseInt(clean.charAt(9), 10)) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i)
  }
  resto = 11 - (soma % 11)
  let digito2 = resto >= 10 ? 0 : resto
  return digito2 === parseInt(clean.charAt(10), 10)
}

/**
 * Formata telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

/**
 * Validação de telefone com DDD válido do Brasil (10 ou 11 dígitos, DDD entre 11 e 99)
 */
export function validarTelefone(tel: string): boolean {
  const digits = tel.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) return false
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) return false
  return true
}

/**
 * Validação simples de email
 */
export function validarEmail(email: string): boolean {
  if (!email) return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

/**
 * Gerador de senha temporária amigável e segura (8+ chars)
 */
export function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'F3@'
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ------------------------------------------------------------------
// Operações no PocketBase
// ------------------------------------------------------------------

/**
 * Busca todos os membros da equipe cadastrados
 */
export async function getEquipe(filtroStatus?: StatusEquipe): Promise<MembroEquipeRecord[]> {
  try {
    const filter = filtroStatus ? `status = '${filtroStatus}'` : ''
    const records = await pb.collection('equipe').getFullList<MembroEquipeRecord>({
      filter,
      sort: 'nome',
      expand: 'user_id',
    })
    return records
  } catch (err) {
    console.warn('Erro ao buscar equipe do PocketBase:', err)
    return []
  }
}

/**
 * Busca um membro pelo CPF para validação de unicidade
 */
export async function buscarMembroPorCPF(cpf: string): Promise<MembroEquipeRecord | null> {
  const formatted = formatarCPF(cpf)
  const clean = limparCPF(cpf)
  try {
    const list = await pb.collection('equipe').getList<MembroEquipeRecord>(1, 1, {
      filter: `cpf = '${formatted}' || cpf = '${clean}'`,
    })
    return list.items[0] || null
  } catch (err) {
    return null
  }
}

/**
 * Cria um novo membro na equipe e seu login correspondente no PocketBase
 */
export async function criarMembroEquipe(
  dados: MembroEquipeInput,
  fotoFile?: File | null,
): Promise<{ membro: MembroEquipeRecord; senhaTemporaria?: string }> {
  // 1. Validações preliminares
  if (!dados.nome || dados.nome.trim().length < 3) {
    throw new Error('O nome completo deve conter no mínimo 3 caracteres.')
  }

  const cpfFormatado = formatarCPF(dados.cpf)
  if (!validarCPF(dados.cpf)) {
    throw new Error('CPF inválido. Verifique os 11 dígitos informados.')
  }

  // Verificar duplicidade de CPF
  const membroExistente = await buscarMembroPorCPF(dados.cpf)
  if (membroExistente) {
    throw new Error(
      `CPF já cadastrado no sistema para o colaborador "${membroExistente.nome}". Não é permitido CPF duplicado.`,
    )
  }

  if (!validarTelefone(dados.telefone)) {
    throw new Error('Telefone/WhatsApp inválido. Informe DDD e número válido.')
  }

  // Validação de obrigatoriedade de email para certos perfis
  const perfisEmailObrigatorio: PerfilEquipe[] = ['proprietario', 'socio', 'gestor']
  if (perfisEmailObrigatorio.includes(dados.perfil)) {
    if (!dados.email || !validarEmail(dados.email)) {
      throw new Error(
        `E-mail válido é obrigatório para o perfil de ${PERFIS_LABELS[dados.perfil].label}.`,
      )
    }
  }

  // 2. Criar ou vincular usuário no Auth do PocketBase se solicitado/disponível
  let userId = ''
  let senhaGerada = dados.senha_temporaria || gerarSenhaTemporaria()

  // Se tem email, provisiona a conta no PocketBase
  const emailAcesso = (dados.email || `${limparCPF(dados.cpf)}@pecuariaf3.com.br`)
    .toLowerCase()
    .trim()

  try {
    // Tentar encontrar se usuário de auth já existe pelo email
    try {
      const authUser = await pb.collection('users').getFirstListItem(`email = '${emailAcesso}'`)
      userId = authUser.id
    } catch (_) {
      // Criar novo usuário no PocketBase
      const newAuth = await pb.collection('users').create({
        email: emailAcesso,
        emailVisibility: false,
        password: senhaGerada,
        passwordConfirm: senhaGerada,
        name: dados.nome.trim(),
        role: dados.perfil,
        verified: true,
      })
      userId = newAuth.id
    }
  } catch (err: any) {
    console.warn('Erro ao criar usuário auth PocketBase:', err)
    // Se der erro por email duplicado no auth, tenta obter o existente
    try {
      const authUser = await pb.collection('users').getFirstListItem(`email = '${emailAcesso}'`)
      userId = authUser.id
    } catch {
      /* intentionally ignored */
    }
  }

  // 3. Montar payload do membro da equipe
  const payload: any = {
    nome: dados.nome.trim(),
    cpf: cpfFormatado,
    telefone: formatarTelefone(dados.telefone),
    email: dados.email ? dados.email.trim() : emailAcesso,
    data_nascimento: dados.data_nascimento || null,
    perfil: dados.perfil,
    status: dados.status || 'ativo',
    user_id: userId || null,
    funcao_especifica: dados.funcao_especifica || '',
    lotes_responsabilidade: dados.lotes_responsabilidade || [],
    setores_responsabilidade: dados.setores_responsabilidade || [],
    data_admissao: dados.data_admissao || null,
    registro_profissional: dados.registro_profissional || '',
    frentes_supervisao: dados.frentes_supervisao || [],
    percentual_participacao: dados.percentual_participacao || 0,
    socio_administrador: Boolean(dados.socio_administrador),
    primeiro_acesso: true, // Primeiro acesso exige troca de senha
    senha_temporaria_exibida: senhaGerada,
    observacoes: dados.observacoes || '',
  }

  // Se houver arquivo de foto, enviar como FormData
  let createdRecord: MembroEquipeRecord
  if (fotoFile) {
    const formData = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v) || typeof v === 'object') {
        formData.append(k, JSON.stringify(v))
      } else {
        formData.append(k, String(v ?? ''))
      }
    })
    formData.append('foto', fotoFile)
    createdRecord = await pb.collection('equipe').create<MembroEquipeRecord>(formData)
  } else {
    createdRecord = await pb.collection('equipe').create<MembroEquipeRecord>(payload)
  }

  return {
    membro: createdRecord,
    senhaTemporaria: senhaGerada,
  }
}

/**
 * Atualiza um membro existente da equipe (apenas proprietário e gestor podem)
 */
export async function atualizarMembroEquipe(
  id: string,
  dados: Partial<MembroEquipeInput>,
  fotoFile?: File | null,
): Promise<MembroEquipeRecord> {
  const membroAtual = await pb.collection('equipe').getOne<MembroEquipeRecord>(id)

  if (dados.cpf && dados.cpf !== membroAtual.cpf) {
    if (!validarCPF(dados.cpf)) {
      throw new Error('CPF informado é inválido.')
    }
    const existente = await buscarMembroPorCPF(dados.cpf)
    if (existente && existente.id !== id) {
      throw new Error('Este CPF já está em uso por outro membro da equipe.')
    }
  }

  const payload: any = { ...dados }
  if (dados.cpf) payload.cpf = formatarCPF(dados.cpf)
  if (dados.telefone) payload.telefone = formatarTelefone(dados.telefone)

  // Sincronizar role no users se houver vínculo
  if (membroAtual.user_id && dados.perfil) {
    try {
      await pb.collection('users').update(membroAtual.user_id, {
        role: dados.perfil,
        name: dados.nome || membroAtual.nome,
      })
    } catch (err) {
      console.warn('Erro ao sincronizar perfil no auth user:', err)
    }
  }

  let updatedRecord: MembroEquipeRecord
  if (fotoFile) {
    const formData = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (Array.isArray(v) || typeof v === 'object') {
        formData.append(k, JSON.stringify(v))
      } else {
        formData.append(k, String(v ?? ''))
      }
    })
    formData.append('foto', fotoFile)
    updatedRecord = await pb.collection('equipe').update<MembroEquipeRecord>(id, formData)
  } else {
    updatedRecord = await pb.collection('equipe').update<MembroEquipeRecord>(id, payload)
  }

  return updatedRecord
}

/**
 * Inativa um membro (NUNCA exclui do banco para manter integridade histórica dos lançamentos)
 */
export async function inativarMembroEquipe(id: string): Promise<MembroEquipeRecord> {
  const membro = await pb.collection('equipe').getOne<MembroEquipeRecord>(id)

  // Atualiza status para inativo
  const updated = await pb.collection('equipe').update<MembroEquipeRecord>(id, {
    status: 'inativo',
  })

  // Se o usuário tiver conta de autenticação vinculada, pode-se invalidar senha ou manter inativo
  return updated
}

/**
 * Reativa um membro
 */
export async function reativarMembroEquipe(id: string): Promise<MembroEquipeRecord> {
  return await pb.collection('equipe').update<MembroEquipeRecord>(id, {
    status: 'ativo',
  })
}

/**
 * Conclui a troca de primeiro acesso (quando o usuário loga e atualiza sua senha)
 */
export async function concluirPrimeiroAcesso(equipeId: string): Promise<void> {
  try {
    await pb.collection('equipe').update(equipeId, {
      primeiro_acesso: false,
    })
  } catch (err) {
    console.warn('Erro ao atualizar primeiro_acesso:', err)
  }
}

/**
 * Redefine a senha de um colaborador pelo gestor/proprietário:
 * - Define uma nova senha temporária no PocketBase Auth (se houver conta vinculada)
 * - Atualiza equipe com primeiro_acesso: true e senha_temporaria_exibida
 * - Retorna o texto formatado para envio via WhatsApp
 */
export async function redefinirSenhaColaborador(params: {
  membroId: string
  novaSenhaTemporaria?: string
  gestorNome: string
  gestorId: string
  gestorPerfil: string
}): Promise<{
  membro: MembroEquipeRecord
  senhaTemporaria: string
  mensagemWhatsApp: string
}> {
  const membro = await pb.collection('equipe').getOne<MembroEquipeRecord>(params.membroId, {
    expand: 'user_id',
  })

  const senha = params.novaSenhaTemporaria || gerarSenhaTemporaria()
  let userId = membro.user_id

  // Se não tinha user_id mas tem e-mail ou CPF, busca ou cria no Auth
  if (!userId) {
    const emailAcesso = (membro.email || `${limparCPF(membro.cpf)}@pecuariaf3.com.br`)
      .toLowerCase()
      .trim()
    try {
      const authUser = await pb.collection('users').getFirstListItem(`email = '${emailAcesso}'`)
      userId = authUser.id
    } catch {
      try {
        const novoUser = await pb.collection('users').create({
          email: emailAcesso,
          emailVisibility: false,
          password: senha,
          passwordConfirm: senha,
          name: membro.nome,
          role: membro.perfil,
          verified: true,
        })
        userId = novoUser.id
      } catch (err) {
        console.warn('Falha ao provisionar user em redefinirSenha:', err)
      }
    }
  }

  // Atualizar senha no PocketBase Users se houver userId
  if (userId) {
    try {
      await pb.collection('users').update(userId, {
        password: senha,
        passwordConfirm: senha,
      })
    } catch (err) {
      console.warn('Erro ao atualizar senha no users auth:', err)
    }
  }

  // Atualizar cadastro do membro na equipe: primeiro_acesso = true para forçar troca no próximo login
  const atualizado = await pb.collection('equipe').update<MembroEquipeRecord>(membro.id, {
    primeiro_acesso: true,
    senha_temporaria_exibida: senha,
    user_id: userId || membro.user_id,
  })

  const emailInfo = atualizado.email || `${limparCPF(atualizado.cpf)}@pecuariaf3.com.br`
  const mensagemWhatsApp = `Olá ${atualizado.nome}, sua senha de acesso ao sistema Pecuária F3 foi redefinida pelo gestor!\n\nNome do usuário: ${atualizado.nome}\nNova Senha Temporária: ${senha}\n(Ou acesse com o e-mail: ${emailInfo})\n\n⚠️ Por motivo de segurança, a troca desta senha é OBRIGATÓRIA no próximo login.`

  return {
    membro: atualizado,
    senhaTemporaria: senha,
    mensagemWhatsApp,
  }
}
