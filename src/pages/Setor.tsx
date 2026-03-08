import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { sectorData } from '@/data/mock'
import { Beef, Activity, DollarSign, LineChart } from 'lucide-react'
import { LotPerformanceDrawer } from '@/components/LotPerformanceDrawer'
import { ReproductionTab } from '@/components/sector/ReproductionTab'
import { SectorCalendarTab } from '@/components/sector/SectorCalendarTab'
import { SectorPastureTab } from '@/components/sector/SectorPastureTab'

export default function Setor() {
  const { id } = useParams<{ id: string }>()
  const [selectedLote, setSelectedLote] = useState<string | null>(null)

  const data = sectorData[id as keyof typeof sectorData]
  if (!data) return <Navigate to="/" replace />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{data.title}</h2>
        <p className="text-muted-foreground mt-1">{data.description}</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto bg-transparent border-b rounded-none p-0 h-auto gap-4">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Visão Geral & Lotes
          </TabsTrigger>
          <TabsTrigger
            value="pastures"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Pastagens & Nutrição
          </TabsTrigger>
          {id === 'cria' && (
            <TabsTrigger
              value="reproduction"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
            >
              Previsão de Partos
            </TabsTrigger>
          )}
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
          >
            Calendário Operacional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-primary">Total Cabeças</CardTitle>
                <Beef className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{data.kpis.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {data.kpis.labelIndicador}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.indicadorPrincipal}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Custo Mensal (Cab)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.custoCabeca}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Composição de Lotes</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote ID</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status Sanitário</TableHead>
                      <TableHead className="text-right">Desempenho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lotes.map((lote) => (
                      <TableRow
                        key={lote.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedLote(lote.id)}
                      >
                        <TableCell className="font-medium text-primary">{lote.id}</TableCell>
                        <TableCell>{lote.categoria}</TableCell>
                        <TableCell className="text-right">{lote.cabecas}</TableCell>
                        <TableCell>{lote.pasto}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lote.status === 'Saudável'
                                ? 'default'
                                : lote.status === 'Pronto p/ Abate'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {lote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pastures" className="mt-4">
          <SectorPastureTab sectorId={id || ''} />
        </TabsContent>

        {id === 'cria' && (
          <TabsContent value="reproduction" className="mt-4">
            <ReproductionTab />
          </TabsContent>
        )}

        <TabsContent value="calendar" className="mt-4">
          <SectorCalendarTab sectorId={id || ''} />
        </TabsContent>
      </Tabs>

      <LotPerformanceDrawer
        loteId={selectedLote}
        open={!!selectedLote}
        onOpenChange={(open) => !open && setSelectedLote(null)}
      />
    </div>
  )
}
