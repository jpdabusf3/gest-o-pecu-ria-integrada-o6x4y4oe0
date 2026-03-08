import { useState, useMemo } from 'react'
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
import { BrainCircuit, DollarSign, Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { confinementData, sectorData } from '@/data/mock'
import { MarketIndicators } from '@/components/MarketIndicators'
import { marketIndicators } from '@/data/market'
import { MarketTrendsChart } from '@/components/MarketTrendsChart'
import { PriceAlertModal } from '@/components/PriceAlertModal'
import { cn } from '@/lib/utils'

export default function ProjecaoVendas() {
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>('sp')
  const [arrobaPrice, setArrobaPrice] = useState<number>(245.5)
  const [targetWeight, setTargetWeight] = useState<number>(540)

  const activeLabel = useMemo(
    () =>
      selectedMarketId
        ? marketIndicators.find((i) => i.id === selectedMarketId)?.label
        : 'Valor Manual Customizado',
    [selectedMarketId],
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

  const projections = useMemo(
    () =>
      lots
        .map((lot) => {
          const days = Math.max(0, Math.ceil((targetWeight - lot.pesoMedio) / lot.gmd)) || 0
          const activeTrend = selectedMarketId
            ? marketIndicators.find((i) => i.id === selectedMarketId)?.trend
            : 'stable'

          // Financial Analytics Engine: Combine labor & nutritional costs
          const totalCostHead = lot.pesoMedio * 4.2 + days * 10 // Baseline + R$10/dia (8.5 Nutrição + 1.5 Mão de Obra de tarefas)
          const grossRevHead = (targetWeight / 30) * arrobaPrice

          // Recommendation Logic (Selling Opportunity Tool)
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
    [lots, arrobaPrice, targetWeight, selectedMarketId],
  )

  const totalProjNetProfit = projections.reduce((a, c) => a + c.netProfitHead * c.cabecas, 0)

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" /> Inteligência de Vendas e Mercado
          </h2>
          <p className="text-muted-foreground mt-1">
            Projeções integrando GMD, custos totais (Mão de obra e Nutrição) e tendências de
            mercado.
          </p>
        </div>
        <PriceAlertModal />
      </div>

      <MarketIndicators
        selectedId={selectedMarketId}
        onSelect={(id, price) => {
          setSelectedMarketId(id)
          setArrobaPrice(price)
        }}
      />

      <MarketTrendsChart />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center justify-between">
              Preço Base da Arroba (R$)
              <Badge
                variant="outline"
                className="text-[10px] bg-background text-muted-foreground border-primary/20"
              >
                {activeLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <Input
                type="number"
                value={arrobaPrice}
                onChange={(e) => {
                  setArrobaPrice(Number(e.target.value))
                  setSelectedMarketId(null)
                }}
                className="text-2xl font-bold h-12 w-full bg-background border-primary/30 shadow-inner"
              />
            </div>
            <p className="text-xs text-primary/70 mt-2 font-medium">
              Usado para cálculo da receita projetada
            </p>
          </CardContent>
        </Card>

        <Card>
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
                className="text-2xl font-bold h-12 w-32 shadow-sm"
              />
              <span className="text-muted-foreground font-medium flex-1">
                ≈ {(targetWeight / 30).toFixed(1)} @
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Meta desejada por animal</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
              Lucro Líquido Global Proj.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">
              R${' '}
              {totalProjNetProfit.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 font-medium">
              Receita deduzida de custos de nutrição e mão de obra
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel Analítico de Oportunidades de Venda</CardTitle>
          <CardDescription>
            Motor de inteligência cruzando previsão de ganho de peso, custos operacionais por cabeça
            e cotação da B3.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote / Origem</TableHead>
                <TableHead className="text-center">Janela Ideal / Ação</TableHead>
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
                      {p.pesoMedio}kg • <TrendingUp className="h-3 w-3 text-emerald-500" /> {p.gmd}
                      kg/dia
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={cn('text-xs font-semibold whitespace-nowrap', p.color)}>
                      {p.rec}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {p.daysNeeded === 0 ? 'Disponível' : `Em ${p.daysNeeded} d`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium whitespace-nowrap">
                    - R$ {p.totalCostHead.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                    R$ {p.netProfitHead.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary whitespace-nowrap text-base">
                    R$ {p.projRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
