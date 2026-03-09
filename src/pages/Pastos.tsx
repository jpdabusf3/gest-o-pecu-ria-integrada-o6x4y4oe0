import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pasturesData, rotationalSchedule } from '@/data/mock'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Map as MapIcon, RotateCw, Beef } from 'lucide-react'
import { ManagementTab } from '@/components/pastures/ManagementTab'
import { EfficiencyTab } from '@/components/pastures/EfficiencyTab'
import { cn } from '@/lib/utils'

export default function Pastos() {
  const { toast } = useToast()
  const [selectedPaddock, setSelectedPaddock] = useState<number | null>(null)

  const handleSync = () => {
    const alerts = pasturesData.filter(
      (p) => p.alturaAtual < p.alturaSaidaAlvo || p.alturaAtual > p.alturaEntradaAlvo,
    )
    toast({
      title: 'Sincronização Concluída',
      description: `Dados de campo atualizados. ${alerts.length > 0 ? `Atenção: ${alerts.length} pasto(s) com desvio de altura.` : ''}`,
      variant: alerts.length > 0 ? 'destructive' : 'default',
    })
  }

  const activePaddockData = selectedPaddock
    ? pasturesData.find((p) => p.id === selectedPaddock)
    : null

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Pastos</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de áreas, capacidade de suporte e rotacionamento.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" onClick={handleSync} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sincronizar
          </Button>
          <NotificationPreferences />
        </div>
      </div>

      <Tabs defaultValue="mapa" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto overflow-x-auto justify-start h-auto py-1.5 px-1 flex flex-wrap sm:flex-nowrap">
          <TabsTrigger value="mapa" className="gap-2 py-2">
            <MapIcon className="h-4 w-4" /> Mapa Interativo
          </TabsTrigger>
          <TabsTrigger value="inventario" className="py-2">
            Inventário e Métricas
          </TabsTrigger>
          <TabsTrigger value="manejo" className="py-2">
            Manejo e Intervenções
          </TabsTrigger>
          <TabsTrigger value="eficiencia" className="py-2 text-primary font-medium">
            Eficiência de Pasto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapa" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Mapa de Piquetes</CardTitle>
                <CardDescription>
                  Selecione uma área para visualizar a lotação (UA/ha) e planejar a rotação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 sm:p-6 rounded-xl border aspect-[4/3] sm:aspect-[16/9] relative overflow-hidden flex flex-col justify-between">
                  {/* Decorative background grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 h-full">
                    {pasturesData.map((pasto) => {
                      const isStockingAlert = pasto.lotacaoExecutada > pasto.lotacaoProjetada * 1.1
                      const statusColor =
                        pasto.status === 'Vedado'
                          ? 'bg-slate-200 border-slate-300 text-slate-500'
                          : pasto.status === 'Alerta'
                            ? 'bg-orange-100 border-orange-300 text-orange-800'
                            : 'bg-green-100 border-green-300 text-green-800'

                      return (
                        <div
                          key={pasto.id}
                          onClick={() => setSelectedPaddock(pasto.id)}
                          className={cn(
                            'rounded-lg border-2 p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm',
                            statusColor,
                            selectedPaddock === pasto.id ? 'ring-2 ring-primary ring-offset-2' : '',
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm sm:text-base leading-tight">
                              {pasto.nome}
                            </span>
                            <Badge variant="outline" className="bg-white/50 text-[10px] px-1.5">
                              {pasto.area}ha
                            </Badge>
                          </div>

                          <div className="mt-4 space-y-1">
                            {pasto.ocupanteAtual ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/40 px-2 py-1 rounded-md w-fit">
                                <Beef className="h-3.5 w-3.5" /> {pasto.ocupanteAtual}
                              </div>
                            ) : (
                              <div className="text-xs font-medium bg-white/40 px-2 py-1 rounded-md w-fit text-muted-foreground">
                                Vazio ({pasto.daysOfRest} dias)
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                Lotação
                              </span>
                              <span
                                className={cn(
                                  'text-sm font-mono font-bold',
                                  isStockingAlert ? 'text-destructive' : '',
                                )}
                              >
                                {pasto.lotacaoExecutada.toFixed(1)} UA/ha
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {activePaddockData ? (
                <Card className="animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex justify-between items-center">
                      Detalhes da Área
                      <Badge>{activePaddockData.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-bold text-xl">{activePaddockData.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {activePaddockData.cultivar} • {activePaddockData.area} hectares
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-xs">Lotação Atual</span>
                        <span className="font-mono font-bold">
                          {activePaddockData.lotacaoExecutada} UA/ha
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Lotação Alvo</span>
                        <span className="font-mono">
                          {activePaddockData.lotacaoProjetada} UA/ha
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Altura Atual</span>
                        <span className="font-mono font-bold">
                          {activePaddockData.alturaAtual} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Meta Saída</span>
                        <span className="font-mono">{activePaddockData.alturaSaidaAlvo} cm</span>
                      </div>
                    </div>

                    <Button className="w-full gap-2">Registrar Altura de Entrada/Saída</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30 border-dashed border-2 flex items-center justify-center h-[250px]">
                  <p className="text-muted-foreground text-sm text-center px-6">
                    Selecione um piquete no mapa para visualizar os detalhes operacionais.
                  </p>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCw className="h-5 w-5 text-primary" />
                    Cronograma de Rotação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rotationalSchedule.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="border-l-2 border-primary pl-4 py-1 relative"
                      >
                        <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-primary" />
                        <h5 className="font-semibold text-sm">{schedule.pastoNome}</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Próx. Lote:{' '}
                          <span className="font-medium text-foreground">{schedule.nextLot}</span> em{' '}
                          {schedule.entryDate}
                        </p>
                        <div className="mt-2 flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            Descanso
                          </span>
                          <span
                            className={cn(
                              'text-xs font-bold',
                              schedule.currentRest >= schedule.requiredRest
                                ? 'text-green-600'
                                : 'text-amber-600',
                            )}
                          >
                            {schedule.currentRest} / {schedule.requiredRest} dias
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Inventário de Áreas de Pastagem</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / Cultivar</TableHead>
                      <TableHead className="text-right">Área (ha)</TableHead>
                      <TableHead className="text-center">Altura (Alvo vs Atual)</TableHead>
                      <TableHead className="text-center">Lotação (Proj vs Exec)</TableHead>
                      <TableHead className="text-center">Peso Médio (Hist vs Atual)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pasturesData.map((pasto) => {
                      const isHeightAlert =
                        pasto.alturaAtual < pasto.alturaSaidaAlvo ||
                        pasto.alturaAtual > pasto.alturaEntradaAlvo
                      const isStockingAlert = pasto.lotacaoExecutada > pasto.lotacaoProjetada * 1.1

                      return (
                        <TableRow key={pasto.id}>
                          <TableCell>
                            <div className="font-medium">{pasto.nome}</div>
                            <div className="text-xs text-muted-foreground">{pasto.cultivar}</div>
                          </TableCell>
                          <TableCell className="text-right">{pasto.area.toFixed(1)}</TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Meta: {pasto.alturaSaidaAlvo}-{pasto.alturaEntradaAlvo}cm
                              </span>
                              <Badge
                                variant={isHeightAlert ? 'destructive' : 'outline'}
                                className="font-mono"
                              >
                                {pasto.alturaAtual} cm
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Proj: {pasto.lotacaoProjetada.toFixed(1)} UA/ha
                              </span>
                              <Badge
                                variant={isStockingAlert ? 'destructive' : 'secondary'}
                                className="font-mono"
                              >
                                Exec: {pasto.lotacaoExecutada.toFixed(1)} UA/ha
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {pasto.pesoMedioAtual > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  Histórico: {pasto.pesoMedioHistorico} kg
                                </span>
                                <span
                                  className={`text-sm font-medium ${pasto.pesoMedioAtual < pasto.pesoMedioHistorico ? 'text-destructive' : 'text-primary'}`}
                                >
                                  Atual: {pasto.pesoMedioAtual} kg
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                pasto.status === 'Bom' || pasto.status === 'Excelente'
                                  ? 'default'
                                  : pasto.status === 'Vedado'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="w-20 justify-center"
                            >
                              {pasto.status}
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

        <TabsContent value="manejo" className="space-y-6 mt-0">
          <ManagementTab />
        </TabsContent>

        <TabsContent value="eficiencia" className="space-y-6 mt-0">
          <EfficiencyTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
