import { useState, useEffect } from 'react'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  FileDown,
  AlertTriangle,
} from 'lucide-react'
import {
  TrimestreAtividadesResumo,
  consolidarAtividadesPorTrimestre,
} from '@/services/fechamentoTrimestral'
import { FrenteFechamento } from '@/services/fechamento'
import { triggerPDFPrint } from '@/lib/exportUtils'

interface PainelFechamentoTrimestralProps {
  ano: number
  frente: FrenteFechamento
}

export function PainelFechamentoTrimestral({ ano, frente }: PainelFechamentoTrimestralProps) {
  const [trimestres, setTrimestres] = useState<TrimestreAtividadesResumo[]>([])
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('T1')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const dados = await consolidarAtividadesPorTrimestre(ano, frente)
        setTrimestres(dados)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [ano, frente])

  const tAtual = trimestres.find((t) => t.trimestreKey === selectedTrimestre) || trimestres[0]

  const chartData = trimestres.map((t) => ({
    name: t.trimestreKey,
    Planejadas: t.totalPlanejadas,
    Realizadas: t.totalRealizadas,
    NaoRealizadas: t.totalNaoRealizadas,
    CustoRealizado: t.custoTotalRealizado,
    CustoPlanejado: t.custoTotalPlanejado,
  }))

  const handleExportPDF = () => {
    triggerPDFPrint()
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Consolidando dados trimestrais de manejos e custos...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              Fechamento Trimestral Integrado: Planejado vs. Realizado
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cruzamento auditado de atividades planejadas, taxas de execução e custos de insumos +
            diárias por trimestre ({ano})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            {trimestres.map((t) => (
              <Button
                key={t.trimestreKey}
                size="sm"
                variant={selectedTrimestre === t.trimestreKey ? 'default' : 'ghost'}
                className="h-8 text-xs font-semibold px-3"
                onClick={() => setSelectedTrimestre(t.trimestreKey)}
              >
                {t.trimestreKey}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold"
            onClick={handleExportPDF}
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF Trimestral
          </Button>
        </div>
      </div>

      {/* Cards de Resumo do Trimestre Selecionado */}
      {tAtual && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary shadow-xs">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">Taxa de Conclusão</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {tAtual.taxaConclusaoPct}%
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-[11px] text-muted-foreground">
                {tAtual.totalRealizadas} de {tAtual.totalPlanejadas} atividades concluídas
              </span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 shadow-xs">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">
                Custo Insumos Realizados
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
                R${' '}
                {tAtual.custoInsumosRealizados.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-[11px] text-muted-foreground">
                Medicamentos, vacinas, sal e suplementos
              </span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600 shadow-xs">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">
                Diárias & Operacional
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-blue-600">
                R${' '}
                {tAtual.custoDiariasRealizadas.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-[11px] text-muted-foreground">
                Mão de obra e serviços de campo
              </span>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600 shadow-xs">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium">
                Custo Total Realizado
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-amber-600">
                R${' '}
                {tAtual.custoTotalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-[11px] text-muted-foreground">
                Previsto: R${' '}
                {tAtual.custoTotalPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico Comparativo Trimestral de Volume e Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Execução Física de Atividades (T1 a T4)
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativo de atividades planejadas vs. realizadas por trimestre
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Planejadas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="NaoRealizadas" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Custos Realizados de Insumos + Diárias (R$)
            </CardTitle>
            <CardDescription className="text-xs">
              Evolução financeira das atividades realizadas nos 4 trimestres
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(val: any) =>
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="CustoPlanejado"
                    name="Previsto (R$)"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="CustoRealizado"
                    name="Realizado (R$)"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Fechamento por Frente no Trimestre */}
      {tAtual && (
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold">
              Detalhamento de Custos e Execução por Frente — {tAtual.rotulo}
            </CardTitle>
            <CardDescription className="text-xs">
              Custos de insumos e diárias consolidados de todas as atividades realizadas na frente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frente de Produção</TableHead>
                  <TableHead className="text-center">Planejadas</TableHead>
                  <TableHead className="text-center">Realizadas</TableHead>
                  <TableHead className="text-center">Não Realizadas</TableHead>
                  <TableHead className="text-center">Conclusão</TableHead>
                  <TableHead className="text-right">Custo Realizado (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(tAtual.atividadesPorFrente)
                  .filter(([f]) => f !== 'todas')
                  .map(([frenteKey, dados]) => {
                    const pct =
                      dados.planejadas > 0
                        ? ((dados.realizadas / dados.planejadas) * 100).toFixed(1)
                        : '0.0'
                    return (
                      <TableRow key={frenteKey}>
                        <TableCell className="font-semibold capitalize">
                          {frenteKey === 'arrendamento' ? 'Arrendamento (Segregado)' : frenteKey}
                        </TableCell>
                        <TableCell className="text-center font-mono">{dados.planejadas}</TableCell>
                        <TableCell className="text-center font-mono text-emerald-600 font-bold">
                          {dados.realizadas}
                        </TableCell>
                        <TableCell className="text-center font-mono text-rose-600">
                          {dados.naoRealizadas}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          <Badge
                            variant={parseFloat(pct) >= 80 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          R${' '}
                          {dados.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Motivos de Não Realização no Trimestre */}
      {tAtual && Object.keys(tAtual.motivosNaoRealizadas).length > 0 && (
        <Card className="border-rose-300 dark:border-rose-900 bg-rose-500/5 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Justificativas de Manejos Não Realizados no Trimestre
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex flex-wrap gap-2">
              {Object.entries(tAtual.motivosNaoRealizadas).map(([motivo, qtd]) => (
                <Badge
                  key={motivo}
                  variant="outline"
                  className="bg-background text-rose-800 dark:text-rose-200 border-rose-300 px-2.5 py-1 text-xs"
                >
                  <span className="capitalize">{motivo.replace('_', ' ')}</span>:{' '}
                  <strong className="ml-1 font-mono">{qtd} caso(s)</strong>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
