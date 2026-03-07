import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { sanitaryEvents } from '@/data/mock'
import {
  Syringe,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendário Sanitário</h2>
          <p className="text-muted-foreground mt-1">
            Gestão de vacinas, vermífugos e protocolos reprodutivos.
          </p>
        </div>
        <Button onClick={handleSchedule} className="w-full sm:w-auto gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

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
              <CardTitle className="text-sm font-medium text-primary">Próxima Campanha</CardTitle>
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
              <CardDescription>Acompanhamento de protocolos por lote e categoria.</CardDescription>
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
                          <span className="font-medium text-foreground">Lote: {event.lote}</span>
                          <span>Alvo: {event.target}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0">
                      <span className="text-sm font-medium sm:mr-4">{event.date}</span>
                      {event.status !== 'Concluído' && (
                        <Button variant="outline" size="sm" className="min-h-[44px]">
                          Registrar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
