import { useState } from 'react'
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
import { calendarEvents } from '@/data/mock'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SectorCalendarTab({ sectorId }: { sectorId: string }) {
  const [filterType, setFilterType] = useState('Todos')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const types = [
    'Todos',
    'Nascimentos',
    'Sanidade',
    'IATF',
    'Pesagem',
    'Confinamento',
    'Manejo de Pasto',
    'Balanço',
    'Vendas',
    'Abates',
  ]

  const filtered = calendarEvents.filter((e) => {
    if (e.sector !== sectorId && sectorId !== 'all') return false
    if (filterType !== 'Todos' && e.type !== filterType) return false
    if (dateStart && new Date(e.date) < new Date(dateStart)) return false
    if (dateEnd && new Date(e.date) > new Date(dateEnd)) return false
    return true
  })

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
        <CardTitle>Eventos e Atividades</CardTitle>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full sm:w-[130px]"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full sm:w-[130px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Alvo (Lote/Animal)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap">{item.date}</TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.target}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  Nenhum evento encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
