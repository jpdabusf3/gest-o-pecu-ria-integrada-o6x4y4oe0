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
import { TrendingUp, BrainCircuit } from 'lucide-react'

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
            <TrendingUp className="h-6 w-6 text-primary" /> Desempenho: {loteId}
          </SheetTitle>
          <SheetDescription>
            Análise preditiva e acompanhamento de ganho de peso real vs projetado com base no GMD e
            plano nutricional. Utilize a aba Benchmarking Interno em Relatórios para comparar
            dietas.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-4">
            <BrainCircuit className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-primary">
                Previsão com IA (Modelo Preditivo)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                A linha tracejada representa a curva de crescimento projetando a data ideal de abate
                (alvo: 540kg). Desvios indicam necessidade de ajuste na dieta.
              </p>
            </div>
          </div>

          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Evolução Mensal (IA)</TabsTrigger>
              <TabsTrigger value="daily">Projeção Diária</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-4 text-sm">Curva de Evolução Preditiva</h3>
              {loteId && <WeightGainChart loteId={loteId} />}
            </TabsContent>
            <TabsContent value="daily" className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="font-medium mb-4 text-sm">Acompanhamento Diário</h3>
              {loteId && <DailyWeightChart loteId={loteId} />}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
