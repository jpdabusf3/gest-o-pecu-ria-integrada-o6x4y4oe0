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
import { inventoryData } from '@/data/mock'

export default function Estoque() {
  const renderTable = (items: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Qtd Atual</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Mínimo</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isCritical = item.qtd < item.minQtd
            return (
              <TableRow key={item.id} className={isCritical ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">{item.item}</TableCell>
                <TableCell>{item.tipo}</TableCell>
                <TableCell
                  className={`text-right font-mono ${isCritical ? 'text-destructive font-bold' : ''}`}
                >
                  {item.qtd}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {item.minQtd}
                </TableCell>
                <TableCell>{item.unidade}</TableCell>
                <TableCell>
                  <Badge
                    variant={isCritical ? 'destructive' : 'secondary'}
                    className={isCritical ? 'animate-pulse-slow' : ''}
                  >
                    {isCritical ? 'Crítico' : 'Normal'}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Estoque & Insumos</h2>
        <p className="text-muted-foreground mt-1">
          Gestão de farmácia veterinária, almoxarifado geral e nutrição animal.
        </p>
      </div>

      <Tabs defaultValue="farmacia" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
          <TabsTrigger value="farmacia">Farmácia</TabsTrigger>
          <TabsTrigger value="almoxarifado">Almoxarifado</TabsTrigger>
          <TabsTrigger value="nutricao">Nutrição</TabsTrigger>
        </TabsList>

        <TabsContent value="farmacia">
          <Card>
            <CardHeader>
              <CardTitle>Itens de Farmácia Veterinária</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {renderTable(inventoryData.farmacia)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="almoxarifado">
          <Card>
            <CardHeader>
              <CardTitle>Almoxarifado e Ferramentas</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {renderTable(inventoryData.almoxarifado)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutricao">
          <Card>
            <CardHeader>
              <CardTitle>Suplementação e Rações (Previsão de Estoque)</CardTitle>
              <CardDescription>
                Acompanhe o consumo diário e a estimativa de duração do estoque baseada no rebanho
                atual.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Estoque Atual</TableHead>
                      <TableHead className="text-right">Consumo Diário</TableHead>
                      <TableHead className="text-right">Autonomia (Dias)</TableHead>
                      <TableHead>Status / Alerta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData.nutricao.map((item) => {
                      const consumo = item.consumoDiario || 1
                      const diasRestantes = Math.floor(item.qtd / consumo)
                      const isCritical = diasRestantes <= 7
                      const isWarning = diasRestantes > 7 && diasRestantes <= 15

                      return (
                        <TableRow key={item.id} className={isCritical ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.qtd} {item.unidade}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {item.consumoDiario} {item.unidade}/dia
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold ${isCritical ? 'text-destructive' : isWarning ? 'text-orange-500' : 'text-primary'}`}
                          >
                            {diasRestantes} dias
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isCritical ? 'destructive' : isWarning ? 'secondary' : 'default'
                              }
                              className={isCritical ? 'animate-pulse-slow' : ''}
                            >
                              {isCritical
                                ? 'Estoque Crítico'
                                : isWarning
                                  ? 'Alerta (Baixo)'
                                  : 'Confortável'}
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
      </Tabs>
    </div>
  )
}
