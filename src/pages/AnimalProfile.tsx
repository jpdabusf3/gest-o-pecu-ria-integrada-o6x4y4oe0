import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import useAuditStore from '@/stores/useAuditStore'
import { animalData } from '@/data/mock'
import { ArrowLeft, Plus, History, Files, ShieldCheck } from 'lucide-react'
import { ScaleIntegrationModal } from '@/components/ScaleIntegrationModal'
import { DocumentManager } from '@/components/DocumentManager'

function QuickEventModal({ animalId }: { animalId: string }) {
  const [open, setOpen] = useState(false)
  const [eventType, setEventType] = useState('pesagem')
  const [value, setValue] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()
  const { addLog } = useAuditStore()

  const handleSave = () => {
    toast({
      title: 'Evento registrado',
      description: `Novo evento salvo para o animal ${animalId}.`,
    })
    addLog({
      userId: user.id,
      userName: user.name,
      entityType: 'Animal',
      entityId: animalId,
      action: 'Update',
      details: `Registrou manualmente o evento de ${eventType}: ${value || 'Sem detalhes'}`,
    })
    setOpen(false)
    setValue('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 min-h-[44px]">
          <Plus className="h-4 w-4" /> Registrar Evento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Evento Sanitário ou Manejo</DialogTitle>
          <DialogDescription>
            Atualize o histórico individual do animal {animalId}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pesagem">Pesagem</SelectItem>
                <SelectItem value="vacinacao">Vacinação</SelectItem>
                <SelectItem value="medicacao">Medicação</SelectItem>
                <SelectItem value="transferencia">Transferência de Lote</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor / Detalhe</Label>
            <Input
              placeholder="Ex: 250 kg ou Nome da Vacina"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <Button onClick={handleSave} className="w-full min-h-[44px]">
            Salvar Histórico
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AnimalProfile() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { logs, addLog } = useAuditStore()

  const animal = animalData[id || ''] || animalData['TAG-1234']
  const [historico, setHistorico] = useState(animal.historico)
  const [pesoAtual, setPesoAtual] = useState(animal.pesoAtual)

  const handleNewWeight = (weight: string) => {
    const newData = `${weight} kg`
    setPesoAtual(newData)
    setHistorico([
      { data: new Date().toLocaleDateString('pt-BR'), tipo: 'Pesagem (Sensor)', valor: newData },
      ...historico,
    ])
    addLog({
      userId: user.id,
      userName: user.name,
      entityType: 'Animal',
      entityId: animal.id,
      action: 'Update',
      details: `Pesagem automática via balança eletrônica integrada: ${newData}`,
    })
  }

  const animalLogs = logs.filter((l) => l.entityType === 'Animal' && l.entityId === animal.id)

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ficha do Animal: {animal.id}</h2>
          <p className="text-muted-foreground mt-1">
            Gestão individual de histórico, pesagens e documentação digital.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{animal.categoria}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{animal.lote}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Peso Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{pesoAtual}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nascimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{animal.nascimento}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-3 mb-4">
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4 hidden sm:block" /> Operacional
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Files className="h-4 w-4 hidden sm:block" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ShieldCheck className="h-4 w-4 hidden sm:block" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-2 outline-none">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Histórico de Eventos e Pesagens</CardTitle>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <ScaleIntegrationModal animalId={animal.id} onSaveWeight={handleNewWeight} />
                <QuickEventModal animalId={animal.id} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor / Detalhe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map((ev: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">{ev.data}</TableCell>
                        <TableCell>
                          <Badge variant={ev.tipo.includes('Sensor') ? 'default' : 'outline'}>
                            {ev.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{ev.valor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-2 outline-none">
          <DocumentManager entityId={animal.id} />
        </TabsContent>

        <TabsContent value="audit" className="mt-2 outline-none">
          <Card>
            <CardHeader>
              <CardTitle>Log de Atividades (Auditoria)</CardTitle>
              <CardDescription>
                Acompanhamento de todas as alterações feitas na ficha e dados deste animal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Usuário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animalLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{log.details}</TableCell>
                        <TableCell className="text-muted-foreground">{log.userName}</TableCell>
                      </TableRow>
                    ))}
                    {animalLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          Nenhum log de auditoria encontrado para este animal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
