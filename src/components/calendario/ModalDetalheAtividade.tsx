import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Trash2,
  Package,
  Layers,
  Repeat,
  AlertTriangle,
  History,
  RotateCw,
  Hourglass,
  XCircle,
  WifiOff,
} from 'lucide-react'
import {
  AtividadeRecord,
  tipoLabel,
  tipoCores,
  getStatusLabel,
  getFrenteLabel,
  deleteAtividade,
  isAtividadeVencida,
  transicionarStatusAtividade,
  calcularProximoDiaUtil,
  updateAtividade,
  StatusAtividade,
} from '@/services/atividades'
import {
  getHistoricoPorAtividade,
  HistoricoStatusRecord,
  getMotivoLabel,
  MOTIVOS_NAO_REALIZADA_OPTIONS,
} from '@/services/historicoStatus'
import { LotRecord } from '@/services/lots'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useToast } from '@/hooks/use-toast'
import { useFarm } from '@/contexts/FarmContext'

interface ModalDetalheAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividade: AtividadeRecord | null
  lots: LotRecord[]
  onUpdated: () => void
}

export function ModalDetalheAtividade({
  open,
  onOpenChange,
  atividade,
  lots,
  onUpdated,
}: ModalDetalheAtividadeProps) {
  const { user } = useAuth()
  const { isOnline, addAction } = useOffline()
  const { toast } = useToast()
  const { inventory } = useFarm()
  const [loading, setLoading] = useState(false)
  const [historico, setHistorico] = useState<HistoricoStatusRecord[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Estado local para transição com justificativa obrigatória
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('')
  const [detalheMotivo, setDetalheMotivo] = useState<string>('')
  const [erroMotivo, setErroMotivo] = useState<string>('')

  // Carregar histórico da auditoria
  useEffect(() => {
    if (open && atividade) {
      setLoadingHistorico(true)
      getHistoricoPorAtividade(atividade.id)
        .then(setHistorico)
        .catch(() => setHistorico([]))
        .finally(() => setLoadingHistorico(false))
    }
  }, [open, atividade])

  if (!atividade) return null

  const isVencida = isAtividadeVencida(atividade)
  const isRealizada = atividade.status === 'realizada' || atividade.status === 'concluida'
  const lotNames = (atividade.lote_ids || [])
    .map((lid) => lots.find((l) => l.id === lid)?.name || lid)
    .join(', ')

  const handleTransicao = async (
    novoStatus: StatusAtividade,
    motivo?: string,
    detalhes?: string,
  ) => {
    try {
      setLoading(true)
      const timestamp = new Date().toISOString()

      if (isOnline) {
        await transicionarStatusAtividade({
          atividadeId: atividade.id,
          statusNovo: novoStatus,
          statusAnterior: atividade.status,
          usuarioNome: user.name,
          motivo,
          detalhes,
          offline: false,
          timestamp,
        })

        toast({
          title: 'Status Atualizado',
          description: `"${atividade.titulo}" agora está como ${getStatusLabel(novoStatus)} (com carimbo de auditoria).`,
        })
      } else {
        await addAction({
          type: 'UPDATE_ATIVIDADE_STATUS',
          payload: {
            atividadeId: atividade.id,
            statusNovo: novoStatus,
            statusAnterior: atividade.status,
            usuarioNome: user.name,
            motivo,
            detalhes,
            timestamp,
          },
        })

        toast({
          title: 'Salvo Offline',
          description: 'Transição gravada na fila local com carimbo offline. Sincronize depois.',
        })
      }

      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro na transição de status:', err)
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao atualizar status.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarcarNaoRealizada = () => {
    if (!motivoSelecionado) {
      setErroMotivo('Selecione uma justificativa obrigatória antes de salvar.')
      return
    }
    if (motivoSelecionado === 'outro' && !detalheMotivo.trim()) {
      setErroMotivo('Especifique o motivo no campo de texto livre.')
      return
    }
    setErroMotivo('')
    handleTransicao('nao_realizada', motivoSelecionado, detalheMotivo.trim())
  }

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente excluir a atividade "${atividade.titulo}"?`)) return
    try {
      setLoading(true)
      await deleteAtividade(atividade.id)
      toast({
        title: 'Atividade Excluída',
        description: 'Registro removido do banco real.',
      })
      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao excluir.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = new Date(atividade.data).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const formattedTime = new Date(atividade.data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              style={{ backgroundColor: tipoCores[atividade.tipo], color: '#fff' }}
              className="font-medium"
            >
              {tipoLabel(atividade.tipo)}
            </Badge>

            {atividade.is_arrendamento && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">
                Arrendamento de Fêmeas
              </Badge>
            )}

            {isVencida && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" /> Vencida
              </Badge>
            )}

            <Badge
              variant={isRealizada ? 'default' : 'secondary'}
              className={isRealizada ? 'bg-emerald-600 text-white' : ''}
            >
              {getStatusLabel(atividade.status)}
            </Badge>
          </div>

          <DialogTitle className="text-xl font-bold leading-tight">{atividade.titulo}</DialogTitle>
          <DialogDescription>
            {formattedDate} às {formattedTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Informações centrais */}
          <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground">Frente</div>
                <div className="font-semibold">{getFrenteLabel(atividade.frente)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground">Responsável</div>
                <div className="font-semibold">{atividade.responsavel_id}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground">Setor / Local</div>
                <div className="font-semibold">{atividade.setor || 'Não especificado'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground">Recorrência</div>
                <div className="font-semibold capitalize">{atividade.recorrencia}</div>
              </div>
            </div>
          </div>

          {/* Lotes vinculados */}
          {lotNames && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold mb-1">
                Lote(s) Vinculado(s):
              </div>
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                {lotNames}
              </Badge>
            </div>
          )}

          {/* Descrição */}
          {atividade.descricao && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold mb-1">
                Instruções / Detalhes:
              </div>
              <div className="bg-muted/20 p-2.5 rounded-lg border text-foreground/90 whitespace-pre-wrap leading-relaxed text-xs">
                {atividade.descricao}
              </div>
            </div>
          )}

          {/* Insumos necessários e alerta de estoque em tempo real */}
          {atividade.insumos && atividade.insumos.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                Insumos Vinculados (Conferência de Saldo):
              </div>
              <div className="space-y-1.5">
                {atividade.insumos.map((ins, idx) => {
                  const itemReal = inventory.find(
                    (i) => i.id === ins.inventoryId || i.item === ins.item,
                  )
                  const saldoAtual = itemReal?.qtd ?? 0
                  const insuficiente = saldoAtual < ins.quantidade
                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-center text-xs p-2 rounded border ${
                        insuficiente
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
                          : 'bg-muted/40'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{ins.item}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Saldo em estoque: {saldoAtual} {ins.unidade || itemReal?.unidade || 'un'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {insuficiente && (
                          <Badge variant="destructive" className="text-[9px] h-4">
                            Saldo Insuficiente!
                          </Badge>
                        )}
                        <Badge variant="secondary" className="font-mono">
                          {ins.quantidade} {ins.unidade || 'un'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Progresso em andamento */}
          {atividade.progresso_observacoes && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-300 mb-0.5 flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5" /> Progresso Registrado:
              </div>
              {atividade.progresso_observacoes}
            </div>
          )}

          {/* Motivo Não Realizada */}
          {atividade.status === 'nao_realizada' && atividade.motivo_nao_realizada && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg text-xs">
              <div className="font-bold text-rose-700 dark:text-rose-300 mb-0.5 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Justificativa de Não Realização:
              </div>
              <div>
                <strong>{getMotivoLabel(atividade.motivo_nao_realizada)}</strong>
                {atividade.detalhes_motivo && ` — "${atividade.detalhes_motivo}"`}
              </div>
            </div>
          )}

          {/* Custo e conclusão */}
          <div className="flex justify-between items-center text-xs border-t pt-2 text-muted-foreground">
            <span>
              Custo Previsto:{' '}
              <strong className="text-foreground">
                R${' '}
                {(atividade.custo_previsto || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </span>
            {isRealizada && atividade.concluido_por && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Concluído por {atividade.concluido_por}
              </span>
            )}
          </div>

          {/* HISTÓRICO DE AUDITORIA (historico_status) */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Histórico de Status & Auditoria
            </div>

            {loadingHistorico ? (
              <div className="text-[11px] text-muted-foreground italic">
                Carregando histórico...
              </div>
            ) : historico.length === 0 ? (
              <div className="text-[11px] text-muted-foreground border border-dashed rounded-lg p-3 text-center">
                Nenhuma alteração de status registrada ainda.
              </div>
            ) : (
              <div className="space-y-1.5">
                {historico.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-2 text-[11px] bg-muted/30 border rounded-lg p-2"
                  >
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-semibold">{h.usuario_id}</span>
                        <span className="text-muted-foreground"> mudou de </span>
                        <span className="font-mono">{h.status_anterior || '—'}</span>
                        <span className="text-muted-foreground"> para </span>
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[9px] font-bold uppercase"
                        >
                          {h.status_novo}
                        </Badge>
                      </div>
                      {h.motivo && (
                        <div className="text-rose-600 font-medium">
                          Motivo: {getMotivoLabel(h.motivo)}
                          {h.detalhes && ` — "${h.detalhes}"`}
                        </div>
                      )}
                      <div className="text-muted-foreground font-mono">
                        {new Date(h.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    {h.offline && (
                      <Badge
                        variant="outline"
                        className="text-[9px] gap-0.5 border-amber-400 text-amber-700 shrink-0"
                      >
                        <WifiOff className="h-2.5 w-2.5" /> Offline
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO DE AÇÕES RÁPIDAS DE STATUS */}
          {!isRealizada && atividade.status !== 'cancelada' && (
            <div className="space-y-3 border-t pt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Atualizar Status
              </div>

              {/* Transição rápida para realizada / em_andamento */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="min-h-[48px] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 flex-col"
                  disabled={loading}
                  onClick={() => handleTransicao('realizada')}
                >
                  <CheckCircle2 className="h-4 w-4" />✅ Realizado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-[48px] h-12 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold gap-1.5 flex-col"
                  disabled={loading}
                  onClick={() => handleTransicao('em_andamento')}
                >
                  <Hourglass className="h-4 w-4" />⏳ Em Andamento
                </Button>
              </div>

              {/* Justificativa Obrigatória para Não Realizado */}
              <div className="space-y-2 bg-rose-500/5 border border-rose-500/30 p-3 rounded-xl">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Marcar como Não Realizado (Justificativa
                  Obrigatória)
                </div>

                {erroMotivo && (
                  <div className="text-[11px] text-rose-600 font-semibold bg-rose-500/10 p-2 rounded border border-rose-500/30">
                    {erroMotivo}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {MOTIVOS_NAO_REALIZADA_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setMotivoSelecionado(opt.id)
                        setErroMotivo('')
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        motivoSelecionado === opt.id
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-background text-foreground border-border hover:border-rose-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {motivoSelecionado && (
                  <Textarea
                    rows={2}
                    placeholder={
                      motivoSelecionado === 'outro'
                        ? 'Descreva o motivo específico (obrigatório)...'
                        : 'Detalhamento adicional (opcional)...'
                    }
                    value={detalheMotivo}
                    onChange={(e) => setDetalheMotivo(e.target.value)}
                    className="text-xs"
                  />
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full min-h-[44px] border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white font-bold"
                  disabled={loading}
                  onClick={handleMarcarNaoRealizada}
                >
                  Confirmar Não Realizado
                </Button>
              </div>

              {/* Reagendamento (reabertura) para atividades não realizadas */}
              {(atividade.status === 'nao_realizada' || atividade.status === 'reagendada') && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700 font-bold gap-1.5"
                  disabled={loading}
                  onClick={() => {
                    const proximo = calcularProximoDiaUtil(new Date())
                    const iso = `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, '0')}-${String(proximo.getDate()).padStart(2, '0')}T08:00:00.000Z`
                    if (
                      confirm(
                        `Reagendar para ${proximo.toLocaleDateString('pt-BR')} (+1 dia útil)?`,
                      )
                    ) {
                      handleTransicaoReagendar(iso)
                    }
                  }}
                >
                  <RotateCw className="h-4 w-4" /> Reagendar com 1 Toque (+1 Dia Útil)
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  async function handleTransicaoReagendar(isoDate: string) {
    try {
      setLoading(true)
      if (isOnline) {
        // Atualiza data + status em uma única passada
        await transicionarStatusAtividade({
          atividadeId: atividade.id,
          statusNovo: 'reagendada',
          statusAnterior: atividade.status,
          usuarioNome: user.name,
          detalhes: `Reagendado para ${isoDate.split('T')[0]} mantendo histórico do motivo (${getMotivoLabel(atividade.motivo_nao_realizada || '')}).`,
        })
        // Atualiza a data da atividade
        await updateAtividade(atividade.id, { data: isoDate } as any)
      } else {
        await addAction({
          type: 'UPDATE_ATIVIDADE_STATUS',
          payload: {
            atividadeId: atividade.id,
            statusNovo: 'reagendada',
            statusAnterior: atividade.status,
            usuarioNome: user.name,
            detalhes: `Reagendado para ${isoDate.split('T')[0]}.`,
            timestamp: new Date().toISOString(),
          },
        })
      }
      toast({
        title: 'Atividade Reagendada',
        description: `Nova data: ${new Date(isoDate).toLocaleDateString('pt-BR')}. Histórico do motivo preservado.`,
      })
      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao reagendar:', err)
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao reagendar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
}
