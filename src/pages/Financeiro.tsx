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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Download, Plus, FileText, FileSpreadsheet } from 'lucide-react'
import { financialData, lotPerformanceData, costPerArrobaData } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { NotificationPreferences } from '@/components/NotificationPreferences'

export default function Financeiro() {
  const { toast } = useToast()

  const handleExport = (format: string) => {
    toast({
      title: 'Relatório Gerado',
      description: `O balanço financeiro está sendo baixado em formato ${format.toUpperCase()}.`,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão Financeira</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de fluxo de caixa e rentabilidade.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap justify-start md:justify-end">
          <NotificationPreferences />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none gap-2">
                <Download className="h-4 w-4" /> Exportar Balanço
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Formato do Relatório</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" /> Exportar em PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" /> Exportar em Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="flex-1 sm:flex-none gap-2">
            <Plus className="h-4 w-4" /> Lançamento
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fluxo" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto flex overflow-x-auto justify-start">
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho por Lote</TabsTrigger>
          <TabsTrigger value="custo-arroba">Custo por @ Produzida</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="space-y-6 mt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Receitas do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">R$ 335.000,00</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  Despesas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">R$ 87.700,00</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Líquido Operacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 247.300,00</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialData.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">{tx.data}</TableCell>
                        <TableCell className="font-medium">{tx.descricao}</TableCell>
                        <TableCell>{tx.categoria}</TableCell>
                        <TableCell
                          className={`text-right font-mono font-medium whitespace-nowrap ${tx.tipo === 'entrada' ? 'text-primary' : 'text-destructive'}`}
                        >
                          {tx.tipo === 'entrada' ? '+ ' : '- '}
                          {tx.valor}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-muted-foreground">
                            Efetivado
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desempenho" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Rentabilidade por Lote</CardTitle>
              <CardDescription>
                Cálculo de custos totais projetados contra as receitas para determinação do lucro
                líquido.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Custos Totais</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Lucro Líquido</TableHead>
                      <TableHead className="text-right">Margem Líquida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotPerformanceData.map((lote) => (
                      <TableRow key={lote.loteId}>
                        <TableCell className="font-medium">{lote.loteId}</TableCell>
                        <TableCell>{lote.categoria}</TableCell>
                        <TableCell className="text-right text-destructive">
                          - R$ {lote.custos.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right text-primary">
                          + R$ {lote.receita.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${lote.lucro >= 0 ? 'text-primary' : 'text-destructive'}`}
                        >
                          R$ {lote.lucro.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-medium">{lote.margem}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custo-arroba" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Análise Analítica: Custo por @ Produzida</CardTitle>
              <CardDescription>
                Comparativo entre os custos de suplementação acumulados e o ganho real de peso de
                cada lote.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Custo Nutrição</TableHead>
                      <TableHead className="text-right">Ganho Real (kg)</TableHead>
                      <TableHead className="text-right">Ganho em @</TableHead>
                      <TableHead className="text-right font-bold text-primary">Custo / @</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costPerArrobaData.map((lote) => (
                      <TableRow key={lote.loteId}>
                        <TableCell className="font-medium">{lote.loteId}</TableCell>
                        <TableCell>{lote.categoria}</TableCell>
                        <TableCell className="text-right text-destructive">
                          R$ {lote.custoAcumulado.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {lote.ganhoPesoKg.toLocaleString('pt-BR')} kg
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {lote.ganhoArroba.toLocaleString('pt-BR')} @
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg">
                          R${' '}
                          {lote.custoPorArroba.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
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
