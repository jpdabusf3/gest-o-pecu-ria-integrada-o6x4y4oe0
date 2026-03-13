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
import { Badge } from '@/components/ui/badge'
import { Tractor, Wrench } from 'lucide-react'
import useFrotaStore from '@/stores/useFrotaStore'
import { RefuelModal } from '@/components/frota/RefuelModal'
import { NewMachineModal } from '@/components/frota/NewMachineModal'
import { MaintenanceModal } from '@/components/frota/MaintenanceModal'
import { IncidentModal } from '@/components/frota/IncidentModal'

export default function Frota() {
  const { machines, refuels, maintenances, incidents } = useFrotaStore()

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tractor className="h-8 w-8 text-primary" />
            Frota & Maquinário
          </h2>
          <p className="text-muted-foreground mt-1">
            Controle de equipamentos, integração de abastecimentos e manutenções com estoque.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <IncidentModal />
          <MaintenanceModal />
          <RefuelModal />
          <NewMachineModal />
        </div>
      </div>

      <Tabs defaultValue="veiculos" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto overflow-x-auto justify-start h-auto py-1.5 px-1 flex flex-wrap sm:flex-nowrap">
          <TabsTrigger value="veiculos" className="py-2">
            Composição da Frota
          </TabsTrigger>
          <TabsTrigger value="abastecimentos" className="py-2">
            Abastecimentos
          </TabsTrigger>
          <TabsTrigger value="manutencoes" className="py-2">
            Manutenções
          </TabsTrigger>
          <TabsTrigger value="intercorrencias" className="py-2">
            Intercorrências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="veiculos" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Relação de Veículos e Indicadores</CardTitle>
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
                      <TableHead className="text-right">Custo Manutenção (Acum)</TableHead>
                      <TableHead className="text-right">Depreciação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((f) => {
                      const mCosts = maintenances
                        .filter((m) => m.machineId === f.id)
                        .reduce((a, b) => a + b.cost, 0)
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            {f.name}
                            <div className="text-xs text-muted-foreground">{f.type}</div>
                          </TableCell>
                          <TableCell>
                            {f.currentHours
                              ? `${f.currentHours} h`
                              : f.currentKm
                                ? `${f.currentKm} km`
                                : '-'}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            R${' '}
                            {(f.maintenanceCost + mCosts).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
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
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abastecimentos" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Abastecimento</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead className="text-right">Volume (L)</TableHead>
                    <TableHead>Operador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refuels.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{r.machineName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.fuelType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {r.quantity} L
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.operator}</TableCell>
                    </TableRow>
                  ))}
                  {refuels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhum abastecimento registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manutencoes" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Manutenção Preventiva e Corretiva</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{m.machineName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{m.category}</Badge>
                      </TableCell>
                      <TableCell>{m.description}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {maintenances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma manutenção registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intercorrencias" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Intercorrências Operacionais</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Operador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(i.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{i.machineName}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{i.type}</Badge>
                      </TableCell>
                      <TableCell>{i.description}</TableCell>
                      <TableCell className="text-muted-foreground">{i.operator}</TableCell>
                    </TableRow>
                  ))}
                  {incidents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma intercorrência registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
