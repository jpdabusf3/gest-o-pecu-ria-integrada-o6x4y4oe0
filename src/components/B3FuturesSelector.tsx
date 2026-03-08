import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useMarket } from '@/contexts/MarketContext'
import { TrendingDown, TrendingUp, Minus, LineChart, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface B3FuturesSelectorProps {
  onSelectPrice?: (id: string, price: number, label: string) => void
}

export function B3FuturesSelector({ onSelectPrice }: B3FuturesSelectorProps) {
  const { b3Data, b3LastUpdate } = useMarket()
  const [commodity, setCommodity] = useState<'boi-gordo' | 'milho' | 'soja'>('boi-gordo')
  const [contract, setContract] = useState<string>('')

  // Initialize contract when data loads
  useEffect(() => {
    if (b3Data[commodity] && b3Data[commodity].length > 0 && !contract) {
      setContract(b3Data[commodity][0].ticker)
    }
  }, [b3Data, commodity, contract])

  // Sync valid contracts
  useEffect(() => {
    if (b3Data[commodity]) {
      const validContracts = b3Data[commodity].map((c) => c.ticker)
      if (contract && !validContracts.includes(contract)) {
        setContract(b3Data[commodity][0].ticker)
      }
    }
  }, [commodity, contract, b3Data])

  const selectedData =
    b3Data[commodity]?.find((c) => c.ticker === contract) || b3Data[commodity]?.[0]

  const handleContractSelect = (val: string) => {
    setContract(val)
    const data = b3Data[commodity].find((c) => c.ticker === val)
    if (data && onSelectPrice && commodity === 'boi-gordo') {
      onSelectPrice(data.ticker, data.price, `B3 ${data.ticker}`)
    }
  }

  if (!selectedData) return null

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <LineChart className="h-4 w-4" />
          Mercado Futuro (B3)
        </CardTitle>
        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded animate-pulse">
          <Activity className="h-3 w-3" /> AO VIVO
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Select value={commodity} onValueChange={(val: any) => setCommodity(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boi-gordo">Boi Gordo</SelectItem>
                <SelectItem value="milho">Milho</SelectItem>
                <SelectItem value="soja">Soja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={contract} onValueChange={handleContractSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                {b3Data[commodity]?.map((c) => (
                  <SelectItem key={c.ticker} value={c.ticker}>
                    {c.month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-center items-center bg-muted/30 rounded-lg p-4 border h-[106px] transition-all duration-300">
            <Badge variant="outline" className="mb-2 bg-background border-primary/20 text-primary">
              Ticker: {selectedData.ticker}
            </Badge>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold transition-all">
                R$ {selectedData.price.toFixed(2)}
              </span>
              <span
                className={cn(
                  'text-sm font-medium flex items-center gap-0.5 transition-colors',
                  selectedData.trend === 'up'
                    ? 'text-emerald-500'
                    : selectedData.trend === 'down'
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
              >
                {selectedData.trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                {selectedData.trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                {selectedData.trend === 'stable' && <Minus className="h-3.5 w-3.5" />}
                {selectedData.change}
              </span>
            </div>
            <div className="flex items-center justify-between w-full mt-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {commodity === 'boi-gordo' ? 'por Arroba (@)' : 'por Saca (60kg)'}
              </p>
              <p className="text-[9px] text-muted-foreground opacity-70">Upd: {b3LastUpdate}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
