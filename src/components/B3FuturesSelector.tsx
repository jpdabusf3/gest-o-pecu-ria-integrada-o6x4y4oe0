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
import { TrendingDown, TrendingUp, Minus, LineChart } from 'lucide-react'
import { b3FuturesData } from '@/data/market'
import { cn } from '@/lib/utils'

interface B3FuturesSelectorProps {
  onSelectPrice?: (id: string, price: number, label: string) => void
}

export function B3FuturesSelector({ onSelectPrice }: B3FuturesSelectorProps) {
  const [commodity, setCommodity] = useState<'boi-gordo' | 'milho' | 'soja'>('boi-gordo')
  const [contract, setContract] = useState<string>(b3FuturesData['boi-gordo'][0].ticker)

  const selectedData =
    b3FuturesData[commodity].find((c) => c.ticker === contract) || b3FuturesData[commodity][0]

  useEffect(() => {
    // Make sure contract matches commodity when commodity changes
    const validContracts = b3FuturesData[commodity].map((c) => c.ticker)
    if (!validContracts.includes(contract)) {
      setContract(b3FuturesData[commodity][0].ticker)
    }
  }, [commodity, contract])

  const handleContractSelect = (val: string) => {
    setContract(val)
    const data = b3FuturesData[commodity].find((c) => c.ticker === val)
    if (data && onSelectPrice && commodity === 'boi-gordo') {
      onSelectPrice(data.ticker, data.price, `B3 ${data.ticker}`)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
          <LineChart className="h-4 w-4" />
          Mercado Futuro (B3)
        </CardTitle>
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
                {b3FuturesData[commodity].map((c) => (
                  <SelectItem key={c.ticker} value={c.ticker}>
                    {c.month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-center items-center bg-muted/30 rounded-lg p-4 border h-[106px]">
            <Badge variant="outline" className="mb-2 bg-background border-primary/20 text-primary">
              Ticker: {selectedData.ticker}
            </Badge>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">R$ {selectedData.price.toFixed(2)}</span>
              <span
                className={cn(
                  'text-sm font-medium flex items-center gap-0.5',
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
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
              {commodity === 'boi-gordo' ? 'por Arroba (@)' : 'por Saca (60kg)'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
