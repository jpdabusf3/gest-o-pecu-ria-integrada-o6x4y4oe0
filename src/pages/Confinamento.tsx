import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { confinementData } from '@/data/mock'
import { Wheat, TrendingUp, Scale } from 'lucide-react'
import { useFarm } from '@/contexts/FarmContext'
import { RegisterFeedModal } from '@/components/forms/RegisterFeedModal'
import { RegisterWeightModal } from '@/components/forms/RegisterWeightModal'
import { LotPerformanceDrawer } from '@/components/LotPerformanceDrawer'

export default function Confinamento() {
  const { lots, getPredictedSlaughterDate, inventory } = useFarm()
  const [selectedLote, setSelectedLote] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Confinamento</h2>
          <p className="text-muted-foreground mt-1">
            Controle de engorda, dietas, e projeção preditiva de abate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegisterWeightModal />
          <RegisterFeedModal />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Confinado</CardTitle>
            <Wheat className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {confinementData.kpis.totalAnimais}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capacidade: {confinementData.kpis.capacidade}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consumo Diário
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confinementData.kpis.consumoRacaoDiario}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Cab/Dia
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {confinementData.kpis.custoDiarioCabeca}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lotes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="lotes">Lotes em Confinamento</TabsTrigger>
          <TabsTrigger value="estoque">Estoque (Insumos)</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Acompanhamento de Lotes & Projeção IA</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote ID</TableHead>
                      <TableHead>Curral/Baia</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">Peso Méd.</TableHead>
                      <TableHead className="text-right">GMD</TableHead>
                      <TableHead className="text-right">Previsão Abate (IA)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lote) => {
                      const predictedDate = getPredictedSlaughterDate(lote.id)
                      const formattedDate = predictedDate
                        ? predictedDate.toLocaleDateString('pt-BR')
                        : 'N/A'
                      const isReady = predictedDate && predictedDate <= new Date()

                      return (
                        <TableRow
                          key={lote.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedLote(lote.id)}
                        >
                          <TableCell className="font-medium text-primary">{lote.id}</TableCell>
                          <TableCell className="text-muted-foreground">{lote.curral}</TableCell>
                          <TableCell className="text-right">{lote.cabecas}</TableCell>
                          <TableCell className="text-right font-medium">
                            {lote.pesoMedio} kg
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {lote.gmd} kg
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isReady
                                  ? 'secondary'
                                  : lote.status === 'Normal'
                                    ? 'default'
                                    : 'destructive'
                              }
                            >
                              {isReady ? 'Pronto p/ Abate' : lote.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Insumos Dedicados (Nutrição)</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Quantidade Atual</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.item}</TableCell>
                        <TableCell className="text-right font-mono">{inv.qtd}</TableCell>
                        <TableCell>{inv.unidade}</TableCell>
                        <TableCell>
                          <Badge variant={inv.qtd <= inv.minQtd ? 'destructive' : 'default'}>
                            {inv.qtd <= inv.minQtd ? 'Abaixo do Mínimo' : 'Normal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LotPerformanceDrawer
        loteId={selectedLote}
        open={!!selectedLote}
        onOpenChange={(o) => !o && setSelectedLote(null)}
      />
    </div>
  )
}
