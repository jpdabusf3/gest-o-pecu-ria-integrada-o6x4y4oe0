import pb from '@/lib/pocketbase/client'

export interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  created: string
  updated: string
  verified?: boolean
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: string
  password?: string
}

/**
 * Atualiza o avatar (foto de perfil) do usuário atual via multipart upload.
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('A imagem deve ter no máximo 5MB.')
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    throw new Error('Formato inválido. Use JPG, PNG, WEBP ou GIF.')
  }

  const formData = new FormData()
  formData.append('avatar', file)

  const updated = await pb.collection('users').update<UserRecord>(userId, formData)
  return updated.avatar ? pb.files.getURL(updated, updated.avatar) : ''
}

/**
 * Remove o avatar do usuário, voltando ao fallback de iniciais.
 */
export async function removeUserAvatar(userId: string): Promise<void> {
  // No PocketBase, passar null/vazio no campo de arquivo remove o arquivo
  const formData = new FormData()
  formData.append('avatar', '')
  await pb.collection('users').update(userId, formData)
}

/**
 * Lista todos os usuários do sistema.
 */
export async function listUsers(): Promise<UserRecord[]> {
  return await pb.collection('users').getFullList<UserRecord>({
    sort: 'name',
  })
}

/**
 * Cria um novo usuário/funcionário com validações de regra de negócio.
 */
export async function createUser(data: CreateUserInput): Promise<UserRecord> {
  if (!data.name || data.name.trim().length < 3) {
    throw new Error('O nome deve ter no mínimo 3 caracteres.')
  }
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Informe um e-mail válido.')
  }
  if (!data.password || data.password.length < 8) {
    throw new Error('A senha inicial deve ter no mínimo 8 caracteres.')
  }

  const record = await pb.collection('users').create<UserRecord>({
    email: data.email.trim().toLowerCase(),
    emailVisibility: false,
    password: data.password,
    passwordConfirm: data.password,
    name: data.name.trim(),
    role: data.role || 'funcionario',
    verified: true,
  })

  return record
}

/**
 * Atualiza dados de um usuário existente (nome, e-mail, papel e/ou redefinição de senha).
 */
export async function updateUser(id: string, data: UpdateUserInput): Promise<UserRecord> {
  const payload: Record<string, any> = {}

  if (data.name !== undefined) {
    if (data.name.trim().length < 3) {
      throw new Error('O nome deve ter no mínimo 3 caracteres.')
    }
    payload.name = data.name.trim()
  }

  if (data.email !== undefined) {
    if (!data.email.includes('@')) {
      throw new Error('Informe um e-mail válido.')
    }
    payload.email = data.email.trim().toLowerCase()
  }

  if (data.role !== undefined) {
    payload.role = data.role
  }

  if (data.password) {
    if (data.password.length < 8) {
      throw new Error('A nova senha deve ter no mínimo 8 caracteres.')
    }
    payload.password = data.password
    payload.passwordConfirm = data.password
  }

  return await pb.collection('users').update<UserRecord>(id, payload)
}

/**
 * Exclui um usuário do sistema com checagem de integridade (não pode excluir a si mesmo).
 */
export async function deleteUser(id: string, currentUserId: string): Promise<void> {
  if (id === currentUserId) {
    throw new Error('Você não pode excluir sua própria conta.')
  }
  await pb.collection('users').delete(id)
}
