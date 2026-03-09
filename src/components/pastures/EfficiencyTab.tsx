import { useMemo } from 'react'
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
import { pasturesData, sectorData } from '@/data/mock'
import { TrendingUp, Coins, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EfficiencyTab() {
  const allLots = useMemo(
    () => [...sectorData.cria.lotes, ...sectorData.recria.lotes, ...sectorData.engorda.lotes],
    [],
  )

  const efficiencyData = useMemo(() => {
    return pasturesData
      .map((pasto) => {
        const occupant = allLots.find((l) => l.id === pasto.ocupanteAtual)
        const daysOccupied = occupant ? Math.floor(Math.random() * 40) + 15 : 0
        const totalMaintenanceCost = pasto.area * 85

        let heads = occupant?.cabecas || 0
        let costPerHeadDay =
          heads > 0 && daysOccupied > 0 ? totalMaintenanceCost / (heads * daysOccupied) : 0

        let weightGain = 0
        let valueGenerated = 0

        if (occupant) {
          const gmd = pasto.sector === 'recria' ? 0.6 : pasto.sector === 'engorda' ? 1.1 : 0.3
          weightGain = heads * gmd * daysOccupied
          valueGenerated = (weightGain / 30) * 265.5
        }

        const roi =
          totalMaintenanceCost > 0 && valueGenerated > 0
            ? ((valueGenerated - totalMaintenanceCost) / totalMaintenanceCost) * 100
            : 0

        return {
          ...pasto,
          occupantId: occupant?.id || 'Vazio',
          heads,
          daysOccupied,
          totalMaintenanceCost,
          costPerHeadDay,
          weightGain,
          valueGenerated,
          roi,
        }
      })
      .sort((a, b) => b.roi - a.roi)
  }, [allLots])

  return (
    <Card className="animate-fade-in mt-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-600" /> Relatório de Eficiência de Pasto
          (Custo-Benefício)
        </CardTitle>
        <CardDescription>
          Integração entre tempo de ocupação da área (`MapaPropriedade`) e custos aplicados
          (`Financeiro`), determinando o Retorno sobre Investimento (ROI) estimado pelo ganho de
          peso.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pasto / Piquete</TableHead>
              <TableHead>Ocupação</TableHead>
              <TableHead className="text-right">Custo Manutenção</TableHead>
              <TableHead className="text-right">Custo Cab/Dia</TableHead>
              <TableHead className="text-right">Ganho Estimado (@)</TableHead>
              <TableHead className="text-right">Valor Gerado</TableHead>
              <TableHead className="text-center">ROI (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {efficiencyData.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium text-sm">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.area} ha • {p.cultivar}
                  </div>
                </TableCell>
                <TableCell>
                  {p.occupantId !== 'Vazio' ? (
                    <div>
                      <div className="font-semibold text-xs">
                        {p.occupantId} ({p.heads} cab)
                      </div>
                      <div className="text-[10px] text-muted-foreground">{p.daysOccupied} dias</div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Em Descanso
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-destructive font-medium">
                  R$ {p.totalMaintenanceCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {p.costPerHeadDay > 0 ? `R$ ${p.costPerHeadDay.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {p.weightGain > 0 ? (
                    <div className="flex items-center justify-end gap-1 text-emerald-600 font-medium">
                      <TrendingUp className="h-3 w-3" /> {(p.weightGain / 30).toFixed(1)} @
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {p.valueGenerated > 0
                    ? `R$ ${p.valueGenerated.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                    : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {p.roi !== 0 ? (
                    <Badge
                      variant={p.roi > 0 ? 'default' : 'destructive'}
                      className={cn(p.roi > 0 && 'bg-emerald-500 hover:bg-emerald-600')}
                    >
                      {p.roi > 0 ? '+' : ''}
                      {p.roi.toFixed(1)}%
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
