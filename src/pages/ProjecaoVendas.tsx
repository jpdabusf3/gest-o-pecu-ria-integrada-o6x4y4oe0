import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  BrainCircuit,
  DollarSign,
  Calendar as CalendarIcon,
  TrendingUp,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { confinementData, sectorData } from '@/data/mock'
import { MarketIndicators } from '@/components/MarketIndicators'
import { MarketTrendsChart } from '@/components/MarketTrendsChart'
import { PriceAlertModal } from '@/components/PriceAlertModal'
import { ReplacementFilter } from '@/components/ReplacementFilter'
import { CommoditiesQuotes } from '@/components/CommoditiesQuotes'
import { B3FuturesSelector } from '@/components/B3FuturesSelector'
import { GpbBalizadorButton } from '@/components/GpbBalizadorButton'
import { ExportMenu } from '@/components/ExportMenu'
import { SalesSimulator } from '@/components/SalesSimulator'
import { SimulationHistory } from '@/components/SimulationHistory'
import { PastureProfitabilityDashboard } from '@/components/PastureProfitabilityDashboard'
import { downloadCSV, triggerPDFPrint } from '@/lib/exportUtils'
import { useToast } from '@/hooks/use-toast'
import { useMarket } from '@/contexts/MarketContext'
import { cn, formatCurrency, formatWeight, formatNumber } from '@/lib/utils'

