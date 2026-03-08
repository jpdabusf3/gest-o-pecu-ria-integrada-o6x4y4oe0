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

export default function ProjecaoVendas() {
  const [arrobaPrice, setArrobaPrice] = useState<number>(240)
  const [targetWeight, setTargetWeight] = useState<number>(540) // ~ 18 arrobas

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
        origin: 'Pasto/Suplemento',
      })),
    ],
    [],
  )

  const projections = useMemo(() => {
    return lots
      .map((lot) => {
        const weightToGain = Math.max(0, targetWeight - lot.pesoMedio)
        const daysNeeded = weightToGain > 0 ? Math.ceil(weightToGain / lot.gmd) : 0

        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + daysNeeded)

        const targetArrobas = targetWeight / 30 // live weight / 30 = arroba equivalent
        const projRevenue = targetArrobas * arrobaPrice * lot.cabecas

        return {
          ...lot,
          daysNeeded,
          targetDate: targetDate.toLocaleDateString('pt-BR'),
          projRevenue,
        }
      })
      .sort((a, b) => a.daysNeeded - b.daysNeeded)
  }, [lots, arrobaPrice, targetWeight])

  const totalRevenue = projections.reduce((acc, curr) => acc + curr.projRevenue, 0)
  const readyLots = projections.filter((p) => p.daysNeeded <= 30).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Dashboard de Inteligência de Vendas (AI)
        </h2>
        <p className="text-muted-foreground mt-1">
          Projeções de abate baseadas no GMD dos lotes e simulação de precificação de mercado em
          tempo real.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Preço da Arroba Atual (R$)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <Input
                type="number"
                value={arrobaPrice}
                onChange={(e) => setArrobaPrice(Number(e.target.value))}
                className="text-2xl font-bold h-12 w-full bg-background border-primary/30 shadow-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ajuste variável para simular cenários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peso Alvo para Abate (kg)
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

        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">
              Receita Total Projetada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              R${' '}
              {totalRevenue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1 font-medium">
              {readyLots} lotes prontos para envio em até 30 dias
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote (Cabeças)</TableHead>
                  <TableHead>Sistema de Origem</TableHead>
                  <TableHead className="text-right">Peso Atual / GMD</TableHead>
                  <TableHead className="text-center">Dias para Alvo</TableHead>
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
                      <div className="font-medium text-primary">{p.id}</div>
                      <div className="text-xs text-muted-foreground">{p.cabecas} cabeças</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.origin}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">{p.pesoMedio} kg</div>
                      <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" /> {p.gmd} kg/dia
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.daysNeeded === 0 ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-500 hover:bg-emerald-600 border-transparent"
                        >
                          Pronto
                        </Badge>
                      ) : (
                        <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                          {p.daysNeeded} dias
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
