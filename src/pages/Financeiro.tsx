import { useMemo, useEffect } from 'react'
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
import { Plus } from 'lucide-react'
import { financialData, lotPerformanceData, costPerArrobaData, animalData } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { NotificationPreferences } from '@/components/NotificationPreferences'
import { CostAnalysisTab } from '@/components/finance/CostAnalysisTab'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { BreakEvenTab } from '@/components/finance/BreakEvenTab'
import { LotBudgetsTab } from '@/components/finance/LotBudgetsTab'
import { DRETab } from '@/components/finance/DRETab'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import useFinanceStore from '@/stores/useFinanceStore'
import { useAppNotifications } from '@/contexts/NotificationContext'

export default function Financeiro() {
  const { toast } = useToast()
  const { ledger, lotThresholds } = useFinanceStore()
  const { addNotification, notifications } = useAppNotifications()

  useEffect(() => {
    lotThresholds.forEach((lt) => {
      const cost = ledger
        .filter((l) => l.loteId === lt.loteId && l.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0)

      if (lt.threshold > 0 && cost >= lt.threshold) {
        const alreadyNotified = notifications.some((n) => n.title.includes(lt.loteId) && !n.read)
        if (!alreadyNotified) {
          addNotification({
            title: `🚨 Alerta de Custo: Lote ${lt.loteId}`,
            message: `O lote ${lt.loteId} excedeu o limite de gastos (R$ ${lt.threshold.toLocaleString('pt-BR')}). Custo acumulado atual: R$ ${cost.toLocaleString('pt-BR')}.`,
            type: 'alert',
          })
        }
      }
    })
  }, [ledger, lotThresholds, notifications, addNotification])

  const handleExportCSV = () => {
    downloadCSV(financialData, 'balanco_financeiro')
    toast({
      title: 'Relatório Gerado',
      description: 'O balanço financeiro foi baixado em formato CSV.',
    })
  }

  const handleExportExcel = () => {
    downloadExcel(financialData, 'balanco_financeiro')
    toast({
      title: 'Relatório Gerado',
      description: 'O balanço financeiro foi baixado em formato Excel.',
    })
  }

  const animalProfitList = useMemo(() => {
    const baseAnimals = Object.values(animalData)
    const extraAnimals = [
      { id: 'TAG-8899', categoria: 'Boi Terminação', pesoAtual: '480 kg', lote: 'LEN-02' },
      { id: 'TAG-4455', categoria: 'Vaca Solteira', pesoAtual: '380 kg', lote: 'LCR-01' },
      { id: 'TAG-3322', categoria: 'Bezerro', pesoAtual: '180 kg', lote: 'LCR-04' },
    ]

    return [...baseAnimals, ...extraAnimals].map((animal) => {
      const expenses = ledger
        .filter((l) => l.animalId === animal.id && l.type === 'expense')
        .reduce((a, b) => a + b.amount, 0)

      const weightNum = parseFloat(animal.pesoAtual.replace('kg', '').trim()) || 0
      const estimatedValue = weightNum * 12.5
      const netProfit = estimatedValue - expenses

      return {
        ...animal,
        expenses,
        estimatedValue,
        netProfit,
      }
    })
  }, [ledger])

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão Financeira</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de fluxo de caixa e rentabilidade.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap justify-start md:justify-end">
          <NotificationPreferences />
          <ExportMenu
            className="flex-1 sm:flex-none"
            label="Exportar Balanço"
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            onExportPDF={triggerPDFPrint}
          />
          <Button className="flex-1 sm:flex-none gap-2">
            <Plus className="h-4 w-4" /> Lançamento
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dre" className="space-y-6">
        <TabsList className="mb-2 w-full sm:w-auto flex flex-wrap sm:flex-nowrap overflow-x-auto justify-start h-auto p-1 py-1.5">
          <TabsTrigger value="dre" className="py-2 text-primary font-medium">
            DRE Mensal
          </TabsTrigger>
          <TabsTrigger value="dashboard-custos" className="py-2">
            Análise de Custos
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="py-2">
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="previsao-venda" className="py-2">
            Previsão e Break-even
          </TabsTrigger>
          <TabsTrigger value="orcamento-lotes" className="py-2">
            Alertas por Lote
          </TabsTrigger>
          <TabsTrigger value="lucro-cabeca" className="py-2">
            Lucro Indiv.
          </TabsTrigger>
          <TabsTrigger value="desempenho" className="py-2">
            Rentabilidade Lotes
          </TabsTrigger>
          <TabsTrigger value="custo-arroba" className="py-2">
            Custo / @
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="space-y-6 mt-0">
          <DRETab />
        </TabsContent>

        <TabsContent value="dashboard-custos" className="space-y-6 mt-0">
          <CostAnalysisTab />
        </TabsContent>

        <TabsContent value="previsao-venda" className="space-y-6 mt-0">
          <BreakEvenTab />
        </TabsContent>

        <TabsContent value="orcamento-lotes" className="space-y-6 mt-0">
          <LotBudgetsTab />
        </TabsContent>

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
              <CardTitle>Tendência de Fluxo de Caixa</CardTitle>
              <CardDescription>
                Análise agregada de receitas contra custos operacionais (nutrição, sanidade, e
                manejo).
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <CashflowChart />
            </CardContent>
          </Card>

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

        <TabsContent value="lucro-cabeca" className="space-y-6 mt-0">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Relatório de Lucro Líquido por Cabeça</CardTitle>
              <CardDescription>
                Cálculo de rentabilidade individual subtraindo os custos reais acumulados do livro
                razão do animal (nutrição, vacinas) pelo valor estimado de mercado.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Animal / TAG</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Valor Mercado</TableHead>
                      <TableHead className="text-right">Custos</TableHead>
                      <TableHead className="text-right font-bold text-primary">
                        Lucro Líquido
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animalProfitList.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.id}</TableCell>
                        <TableCell>{a.categoria}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {a.lote}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          R${' '}
                          {a.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-destructive whitespace-nowrap">
                          - R$ {a.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-base whitespace-nowrap">
                          R$ {a.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        <TableCell className="text-right text-destructive whitespace-nowrap">
                          - R$ {lote.custos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-primary whitespace-nowrap">
                          + R$ {lote.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold whitespace-nowrap ${lote.lucro >= 0 ? 'text-primary' : 'text-destructive'}`}
                        >
                          R$ {lote.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {lote.margem}
                        </TableCell>
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
              <CardTitle>Custo Específico por @ de Ganho (Lotes)</CardTitle>
              <CardDescription>
                Comparativo entre os custos de suplementação acumulados e o ganho real de peso de
                cada lote isolado.
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
                        <TableCell className="text-right text-destructive whitespace-nowrap">
                          R${' '}
                          {lote.custoAcumulado.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {lote.ganhoPesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                          kg
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {lote.ganhoArroba.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} @
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-lg whitespace-nowrap">
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
