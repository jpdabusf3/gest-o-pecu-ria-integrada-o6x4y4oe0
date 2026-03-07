import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Beef,
  Wallet,
  Syringe,
  WifiOff,
} from 'lucide-react'
import { dashboardData, inventoryData, sanitaryEvents } from '@/data/mock'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { DistributionChart } from '@/components/charts/DistributionChart'

export default function Index() {
  const inventoryAlerts = Object.values(inventoryData)
    .flat()
    .filter((item) => item.qtd < item.minQtd)
    .map((item) => ({
      id: `inv-${item.id}`,
      title: `Estoque Crítico: ${item.item}`,
      desc: `A quantidade atual (${item.qtd} ${item.unidade}) está abaixo do mínimo aceitável (${item.minQtd}).`,
      type: 'destructive',
    }))

  const sanitaryAlerts = sanitaryEvents
    .filter((event) => event.status === 'Atrasado')
    .map((event) => ({
      id: event.id,
      title: `Sanidade Atrasada: ${event.title}`,
      desc: `O protocolo para o lote ${event.lote} encontra-se pendente.`,
      type: 'destructive',
    }))

  const allAlerts = [...dashboardData.alerts, ...inventoryAlerts, ...sanitaryAlerts]

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h2>
          <p className="text-muted-foreground mt-1">Visão consolidada da operação agropecuária.</p>
        </div>

        {/* PWA / Offline Indicator Simulation */}
        <div className="hidden sm:flex items-center text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
          Acesso Offline Habilitado
        </div>
      </div>

      {allAlerts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {allAlerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.type as any}
              className="hover-lift bg-background shadow-sm border-l-4 border-l-destructive"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
              <AlertDescription>{alert.desc}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Acesso Rápido - Touch Friendly for Mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 shadow-sm hover:border-primary/50"
          asChild
        >
          <Link to="/sanidade">
            <Syringe className="h-5 w-5 text-primary" />
            <span className="text-xs">Sanidade</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 shadow-sm hover:border-primary/50"
          asChild
        >
          <Link to="/estoque">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-xs">Estoque</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 shadow-sm hover:border-primary/50"
          asChild
        >
          <Link to="/financeiro">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-xs">Finanças</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-16 flex flex-col items-center justify-center gap-1 shadow-sm hover:border-primary/50"
          asChild
        >
          <Link to="/pastos">
            <Beef className="h-5 w-5 text-primary" />
            <span className="text-xs">Pastos</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Animais
            </CardTitle>
            <Beef className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.animais}</div>
            <p className="text-xs text-muted-foreground mt-1">+12% a/a</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Estimado
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.valorTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Base arroba atual</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboardData.kpis.receitaMes}</div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas Mês
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dashboardData.kpis.despesasMes}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-2 min-h-[300px]">
            <CashflowChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Distribuição Rebanho</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-2 min-h-[300px]">
            <DistributionChart />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
