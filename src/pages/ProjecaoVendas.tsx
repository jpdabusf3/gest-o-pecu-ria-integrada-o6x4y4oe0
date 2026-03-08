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
          return {
            ...lot,
            daysNeeded: days,
            targetDate: new Date(Date.now() + days * 86400000).toLocaleDateString('pt-BR'),
            projRevenue: (targetWeight / 30) * arrobaPrice * lot.cabecas,
          }
        })
        .sort((a, b) => a.daysNeeded - b.daysNeeded),
    [lots, arrobaPrice, targetWeight],
  )

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" /> Dashboard de Inteligência de Vendas
          </h2>
          <p className="text-muted-foreground mt-1">
            Projeções baseadas no GMD e sincronizadas com dados de mercado em tempo real.
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
              Receita Total Projetada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">
              R${' '}
              {projections
                .reduce((a, c) => a + c.projRevenue, 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 font-medium">
              {projections.filter((p) => p.daysNeeded <= 30).length} lotes prontos em até 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cronograma de Lotes em Preparação</CardTitle>
          <CardDescription>
            Estimativa de dias para atingir o peso alvo calculada via Inteligência baseada no GMD
            atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote / Origem</TableHead>
                <TableHead className="text-right">Peso Atual / GMD</TableHead>
                <TableHead className="text-center">Dias p/ Alvo</TableHead>
                <TableHead>Data Est. Venda</TableHead>
                <TableHead className="text-right font-bold text-primary">
                  Receita Bruta Est.
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
                    <Badge variant="outline" className="mt-1 font-normal text-xs">
                      {p.origin}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{p.pesoMedio} kg</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" /> {p.gmd} kg/dia
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.daysNeeded === 0 ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-transparent">
                        Pronto
                      </Badge>
                    ) : (
                      <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                        {p.daysNeeded} d
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span
                        className={
                          p.daysNeeded === 0 ? 'font-bold text-emerald-500' : 'font-medium'
                        }
                      >
                        {p.targetDate}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary whitespace-nowrap text-base">
                    R${' '}
                    {p.projRevenue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
