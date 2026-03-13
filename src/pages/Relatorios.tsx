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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Leaf, Clock, Tag, MapPin, Users, Coins, Info, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { managementHistory } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

type HistoryItem = (typeof managementHistory)[0]

export default function Relatorios() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [selectedIntervention, setSelectedIntervention] = useState<HistoryItem | null>(null)

  const filteredHistory = managementHistory.filter((item) => {
    const matchesSearch =
      item.alvo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType =
      typeFilter === 'todos' || item.tipo.toLowerCase().includes(typeFilter.toLowerCase())
    return matchesSearch && matchesType
  })

  const handleExportCSV = () => {
    downloadCSV(filteredHistory, 'historico_manejo')
    toast({
      title: 'Relatório Gerado',
      description: 'O histórico foi baixado em formato CSV com sucesso.',
    })
  }

  const handleExportExcel = () => {
    downloadExcel(filteredHistory, 'historico_manejo')
    toast({
      title: 'Relatório Gerado',
      description: 'O histórico foi baixado em formato Excel com sucesso.',
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatórios & Histórico</h2>
          <p className="text-muted-foreground mt-1">
            Registro detalhado de intervenções operacionais e ferramentas analíticas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link to="/sustentabilidade">
            <Button
              variant="secondary"
              className="gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
            >
              <Leaf className="h-4 w-4" />
              Sustentabilidade
            </Button>
          </Link>
          <ExportMenu
            className="w-full sm:w-auto"
            label="Exportar Histórico"
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={triggerPDFPrint}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Log de Intervenções e Atividades</CardTitle>
            <CardDescription>Clique em um registro para ver os detalhes completos</CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar alvo ou descrição..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sanidade">Sanidade</SelectItem>
                <SelectItem value="nutrição">Nutrição</SelectItem>
                <SelectItem value="pasto">Pasto</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedIntervention(item)}
                  >
                    <TableCell className="whitespace-nowrap font-medium">
                      {item.data}{' '}
                      {item.hora && (
                        <span className="text-xs text-muted-foreground ml-1">{item.hora}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tipo}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary whitespace-nowrap">
                      {item.alvo}
                    </TableCell>
                    <TableCell className="min-w-[250px] truncate max-w-xs">
                      {item.descricao}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {item.responsavel}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum registro encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Intervention Modal */}
      <Dialog
        open={!!selectedIntervention}
        onOpenChange={(open) => !open && setSelectedIntervention(null)}
      >
        <DialogContent className="sm:max-w-[600px] gap-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Intervenção: {selectedIntervention?.tipo}
              </DialogTitle>
              <Badge
                variant="secondary"
                className="w-fit text-sm px-3 py-1 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                {selectedIntervention?.data}{' '}
                {selectedIntervention?.hora ? `às ${selectedIntervention.hora}` : ''}
              </Badge>
            </div>
            <DialogDescription className="mt-2 text-base text-foreground">
              {selectedIntervention?.descricao}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Alvo Principal
                </span>
                <p className="font-semibold text-primary">{selectedIntervention?.alvo}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Animais Envolvidos
                </span>
                <p className="font-medium">{selectedIntervention?.animaisEnvolvidos || 'N/A'}</p>
              </div>
            </div>

            {selectedIntervention?.insumosUtilizados &&
              selectedIntervention.insumosUtilizados.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Insumos Utilizados:
                  </span>
                  <ul className="list-disc list-inside pl-5 space-y-1">
                    {selectedIntervention.insumosUtilizados.map((insumo, idx) => (
                      <li key={idx} className="text-sm">
                        {insumo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Technical Metrics (Only for Venda/Entrada) */}
            {(selectedIntervention?.tipo.toLowerCase() === 'venda' ||
              selectedIntervention?.tipo.toLowerCase() === 'entrada') && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectedIntervention?.pesoEntrada !== undefined && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Scale className="w-3 h-3" /> Peso Ref.
                    </span>
                    <p className="font-semibold">{selectedIntervention.pesoEntrada} kg</p>
                  </div>
                )}
                {selectedIntervention?.valorCabeca !== undefined && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Valor/Cabeça</span>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(selectedIntervention.valorCabeca)}
                    </p>
                  </div>
                )}
                {selectedIntervention?.valorArroba !== undefined && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Valor/@</span>
                    <p className="font-semibold">
                      {formatCurrency(selectedIntervention.valorArroba)}
                    </p>
                  </div>
                )}
                {selectedIntervention?.rendimentoCarcaca !== undefined &&
                  selectedIntervention.rendimentoCarcaca !== null && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Rend. Carcaça</span>
                      <p className="font-semibold">{selectedIntervention.rendimentoCarcaca}%</p>
                    </div>
                  )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Custo Associado (por cabeça)
                </span>
                <p className="font-medium text-destructive">
                  {selectedIntervention?.custoCabeca !== undefined &&
                  selectedIntervention.custoCabeca !== null
                    ? formatCurrency(selectedIntervention.custoCabeca)
                    : 'Nenhum custo direto associado'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Responsável Operacional
                </span>
                <p className="font-medium">{selectedIntervention?.responsavel}</p>
              </div>
            </div>

            {selectedIntervention?.observacoes && (
              <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-md border border-blue-100 mt-2">
                <span className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Observações Técnicas
                </span>
                <p className="text-sm text-blue-900/80 leading-relaxed">
                  {selectedIntervention.observacoes}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
