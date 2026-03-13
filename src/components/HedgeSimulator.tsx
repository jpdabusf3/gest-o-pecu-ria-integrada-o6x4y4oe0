import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Calculator, ArrowRightCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface HedgeSimulatorProps {
  onConvertToReal: (data: any) => void
}

export function HedgeSimulator({ onConvertToReal }: HedgeSimulatorProps) {
  const [arrobas, setArrobas] = useState<number>(3300)
  const [futureB3, setFutureB3] = useState<number>(270.0)
  const [basisLocal, setBasisLocal] = useState<number>(-5.0)

  const [putStrike, setPutStrike] = useState<number>(260.0)
  const [putPremium, setPutPremium] = useState<number>(5.0)

  const [callStrike, setCallStrike] = useState<number>(280.0)
  const [callPremium, setCallPremium] = useState<number>(3.0)

  // 3 Scenarios
  const scenarios = [
    { name: 'Pessimista (-20%)', price: futureB3 * 0.8 },
    { name: 'Realista (Estável)', price: futureB3 },
    { name: 'Otimista (+20%)', price: futureB3 * 1.2 },
  ]

  // Matrix generation for 4 strategies
  const results = scenarios.map((s) => {
    // 1. Sem Hedge
    const noHedge = s.price * arrobas

    // 2. Compra de Put (Seguro Piso)
    const putRev = Math.max(s.price, putStrike) * arrobas
    const putNet = putRev - putPremium * arrobas

    // 3. Collar (Put + Call)
    const collarRev = Math.min(Math.max(s.price, putStrike), callStrike) * arrobas
    const collarNet = collarRev - (putPremium - callPremium) * arrobas

    // 4. Futuro (Trava exata)
    const futureNet = (futureB3 + basisLocal) * arrobas

    return {
      scenario: s.name,
      marketPrice: s.price,
      noHedge,
      putNet,
      collarNet,
      futureNet,
    }
  })

  return (
    <Card className="border-primary/20 shadow-sm animate-fade-in-up mt-2">
      <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Calculator className="h-5 w-5" /> Simulador Interativo de Estratégias de Proteção
        </CardTitle>
        <CardDescription>
          Compare financeiramente as opções de mitigação de risco (Sem Hedge, Put, Collar e Venda de
          Futuro) para os cenários projetados.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 rounded-xl bg-muted/30 border">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold border-b pb-2">1. Volume e Preços Base</h4>
            <div className="space-y-2">
              <Label className="text-xs">Volume (@ Projetadas)</Label>
              <Input
                type="number"
                value={arrobas}
                onChange={(e) => setArrobas(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Preço Futuro B3 Alvo (R$)</Label>
              <Input
                type="number"
                value={futureB3}
                onChange={(e) => setFutureB3(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Basis Local Estimado (R$)</Label>
              <Input
                type="number"
                value={basisLocal}
                onChange={(e) => setBasisLocal(Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold border-b pb-2">2. Seguro de Baixa (Put)</h4>
            <div className="space-y-2">
              <Label className="text-xs">Strike Put (Piso R$)</Label>
              <Input
                type="number"
                value={putStrike}
                onChange={(e) => setPutStrike(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prêmio Put a Pagar (R$)</Label>
              <Input
                type="number"
                value={putPremium}
                onChange={(e) => setPutPremium(Number(e.target.value))}
                className="h-8 text-destructive"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold border-b pb-2">
              3. Limite de Alta (Call - p/ Collar)
            </h4>
            <div className="space-y-2">
              <Label className="text-xs">Strike Call (Teto R$)</Label>
              <Input
                type="number"
                value={callStrike}
                onChange={(e) => setCallStrike(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prêmio Call a Receber (R$)</Label>
              <Input
                type="number"
                value={callPremium}
                onChange={(e) => setCallPremium(Number(e.target.value))}
                className="h-8 text-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col justify-end">
            <div className="p-3 bg-background rounded-md border text-sm text-center">
              <span className="text-muted-foreground block text-xs">Custo Líquido Collar (@)</span>
              <span className="font-bold text-primary text-base">
                R$ {(putPremium - callPremium).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            Matriz de Resultados Líquidos Totais
          </h3>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Cenário de Mercado</TableHead>
                  <TableHead className="text-right">Sem Hedge (Exposto)</TableHead>
                  <TableHead className="text-right bg-blue-500/5">Compra de Put</TableHead>
                  <TableHead className="text-right bg-purple-500/5">Collar (Put+Call)</TableHead>
                  <TableHead className="text-right bg-amber-500/5">Venda Futuro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row.scenario}
                      <br />
                      <span className="text-xs text-muted-foreground font-normal">
                        B3 Acerto: {formatCurrency(row.marketPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.noHedge)}
                    </TableCell>
                    <TableCell className="text-right bg-blue-500/5 font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(row.putNet)}
                    </TableCell>
                    <TableCell className="text-right bg-purple-500/5 font-bold text-purple-700 dark:text-purple-400">
                      {formatCurrency(row.collarNet)}
                    </TableCell>
                    <TableCell className="text-right bg-amber-500/5 font-bold text-amber-700 dark:text-amber-500">
                      {formatCurrency(row.futureNet)}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className="bg-muted/30">
                  <TableCell className="font-semibold text-xs py-2 uppercase tracking-wider">
                    Ação Operacional
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" disabled size="sm" className="h-8 text-xs">
                      Exposição Total
                    </Button>
                  </TableCell>
                  <TableCell className="text-right py-2 bg-blue-500/5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 border-blue-200 hover:bg-blue-50"
                      onClick={() =>
                        onConvertToReal({
                          type: 'Put',
                          strikePrice: putStrike,
                          premiumPaid: putPremium,
                          quantityArrobas: arrobas,
                          basisLocal,
                        })
                      }
                    >
                      Executar Put <ArrowRightCircle className="h-3 w-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right py-2 bg-purple-500/5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 border-purple-200 hover:bg-purple-50"
                      onClick={() =>
                        onConvertToReal({
                          type: 'Collar',
                          strikePrice: putStrike,
                          premiumPaid: putPremium - callPremium,
                          quantityArrobas: arrobas,
                          basisLocal,
                        })
                      }
                    >
                      Executar Collar <ArrowRightCircle className="h-3 w-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right py-2 bg-amber-500/5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 border-amber-200 hover:bg-amber-50"
                      onClick={() =>
                        onConvertToReal({
                          type: 'Futuro',
                          strikePrice: futureB3,
                          premiumPaid: 0,
                          quantityArrobas: arrobas,
                          basisLocal,
                        })
                      }
                    >
                      Travar Futuro <ArrowRightCircle className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
