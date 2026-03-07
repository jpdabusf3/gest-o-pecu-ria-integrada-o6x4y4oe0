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
import { pasturesData } from '@/data/mock'

export default function Pastos() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Pastos</h2>
        <p className="text-muted-foreground mt-1">
          Acompanhamento de áreas, capacidade de suporte e cultivares.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventário de Áreas de Pastagem</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Divisão</TableHead>
                  <TableHead className="text-right">Área (ha)</TableHead>
                  <TableHead>Cultivar</TableHead>
                  <TableHead>Estação / Uso</TableHead>
                  <TableHead className="text-right">Lotação (UA/ha)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pasturesData.map((pasto) => (
                  <TableRow key={pasto.id}>
                    <TableCell className="font-medium">{pasto.nome}</TableCell>
                    <TableCell className="text-right">{pasto.area.toFixed(1)}</TableCell>
                    <TableCell>{pasto.cultivar}</TableCell>
                    <TableCell>{pasto.estacao}</TableCell>
                    <TableCell className="text-right font-mono">
                      {pasto.lotacao > 0 ? pasto.lotacao.toFixed(1) : '-'}
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
