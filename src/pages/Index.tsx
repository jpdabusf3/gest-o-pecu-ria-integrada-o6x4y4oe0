import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, Plus, Beef, Wallet, TrendingUp, TrendingDown, Map } from 'lucide-react'
import { dashboardData, herdSummary, productionGoals, farmRegistry } from '@/data/mock'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { DistributionChart } from '@/components/charts/DistributionChart'
import { SectorCalendarTab } from '@/components/sector/SectorCalendarTab'
import { useToast } from '@/hooks/use-toast'

function GoalDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleSave = () => {
    toast({ title: 'Meta salva', description: 'Sua nova meta foi adicionada ao painel.' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir Nova Meta de Produção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título da Meta</Label>
            <Input placeholder="Ex: Ganho de Peso Médio" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alvo Numérico</Label>
              <Input type="number" placeholder="Ex: 1.5" />
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select defaultValue="mensal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">
            Salvar Meta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Index() {
  return (
    <div className="space-y-6 pb-20 sm:pb-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Geral</h2>
          <p className="text-muted-foreground mt-1">Visão consolidada da operação agropecuária.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Animais
            </CardTitle>
            <Beef className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.animais}</div>
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
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lotação Média
            </CardTitle>
            <Map className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboardData.kpis.animais / farmRegistry.areaPastagem).toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
              Cab / Hectare
            </p>
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

      {/* Resumo do Rebanho (Herd Statement) */}
      <Card className="col-span-full bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Resumo do Rebanho (Movimentação do Mês)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors">
              <span className="text-3xl font-bold text-primary">{herdSummary.entradas}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                Entradas
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Compras / Transf.
              </span>
            </div>
            <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors">
              <span className="text-3xl font-bold text-primary">{herdSummary.nascimentos}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                Nascimentos
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">Na fazenda</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-destructive/5 rounded-xl border border-destructive/10 hover:bg-destructive/10 transition-colors">
              <span className="text-3xl font-bold text-destructive">{herdSummary.saidas}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                Saídas
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">Vendas / Abate</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors">
              <span className="text-3xl font-bold text-foreground">{herdSummary.mortalidade}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                Mortalidade
              </span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Óbitos registrados
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Metas de Produção</CardTitle>
              <GoalDialog />
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {productionGoals.map((goal) => {
                const percentage = Math.min((goal.current / goal.target) * 100, 100)
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-end text-sm">
                      <div className="space-y-1">
                        <span className="font-medium block leading-tight">{goal.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {goal.period}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {goal.current} / {goal.target} {goal.unit}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-lg font-bold tracking-tight mb-2">Calendário Operacional Mestre</h3>
          <SectorCalendarTab sectorId="all" />
        </div>
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
