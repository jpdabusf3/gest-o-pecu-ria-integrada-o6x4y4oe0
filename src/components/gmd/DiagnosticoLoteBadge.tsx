import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sparkles,
  AlertOctagon,
  Wheat,
  Utensils,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
} from 'lucide-react'
import {
  DiagnosticoLoteResult,
  HipoteseDiagnostico,
  CategoriaDiagnostico,
} from '@/services/diagnosticoLote'

interface DiagnosticoLoteBadgeProps {
  diagnostico: DiagnosticoLoteResult
  onAdotarCausa?: (causa: string, contramedida: string) => void
  compact?: boolean
  className?: string
}

const ICONS_CATEGORIA: Record<CategoriaDiagnostico, React.ReactNode> = {
  nutricao: <Utensils className="h-3.5 w-3.5 text-amber-500" />,
  forragem: <Wheat className="h-3.5 w-3.5 text-emerald-500" />,
  sanidade: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />,
}

const BADGE_COLORS: Record<CategoriaDiagnostico, string> = {
  nutricao:
    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  forragem:
    'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
  sanidade:
    'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800',
}

export const DiagnosticoLoteBadge: React.FC<DiagnosticoLoteBadgeProps> = ({
  diagnostico,
  onAdotarCausa,
  compact = false,
  className = '',
}) => {
  const [modalAberto, setModalAberto] = useState(false)

  const categoria = diagnostico.causaProvavel
  const icon = ICONS_CATEGORIA[categoria]
  const colorClass = BADGE_COLORS[categoria]

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all hover:shadow-sm hover:brightness-95 cursor-pointer ${colorClass}`}
          title="Clique para ver o diagnóstico automático da causa provável"
        >
          <Sparkles className="h-3 w-3 animate-pulse text-indigo-500 shrink-0" />
          <span className="font-semibold capitalize">Causa provável:</span>
          <span className="flex items-center gap-1">
            {icon}
            <span className="capitalize">{categoria}</span>
          </span>
          <ChevronRight className="h-3 w-3 opacity-60 ml-0.5" />
        </button>
      </div>

      {/* Modal detalhado do Diagnóstico por Lote */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Diagnóstico Automático: {diagnostico.loteNome}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Análise baseada em pesagens, manejo, estoque de insumos e ocorrências sanitárias.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Resumo do Lote */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/40 rounded-lg border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Fase / Frente
                </span>
                <span className="font-medium">
                  {diagnostico.fase} ({diagnostico.frente})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  GMD Alvo
                </span>
                <span className="font-medium">{diagnostico.gmdAlvoKgDia.toFixed(3)} kg/dia</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  GMD Real
                </span>
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {diagnostico.gmdRealKgDia.toFixed(3)} kg/dia
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Desvio
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {diagnostico.desvioPct.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Causa Mais Provável em Destaque */}
            <div className={`p-3.5 rounded-lg border ${colorClass} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Causa Mais Provável Identificada
                </span>
                <Badge variant="outline" className="text-xs font-semibold uppercase border-current">
                  {diagnostico.tituloCausaProvavel}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed font-medium">{diagnostico.racional}</p>
            </div>

            {/* Racional e Hipóteses Ordenadas */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Hipóteses Avaliadas (Ordem de Probabilidade)
              </span>

              {diagnostico.hipoteses.map((hip, idx) => {
                const isPrimeira = idx === 0
                return (
                  <div
                    key={hip.categoria}
                    className={`rounded-lg border p-3 space-y-2 text-xs transition-all ${
                      isPrimeira ? 'border-primary/50 bg-primary/5' : 'bg-background border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ICONS_CATEGORIA[hip.categoria]}
                        <span className="font-semibold text-foreground text-xs">{hip.titulo}</span>
                        {isPrimeira && (
                          <Badge
                            variant="default"
                            className="text-[9px] h-4 py-0 px-1 bg-indigo-600"
                          >
                            Principal
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-muted-foreground text-[11px]">
                        Probabilidade: {hip.probabilidade}%
                      </span>
                    </div>

                    {/* Evidências no sistema */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Evidências encontradas no sistema:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {hip.evidencias.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    {/* O que verificar em campo */}
                    <div className="space-y-1 pt-1 border-t">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />O que inspecionar em campo:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {hip.oQueVerificar.map((verif, i) => (
                          <li key={i}>{verif}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Ação rápida para adotar essa hipótese */}
                    {onAdotarCausa && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={isPrimeira ? 'default' : 'outline'}
                          className="h-7 text-[11px] gap-1"
                          onClick={() => {
                            onAdotarCausa(hip.sugestaoCausa, hip.sugestaoContramedida)
                            setModalAberto(false)
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Adotar esta causa e contramedida
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setModalAberto(false)}>
              Fechar
            </Button>
            {onAdotarCausa && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={() => {
                  onAdotarCausa(
                    diagnostico.sugestaoCausaPreenchimento,
                    diagnostico.sugestaoContramedidaPreenchimento,
                  )
                  setModalAberto(false)
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Adotar Causa Provável Sugerida
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