export default function ProjecaoVendas() {
  const { getPrice, b3Data, marketData, refreshMarketPrices, isRefreshing, lastUpdate } =
    useMarket()
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>('boi-gordo-mt')
  const [selectedMarketLabel, setSelectedMarketLabel] = useState<string>('Boi Gordo - MT')
  const [arrobaPrice, setArrobaPrice] = useState<number>(265.5)
  const [targetWeight, setTargetWeight] = useState<number>(540)
  const { toast } = useToast()

  const hasFetched = useRef(false)

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      refreshMarketPrices()
    }
  }, [refreshMarketPrices])

  useEffect(() => {
    if (selectedMarketId) {
      const livePrice = getPrice(selectedMarketId)
      if (livePrice !== null && livePrice !== arrobaPrice) {
        setArrobaPrice(livePrice)
      }
    }
  }, [selectedMarketId, getPrice, arrobaPrice, marketData])

  const activeLabel = useMemo(
    () => (selectedMarketId ? selectedMarketLabel : 'Valor Manual Customizado'),
    [selectedMarketId, selectedMarketLabel],
  )

  const activeTrend = useMemo(() => {
    if (!selectedMarketId) return 'stable'
    let ind = marketData.find((i) => i.id === selectedMarketId)
    if (ind) return ind.trend

    for (const commodity in b3Data) {
      const found = b3Data[commodity].find((i: any) => i.ticker === selectedMarketId)
      if (found) return found.trend
    }
    return 'stable'
  }, [selectedMarketId, marketData, b3Data])

  const lots = useMemo(
    () => [
      ...confinementData.lotes
        .filter((l) => l.gmd > 0)
        .map((l) => ({ ...l, origin: 'Confinamento' })),
      ...sectorData.engorda.lotes.map((l) => ({
        id: l.id,
        categoria: l.categoria,
        cabecas: l.cabecas,
        pesoMedio: l.id === 'LEN-02' ? 490 : 380,
        gmd: l.id === 'LEN-02' ? 1.4 : 1.1,
        origin: 'Pasto/Sup.',
      })),
    ],
    [],
  )

  const projections = useMemo(
    () =>
      lots
        .map((lot) => {
          const days = Math.max(0, Math.ceil((targetWeight - lot.pesoMedio) / lot.gmd)) || 0
          const totalCostHead = lot.pesoMedio * 4.2 + days * 10
          const grossRevHead = (targetWeight / 30) * arrobaPrice

          let rec = 'Em Desenv.'
          let color = 'text-muted-foreground'
          if (days === 0) {
            rec = activeTrend === 'up' ? 'Vender (Alta)' : 'Vender (Pronto)'
            color = 'text-emerald-500'
          } else if (days <= 15) {
            rec = activeTrend === 'down' ? 'Antecipar (Baixa)' : 'Aguardar Alvo'
            color = activeTrend === 'down' ? 'text-amber-500' : 'text-blue-500'
          }

          return {
            ...lot,
            daysNeeded: days,
            targetDate: new Date(Date.now() + days * 86400000).toLocaleDateString('pt-BR'),
            projRevenue: grossRevHead * lot.cabecas,
            netProfitHead: grossRevHead - totalCostHead,
            totalCostHead,
            rec,
            color,
          }
        })
        .sort((a, b) => a.daysNeeded - b.daysNeeded),
    [lots, arrobaPrice, targetWeight, activeTrend],
  )

  const totalProjNetProfit = projections.reduce((a, c) => a + c.netProfitHead * c.cabecas, 0)

  const handleExportCSV = () => {
    const csvData = projections.map((p) => ({
      Lote: p.id,
      Origem: p.origin,
      Categoria: p.categoria,
      Cabeças: p.cabecas,
      'Peso Médio (kg)': p.pesoMedio,
      'GMD (kg/dia)': p.gmd,
      'Dias p/ Abate': p.daysNeeded,
      'Ação Recomendada': p.rec,
      'Custo Proj. Total/Cab (R$)': p.totalCostHead.toFixed(2),
      'Lucro Líq. Proj/Cab (R$)': p.netProfitHead.toFixed(2),
      'Receita Bruta Total (R$)': p.projRevenue.toFixed(2),
    }))
    downloadCSV(csvData, 'projecao_vendas_inteligencia')
    toast({
      title: 'Exportação Concluída',
      description: 'Relatório de Inteligência de Vendas exportado com sucesso.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8 print:pb-0">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" /> Inteligência e Projeções
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Análises preditivas, cenários de venda e rentabilidade de manejo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex flex-col items-end mr-2 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Status do Indicador
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lastUpdate}</span>
          </div>
          <Button
            variant="outline"
            onClick={refreshMarketPrices}
            disabled={isRefreshing}
            className="gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Sincronizando...' : 'Atualizar Cotações'}
          </Button>
          <GpbBalizadorButton />
          <PriceAlertModal />
        </div>
      </div>

      <Tabs defaultValue="vendas" className="space-y-6">
        <TabsList className="print:hidden">
          <TabsTrigger value="vendas">Inteligência de Vendas</TabsTrigger>
          <TabsTrigger value="pasto">Rentabilidade por Pasto</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6 m-0 border-none p-0 focus-visible:ring-0">
          <div className="print:hidden">
            <MarketIndicators
              selectedId={selectedMarketId}
              onSelect={(id, price, label) => {
                setSelectedMarketId(id)
                setArrobaPrice(price)
                setSelectedMarketLabel(label)
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 print:hidden">
            <ReplacementFilter />
            <CommoditiesQuotes />
            <B3FuturesSelector
              onSelectPrice={(id, price, label) => {
                setSelectedMarketId(id)
                setArrobaPrice(price)
                setSelectedMarketLabel(label)
              }}
            />
          </div>

          <div className="print:hidden">
            <MarketTrendsChart />
          </div>

          <SalesSimulator />
          <SimulationHistory />

          <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3 mt-6">
            <Card className="bg-primary/5 border-primary/20 shadow-sm print:border print:shadow-none print:bg-transparent transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center justify-between">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger className="underline decoration-dashed underline-offset-4">
                        Preço Base da Arroba (R$)
                      </TooltipTrigger>
                      <TooltipContent>
                        Preço base utilizado para calcular as receitas nas simulações e projeções
                        abaixo.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-background text-muted-foreground border-primary/20 max-w-[120px] truncate print:border print:bg-transparent"
                  >
                    {activeLabel}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary print:hidden" />
                  <Input
                    type="number"
                    value={Number(arrobaPrice.toFixed(2))}
                    onChange={(e) => {
                      setArrobaPrice(Number(e.target.value))
                      setSelectedMarketId(null)
                    }}
                    className="text-2xl font-bold h-12 w-full bg-background border-primary/30 shadow-inner print:border-none print:shadow-none print:p-0 transition-all"
                  />
                </div>
                <p className="text-xs text-primary/70 mt-2 font-medium print:hidden">
                  Usado para cálculo da receita projetada na tabela
                </p>
              </CardContent>
            </Card>

            <Card className="print:border print:shadow-none print:bg-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Peso Alvo p/ Abate (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(Number(e.target.value))}
                    className="text-2xl font-bold h-12 w-32 shadow-sm print:border-none print:shadow-none print:p-0"
                  />
                  <span className="text-muted-foreground font-medium flex-1">
                    ≈ {formatNumber(targetWeight / 30, 1)} @
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 print:hidden">
                  Meta desejada por animal
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm print:border print:shadow-none print:bg-transparent transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
                  Lucro Líquido Global Proj.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500 transition-all">
                  {formatCurrency(totalProjNetProfit)}
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 font-medium print:hidden">
                  Receita deduzida de custos da tabela
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="print:border-none print:shadow-none mt-6">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle>Painel Analítico de Oportunidades de Venda</CardTitle>
                <CardDescription className="print:hidden">
                  Motor de inteligência cruzando previsão de ganho de peso, custos operacionais e
                  cotações.
                </CardDescription>
              </div>
              <div className="print:hidden">
                <ExportMenu onExportCSV={handleExportCSV} onExportPDF={triggerPDFPrint} />
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto print:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote / Origem</TableHead>
                    <TableHead className="text-center">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger className="underline decoration-dashed underline-offset-4">
                            Janela Ideal / Ação
                          </TooltipTrigger>
                          <TooltipContent>
                            Momento recomendado para venda baseado em projeção de ganho e mercado.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right">Custos Proj. / Cab.</TableHead>
                    <TableHead className="text-right text-primary">Lucro Líq. / Cab.</TableHead>
                    <TableHead className="text-right font-bold text-primary">
                      Receita Bruta Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projections.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium text-primary">
                          {p.id}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({p.cabecas} cab.)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1 gap-1">
                          {formatWeight(p.pesoMedio, 'kg')} •{' '}
                          <TrendingUp className="h-3 w-3 text-emerald-500 print:hidden" />{' '}
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help">
                                {formatNumber(p.gmd, 2)} kg/dia
                              </TooltipTrigger>
                              <TooltipContent>Ganho Médio Diário (GMD) projetado.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn('text-xs font-semibold whitespace-nowrap', p.color)}>
                          {p.rec}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                          <CalendarIcon className="h-3 w-3 print:hidden" />
                          {p.daysNeeded === 0 ? 'Disponível' : `Em ${p.daysNeeded} d`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium whitespace-nowrap">
                        - {formatCurrency(p.totalCostHead)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap transition-all">
                        {formatCurrency(p.netProfitHead)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap text-base transition-all">
                        {formatCurrency(p.projRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pasto" className="m-0 border-none p-0 focus-visible:ring-0">
          <PastureProfitabilityDashboard currentArrobaPrice={arrobaPrice} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
