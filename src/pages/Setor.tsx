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
import { sectorData } from '@/data/mock'
import { Beef, Activity, DollarSign } from 'lucide-react'

export default function Setor() {
  const { id } = useParams<{ id: string }>()
  const data = sectorData[id as keyof typeof sectorData]

  if (!data) return <Navigate to="/" replace />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{data.title}</h2>
        <p className="text-muted-foreground mt-1">{data.description}</p>
      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell className="font-medium">{lote.id}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
