import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tractor, Plus, Fuel, Wrench, Clock } from 'lucide-react'
import { fleetData } from '@/data/mock'

export default function Frota() {
  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tractor className="h-8 w-8 text-primary" />
            Frota & Maquinário
          </h2>
          <p className="text-muted-foreground mt-1">
            Controle de equipamentos, integração de depreciação e custos de manutenção.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2">
            <Fuel className="h-4 w-4" /> Abastecimento
          </Button>
          <Button className="flex-1 sm:flex-none gap-2">
            <Plus className="h-4 w-4" /> Nova Máquina
          </Button>
        </div>
      </div>

      <Tabs defaultValue="veiculos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="veiculos">Composição da Frota</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos (Horas / Km)</TabsTrigger>
        </TabsList>

        <TabsContent value="veiculos" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Relação de Veículos e Custos Atribuídos</CardTitle>
              <CardDescription>
                Todos os custos registrados aqui compõem automaticamente a métrica do Custo por
                Arroba Produzida.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máquina / Veículo</TableHead>
                      <TableHead>Horas / Km</TableHead>
                      <TableHead className="text-right">Consumo Mensal</TableHead>
                      <TableHead className="text-right">Custo Manutenção</TableHead>
                      <TableHead className="text-right">Depreciação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetData.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          {f.name}
                          <div className="text-xs text-muted-foreground">{f.type}</div>
                        </TableCell>
                        <TableCell>
                          {f.currentHours ? `${f.currentHours} h` : `${f.currentKm} km`}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {f.fuelConsumption > 0 ? `${f.fuelConsumption} L` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          R$ {f.maintenanceCost.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R$ {f.depreciation.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.status === 'Ativo' ? 'default' : 'secondary'}>
                            {f.status === 'Manutenção' && (
                              <Wrench className="w-3 h-3 mr-1 inline-block" />
                            )}
                            {f.status}
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

        <TabsContent value="lancamentos" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Registrar Uso Diário
                </CardTitle>
                <CardDescription>
                  Informe a quilometragem ou horímetro para cálculo preciso de depreciação por uso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecione a Máquina</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="">Selecione...</option>
                    {fleetData.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medidor (Horímetro / Km)</Label>
                    <Input type="number" placeholder="Ex: 1205" />
                  </div>
                  <div className="space-y-2">
                    <Label>Combustível (Litros)</Label>
                    <Input type="number" placeholder="Ex: 45" />
                  </div>
                </div>
                <Button className="w-full mt-2">Gravar Lançamento</Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Impacto Operacional Estimado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground text-sm">
                    Custo total maquinário (mês):
                  </span>
                  <span className="font-bold text-lg">R$ 35.000,00</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground text-sm">Representatividade no @:</span>
                  <span className="font-bold text-destructive">11.8%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Os valores agregam consumo, manutenções corretivas e depreciação calculada
                  linearmente.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
