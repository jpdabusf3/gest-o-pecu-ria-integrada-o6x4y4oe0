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
import { inventoryData } from '@/data/mock'

export default function Estoque() {
  const renderTable = (items: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Status de Estoque</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.item}</TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell className="text-right font-mono">{item.qtd}</TableCell>
              <TableCell>{item.unidade}</TableCell>
              <TableCell>
                <Badge
                  variant={item.status === 'Baixo' ? 'destructive' : 'secondary'}
                  className={item.status === 'Baixo' ? 'animate-pulse-slow' : ''}
                >
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
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
              <CardTitle>Suplementação e Rações</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {renderTable(inventoryData.nutricao)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
