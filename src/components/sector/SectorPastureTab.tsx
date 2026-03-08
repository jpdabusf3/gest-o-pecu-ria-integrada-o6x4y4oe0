import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Leaf, Info, DollarSign } from 'lucide-react'
import { pasturesData, sectorData } from '@/data/mock'

export function SectorPastureTab({ sectorId }: { sectorId: string }) {
  const sectorPastures = pasturesData.filter((p) => p.sector === sectorId || p.sector === 'todos')
  const [pastures, setPastures] = useState(sectorPastures)

  const sectorLotes = sectorData[sectorId as keyof typeof sectorData]?.lotes || []
  const [lotes, setLotes] = useState(sectorLotes)

  const handleScoreChange = (id: number, score: string) => {
    setPastures((prev) => prev.map((p) => (p.id === id ? { ...p, score: parseInt(score) } : p)))
  }

  const handleSupplementChange = (loteId: string, field: string, value: string) => {
    setLotes((prev) =>
      prev.map((l) => {
        if (l.id === loteId) {
          const parsed = parseFloat(value)
          return {
            ...l,
            supplement: {
              ...l.supplement,
              [field]: field === 'name' ? value : isNaN(parsed) ? 0 : parsed,
            },
          }
        }
        return l
      }),
    )
  }

  const getScoreStatus = (score: number) => {
    if (score === 1) return { label: 'Remover Animais', variant: 'destructive' as const }
    if (score === 3) return { label: 'Manter Lote', variant: 'secondary' as const }
    if (score === 5) return { label: 'Entrada / Aumentar Lote', variant: 'default' as const }
    return { label: '-', variant: 'outline' as const }
  }

  const restedPastures = pastures.filter(
    (p) => p.daysOfRest > 0 && p.daysOfRest >= p.optimalRestDuration,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            Manejo de Pastagens (Escore e Descanso)
          </CardTitle>
          <CardDescription>
            Avalie o escore das pastagens (1, 3 ou 5) e monitore o período de descanso para otimizar
            o pastejo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {restedPastures.length > 0 && (
            <div className="space-y-3 mb-6">
              {restedPastures.map((p) => (
                <Alert
                  key={p.id}
                  className="bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                >
                  <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-300">
                    Pasto Pronto: {p.nome}
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    O pasto atingiu <strong>{p.daysOfRest} dias</strong> de descanso (Meta:{' '}
                    {p.optimalRestDuration} dias). Lotação recomendada para entrada:{' '}
                    <strong>{p.recommendedLotSize} cabeças</strong>.
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasto</TableHead>
                  <TableHead>Área (ha)</TableHead>
                  <TableHead>Escore (1-5)</TableHead>
                  <TableHead>Ação Recomendada</TableHead>
                  <TableHead>Descanso (Dias / Meta)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastures.map((p) => {
                  const status = getScoreStatus(p.score)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.area}</TableCell>
                      <TableCell>
                        <Select
                          value={p.score.toString()}
                          onValueChange={(val) => handleScoreChange(p.id, val)}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              p.daysOfRest >= p.optimalRestDuration
                                ? 'text-green-600 font-medium'
                                : ''
                            }
                          >
                            {p.daysOfRest}
                          </span>
                          <span className="text-muted-foreground">/ {p.optimalRestDuration}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {pastures.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhum pasto associado a este setor.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Controle de Suplementação por Lote
          </CardTitle>
          <CardDescription>
            Acompanhe o consumo diário e os custos de suplementação/ração para cada lote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Cabeças</TableHead>
                  <TableHead>Suplemento / Ração</TableHead>
                  <TableHead>Custo (R$/kg)</TableHead>
                  <TableHead>Consumo (kg/cab/dia)</TableHead>
                  <TableHead className="text-right">Invest. Cab/Dia</TableHead>
                  <TableHead className="text-right">Invest. Lote/Dia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => {
                  const supp = lote.supplement || {
                    name: '',
                    costPerKg: 0,
                    consumptionPerAnimal: 0,
                  }
                  const investCab = supp.costPerKg * supp.consumptionPerAnimal
                  const investLote = investCab * lote.cabecas
                  return (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.id}</TableCell>
                      <TableCell>{lote.cabecas}</TableCell>
                      <TableCell>
                        <Input
                          value={supp.name}
                          onChange={(e) => handleSupplementChange(lote.id, 'name', e.target.value)}
                          className="w-[180px] h-8"
                          placeholder="Ex: Sal Mineral"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={supp.costPerKg || ''}
                          onChange={(e) =>
                            handleSupplementChange(lote.id, 'costPerKg', e.target.value)
                          }
                          className="w-[100px] h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={supp.consumptionPerAnimal || ''}
                          onChange={(e) =>
                            handleSupplementChange(lote.id, 'consumptionPerAnimal', e.target.value)
                          }
                          className="w-[100px] h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(investCab)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(investLote)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
