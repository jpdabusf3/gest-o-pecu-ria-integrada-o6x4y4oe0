import { useState } from 'react'
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import { Syringe, Plus, Activity } from 'lucide-react'
import { iatfProtocols, bullsData, bullUsageDistribution } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'

export function IatfTab() {
  const [protocols, setProtocols] = useState(iatfProtocols)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    lote: '',
    tipo: 'Convencional 3 Manejos',
    inicio: '',
    inseminacao: '',
    dg: '',
    status: 'Aguardando DG',
  })

  const handleSave = () => {
    if (!formData.lote || !formData.inicio) return
    const newP = {
      id: `IATF-${Date.now().toString().slice(-4)}`,
      lote: formData.lote,
      tipo: formData.tipo,
      inicio: formData.inicio,
      inseminacao: formData.inseminacao || '-',
      dg: formData.dg || '-',
      dgFinal: '-',
      proximoManejo: 'Calculado Automaticamente',
      status: formData.status,
    }
    setProtocols([newP, ...protocols])
    toast({
      title: 'Protocolo Registrado',
      description: 'O manejo reprodutivo foi adicionado à agenda.',
    })
    setOpen(false)
  }

  const chartConfig = {
    value: { label: 'Doses Usadas', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-primary" /> Protocolos IATF Ativos
                </CardTitle>
                <CardDescription>
                  Acompanhe as datas de manejo, inseminação e diagnóstico de gestação.
                </CardDescription>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Protocolo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Protocolo IATF</DialogTitle>
                    <DialogDescription>
                      Insira as datas para agendar os próximos manejos na propriedade.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Lote Alvo</Label>
                        <Input
                          placeholder="Ex: LCR-01"
                          value={formData.lote}
                          onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Protocolo</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Convencional 3 Manejos">
                              Convencional 3 Manejos
                            </SelectItem>
                            <SelectItem value="J-Synch">J-Synch</SelectItem>
                            <SelectItem value="Presynch">Presynch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Início (D0)</Label>
                        <Input
                          type="date"
                          value={formData.inicio}
                          onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Inseminação</Label>
                        <Input
                          type="date"
                          value={formData.inseminacao}
                          onChange={(e) =>
                            setFormData({ ...formData, inseminacao: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data DG (Diagnóstico)</Label>
                        <Input
                          type="date"
                          value={formData.dg}
                          onChange={(e) => setFormData({ ...formData, dg: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => setFormData({ ...formData, status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Em andamento">Em andamento</SelectItem>
                            <SelectItem value="Aguardando DG">Aguardando DG</SelectItem>
                            <SelectItem value="Prenhez Positiva">Prenhez Positiva</SelectItem>
                            <SelectItem value="Prenhez Negativa">Prenhez Negativa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSave} className="w-full">
                      Registrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Inseminação</TableHead>
                      <TableHead>Próx. Manejo</TableHead>
                      <TableHead>Status / DG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {protocols.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium whitespace-nowrap">{p.lote}</TableCell>
                        <TableCell className="whitespace-nowrap">{p.tipo}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.inicio}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {p.inseminacao}
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {p.proximoManejo}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status.includes('Positiva') || p.status.includes('85%')
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reprodutores & Catálogo de Sêmen</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Touro (Nome)</TableHead>
                      <TableHead>Raça</TableHead>
                      <TableHead>Central / Fornecedor</TableHead>
                      <TableHead className="text-right">Doses em Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bullsData.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.nome}</TableCell>
                        <TableCell>{b.raca}</TableCell>
                        <TableCell className="text-muted-foreground">{b.central}</TableCell>
                        <TableCell className="text-right font-mono">{b.doses}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Uso de Sêmen (Histórico)
              </CardTitle>
              <CardDescription>Distribuição de doses utilizadas na estação.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={bullUsageDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {bullUsageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
