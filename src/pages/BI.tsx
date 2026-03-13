import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { useToast } from '@/hooks/use-toast'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { biMetricsList, defaultSavedReports, biData, twelveMonthsTrendData } from '@/data/mock'
import { DynamicBIChart } from '@/components/charts/DynamicBIChart'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import { Save, Bookmark } from 'lucide-react'

export default function BI() {
  const [m1, setM1] = useState<string>(biMetricsList[0]?.id || '')
  const [m2, setM2] = useState<string>(biMetricsList[1]?.id || biMetricsList[0]?.id || '')
  const [dateRange, setDateRange] = useState('ultimos_6')
  const [saved, setSaved] = useState(defaultSavedReports)
  const { toast } = useToast()

  const handleSave = () => {
    const metric1Name = biMetricsList.find((m) => m.id === m1)?.name || 'Métrica 1'
    const metric2Name = biMetricsList.find((m) => m.id === m2)?.name || 'Métrica 2'
    const newName = `${metric1Name} vs ${metric2Name}`

    setSaved([{ id: Date.now().toString(), name: newName, m1, m2 }, ...saved])
    toast({
      title: 'Relatório Salvo',
      description: 'Sua configuração foi salva e pode ser acessada posteriormente.',
    })
  }

  const loadSaved = (s: { m1: string; m2: string }) => {
    setM1(s.m1)
    setM2(s.m2)
    toast({
      title: 'Visão Carregada',
      description: 'Os eixos do gráfico foram atualizados.',
    })
  }

  const filteredData = useMemo(() => {
    if (dateRange === 'ultimos_6') return biData.slice(-6)
    if (dateRange === 'este_ano') return biData.slice(-3) // Mocking different timeframe
    return biData
  }, [dateRange])

  const prepareExportData = () => {
    const metric1Name = biMetricsList.find((m) => m.id === m1)?.name || m1
    const metric2Name = biMetricsList.find((m) => m.id === m2)?.name || m2

    return filteredData.map((d) => ({
      Período: d.period,
      [metric1Name]: d[m1 as keyof typeof d],
      [metric2Name]: d[m2 as keyof typeof d],
    }))
  }

  const handleExportCSV = () => {
    downloadCSV(prepareExportData(), `bi_report_${m1}_${m2}`)
    toast({ title: 'Exportação Concluída', description: 'O arquivo CSV foi baixado com sucesso.' })
  }

  const handleExportExcel = () => {
    downloadExcel(prepareExportData(), `bi_report_${m1}_${m2}`)
    toast({
      title: 'Exportação Concluída',
      description: 'O arquivo Excel foi baixado com sucesso.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20 sm:pb-6 print:pb-0 print:space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            BI & Relatórios Dinâmicos
          </h2>
          <p className="text-muted-foreground mt-1">
            Cruze dados de diferentes módulos para descobrir insights de performance.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" /> Salvar Visão
        </Button>
      </div>

      <Card className="mb-6 md:col-span-4 print:hidden">
        <CardHeader>
          <CardTitle>Tendência de 12 Meses: Fluxo de Caixa vs Ganho de Peso</CardTitle>
          <CardDescription>
            Análise de longo prazo correlacionando o faturamento acumulado com a produtividade do
            rebanho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              cashflow: { label: 'Fluxo de Caixa (R$)', color: 'hsl(var(--primary))' },
              weightGain: { label: 'Ganho de Peso (kg)', color: 'hsl(var(--chart-2))' },
            }}
            className="h-[300px] w-full"
          >
            <ComposedChart
              data={twelveMonthsTrendData}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => `${v} kg`}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--color-muted)' }}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="left"
                dataKey="cashflow"
                fill="var(--color-cashflow)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="weightGain"
                stroke="var(--color-weightGain)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-4 print:grid-cols-1 print:gap-2">
        <div className="md:col-span-1 space-y-6 print:hidden">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Configurar Eixos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Série 1 (Barras)</label>
                <Select value={m1} onValueChange={setM1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {biMetricsList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Série 2 (Linha)</label>
                <Select value={m2} onValueChange={setM2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {biMetricsList.map((m) => (
                      <SelectItem key={m.id} value={m.id} disabled={m.id === m1}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultimos_6">Últimos 6 Meses</SelectItem>
                    <SelectItem value="este_ano">Este Ano</SelectItem>
                    <SelectItem value="todo_periodo">Todo Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Visões Salvas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {saved.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-3"
                  onClick={() => loadSaved(s)}
                >
                  <Bookmark className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                  <span className="truncate text-sm whitespace-normal break-words">{s.name}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="h-full flex flex-col min-h-[500px] print:min-h-[auto] print:border-none print:shadow-none">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Gráfico Comparativo</CardTitle>
                <CardDescription>
                  Análise temporal cruzada interagindo indicadores de custo e produção.
                </CardDescription>
              </div>
              <div className="print:hidden">
                <ExportMenu
                  onExportCSV={handleExportCSV}
                  onExportExcel={handleExportExcel}
                  onExportPDF={triggerPDFPrint}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <DynamicBIChart m1={m1} m2={m2} data={filteredData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
