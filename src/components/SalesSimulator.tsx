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
import { useFarm } from '@/contexts/FarmContext'
import useSimulationStore from '@/stores/useSimulationStore'
import useFazendaStore from '@/stores/useFazendaStore'
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Save,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function SalesSimulator() {
  const { marketData } = useMarket()
  const { addSimulation } = useSimulationStore()
  const { fazendas } = useFazendaStore()
  const { lots } = useFarm()
  const { toast } = useToast()

  // 1. Origem / Lote
  const [selectedLote, setSelectedLote] = useState<string>('manual')
  const [quantity, setQuantity] = useState<number>(100)
  const [animalCategory, setAnimalCategory] = useState<string>('Boi Gordo')

  // 2. Entrada / Compra
  const [initialWeight, setInitialWeight] = useState<number>(250)
  const [entryYield, setEntryYield] = useState<number>(50)
  const [purchaseCostPerHead, setPurchaseCostPerHead] = useState<number>(1800)

  // 3. Custos Operacionais
  const [otherCosts, setOtherCosts] = useState<number>(350)
  const [selectedFarms, setSelectedFarms] = useState<string[]>([])

  // 4. Saída / Venda
  const [finalWeight, setFinalWeight] = useState<number>(540)
  const [saleYield, setSaleYield] = useState<number>(52)
  const [saleIndicator, setSaleIndicator] = useState<string>(marketData[0]?.id || '')
  const [salePrice, setSalePrice] = useState<number>(marketData[0]?.price || 265.5)

  const lastMarketPrice = useRef<number>(marketData[0]?.price || 265.5)

  // Sync indicator price
  useEffect(() => {
    if (saleIndicator !== 'manual') {
      const ind = marketData.find((m) => m.id === saleIndicator)
      if (ind && ind.price !== lastMarketPrice.current) {
        setSalePrice(ind.price)
        lastMarketPrice.current = ind.price
      }
    }
  }, [marketData, saleIndicator])

  const handleLoteChange = (val: string) => {
    setSelectedLote(val)
    if (val !== 'manual') {
      const lote = lots.find((l) => l.id === val)
      if (lote) {
        setQuantity(lote.cabecas)
        setAnimalCategory(lote.categoria)
        setInitialWeight(lote.pesoMedio)

        const guess = marketData.find((m) =>
          m.id.toLowerCase().includes(lote.categoria.split(' ')[0].toLowerCase().replace(/s$/, '')),
        )
        if (guess) {
          setSaleIndicator(guess.id)
          setSalePrice(guess.price)
        }
      }
    }
  }

  const handleSaleIndicatorChange = (val: string) => {
    setSaleIndicator(val)
    if (val !== 'manual') {
      const ind = marketData.find((m) => m.id === val)
      if (ind) {
        setSalePrice(ind.price)
        lastMarketPrice.current = ind.price
      }
    }
  }

  const entryArrobas = useMemo(() => {
    return (initialWeight * (entryYield / 100)) / 15
  }, [initialWeight, entryYield])

  const purchaseCostPerArroba = useMemo(() => {
    return entryArrobas > 0 ? purchaseCostPerHead / entryArrobas : 0
  }, [purchaseCostPerHead, entryArrobas])

  const handlePurchaseCostPerArrobaChange = (val: number) => {
    const arr = (initialWeight * (entryYield / 100)) / 15
    setPurchaseCostPerHead(val * arr)
  }

  const farmCostPerHead = useMemo(() => {
    if (selectedFarms.length === 0) return 0
    const fms = fazendas.filter((f) => selectedFarms.includes(f.id))
    const totalCost = fms.reduce(
      (acc, f) => acc + ((f.custoNutricao || 0) + (f.custoManejo || 0)),
      0,
    )
    const totalHerd = fms.reduce((acc, f) => acc + (f.rebanho || 1), 0)
    return totalCost / (totalHerd || 1)
  }, [selectedFarms, fazendas])

  const results = useMemo(() => {
    const saleArrobasPerHead = (finalWeight * (saleYield / 100)) / 15
    const revenuePerHead = saleArrobasPerHead * salePrice
    const totalCostPerHead = purchaseCostPerHead + otherCosts + farmCostPerHead
    const profitPerHead = revenuePerHead - totalCostPerHead
    const margin = revenuePerHead > 0 ? (profitPerHead / revenuePerHead) * 100 : 0
    const roi = totalCostPerHead > 0 ? (profitPerHead / totalCostPerHead) * 100 : 0

    const totalRevenue = revenuePerHead * quantity
    const totalCost = totalCostPerHead * quantity
    const totalProfit = profitPerHead * quantity

    return {
      saleArrobasPerHead,
      revenuePerHead,
      totalCostPerHead,
      profitPerHead,
      margin,
      roi,
      totalRevenue,
      totalCost,
      totalProfit,
    }
  }, [
    finalWeight,
    saleYield,
    salePrice,
    purchaseCostPerHead,
    otherCosts,
    farmCostPerHead,
    quantity,
  ])

  const handleSave = () => {
    addSimulation({
      category: animalCategory,
      weight: finalWeight,
      salesPrice: salePrice,
      productionCost: purchaseCostPerHead + otherCosts,
      farmCost: farmCostPerHead,
      arrobas: results.saleArrobasPerHead,
      revenue: results.revenuePerHead,
      profit: results.profitPerHead,
      margin: results.margin,
      farmIds: selectedFarms,

      quantity,
      initialWeight,
      entryYield,
      purchaseCostPerHead,
      otherCostsPerHead: otherCosts,
      finalWeight,
      saleYield,
      saleArrobasPerHead: results.saleArrobasPerHead,
      revenuePerHead: results.revenuePerHead,
      profitPerHead: results.profitPerHead,
      roi: results.roi,
      totalRevenue: results.totalRevenue,
      totalCost: results.totalCost,
      totalProfit: results.totalProfit,
      loteId: selectedLote !== 'manual' ? selectedLote : undefined,
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
          Simulador Avançado de Cenários (Padrão Zootécnico)
        </CardTitle>
        <CardDescription>
          Simule a rentabilidade por animal e por lote, ajustando peso de entrada, rendimento de
          carcaça e custos globais operacionais.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 space-y-6">
            {/* Bloco 1: Origem */}
            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-border/60 pb-3">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" /> 1. Origem e Rebanho
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                <div className="space-y-2">
                  <Label>Lote / Referência</Label>
                  <Select value={selectedLote} onValueChange={handleLoteChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Simulação Manual</SelectItem>
                      {lots.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.id} ({l.cabecas} cab.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade (cab.)</Label>
                  <Input
                    type="number"
                    className="bg-background"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria Animal</Label>
                  <Input
                    className="bg-background"
                    value={animalCategory}
                    onChange={(e) => setAnimalCategory(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Entrada */}
            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-border/60 pb-3">
                <ArrowDownToLine className="h-4 w-4 text-blue-500" /> 2. Entrada / Aquisição
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
                <div className="space-y-2">
                  <Label>Peso Inicial (kg)</Label>
                  <Input
                    type="number"
                    className="bg-background"
                    value={initialWeight}
                    onChange={(e) => setInitialWeight(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rend. Carcaça Entrada (%)</Label>
                  <Input
                    type="number"
                    className="bg-background"
                    value={entryYield}
                    onChange={(e) => setEntryYield(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo Aquisição (R$/cab)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9 bg-background"
                      value={purchaseCostPerHead}
                      onChange={(e) => setPurchaseCostPerHead(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Custo Aquisição (R$/@)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9 bg-background"
                      value={Number(purchaseCostPerArroba.toFixed(2))}
                      onChange={(e) => handlePurchaseCostPerArrobaChange(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 3: Custos Operacionais */}
            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-border/60 pb-3">
                <PlusCircle className="h-4 w-4 text-amber-500" /> 3. Custos Operacionais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <Label>Outros Custos / Cab. (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9 bg-background"
                      value={otherCosts}
                      onChange={(e) => setOtherCosts(Number(e.target.value))}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ex: Sanidade, nutrição extra, frete, comissões.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Vincular Custo Fazenda Base</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-background"
                      >
                        {selectedFarms.length > 0
                          ? `${selectedFarms.length} Fazenda(s) Vinculada(s)`
                          : 'Opcional: Puxar custos...'}
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
                  {farmCostPerHead > 0 && (
                    <p className="text-xs text-muted-foreground flex justify-between mt-1">
                      <span>Rateio Estrutural (Nutrição/Manejo):</span>
                      <span className="font-semibold text-rose-500">
                        + R$ {farmCostPerHead.toFixed(2)}/cab
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 4: Saída */}
            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b border-border/60 pb-3">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-500" /> 4. Saída / Venda
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
                <div className="space-y-2">
                  <Label>Peso Final Abate (kg)</Label>
                  <Input
                    type="number"
                    className="bg-background"
                    value={finalWeight}
                    onChange={(e) => setFinalWeight(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rend. Carcaça Saída (%)</Label>
                  <Input
                    type="number"
                    className="bg-background"
                    value={saleYield}
                    onChange={(e) => setSaleYield(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indicador Base (Venda)</Label>
                  <Select value={saleIndicator} onValueChange={handleSaleIndicatorChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      {marketData.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preço Venda (R$/@)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-9 bg-background"
                      value={salePrice}
                      onChange={(e) => {
                        setSalePrice(Number(e.target.value))
                        setSaleIndicator('manual')
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="bg-muted/40 rounded-xl p-6 border flex flex-col justify-start h-full">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Resultado por Cabeça
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Arrobas Produzidas (@)</span>
                  <span className="font-medium">{results.saleArrobasPerHead.toFixed(1)} @</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Receita Venda / Cab.</span>
                  <span className="font-medium">
                    R${' '}
                    {results.revenuePerHead.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">
                    Custo Total (Aquisição + Operacional)
                  </span>
                  <span className="font-medium text-destructive">
                    - R${' '}
                    {results.totalCostPerHead.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-2 pb-4">
                  <span className="font-bold text-sm">Lucro Líq. / Cab.</span>
                  <div className="text-right">
                    <span
                      className={cn(
                        'font-bold text-xl tracking-tight',
                        results.profitPerHead >= 0
                          ? 'text-emerald-600 dark:text-emerald-500'
                          : 'text-destructive',
                      )}
                    >
                      R${' '}
                      {results.profitPerHead.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span
                        className={cn(
                          'text-[11px] font-semibold flex items-center gap-1',
                          results.margin >= 0
                            ? 'text-emerald-600 dark:text-emerald-500'
                            : 'text-destructive',
                        )}
                      >
                        Mg: {results.margin.toFixed(1)}%
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-semibold flex items-center gap-1',
                          results.roi >= 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-destructive',
                        )}
                      >
                        ROI: {results.roi.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-6">
                Projeção Total do Lote ({quantity} cab.)
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Receita Bruta Total</span>
                  <span className="font-medium">
                    R${' '}
                    {results.totalRevenue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Custo Total Projetado</span>
                  <span className="font-medium text-destructive">
                    - R${' '}
                    {results.totalCost.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="font-bold text-base">Lucro Líquido Global</span>
                  <span
                    className={cn(
                      'font-bold text-2xl tracking-tight',
                      results.totalProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-500'
                        : 'text-destructive',
                    )}
                  >
                    R${' '}
                    {results.totalProfit.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Button className="w-full gap-2" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Salvar Simulação no Histórico
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
