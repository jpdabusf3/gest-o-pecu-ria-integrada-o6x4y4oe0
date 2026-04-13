import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Factory,
  TrendingUp,
  Scale,
  FileText,
  MoreHorizontal,
  Download,
  Printer,
} from 'lucide-react'
import { RegisterSlaughterModal } from '@/components/forms/RegisterSlaughterModal'
import { getLots, type LotRecord } from '@/services/lots'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatNumber, formatWeight } from '@/lib/utils'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export default function Abates() {
  const [lots, setLots] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [printingLotId, setPrintingLotId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const records = await getLots("status = 'abated'")
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

  useRealtime('lots', () => loadData())

  const handlePrintLot = (id: string) => {
    setPrintingLotId(id)
    setTimeout(() => {
      window.print()
      setPrintingLotId(null)
    }, 500)
  }

  const handlePrintGlobal = () => {
    window.print()
  }

  // --- Calculations ---
  const totalCarcass = useMemo(
    () => lots.reduce((acc, r) => acc + (r.final_weight || 0) * (r.headcount || 0), 0),
    [lots],
  )
  const totalHeads = useMemo(() => lots.reduce((acc, r) => acc + (r.headcount || 0), 0), [lots])

  // Chart 1: Frequency over time
  const freqData = useMemo(() => {
    const grouped = lots.reduce(
      (acc, lot) => {
        if (!lot.exit_date) return acc
        const month = format(parseISO(lot.exit_date), 'MMM yyyy', { locale: ptBR })
        if (!acc[month]) acc[month] = 0
        acc[month] += lot.headcount || 0
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(grouped).map(([name, count]) => ({ name, count }))
  }, [lots])

  // Chart 2: Headcount by category
  const categoryData = useMemo(() => {
    const grouped = lots.reduce(
      (acc, lot) => {
        const cat = lot.category || 'Não definida'
        if (!acc[cat]) acc[cat] = 0
        acc[cat] += lot.headcount || 0
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [lots])

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
  ]

  const printingLot = lots.find((l) => l.id === printingLotId)

  return (
    <div className="space-y-6 animate-fade-in-up pb-8 print:p-0 print:m-0">
      {/* --- PRINT VIEW FOR SINGLE LOT --- */}
      {printingLot && (
        <div className="hidden print:block space-y-6">
          <div className="border-b-2 border-primary pb-4 mb-8">
            <h1 className="text-3xl font-bold">Relatório Oficial de Abate</h1>
            <p className="text-muted-foreground">Fazenda 3 Irmãos - Gestão Pecuária Integrada</p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg border-b mb-4">Dados do Lote</h3>
              <p>
                <strong>Nome:</strong> {printingLot.name}
              </p>
              <p>
                <strong>Categoria:</strong> {printingLot.category} ({printingLot.sex})
              </p>
              <p>
                <strong>Cabeças:</strong> {printingLot.headcount}
              </p>
              <p>
                <strong>Data Saída:</strong>{' '}
                {printingLot.exit_date
                  ? format(parseISO(printingLot.exit_date), 'dd/MM/yyyy')
                  : '-'}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg border-b mb-4">
                Resultados Zootécnicos & Financeiros
              </h3>
              <p>
                <strong>Peso Entrada:</strong> {formatWeight(printingLot.initial_weight, 'kg')}
              </p>
              <p>
                <strong>Peso Abate (Estimado/Carcaça):</strong>{' '}
                {formatWeight(printingLot.final_weight, 'kg')}
              </p>
              <p>
                <strong>GMD:</strong>{' '}
                {formatNumber(
                  (printingLot.final_weight - printingLot.initial_weight) /
                    Math.max(
                      1,
                      differenceInDays(
                        parseISO(printingLot.exit_date || new Date().toISOString()),
                        parseISO(printingLot.entry_date || new Date().toISOString()),
                      ),
                    ),
                  3,
                )}{' '}
                kg/d
              </p>
              <p>
                <strong>Valor Base / Animal:</strong> {formatCurrency(printingLot.value_per_animal)}
              </p>
              <p className="text-xl font-bold mt-4">
                <strong>Receita Bruta do Lote:</strong>{' '}
                {formatCurrency((printingLot.value_per_animal || 0) * (printingLot.headcount || 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- STANDARD VIEW --- */}
      <div className={printingLotId ? 'print:hidden' : ''}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8 text-primary" />
              Gestão de Abates
            </h2>
            <p className="text-muted-foreground mt-1">
              Controle de frigoríficos, pesagens e emissão de relatórios oficiais.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button onClick={handlePrintGlobal} variant="outline" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório Global
            </Button>
            <div className="flex-1 sm:flex-none">
              <RegisterSlaughterModal />
            </div>
          </div>
        </div>

        {/* Global Print Header */}
        <div className="hidden print:block print:mb-8 border-b-2 border-primary pb-4">
          <h1 className="text-3xl font-bold">Relatório Global de Abates</h1>
          <p className="text-muted-foreground">
            Emitido em: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">Animais Abatidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{formatNumber(totalHeads, 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Cabeças totais no histórico</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Volume Total (Estimado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Scale className="h-6 w-6 text-muted-foreground" />{' '}
                {formatWeight(totalCarcass, 'kg')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Arrobas Produzidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-emerald-500" />{' '}
                {formatNumber(totalCarcass / 15, 0)} @
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Frequência de Abates</CardTitle>
              <CardDescription>Volume de animais abatidos ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {freqData.length > 0 ? (
                <ChartContainer
                  config={{ count: { label: 'Cabeças', color: 'hsl(var(--primary))' } }}
                  className="h-[250px] w-full"
                >
                  <BarChart data={freqData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--color-muted)' }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados de abates
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Resumo por Categoria</CardTitle>
              <CardDescription>Distribuição de perfil zootécnico</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados de abates
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="print:shadow-none print:border-none">
          <CardHeader className="print:px-0">
            <CardTitle>Lotes Abatidos</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 overflow-x-auto print:px-0">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Abate</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Cabeças</TableHead>
                    <TableHead className="text-right">Peso Final</TableHead>
                    <TableHead className="text-right">Receita Total</TableHead>
                    <TableHead className="w-[80px] print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {lote.exit_date ? format(parseISO(lote.exit_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{lote.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lote.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{lote.headcount}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatWeight(lote.final_weight, 'kg')}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-emerald-600 font-medium">
                        {formatCurrency((lote.value_per_animal || 0) * (lote.headcount || 0))}
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePrintLot(lote.id)}>
                              <Printer className="mr-2 h-4 w-4" /> Exportar PDF do Lote
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" /> Ver Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Nenhum lote abatido registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
