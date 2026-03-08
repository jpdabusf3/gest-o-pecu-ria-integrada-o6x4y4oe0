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
import {
  Activity,
  Plus,
  Beef,
  Wallet,
  TrendingUp,
  TrendingDown,
  Map,
  LineChart,
  MapPinned,
  BellRing,
} from 'lucide-react'
import { dashboardData, herdSummary, productionGoals, farmRegistry } from '@/data/mock'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { DistributionChart } from '@/components/charts/DistributionChart'
import { SectorCalendarTab } from '@/components/sector/SectorCalendarTab'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { OperatorDashboard } from '@/components/OperatorDashboard'
import { Link } from 'react-router-dom'
import useAnimalStore from '@/stores/useAnimalStore'
import useFazendaStore from '@/stores/useFazendaStore'
import useAnimalTargetsStore from '@/stores/useAnimalTargetsStore'

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
  const { user } = useAuth()
  const { animais } = useAnimalStore()
  const { fazendas } = useFazendaStore()
  const { targets } = useAnimalTargetsStore()

  if (user.role === 'operador') {
    return <OperatorDashboard />
  }

  const farmCounts = fazendas.map((f) => ({
    nome: f.nome,
    count: animais
      .filter((a) => a.fazendaDestinoId === f.id)
      .reduce((sum, a) => sum + a.quantidade, 0),
  }))

  const weightCorte = animais
    .filter((a) => a.categoria === 'Corte')
    .reduce((sum, a) => sum + a.pesoMedio * a.quantidade, 0)

  const weightRepro = animais
    .filter((a) => a.categoria === 'Reprodução')
    .reduce((sum, a) => sum + a.pesoMedio * a.quantidade, 0)

  const readyAnimals = animais.filter(
    (a) =>
      a.categoria === 'Corte' &&
      (a.pesoMedio >= targets.pesoAlvoCorte ||
        (a.idadeMeses && a.idadeMeses >= targets.idadeAlvoMesesCorte)),
  )

  return (
    <div className="space-y-6 pb-20 sm:pb-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Pecuária Inteligente F3
          </h2>
          <p className="text-muted-foreground mt-1">Visão consolidada da operação agropecuária.</p>
        </div>
        <Button asChild className="gap-2 w-full sm:w-auto shadow-sm">
          <Link to="/bi">
            <LineChart className="h-4 w-4" />
            Acessar BI Dinâmico
          </Link>
        </Button>
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

      {/* Livestock Intelligence Dashboard Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPinned className="h-4 w-4" /> Distribuição por Fazenda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {farmCounts.length > 0 ? (
              farmCounts.map((f, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="truncate mr-2">{f.nome}</span>
                  <span className="font-bold">{f.count} cb</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Sem dados</span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Beef className="h-4 w-4" /> Peso Total por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Corte</span>
              <span className="font-bold">{(weightCorte / 1000).toFixed(1)} t</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Reprodução</span>
              <span className="font-bold">{(weightRepro / 1000).toFixed(1)} t</span>
            </div>
          </CardContent>
        </Card>

        {readyAnimals.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30 sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <BellRing className="h-4 w-4" /> Alerta: Prontos p/ Abate/Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2 text-amber-700/80">
                Existem <strong>{readyAnimals.reduce((sum, a) => sum + a.quantidade, 0)}</strong>{' '}
                animais atingindo o peso alvo ({targets.pesoAlvoCorte}kg) ou idade (
                {targets.idadeAlvoMesesCorte}m).
              </p>
              <div className="max-h-20 overflow-y-auto space-y-1 pr-2">
                {readyAnimals.map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between items-center text-xs bg-amber-500/20 p-1.5 rounded text-amber-900"
                  >
                    <span>Lote/Animal: {a.id.split('-')[0]}</span>
                    <span className="font-semibold">
                      {a.quantidade} cb - {a.pesoMedio}kg
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
