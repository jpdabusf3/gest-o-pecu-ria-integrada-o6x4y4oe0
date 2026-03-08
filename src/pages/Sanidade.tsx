import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sanitaryEvents } from '@/data/mock'
import { ProtocolosTab } from '@/components/sanidade/ProtocolosTab'
import { useAuth } from '@/contexts/AuthContext'
import {
  Syringe,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function ExecutionModal({ event }: { event: any }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const handleExecute = () => {
    toast({
      title: 'Execução Registrada',
      description: `Protocolo ${event.title} em ${event.target} registrado por ${user.name}.`,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px]">
          Registrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Execução Sanitária</DialogTitle>
          <DialogDescription>
            Confirme a aplicação do protocolo no alvo selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Alvo (Lote ou Rebanho)</Label>
            <Input value={event.target} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Procedimento / Vacina</Label>
            <Input value={event.title} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Data de Execução Real</Label>
            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full h-12" onClick={handleExecute}>
            Confirmar Aplicação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Sanidade() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const { toast } = useToast()

  const handleSchedule = () => {
    toast({
      title: 'Protocolo Agendado',
      description: 'O novo evento sanitário foi adicionado ao calendário.',
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Atrasado':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'Concluído':
        return <CheckCircle2 className="h-4 w-4 text-primary" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Atrasado':
        return 'destructive'
      case 'Concluído':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const urgentEvents = sanitaryEvents.filter((e) => e.status === 'Atrasado' || e.date === 'Hoje')

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão Sanitária Avançada</h2>
          <p className="text-muted-foreground mt-1">
            Controle de vacinas, vermífugos e protocolos baseados em idade.
          </p>
        </div>
        <Button onClick={handleSchedule} className="w-full sm:w-auto gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {urgentEvents.length > 0 && (
        <Alert
          variant="destructive"
          className="bg-destructive/10 border-destructive/20 text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção - Protocolos Pendentes ou Atrasados</AlertTitle>
          <AlertDescription>
            Existem {urgentEvents.length} tarefas sanitárias que exigem ação imediata para garantir
            a imunidade do rebanho.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="agendados" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="agendados">Calendário & Alertas</TabsTrigger>
          <TabsTrigger value="protocolos">Protocolos por Idade</TabsTrigger>
        </TabsList>

        <TabsContent value="agendados" className="mt-0">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 lg:col-span-3 space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" /> Data Base
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-6">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border shadow-sm"
                  />
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">
                    Próxima Campanha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-lg leading-tight">Febre Aftosa</div>
                  <p className="text-xs text-muted-foreground mt-1">Início previsto em 15 dias</p>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-8 lg:col-span-9">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Eventos Programados</CardTitle>
                  <CardDescription>
                    Acompanhamento de protocolos por lote e execução de tarefas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sanitaryEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4"
                      >
                        <div className="flex gap-4 items-start w-full sm:w-auto">
                          <div
                            className={`mt-1 p-2 rounded-full ${event.status === 'Atrasado' ? 'bg-destructive/10' : 'bg-muted'}`}
                          >
                            {getStatusIcon(event.status)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{event.title}</h4>
                              <Badge variant={getStatusColor(event.status) as any} className="ml-2">
                                {event.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Syringe className="h-3 w-3" /> {event.type}
                              </span>
                              <span className="font-medium text-foreground">
                                Lote: {event.lote}
                              </span>
                              <span>Alvo: {event.target}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0">
                          <span className="text-sm font-medium sm:mr-4">{event.date}</span>
                          {event.status !== 'Concluído' && <ExecutionModal event={event} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="protocolos" className="mt-0">
          <ProtocolosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
