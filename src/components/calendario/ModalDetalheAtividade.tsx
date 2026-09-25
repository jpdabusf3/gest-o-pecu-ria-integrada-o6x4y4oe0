import { useState } from 'react'
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
} from 'lucide-react'
import {
  AtividadeRecord,
  tipoLabel,
  tipoCores,
  getStatusLabel,
  getFrenteLabel,
  updateAtividade,
  deleteAtividade,
  isAtividadeVencida,
} from '@/services/atividades'
import { LotRecord } from '@/services/lots'
import { useFarm } from '@/contexts/FarmContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

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
  const { registerConsumption } = useFarm()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  if (!atividade) return null

  const isVencida = isAtividadeVencida(atividade)
  const isConcluida = atividade.status === 'concluida'
  const lotNames = (atividade.lote_ids || [])
    .map((lid) => lots.find((l) => l.id === lid)?.name || lid)
    .join(', ')

  const handleConcluir = async () => {
    try {
      setLoading(true)

      // 1. Deduz estoque para cada insumo vinculado
      if (atividade.insumos && atividade.insumos.length > 0) {
        const targetLote = lotNames || 'GERAL'
        for (const ins of atividade.insumos) {
          if (ins.inventoryId && ins.quantidade > 0) {
            registerConsumption(targetLote, ins.inventoryId, ins.quantidade)
          }
        }
      }

      // 2. Atualiza status no banco real
      await updateAtividade(atividade.id, {
        status: 'concluida',
        concluido_em: new Date().toISOString(),
        concluido_por: user.name,
      } as any)

      toast({
        title: 'Atividade Concluída!',
        description: `Status atualizado no banco real e estoque de insumos deduzido.`,
      })

      onUpdated()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao concluir atividade:', err)
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao concluir atividade.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
      <DialogContent className="max-w-lg">
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
              variant={isConcluida ? 'default' : 'secondary'}
              className={isConcluida ? 'bg-emerald-600 text-white' : ''}
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

          {/* Insumos necessários */}
          {atividade.insumos && atividade.insumos.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                Insumos a Deduzir do Estoque:
              </div>
              <div className="space-y-1.5">
                {atividade.insumos.map((ins, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs bg-muted/40 p-2 rounded border"
                  >
                    <span className="font-medium">{ins.item}</span>
                    <Badge variant="secondary" className="font-mono">
                      {ins.quantidade} {ins.unidade || 'un'}
                    </Badge>
                  </div>
                ))}
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
            {isConcluida && atividade.concluido_por && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Concluído por {atividade.concluido_por}
              </span>
            )}
          </div>
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

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Fechar
            </Button>
            {!isConcluida && (
              <Button
                type="button"
                size="sm"
                onClick={handleConcluir}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? 'Concluindo...' : 'Concluir & Deduzir Estoque'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
