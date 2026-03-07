import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, TrendingUp, TrendingDown, Beef, Wallet } from 'lucide-react'
import { dashboardData, inventoryData } from '@/data/mock'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { DistributionChart } from '@/components/charts/DistributionChart'

export default function Index() {
  const inventoryAlerts = Object.values(inventoryData)
    .flat()
    .filter((item) => item.qtd < item.minQtd)
    .map((item) => ({
      id: `inv-${item.id}`,
      title: `Estoque Crítico: ${item.item}`,
      desc: `A quantidade atual (${item.qtd} ${item.unidade}) está abaixo do limite mínimo aceitável (${item.minQtd}).`,
      type: 'destructive',
    }))

  const allAlerts = [...dashboardData.alerts, ...inventoryAlerts]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h2>
        <p className="text-muted-foreground mt-1">Visão consolidada da operação agropecuária.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {allAlerts.map((alert) => (
          <Alert key={alert.id} variant={alert.type as any} className="hover-lift bg-background">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
            <AlertDescription>{alert.desc}</AlertDescription>
          </Alert>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Animais
            </CardTitle>
            <Beef className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.animais}</div>
            <p className="text-xs text-muted-foreground mt-1">+12% em relação ao ano anterior</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Estimado do Rebanho
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.valorTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Baseado na arroba atual</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboardData.kpis.receitaMes}</div>
            <p className="text-xs text-muted-foreground mt-1">+4.5% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas do Mês
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dashboardData.kpis.despesasMes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dentro do orçamento projetado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Receitas vs Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            <CashflowChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Distribuição do Rebanho</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            <DistributionChart />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.activities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{act.action}</p>
                  <p className="text-sm text-muted-foreground">{act.time}</p>
                </div>
                <div
                  className={`text-sm font-medium ${act.type === 'receita' ? 'text-primary' : act.type === 'despesa' ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {act.amount}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
