import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Leaf, FileText, FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { managementHistory } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import { DateRange } from 'react-day-picker'
import { FilterBar } from '@/components/reports/FilterBar'
import { InterventionModal } from '@/components/reports/InterventionModal'
import { PerformanceDashboard } from '@/components/reports/PerformanceDashboard'
import { RelatorioMensalGMD } from '@/components/gmd/RelatorioMensalGMD'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type HistoryItem = (typeof managementHistory)[0]

const parseHistoryDate = (dateStr: string) => {
  const months: Record<string, number> = {
    Jan: 0,
    Fev: 1,
    Mar: 2,
    Abr: 3,
    Mai: 4,
    Jun: 5,
    Jul: 6,
    Ago: 7,
    Set: 8,
    Out: 9,
    Nov: 10,
    Dez: 11,
  }
  const [day, monthStr, year] = dateStr.split('/')
  return new Date(parseInt(year), months[monthStr], parseInt(day))
}

export default function Relatorios() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [selectedLot, setSelectedLot] = useState('todos')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedIntervention, setSelectedIntervention] = useState<HistoryItem | null>(null)

  const uniqueTypes = useMemo(
    () => Array.from(new Set(managementHistory.map((i) => i.tipo))).sort(),
    [],
  )
  const uniqueLots = useMemo(
    () => Array.from(new Set(managementHistory.map((i) => i.alvo))).sort(),
    [],
  )

  const filteredHistory = useMemo(() => {
    return managementHistory.filter((item) => {
      const itemDate = parseHistoryDate(item.data)
      const matchesSearch =
        item.alvo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'todos' || item.tipo === typeFilter
      const matchesLot = selectedLot === 'todos' || item.alvo === selectedLot
      const matchesDate =
        !dateRange ||
        ((!dateRange.from || itemDate >= dateRange.from) &&
          (!dateRange.to || itemDate <= dateRange.to))
      return matchesSearch && matchesType && matchesLot && matchesDate
    })
  }, [searchTerm, typeFilter, selectedLot, dateRange])

  const handleExportPDF = () => {
    triggerPDFPrint()
    toast({
      title: 'PDF Gerado',
      description: 'O relatório está pronto para impressão ou salvamento.',
    })
  }

  const handleExportExcel = () => {
    downloadExcel(filteredHistory, 'historico_manejo')
    toast({
      title: 'Excel Gerado',
      description: 'O histórico foi baixado em formato Excel com sucesso.',
    })
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
        <Link to="/sustentabilidade">
          <Button
            variant="secondary"
            className="gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
          >
            <Leaf className="h-4 w-4" /> Sustentabilidade
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="gmd_mensal" className="space-y-6">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full sm:w-[480px]">
          <TabsTrigger value="gmd_mensal" className="font-semibold">
            Fechamento Mensal GMD (Exagro)
          </TabsTrigger>
          <TabsTrigger value="intervencoes">Log de Intervenções & Manejo</TabsTrigger>
        </TabsList>

        <TabsContent value="gmd_mensal" className="mt-0">
          <RelatorioMensalGMD />
        </TabsContent>

        <TabsContent value="intervencoes" className="mt-0 space-y-6">
          <FilterBar
            dateRange={dateRange}
            setDateRange={setDateRange}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            selectedLot={selectedLot}
            setSelectedLot={setSelectedLot}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            uniqueTypes={uniqueTypes}
            uniqueLots={uniqueLots}
          />

          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
              <div>
                <CardTitle>Log de Intervenções e Atividades</CardTitle>
                <CardDescription>
                  Clique em um registro para ver os detalhes completos
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <FileText className="h-4 w-4" /> Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 w-[180px]">Data</TableHead>
                      <TableHead className="w-[150px]">Tipo</TableHead>
                      <TableHead className="w-[180px]">Alvo / Lote</TableHead>
                      <TableHead className="min-w-[250px]">Descrição</TableHead>
                      <TableHead className="w-[180px]">Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedIntervention(item)}
                      >
                        <TableCell className="whitespace-nowrap font-medium px-6">
                          {item.data}{' '}
                          {item.hora && (
                            <span className="text-xs text-muted-foreground ml-1">{item.hora}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary whitespace-nowrap">
                          {item.alvo}
                        </TableCell>
                        <TableCell className="min-w-[250px] max-w-sm whitespace-normal break-words">
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

          <PerformanceDashboard selectedLot={selectedLot} />
        </TabsContent>
      </Tabs>

      <InterventionModal
        intervention={selectedIntervention}
        onOpenChange={(open) => !open && setSelectedIntervention(null)}
      />
    </div>
  )
}
