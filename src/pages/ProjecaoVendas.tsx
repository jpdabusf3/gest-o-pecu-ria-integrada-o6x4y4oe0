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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  BrainCircuit,
  DollarSign,
  Calendar as CalendarIcon,
  TrendingUp,
  RefreshCw,
  Clock,
  Layers,
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
  const [confinementDays, setConfinementDays] = useState<number>(90)
  const [scenario, setScenario] = useState<'pessimistic' | 'realistic' | 'optimistic'>('realistic')
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

  const projections = useMemo(() => {
    const scenarioMult = scenario === 'pessimistic' ? 0.9 : scenario === 'optimistic' ? 1.1 : 1.0

    return lots
      .map((lot) => {
        const gmdSimulado = lot.gmd * scenarioMult
        const pesoSaidaEstimado = lot.pesoMedio + gmdSimulado * confinementDays
        const arrobasEstimadas = pesoSaidaEstimado / 15
        const receitaProjetadaCab = arrobasEstimadas * arrobaPrice
        const custoAcumuladoCab = lot.pesoMedio * 4.2 + confinementDays * 12 // Ex: custo base + diária
        const margemProjetadaCab = receitaProjetadaCab - custoAcumuladoCab

        const targetDate = new Date(Date.now() + confinementDays * 86400000).toLocaleDateString(
          'pt-BR',
        )

        return {
          ...lot,
          gmdSimulado,
          pesoSaidaEstimado,
          arrobasEstimadas,
          receitaProjetadaCab,
          custoAcumuladoCab,
          margemProjetadaCab,
          targetDate,
          projRevenueTotal: receitaProjetadaCab * lot.cabecas,
        }
      })
      .sort((a, b) => b.margemProjetadaCab - a.margemProjetadaCab)
  }, [lots, arrobaPrice, confinementDays, scenario])

  const totalProjNetProfit = projections.reduce((a, c) => a + c.margemProjetadaCab * c.cabecas, 0)

  const handleExportCSV = () => {
    const csvData = projections.map((p) => ({
      Lote: p.id,
      Origem: p.origin,
      Categoria: p.categoria,
      Cabeças: p.cabecas,
      'Peso Entrada (kg)': p.pesoMedio,
      'Dias Conf.': confinementDays,
      'GMD Simulado (kg/dia)': p.gmdSimulado.toFixed(2),
      'Peso Saída Est. (kg)': p.pesoSaidaEstimado.toFixed(1),
      'Arrobas Est. (@)': p.arrobasEstimadas.toFixed(1),
      'Custo Acumulado/Cab (R$)': p.custoAcumuladoCab.toFixed(2),
      'Receita Proj./Cab (R$)': p.receitaProjetadaCab.toFixed(2),
      'Margem Proj./Cab (R$)': p.margemProjetadaCab.toFixed(2),
    }))
    downloadCSV(csvData, `projecao_vendas_cenario_${scenario}`)
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
            Análise de cenários de venda TIP/Confinamento integrados ao DATAGRO MT.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex flex-col items-end mr-2 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Status DATAGRO
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
            {isRefreshing ? 'Sincronizando...' : 'Sync DATAGRO'}
          </Button>
          <GpbBalizadorButton />
          <PriceAlertModal />
        </div>
      </div>

      <Tabs defaultValue="vendas" className="space-y-6">
        <TabsList className="print:hidden">
          <TabsTrigger value="vendas">Painel de Projeções</TabsTrigger>
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

          <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3 mt-6">
            <Card className="bg-primary/5 border-primary/20 shadow-sm transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center justify-between">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger className="underline decoration-dashed underline-offset-4">
                        Preço Base da Arroba (R$)
                      </TooltipTrigger>
                      <TooltipContent>
                        Preço base DATAGRO utilizado para projetar as receitas de abate.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-background text-muted-foreground border-primary/20 max-w-[120px] truncate"
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
                    className="text-2xl font-bold h-12 w-full bg-background border-primary/30 shadow-inner"
                  />
                </div>
                <p className="text-xs text-primary/70 mt-2 font-medium print:hidden">
                  Aplica na fórmula de receita projetada
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dias de Confinamento (Est.)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={confinementDays}
                    onChange={(e) => setConfinementDays(Number(e.target.value))}
                    className="text-2xl font-bold h-12 w-32 shadow-sm"
                  />
                  <span className="text-muted-foreground font-medium flex-1 text-sm">
                    dias alvo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 print:hidden">
                  Determina o ganho de peso acumulado
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
                  Lucro Líquido Global Projetado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500 transition-all">
                  {formatCurrency(totalProjNetProfit)}
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 font-medium print:hidden">
                  Somatório das margens projetadas dos lotes
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="print:border-none print:shadow-none mt-6">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" /> Painel de Projeção Analítica
                </CardTitle>
                <CardDescription className="print:hidden max-w-xl">
                  Projeção de Abate baseada na fórmula:
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold">
                    Peso Est. = Peso Entrada + (GMD × Dias)
                  </code>{' '}
                  e
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold">
                    Arrobas = Peso Est. / 15
                  </code>
                  .
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4 print:hidden">
                <div className="bg-muted p-1 rounded-md flex items-center">
                  <ToggleGroup
                    type="single"
                    value={scenario}
                    onValueChange={(val) => {
                      if (val) setScenario(val as any)
                    }}
                  >
                    <ToggleGroupItem
                      value="pessimistic"
                      className="text-xs px-2 data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive"
                    >
                      Pessimista (-10%)
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="realistic"
                      className="text-xs px-2 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600"
                    >
                      Realista (Base)
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="optimistic"
                      className="text-xs px-2 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-600"
                    >
                      Otimista (+10%)
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <ExportMenu onExportCSV={handleExportCSV} onExportPDF={triggerPDFPrint} />
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto print:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote / Origem</TableHead>
                    <TableHead className="text-right">Peso Entrada</TableHead>
                    <TableHead className="text-right bg-muted/30">
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger className="underline decoration-dashed underline-offset-4">
                            Peso Saída Est.
                          </TooltipTrigger>
                          <TooltipContent>Estimado após os {confinementDays} dias.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right bg-muted/30 font-bold">Arrobas Est.</TableHead>
                    <TableHead className="text-right">Custo Acum./Cab.</TableHead>
                    <TableHead className="text-right text-primary">Receita Proj./Cab.</TableHead>
                    <TableHead className="text-right font-bold text-emerald-600">
                      Margem Proj./Cab.
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
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          GMD Sim: {formatNumber(p.gmdSimulado, 2)} kg/dia
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatWeight(p.pesoMedio, 'kg')}
                      </TableCell>
                      <TableCell className="text-right font-medium bg-muted/10 transition-all">
                        {formatWeight(p.pesoSaidaEstimado, 'kg')}
                      </TableCell>
                      <TableCell className="text-right font-bold bg-muted/10 transition-all">
                        {formatWeight(p.arrobasEstimadas, '@')}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium whitespace-nowrap">
                        - {formatCurrency(p.custoAcumuladoCab)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap transition-all">
                        {formatCurrency(p.receitaProjetadaCab)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-500 whitespace-nowrap text-base transition-all">
                        {formatCurrency(p.margemProjetadaCab)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Nenhum lote confinado em desenvolvimento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <SalesSimulator />
          <SimulationHistory />
        </TabsContent>

        <TabsContent value="pasto" className="m-0 border-none p-0 focus-visible:ring-0">
          <PastureProfitabilityDashboard currentArrobaPrice={arrobaPrice} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
