import pb from '@/lib/pocketbase/client'

export type TipoNotificacaoSistema =
  | 'gmd_critico'
  | 'atividade_pendente'
  | 'margem_comprimida'
  | 'estoque_baixo'
  | 'meta'
  | 'geral'

export type SeveridadeNotificacao = 'baixa' | 'media' | 'alta' | 'critica'

export interface NotificacaoSistemaRecord {
  id: string
  titulo: string
  mensagem: string
  tipo: TipoNotificacaoSistema
  severidade: SeveridadeNotificacao
  lido: boolean
  link_destino?: string
  referencia_id?: string
  destinatario_role?: string
  created: string
  updated?: string
}

export async function getNotificacoesSistema(
  apenasNaoLidas: boolean = false,
): Promise<NotificacaoSistemaRecord[]> {
  try {
    const filter = apenasNaoLidas ? 'lido = false' : ''
    const records = await pb
      .collection('notificacoes_sistema')
      .getFullList<NotificacaoSistemaRecord>({
        filter,
        sort: '-created',
      })
    return records
  } catch (err) {
    console.warn('Erro ao carregar notificações do sistema:', err)
    return []
  }
}

export async function criarNotificacaoSistema(
  notif: Omit<NotificacaoSistemaRecord, 'id' | 'created' | 'updated'>,
): Promise<NotificacaoSistemaRecord> {
  const created = await pb.collection('notificacoes_sistema').create(notif)
  return created as unknown as NotificacaoSistemaRecord
}

export async function marcarNotificacaoComoLida(id: string): Promise<void> {
  await pb.collection('notificacoes_sistema').update(id, { lido: true })
}

export async function marcarTodasNotificacoesComoLidas(): Promise<void> {
  const naoLidas = await getNotificacoesSistema(true)
  for (const n of naoLidas) {
    await pb.collection('notificacoes_sistema').update(n.id, { lido: true })
  }
}
