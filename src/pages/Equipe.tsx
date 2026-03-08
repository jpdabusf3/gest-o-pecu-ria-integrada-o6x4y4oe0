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
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck,
  UserCircle,
  History,
  Smartphone,
  Trophy,
  Target,
  BellRing,
} from 'lucide-react'
import {
  teamMembers,
  managementHistory,
  employeePerformance,
  performanceGoalsList,
} from '@/data/mock'
import { useAppNotifications } from '@/contexts/NotificationContext'
import { useToast } from '@/hooks/use-toast'

export default function Equipe() {
  const { addNotification } = useAppNotifications()
  const { toast } = useToast()

  const handleSimulateGoal = (employee: any) => {
    addNotification({
      title: 'Meta Atingida! 🎯',
      message: `O colaborador ${employee.name} alcançou uma nova meta de performance!`,
      type: 'goal',
    })
    toast({
      title: 'Notificação de Meta Disparada',
      description: `O administrador recebeu um push alert em tempo real sobre a conquista.`,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Equipe & Desempenho
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão de acessos, auditoria e sistema de pontuação de colaboradores para bônus.
          </p>
        </div>
        <Button className="gap-2">
          <UserCircle className="h-4 w-4" /> Convidar Colaborador
        </Button>
      </div>

      <Tabs defaultValue="acessos" className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="acessos">Controle de Acessos</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho & Metas</TabsTrigger>
        </TabsList>

        <TabsContent value="acessos" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Painel de Colaboradores</CardTitle>
                <CardDescription>
                  Acesso total para <b>Administradores</b>, restrito ao módulo de apontamentos para{' '}
                  <b>Operadores de Campo</b>.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status / Acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.role === 'Admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {m.role === 'Operador' && <Smartphone className="h-3 w-3" />}
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${m.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                            />
                            {m.lastActive}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Auditoria de Campo Recente
                </CardTitle>
                <CardDescription>
                  Ações rastreadas e vinculadas ao perfil de cada operador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {managementHistory.slice(0, 6).map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between items-start border-b pb-3 last:border-0 hover:bg-muted/30 p-2 rounded-md transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm leading-tight text-foreground">
                          {h.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Alvo: <span className="font-medium text-primary">{h.alvo}</span> •{' '}
                          {h.tipo}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <Badge variant="outline" className="text-[10px] px-1.5 mb-1 bg-background">
                          {h.responsavel}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground font-mono">{h.data}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4 text-sm text-primary">
                  Ver Relatório Completo
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="desempenho" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Ranking e Pontuação
                </CardTitle>
                <CardDescription>
                  Acúmulo de pontos para cálculo do bônus anual (Safra Pecuária) integrado aos
                  custos totais.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-center">Metas</TableHead>
                        <TableHead className="text-right">Pontos</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeePerformance.map((e) => (
                        <TableRow key={e.employeeId}>
                          <TableCell className="font-medium whitespace-nowrap">{e.name}</TableCell>
                          <TableCell className="text-center">{e.goalsAchieved}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {e.points} pts
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSimulateGoal(e)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <BellRing className="h-4 w-4 mr-1" /> Simular
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" /> Metas Ativas
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Objetivos vinculados ao sistema de recompensa.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" className="h-8">
                  Nova Meta
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceGoalsList.map((g) => (
                    <div
                      key={g.id}
                      className="flex justify-between items-center p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-sm text-foreground">{g.title}</span>
                      <Badge variant="secondary" className="whitespace-nowrap ml-4">
                        +{g.points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
