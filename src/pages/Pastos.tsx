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
import { pasturesData } from '@/data/mock'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw } from 'lucide-react'
import { ManagementTab } from '@/components/pastures/ManagementTab'

export default function Pastos() {
  const { toast } = useToast()

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Pastos</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de áreas, capacidade de suporte e cultivares.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" onClick={handleSync} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sincronizar
          </Button>
          <NotificationPreferences />
        </div>
      </div>

      <Tabs defaultValue="inventario" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="inventario">Inventário e Métricas</TabsTrigger>
          <TabsTrigger value="manejo">Manejo e Intervenções</TabsTrigger>
          <TabsTrigger value="satelite">Satélite (NDVI)</TabsTrigger>
        </TabsList>

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

        <TabsContent value="satelite" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento Satélite (NDVI)</CardTitle>
              <CardDescription>
                Visualização de índices de vegetação e saúde das pastagens da propriedade.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-6">
              <div className="relative w-full aspect-video sm:h-[500px] bg-muted rounded-xl overflow-hidden border mx-auto">
                <img
                  src="https://img.usecurling.com/p/1200/800?q=farm%20satellite%20fields&color=green"
                  className="w-full h-full object-cover opacity-80"
                  alt="Farm Satellite Map"
                />

                <div className="absolute top-[20%] left-[20%] w-[30%] h-[40%] bg-green-500/30 border-2 border-green-500 rounded-bl-3xl flex items-center justify-center backdrop-blur-[2px] hover:bg-green-500/50 transition-colors cursor-pointer group">
                  <div className="bg-background/90 px-3 py-1.5 rounded-md shadow-sm text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-bold">Pasto 01</p>
                    <p className="text-xs text-muted-foreground">NDVI: 0.75</p>
                  </div>
                </div>

                <div className="absolute top-[30%] right-[15%] w-[25%] h-[35%] bg-red-500/30 border-2 border-red-500 rounded-tr-2xl flex items-center justify-center backdrop-blur-[2px] hover:bg-red-500/50 transition-colors cursor-pointer group">
                  <div className="bg-background/90 px-3 py-1.5 rounded-md shadow-sm text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-bold">Pasto 02</p>
                    <p className="text-xs text-destructive font-medium">NDVI: 0.45 (Alerta)</p>
                  </div>
                </div>

                <div className="absolute bottom-[10%] left-[40%] w-[20%] h-[30%] bg-emerald-500/30 border-2 border-emerald-500 rounded-t-xl flex items-center justify-center backdrop-blur-[2px] hover:bg-emerald-500/50 transition-colors cursor-pointer group">
                  <div className="bg-background/90 px-3 py-1.5 rounded-md shadow-sm text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-bold">Pasto 03 (Vedado)</p>
                    <p className="text-xs text-muted-foreground">NDVI: 0.82</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
