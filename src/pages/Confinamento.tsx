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
import { Button } from '@/components/ui/button'
import { confinementData } from '@/data/mock'
import { Wheat, TrendingUp, Scale, Plus } from 'lucide-react'

export default function Confinamento() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Confinamento</h2>
          <p className="text-muted-foreground mt-1">
            Módulo dedicado para controle intensivo de engorda, dietas e performance.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lote Confinado
        </Button>
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
        <TabsList className="overflow-x-auto justify-start w-full sm:w-auto">
          <TabsTrigger value="lotes">Lotes em Confinamento</TabsTrigger>
          <TabsTrigger value="dietas">Dietas e Protocolos</TabsTrigger>
          <TabsTrigger value="estoque">Estoque de Insumos</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Acompanhamento de Lotes</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote ID</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">Dias Confinado</TableHead>
                      <TableHead className="text-right">Peso Médio</TableHead>
                      <TableHead className="text-right">GMD</TableHead>
                      <TableHead>Dieta Atual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confinementData.lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium text-primary">{lote.id}</TableCell>
                        <TableCell>{lote.categoria}</TableCell>
                        <TableCell className="text-right">{lote.cabecas}</TableCell>
                        <TableCell className="text-right">{lote.diasConfinamento}</TableCell>
                        <TableCell className="text-right font-medium">
                          {lote.pesoMedio} kg
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {lote.gmd} kg
                        </TableCell>
                        <TableCell>{lote.dieta}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lote.status === 'Normal'
                                ? 'default'
                                : lote.status === 'Pronto p/ Abate'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {lote.status}
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

        <TabsContent value="dietas" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Fórmulas de Nutrição</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Dieta</TableHead>
                      <TableHead>Volumoso</TableHead>
                      <TableHead>Concentrado</TableHead>
                      <TableHead className="text-right">Custo Estimado (R$/kg)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confinementData.dietas.map((dieta) => (
                      <TableRow key={dieta.id}>
                        <TableCell className="font-medium">{dieta.nome}</TableCell>
                        <TableCell>{dieta.volumoso}</TableCell>
                        <TableCell>{dieta.concentrado}</TableCell>
                        <TableCell className="text-right">
                          R$ {dieta.custoKg.toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={dieta.status === 'Ativa' ? 'default' : 'outline'}>
                            {dieta.status}
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

        <TabsContent value="estoque" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Insumos Dedicados</CardTitle>
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
                    {confinementData.inventory.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.item}</TableCell>
                        <TableCell className="text-right font-mono">{inv.quantidade}</TableCell>
                        <TableCell>{inv.unidade}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'Normal' ? 'default' : 'destructive'}>
                            {inv.status}
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
    </div>
  )
}
