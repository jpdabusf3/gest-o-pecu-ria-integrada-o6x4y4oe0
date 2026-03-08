import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useMarket } from '@/contexts/MarketContext'
import useSimulationStore from '@/stores/useSimulationStore'
import useFazendaStore from '@/stores/useFazendaStore'
import { Calculator, TrendingUp, DollarSign, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function SalesSimulator() {
  const { marketData } = useMarket()
  const { addSimulation } = useSimulationStore()
  const { fazendas } = useFazendaStore()
  const { toast } = useToast()

  const [category, setCategory] = useState(marketData[0]?.id || '')
  const [weight, setWeight] = useState(540)
  const [productionCost, setProductionCost] = useState(3200)
  const [salesPrice, setSalesPrice] = useState(marketData[0]?.price || 265.5)
  const [selectedFarms, setSelectedFarms] = useState<string[]>([])

  const lastMarketPrice = useRef<number>(marketData[0]?.price || 265.5)

  useEffect(() => {
    if (!category && marketData.length > 0) {
      setCategory(marketData[0].id)
    }
  }, [marketData, category])

  useEffect(() => {
    const indicator = marketData.find((m) => m.id === category)
    if (indicator && indicator.price !== lastMarketPrice.current) {
      setSalesPrice(indicator.price)
      lastMarketPrice.current = indicator.price
    }
  }, [marketData, category])

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    const indicator = marketData.find((m) => m.id === val)
    if (indicator) {
      setSalesPrice(indicator.price)
      lastMarketPrice.current = indicator.price
      if (val.includes('vaca')) setWeight(420)
      else if (val.includes('novilha')) setWeight(380)
      else setWeight(540)
    }
  }

  const farmCost = useMemo(() => {
    if (selectedFarms.length === 0) return 0
    const farms = fazendas.filter((f) => selectedFarms.includes(f.id))
    const totalCost = farms.reduce(
      (acc, f) => acc + ((f.custoNutricao || 0) + (f.custoManejo || 0)),
      0,
    )
    const totalHerd = farms.reduce((acc, f) => acc + (f.rebanho || 1), 0)
    return totalCost / (totalHerd || 1)
  }, [selectedFarms, fazendas])

  const results = useMemo(() => {
    const arrobas = weight / 30
    const revenue = arrobas * salesPrice
    const totalProductionCost = productionCost + farmCost
    const profit = revenue - totalProductionCost
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    return { arrobas, revenue, profit, margin, totalProductionCost }
  }, [weight, salesPrice, productionCost, farmCost])

  const handleSave = () => {
    addSimulation({
      category: marketData.find((m) => m.id === category)?.label || category,
      weight,
      salesPrice,
      productionCost,
      farmCost,
      arrobas: results.arrobas,
      revenue: results.revenue,
      profit: results.profit,
      margin: results.margin,
      farmIds: selectedFarms,
    })
    toast({
      title: 'Simulação Salva',
      description: 'O cenário foi adicionado ao histórico para comparação.',
    })
  }

  return (
    <Card className="border-primary/20 shadow-sm animate-fade-in-up mt-6 print:hidden">
      <CardHeader className="bg-primary/5 pb-4 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Simulador de Cenários de Venda (Indicador do Boi)
        </CardTitle>
        <CardDescription>
          Simule a margem de lucro projetada inserindo o custo de produção e vinculando fazendas
          cadastradas.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Categoria Animal</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {marketData.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso Vivo Atual (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Venda Esperado (R$/@)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custo Base de Produção (R$/Cab)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  value={productionCost}
                  onChange={(e) => setProductionCost(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label>Vincular Fazenda (Opcional)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-background"
                  >
                    {selectedFarms.length > 0
                      ? `${selectedFarms.length} Fazenda(s) Vinculada(s)`
                      : 'Selecione para puxar custos...'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px]">
                  {fazendas.map((f) => (
                    <DropdownMenuCheckboxItem
                      key={f.id}
                      checked={selectedFarms.includes(f.id)}
                      onCheckedChange={(c) => {
                        if (c) setSelectedFarms([...selectedFarms, f.id])
                        else setSelectedFarms(selectedFarms.filter((id) => id !== f.id))
                      }}
                    >
                      {f.nome}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {farmCost > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Custo calculado de nutrição/manejo:</span>
                  <span className="font-semibold text-rose-500">
                    + R$ {farmCost.toFixed(2)}/cab
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl p-6 border flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Resultado da Projeção
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Rendimento Estimado (50%)</span>
                <span className="font-medium">{results.arrobas.toFixed(1)} @</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Receita Bruta Projetada</span>
                <span className="font-medium">
                  R${' '}
                  {results.revenue.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Custo Base de Produção</span>
                <span className="font-medium text-destructive">
                  - R${' '}
                  {productionCost.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {farmCost > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">
                    Custos Operacionais (Fazendas)
                  </span>
                  <span className="font-medium text-destructive">
                    - R${' '}
                    {farmCost.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-end pt-3">
                <span className="font-bold text-base">Lucro Líquido Estimado</span>
                <div className="text-right">
                  <span
                    className={cn(
                      'font-bold text-2xl tracking-tight',
                      results.profit >= 0
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : 'text-destructive',
                    )}
                  >
                    R${' '}
                    {results.profit.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <div
                    className={cn(
                      'text-xs font-semibold flex items-center justify-end gap-1 mt-1',
                      results.margin >= 0
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : 'text-destructive',
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> Margem: {results.margin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full mt-6 gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Salvar Simulação no Histórico
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
