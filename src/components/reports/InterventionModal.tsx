import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Tag, MapPin, Users, Coins, Info, Scale } from 'lucide-react'
import { managementHistory } from '@/data/mock'
import { formatCurrency, formatWeight } from '@/lib/utils'

type HistoryItem = (typeof managementHistory)[0]

interface InterventionModalProps {
  intervention: HistoryItem | null
  onOpenChange: (open: boolean) => void
}

export function InterventionModal({ intervention, onOpenChange }: InterventionModalProps) {
  return (
    <Dialog open={!!intervention} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-6">
        {intervention && (
          <>
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Intervenção: {intervention.tipo}
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className="w-fit text-sm px-3 py-1 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {intervention.data} {intervention.hora ? `às ${intervention.hora}` : ''}
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-base text-foreground whitespace-normal break-words">
                {intervention.descricao}
              </DialogDescription>
            </DialogHeader>

            <Separator />

            <div className="grid gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Alvo Principal
                  </span>
                  <p className="font-semibold text-primary">{intervention.alvo}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Animais Envolvidos
                  </span>
                  <p className="font-medium">{intervention.animaisEnvolvidos || 'N/A'}</p>
                </div>
              </div>

              {intervention.insumosUtilizados && intervention.insumosUtilizados.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Insumos Utilizados:
                  </span>
                  <ul className="list-disc list-inside pl-5 space-y-1">
                    {intervention.insumosUtilizados.map((insumo, idx) => (
                      <li key={idx} className="text-sm">
                        {insumo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(intervention.tipo.toLowerCase() === 'venda' ||
                intervention.tipo.toLowerCase() === 'entrada') && (
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {intervention.pesoEntrada !== undefined && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Scale className="w-3 h-3" /> Peso Ref.
                      </span>
                      <p className="font-semibold">
                        {formatWeight(intervention.pesoEntrada, 'kg')}
                      </p>
                    </div>
                  )}
                  {intervention.valorCabeca !== undefined && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Valor/Cabeça</span>
                      <p className="font-semibold text-emerald-600">
                        {formatCurrency(intervention.valorCabeca)}
                      </p>
                    </div>
                  )}
                  {intervention.valorArroba !== undefined && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Valor/@</span>
                      <p className="font-semibold">{formatCurrency(intervention.valorArroba)}</p>
                    </div>
                  )}
                  {intervention.rendimentoCarcaca !== undefined &&
                    intervention.rendimentoCarcaca !== null && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Rend. Carcaça</span>
                        <p className="font-semibold">{intervention.rendimentoCarcaca}%</p>
                      </div>
                    )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Coins className="w-4 h-4" /> Custo Associado (por cabeça)
                  </span>
                  <p className="font-medium text-destructive">
                    {intervention.custoCabeca !== undefined && intervention.custoCabeca !== null
                      ? formatCurrency(intervention.custoCabeca)
                      : 'Nenhum custo direto associado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Responsável Operacional
                  </span>
                  <p className="font-medium">{intervention.responsavel}</p>
                </div>
              </div>

              {intervention.observacoes && (
                <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2">
                  <span className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Observações Técnicas
                  </span>
                  <p className="text-sm text-blue-900/80 leading-relaxed whitespace-normal break-words">
                    {intervention.observacoes}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
