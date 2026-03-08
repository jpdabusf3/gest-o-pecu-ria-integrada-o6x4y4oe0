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
import { reproductionForecast } from '@/data/mock'

export function ReproductionTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previsão de Partos</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Matriz</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Data Prevista</TableHead>
              <TableHead>Touro / Sêmen</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reproductionForecast.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.matriz}</TableCell>
                <TableCell>{item.lote}</TableCell>
                <TableCell>{item.dataPrevista}</TableCell>
                <TableCell>{item.touro}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Confirmada' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
