import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Eye,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { AlertaTrajetoriaItem } from '@/services/alertaTrajetoria'

interface BannerAlertaTrajetoriaProps {
  alertas: AlertaTrajetoriaItem[]
  onReconhecer: (alerta: AlertaTrajetoriaItem) => Promise<void> | void
  className?: string
}

export const BannerAlertaTrajetoria: React.FC<BannerAlertaTrajetoriaProps> = ({
  alertas,
  onReconhecer,
  className = '',
}) => {
  const [alertaSelecionado, setAlertaSelecionado] = useState<AlertaTrajetoriaItem | null>(null)
  const [loadingReconhecer, setLoadingReconhecer] = useState(false)

  if (!alertas || alertas.length === 0) return null

  const handleConfirmarReconhecimento = async () => {
    if (!alertaSelecionado) return
    setLoadingReconhecer(true)
    try {
      await onReconhecer(alertaSelecionado)
      setAlertaSelecionado(null)
    } finally {
      setLoadingReconhecer(false)
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {alertas.map((alerta) => {
        const isVermelho = alerta.faixaAtual === 'vermelho'
        return (
          <div
            key={alerta.id}
            className={`rounded-lg border p-3.5 transition-all ${
              alerta.reconhecido
                ? 'bg-muted/40 border-muted text-muted-foreground'
                : isVermelho
                  ? 'bg-red-50/80 dark:bg-red-950/25 border-red-300 dark:border-red-900 text-red-950 dark:text-red-100'
                  : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-900 text-amber-950 dark:text-amber-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-1.5 rounded-md mt-0.5 ${
                    alerta.reconhecido
                      ? 'bg-muted text-muted-foreground'
                      : isVermelho
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs tracking-wide uppercase">
                      Alerta de Trajetória: Queda de Faixa
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium border-current ${
                        alerta.reconhecido ? 'opacity-70' : ''
                      }`}
                    >
                      {alerta.labelIndicador}
                    </Badge>
                    {alerta.reconhecido && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-muted/60 text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 inline text-green-600" />
                        Reconhecido por {alerta.reconhecidoPor || 'Gestor'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium">
                    Projeção atual em{' '}
                    <span className="font-bold underline decoration-dotted">
                      {alerta.labelFaixaAtual}
                    </span>{' '}
                    vs. <span className="font-bold">{alerta.labelFaixaAnterior}</span> na safra
                    anterior ({alerta.safraAnterior}).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alerta.indicador === 'produtividade'
                      ? `Projetado: ${alerta.valorProjetadoSafraAtual.toFixed(1)} @/ha/ano (Safra anterior: ${alerta.valorSafraAnterior.toFixed(1)} @/ha/ano · Variação: ${alerta.variacaoValor > 0 ? '+' : ''}${alerta.variacaoValor.toFixed(1)} @/ha ou ${alerta.variacaoPercentual.toFixed(1)}%)`
                      : `Projetado: R$ ${alerta.valorProjetadoSafraAtual.toFixed(2)}/@ (Safra anterior: R$ ${alerta.valorSafraAnterior.toFixed(2)}/@ · Variação: ${alerta.variacaoValor > 0 ? '+' : ''}R$ ${alerta.variacaoValor.toFixed(2)}/@)`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setAlertaSelecionado(alerta)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Detalhes
                </Button>
                {!alerta.reconhecido && (
                  <Button
                    size="sm"
                    variant={isVermelho ? 'destructive' : 'default'}
                    className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700"
                    onClick={() => {
                      setAlertaSelecionado(alerta)
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Reconhecer
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Modal de Detalhes e Reconhecimento */}
      <Dialog
        open={Boolean(alertaSelecionado)}
        onOpenChange={(open) => !open && setAlertaSelecionado(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alerta de Trajetória da Safra
            </DialogTitle>
            <DialogDescription className="text-xs">
              Comparativo automático da safra em andamento vs. fechamento da safra anterior.
            </DialogDescription>
          </DialogHeader>

          {alertaSelecionado && (
            <div className="space-y-4 py-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 border">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Indicador Analisado</span>
                  <span className="font-semibold text-foreground">
                    {alertaSelecionado.labelIndicador}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Safras Comparadas</span>
                  <span className="font-semibold text-foreground">
                    {alertaSelecionado.safraAnterior} (Anterior) ➜ {alertaSelecionado.safraAtual}{' '}
                    (Atual)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg border bg-background space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase">
                    Safra Anterior ({alertaSelecionado.safraAnterior})
                  </span>
                  <div className="text-lg font-bold">
                    {alertaSelecionado.indicador === 'produtividade'
                      ? `${alertaSelecionado.valorSafraAnterior.toFixed(1)} @/ha/ano`
                      : `R$ ${alertaSelecionado.valorSafraAnterior.toFixed(2)}/@`}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alertaSelecionado.labelFaixaAnterior}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg border bg-background space-y-1 border-amber-300 dark:border-amber-800">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase">
                    Projeção Atual ({alertaSelecionado.safraAtual})
                  </span>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {alertaSelecionado.indicador === 'produtividade'
                      ? `${alertaSelecionado.valorProjetadoSafraAtual.toFixed(1)} @/ha/ano`
                      : `R$ ${alertaSelecionado.valorProjetadoSafraAtual.toFixed(2)}/@`}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-500 text-amber-600 dark:text-amber-400"
                  >
                    {alertaSelecionado.labelFaixaAtual}
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-card space-y-1.5 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-blue-500" />
                  Racional da Trajetória:
                </div>
                <p>
                  As faixas de referência são calibradas dinamicamente na tela de Configurações de
                  Benchmarking. Quando a projeção recua de faixa, recomenda-se revisar o ritmo de
                  ganho de peso (GMD) por frente, taxa de lotação nos pastos e giro das categorias
                  de terminação.
                </p>
                {alertaSelecionado.reconhecido && alertaSelecionado.reconhecidoEm && (
                  <p className="text-green-600 dark:text-green-400 pt-1 font-medium">
                    ✓ Alerta já reconhecido em{' '}
                    {new Date(alertaSelecionado.reconhecidoEm).toLocaleString('pt-BR')} por{' '}
                    {alertaSelecionado.reconhecidoPor}.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAlertaSelecionado(null)}>
              Fechar
            </Button>
            {alertaSelecionado && !alertaSelecionado.reconhecido && (
              <Button
                onClick={handleConfirmarReconhecimento}
                disabled={loadingReconhecer}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loadingReconhecer ? 'Gravando...' : 'Reconhecer Alerta'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
