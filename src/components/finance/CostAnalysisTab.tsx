import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import { productionCostDashboard } from '@/data/mock'
import { DollarSign, Scale, TrendingDown } from 'lucide-react'

export function CostAnalysisTab() {
  return (
    <div className="space-y-6 mt-0 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Custo Total Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {productionCostDashboard.totalCost.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Arrobas Produzidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              {productionCostDashboard.totalArrobasProduced.toLocaleString('pt-BR')} @
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
              Custo Médio por @
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-500 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              R${' '}
              {productionCostDashboard.costPerArroba.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 font-medium">
              Baseado em nutrição, sanidade e mão de obra
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Custos de Produção</CardTitle>
          <CardDescription>
            Análise consolidada das despesas por categoria operacional, permitindo identificar os
            maiores ofensores de margem.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ChartContainer config={{ value: { label: 'Valor (R$)' } }} className="h-full w-full">
            <PieChart>
              <Pie
                data={productionCostDashboard.costs}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
              >
                {productionCostDashboard.costs.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(val) =>
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} className="flex-wrap pt-6" />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
