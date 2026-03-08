import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { BellRing, MessageCircle, Target, Trash2, Pause, Play, AlertTriangle } from 'lucide-react'
import { useMarket, AlertCondition } from '@/contexts/MarketContext'
import { cn } from '@/lib/utils'

export function PriceAlertModal() {
  const [open, setOpen] = useState(false)
  const {
    marketData,
    b3Data,
    replacementData,
    commodityData,
    getPrice,
    alerts,
    addAlert,
    toggleAlert,
    deleteAlert,
  } = useMarket()

  const [indicatorId, setIndicatorId] = useState('boi-gordo-mt')
  const [condition, setCondition] = useState<AlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true)

  const allIndicators = useMemo(() => {
    const list = [
      ...marketData.map((i) => ({ id: i.id, label: i.label, group: 'Mercado Físico' })),
      ...replacementData.map((i) => ({ id: i.id, label: i.label, group: 'Reposição' })),
      ...commodityData.map((i) => ({ id: i.id, label: i.label, group: 'Insumos' })),
    ]
    Object.keys(b3Data).forEach((key) => {
      b3Data[key].forEach((i) => {
        list.push({
          id: i.ticker,
          label: `B3 Futuro - ${i.ticker} (${i.month})`,
          group: 'B3 Futuro',
        })
      })
    })
    return list
  }, [marketData, b3Data, replacementData, commodityData])

  const handleSaveAlert = () => {
    if (!targetPrice) return
    const indicator = allIndicators.find((i) => i.id === indicatorId)
    if (!indicator) return

    addAlert({
      indicatorId,
      indicatorLabel: indicator.label,
      condition,
      targetPrice: parseFloat(targetPrice),
      notifyWhatsApp,
    })
    setTargetPrice('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/50 text-primary hover:bg-primary/10 relative"
        >
          <BellRing className="h-4 w-4" /> Alertas B3/MT
          {alerts.filter((a) => a.active).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-emerald-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {alerts.filter((a) => a.active).length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Painel de Alertas de Mercado
          </DialogTitle>
          <DialogDescription>
            Configure gatilhos automatizados para B3 e praças regionais (MT).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="novo" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="novo">Novo Alerta</TabsTrigger>
            <TabsTrigger value="gerenciar">Meus Alertas ({alerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ativo / Indicador</Label>
              <Select value={indicatorId} onValueChange={setIndicatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ativo" />
                </SelectTrigger>
                <SelectContent>
                  {allIndicators.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.label} (Atual: R$ {getPrice(ind.id)?.toFixed(2) || '---'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Condição</Label>
                <Select value={condition} onValueChange={(v: AlertCondition) => setCondition(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Atingir / Maior que</SelectItem>
                    <SelectItem value="below">Cair / Menor que</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preço Alvo (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.1"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="pl-9"
                    placeholder="Ex: 260.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-full text-white">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    Notificação via WhatsApp
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Receba mensagens instantâneas
                  </p>
                </div>
              </div>
              <Switch checked={notifyWhatsApp} onCheckedChange={setNotifyWhatsApp} />
            </div>

            <Button onClick={handleSaveAlert} disabled={!targetPrice} className="w-full gap-2 mt-2">
              <BellRing className="h-4 w-4" /> Salvar Alerta
            </Button>
          </TabsContent>

          <TabsContent value="gerenciar" className="py-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <AlertTriangle className="h-10 w-10 mb-2 opacity-50" />
                <p>Nenhum alerta configurado.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {alerts.map((alert) => {
                  const currentPrice = getPrice(alert.indicatorId)
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex flex-col gap-2 p-3 border rounded-md transition-opacity',
                        !alert.active && 'opacity-60 bg-muted/50',
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-sm leading-tight">
                            {alert.indicatorLabel}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            Alvo: R$ {alert.targetPrice.toFixed(2)}
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {alert.condition === 'above' ? '≥' : '≤'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleAlert(alert.id, !alert.active)}
                          >
                            {alert.active ? (
                              <Pause className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Play className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t pt-2 mt-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          Atual:{' '}
                          <span className="font-bold text-foreground">
                            R$ {currentPrice?.toFixed(2) || '---'}
                          </span>
                        </span>
                        {alert.notifyWhatsApp && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
