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
import useFinanceStore from '@/stores/useFinanceStore'
import { animalData } from '@/data/mock'
import {
  ArrowLeft,
  Plus,
  History,
  Files,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
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

function AddExpenseModal({ animalId }: { animalId: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Sanidade')
  const { addEntry } = useFinanceStore()
  const { toast } = useToast()

  const handleSave = () => {
    if (!amount || !description) return
    addEntry({
      date: new Date().toISOString().split('T')[0],
      description,
      category,
      amount: parseFloat(amount),
      animalId,
      type: 'expense',
    })
    toast({ title: 'Despesa Registrada', description: 'Custo individual vinculado ao animal.' })
    setOpen(false)
    setAmount('')
    setDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-destructive hover:bg-destructive/90 text-white">
          <Plus className="h-4 w-4" /> Registrar Despesa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar Despesa Individual</DialogTitle>
          <DialogDescription>
            Registre custos com vacinas, ração ou manejo diretamente neste animal para apurar a
            margem real.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Categoria do Custo</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sanidade">Sanidade (Vacinas/Medicamentos)</SelectItem>
                <SelectItem value="Nutrição">Nutrição (Ração/Suplemento)</SelectItem>
                <SelectItem value="Mão de Obra">Manejo e Mão de Obra</SelectItem>
                <SelectItem value="Outros">Outros Custos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Vacina Raiva"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            Lançar no Livro Razão
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
  const { ledger } = useFinanceStore()

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

  // Financial Computations for Individual Profitability Report
  const animalLedger = ledger.filter((l) => l.animalId === animal.id)

  const totalNutrition = animalLedger
    .filter((l) => l.category === 'Nutrição' && l.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0)
  const totalSanity = animalLedger
    .filter((l) => l.category === 'Sanidade' && l.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0)
  const totalOther = animalLedger
    .filter((l) => !['Nutrição', 'Sanidade'].includes(l.category) && l.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0)
  const totalExpenses = totalNutrition + totalSanity + totalOther

  const currentWeightNum = parseFloat(pesoAtual.replace('kg', '').trim()) || 0
  // Regra técnica: Arroba (@) de peso vivo = 30 kg
  const estimatedArrobas = currentWeightNum / 30

  const currentDatagroPrice = 265.5 // Mock sync to MT price
  const estimatedMarketValue = estimatedArrobas * currentDatagroPrice
  const netProfit = estimatedMarketValue - totalExpenses

  const realUnitCost = estimatedArrobas > 0 ? totalExpenses / estimatedArrobas : 0

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
            Gestão individual de histórico, pesagens e apuração financeira.
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
            <CardTitle className="text-sm text-muted-foreground">Lote Atual</CardTitle>
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
            <p className="text-xs text-muted-foreground mt-1">
              Estimado: {estimatedArrobas.toFixed(1)} @
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-500 font-medium">
              Lucro Líquido Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-500">
              R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="flex flex-wrap w-full sm:w-auto mb-4 h-auto p-1 py-1.5 justify-start">
          <TabsTrigger value="financial" className="gap-2 py-2">
            <DollarSign className="h-4 w-4 hidden sm:block" /> Custo e Rentabilidade
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 py-2">
            <History className="h-4 w-4 hidden sm:block" /> Operacional
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 py-2">
            <Files className="h-4 w-4 hidden sm:block" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 py-2">
            <ShieldCheck className="h-4 w-4 hidden sm:block" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-2 outline-none space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Custo Unitário Real no Abate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  R$ {realUnitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                  <span className="text-base font-normal text-muted-foreground">/@</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 border-t border-primary/10 pt-2">
                  Custo Total ÷ Arrobas Produzidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Receita Projetada (Datagro)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                  R$ {estimatedMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Base B3/Datagro: R$ {currentDatagroPrice.toFixed(2)} / @
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Composição do Custo Acumulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  <div className="text-2xl font-bold text-destructive min-w-[120px]">
                    - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex-1 w-full grid grid-cols-3 gap-2 text-sm border-l pl-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Nutrição (Insumos)</div>
                      <div className="font-semibold text-destructive/80">
                        R$ {totalNutrition.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Sanidade (Vac/Med)</div>
                      <div className="font-semibold text-destructive/80">
                        R$ {totalSanity.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Manejo e Outros</div>
                      <div className="font-semibold text-destructive/80">
                        R$ {totalOther.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Livro Razão Individual</CardTitle>
                <CardDescription>
                  Detalhamento de todos os custos (nutrição, sanidade, manejo) injetados neste
                  animal.
                </CardDescription>
              </div>
              <AddExpenseModal animalId={animal.id} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animalLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                        <TableCell className="font-medium">{entry.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {entry.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          - R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {animalLedger.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          Nenhuma despesa registrada para este animal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-2 outline-none space-y-6">
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
