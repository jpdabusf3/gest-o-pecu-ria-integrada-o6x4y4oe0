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
import { regionalProtocols } from '@/data/mock'

export function ProtocolosTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Protocolos Sanitários Regionais</CardTitle>
        <CardDescription>
          Regras e exigências de vacinação baseadas na categoria e idade do animal, automatizadas
          para a sua região.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa Etária / Categoria</TableHead>
                <TableHead>Vacina / Manejo</TableHead>
                <TableHead>Frequência Recomendada</TableHead>
                <TableHead>Status Legal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionalProtocols.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.ageGroup}</TableCell>
                  <TableCell>{p.vaccine}</TableCell>
                  <TableCell>{p.frequency}</TableCell>
                  <TableCell>
                    <Badge variant={p.mandatory.includes('Sim') ? 'default' : 'secondary'}>
                      {p.mandatory}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
