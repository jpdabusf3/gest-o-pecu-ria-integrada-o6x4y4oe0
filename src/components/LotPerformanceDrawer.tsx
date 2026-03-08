import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeightGainChart } from './charts/WeightGainChart'
import { DailyWeightChart } from './charts/DailyWeightChart'
import { MapPin, TrendingUp } from 'lucide-react'

export function LotPerformanceDrawer({
  loteId,
  open,
  onOpenChange,
}: {
  loteId: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-[95vw] overflow-y-auto">
        <SheetHeader className="pb-6 border-b">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Desempenho: {loteId}
          </SheetTitle>
          <SheetDescription>
            Acompanhamento de ganho de peso real vs projetado com base no plano nutricional.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-4">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Monitoramento de Nutrição</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A linha pontilhada representa a meta estipulada para a dieta atual. Desvios
                significativos podem indicar problemas na pastagem ou deficiência na suplementação.
              </p>
            </div>
          </div>

          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Evolução Mensal</TabsTrigger>
              <TabsTrigger value="daily">Projeção Diária</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-4 text-sm">Curva de Evolução (Últimos 5 meses)</h3>
              <WeightGainChart loteId={loteId || ''} />
            </TabsContent>
            <TabsContent value="daily" className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-4 text-sm">Acompanhamento Diário (Mês Atual)</h3>
              <DailyWeightChart loteId={loteId || ''} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
