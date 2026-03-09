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
import { Search } from 'lucide-react'
import { managementHistory } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'

export default function Relatorios() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')

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

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Histórico de Manejo</h2>
          <p className="text-muted-foreground mt-1">
            Registro detalhado de intervenções em pastagens, suplementação e sanidade.
          </p>
        </div>
        <ExportMenu
          className="w-full sm:w-auto"
          label="Exportar Histórico"
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={triggerPDFPrint}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Log de Intervenções e Atividades</CardTitle>
            <CardDescription>Filtre por lote, pasto ou tipo de manejo</CardDescription>
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
                <SelectItem value="adubação">Adubação</SelectItem>
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
                  <TableHead>Alvo (Lote/Pasto)</TableHead>
                  <TableHead>Descrição da Intervenção</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap font-medium">{item.data}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tipo}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary whitespace-nowrap">
                      {item.alvo}
                    </TableCell>
                    <TableCell className="min-w-[250px]">{item.descricao}</TableCell>
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
    </div>
  )
}
