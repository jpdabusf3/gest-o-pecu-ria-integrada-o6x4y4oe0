import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Legend,
} from 'recharts'
import { PesagemRecord } from '@/services/pesagens'
import { format, parseISO } from 'date-fns'

interface GmdEstimadoVsRealChartProps {
  pesagens: PesagemRecord[]
  gmdAlvoG: number
  rendimentoCarcacaPct?: number
  height?: number
}

export function GmdEstimadoVsRealChart({
  pesagens,
  gmdAlvoG,
  rendimentoCarcacaPct = 53.5,
  height = 280,
}: GmdEstimadoVsRealChartProps) {
  const gmdAlvoKg = gmdAlvoG / 1000

  const chartData = useMemo(() => {
    // Ordenar cronologicamente crescente
    const sorted = [...pesagens].sort(
      (a, b) => new Date(a.data_pesagem).getTime() - new Date(b.data_pesagem).getTime(),
    )

    // Filtra pesagens que possuem intervalo ou calcula ponto a ponto
    return sorted.map((p, index) => {
      const gmdReal =
        typeof p.gmd_intervalo === 'number' && p.gmd_intervalo > 0 ? p.gmd_intervalo : null
      const gdcReal =
        gmdReal !== null && rendimentoCarcacaPct > 0
          ? Number((gmdReal * (rendimentoCarcacaPct / 100)).toFixed(3))
          : null

      return {
        data: p.data_pesagem ? format(parseISO(p.data_pesagem), 'dd/MM/yy') : `P${index + 1}`,
        dataCompleta: p.data_pesagem ? format(parseISO(p.data_pesagem), 'dd/MM/yyyy') : '',
        pesoMedio: p.peso_medio_kg,
        gmdReal: gmdReal,
        gmdAlvo: Number(gmdAlvoKg.toFixed(3)),
        gdcReal: gdcReal,
        dias: p.dias_intervalo || 0,
      }
    })
  }, [pesagens, gmdAlvoKg, rendimentoCarcacaPct])

  if (chartData.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        Nenhuma pesagem registrada para traçar o gráfico de GMD.
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="data"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `${v.toFixed(2)}`}
              className="text-xs text-muted-foreground"
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  return (
                    <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-xs space-y-1">
                      <div className="font-semibold text-foreground">{d.dataCompleta}</div>
                      <div className="text-muted-foreground">
                        Peso Médio: <strong className="text-foreground">{d.pesoMedio} kg</strong>
                      </div>
                      <div className="text-emerald-600 font-medium">
                        GMD Real:{' '}
                        <strong>
                          {d.gmdReal !== null ? `${d.gmdReal.toFixed(3)} kg/d` : 'Pesagem Inicial'}
                        </strong>
                      </div>
                      <div className="text-primary font-medium">
                        GMD Estimado (Meta): <strong>{d.gmdAlvo.toFixed(3)} kg/d</strong>
                      </div>
                      {d.gdcReal !== null && (
                        <div className="text-purple-600 font-medium">
                          GDC (Carcaça): <strong>{d.gdcReal.toFixed(3)} kg/d</strong> (
                          {rendimentoCarcacaPct}%)
                        </div>
                      )}
                      {d.dias > 0 && (
                        <div className="text-muted-foreground text-[11px] pt-1">
                          Intervalo: {d.dias} dias
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
            />
            <ReferenceLine
              y={gmdAlvoKg}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Meta: ${gmdAlvoG} g/d`,
                fill: 'hsl(var(--primary))',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
            <Line
              type="monotone"
              dataKey="gmdReal"
              name="GMD Real (kg/dia)"
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7 }}
              connectNulls
            />
            {rendimentoCarcacaPct > 0 && (
              <Line
                type="monotone"
                dataKey="gdcReal"
                name="GDC Carcaça (kg/dia)"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="2 2"
                dot={{ r: 4, fill: '#8b5cf6' }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground px-2 pt-1 border-t">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> GMD Real Medido
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" /> Meta Projetada ({gmdAlvoG} g/d)
          </span>
          {rendimentoCarcacaPct > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-600" /> GDC Carcaça (
              {rendimentoCarcacaPct}%)
            </span>
          )}
        </div>
        <div>
          Semáforo: <span className="text-emerald-600 font-semibold">Verde (até 10%)</span> |{' '}
          <span className="text-amber-600 font-semibold">Amarelo (10-20%)</span> |{' '}
          <span className="text-destructive font-semibold">Vermelho (&gt;20%)</span>
        </div>
      </div>
    </div>
  )
}
