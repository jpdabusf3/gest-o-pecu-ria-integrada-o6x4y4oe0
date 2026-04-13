import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { DollarSign, Tag, TrendingUp, Calendar as CalendarIcon } from 'lucide-react'
import { getLots, type LotRecord } from '@/services/lots'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatWeight, formatNumber } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

export default function Vendas() {
  const [lots, setLots] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const records = await getLots("sector = 'venda' || status = 'sold'")
      setLots(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('lots', () => {
    loadData()
  })

  const calcGMD = (lot: LotRecord) => {
    if (!lot.entry_date || !lot.exit_date) return 0
    const days = differenceInDays(parseISO(lot.exit_date), parseISO(lot.entry_date))
    if (days <= 0) return 0
    return (lot.final_weight - lot.initial_weight) / days
  }

  const kpis = useMemo(() => {
    const totalAnimals = lots.reduce((acc, l) => acc + (l.headcount || 0), 0)
    const totalRevenue = lots.reduce(
      (acc, l) => acc + (l.headcount || 0) * (l.value_per_animal || 0),
      0,
    )
    const avgPrice = totalAnimals > 0 ? totalRevenue / totalAnimals : 0

    return { totalAnimals, totalRevenue, avgPrice }
  }, [lots])

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Tag className="h-8 w-8 text-primary" />
          Vendas de Boi Magro & Desmamados
        </h2>
        <p className="text-muted-foreground mt-1">
          Gestão comercial, histórico de vendas e análise de valorização de animais jovens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Negociado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(kpis.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Animais Vendidos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.totalAnimals, 0)} cab.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço Médio / Cabeça
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.avgPrice)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lotes Vendidos</CardTitle>
          <CardDescription>Acompanhamento de GMD e valores realizados.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando dados comerciais...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Sexo / Categoria</TableHead>
                    <TableHead className="text-right">Peso Inicial</TableHead>
                    <TableHead className="text-right">Peso Final</TableHead>
                    <TableHead className="text-right">GMD (kg/d)</TableHead>
                    <TableHead className="text-right">Valor / Animal</TableHead>
                    <TableHead className="text-right">Receita Lote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lote) => {
                    const gmd = calcGMD(lote)
                    const receita = (lote.headcount || 0) * (lote.value_per_animal || 0)
                    return (
                      <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="font-medium text-primary">{lote.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <CalendarIcon className="h-3 w-3" />
                            {lote.exit_date
                              ? new Date(lote.exit_date).toLocaleDateString('pt-BR')
                              : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize mr-2">
                            {lote.sex || 'N/A'}
                          </Badge>
                          <span className="text-sm">{lote.category || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatWeight(lote.initial_weight, 'kg')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatWeight(lote.final_weight, 'kg')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          {formatNumber(gmd, 3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(lote.value_per_animal)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(receita)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {lots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro de venda encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
