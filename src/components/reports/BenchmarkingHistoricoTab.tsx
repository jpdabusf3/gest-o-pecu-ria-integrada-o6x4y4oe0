import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  TrendingUp,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Sparkles,
  Download,
  FileText,
} from 'lucide-react'
import { gerarPdfHistoricoBenchmarking } from '@/services/pdfBenchmarking'
import { useToast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  getConfigBenchmarkHistorico,
  ConfigBenchmarkHistoricoRecord,
  DEFAULT_BENCHMARKS,
} from '@/services/configBenchmark'

export function BenchmarkingHistoricoTab() {
  const { toast } = useToast()
  const [historico, setHistorico] = useState<ConfigBenchmarkHistoricoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [indicadorSelecionado, setIndicadorSelecionado] = useState<string>(
    'prod_arroba_ha_ano_pasto',
  )

  const carregar = async () => {
    try {
      setLoading(true)
      const data = await getConfigBenchmarkHistorico()
      setHistorico(data)
    } catch (err) {
      console.error('Erro ao carregar histórico de recalibração:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  // Lista única de indicadores presentes no histórico
  const indicadoresDisponiveis = useMemo(() => {
    const mapa = new Map<string, { codigo: string; indicador: string; unidade?: string }>()
    // Defaults primeiro
    Object.values(DEFAULT_BENCHMARKS).forEach((d) => {
      mapa.set(d.codigo, { codigo: d.codigo, indicador: d.indicador, unidade: d.unidade })
    })
    // Adiciona os que estiverem no histórico
    historico.forEach((h) => {
      if (!mapa.has(h.codigo)) {
        mapa.set(h.codigo, { codigo: h.codigo, indicador: h.indicador, unidade: h.unidade })
      }
    })
    return Array.from(mapa.values())
  }, [historico])

  // Safras únicas ordenadas cronologicamente
  const safras = useMemo(() => {
    const set = new Set<string>()
    historico.forEach((h) => {
      if (h.ano_safra) set.add(h.ano_safra)
    })
    return Array.from(set).sort()
  }, [historico])

  // Filtrado pelo indicador selecionado e ordenado do mais antigo para o mais recente para gráfico
  const dadosGrafico = useMemo(() => {
    const filtrados = historico.filter((h) => h.codigo === indicadorSelecionado)

    // Agrupa por safra pegando o mais recente de cada safra
    const mapSafra = new Map<string, ConfigBenchmarkHistoricoRecord>()
    filtrados.forEach((item) => {
      const existe = mapSafra.get(item.ano_safra)
      if (
        !existe ||
        new Date(item.data_recalibracao).getTime() > new Date(existe.data_recalibracao).getTime()
      ) {
        mapSafra.set(item.ano_safra, item)
      }
    })

    const lista = Array.from(mapSafra.values()).sort(
      (a, b) => new Date(a.data_recalibracao).getTime() - new Date(b.data_recalibracao).getTime(),
    )

    return lista.map((item) => ({
      safra: item.ano_safra,
      data: item.data_recalibracao
        ? new Date(item.data_recalibracao).toLocaleDateString('pt-BR')
        : '',
      media: item.valor_media,
      referencia: item.valor_referencia,
      top: item.valor_top,
      alvo: item.alvo_fazenda,
      usuario: item.usuario_nome || 'Gestor',
    }))
  }, [historico, indicadorSelecionado])

  const infoIndicadorAtual = useMemo(() => {
    return indicadoresDisponiveis.find((i) => i.codigo === indicadorSelecionado)
  }, [indicadoresDisponiveis, indicadorSelecionado])

  // Histórico em ordem decrescente (mais recente primeiro) para a tabela detalhada
  const registrosDetalhados = useMemo(() => {
    return [...historico].sort(
      (a, b) => new Date(b.data_recalibracao).getTime() - new Date(a.data_recalibracao).getTime(),
    )
  }, [historico])

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-xl">Histórico de Benchmarking Safra a Safra</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Evolução histórica das metas da fazenda, médias Exagro e níveis TOP recalibrados
                anualmente.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  try {
                    setGerandoPdf(true)
                    gerarPdfHistoricoBenchmarking({
                      nomeFazenda: 'Fazenda F3 — Pecuária Inteligente',
                      safras,
                      indicadorFiltroNome: infoIndicadorAtual?.indicador,
                      unidadeIndicador: infoIndicadorAtual?.unidade,
                      dadosGrafico,
                      registros: registrosDetalhados,
                    })
                    toast({
                      title: 'PDF gerado com sucesso!',
                      description: 'O relatório de evolução de benchmarking foi baixado.',
                    })
                  } catch (err) {
                    console.error('Erro ao gerar PDF:', err)
                    toast({
                      title: 'Erro ao gerar PDF',
                      description: 'Não foi possível compilar o documento PDF.',
                      variant: 'destructive',
                    })
                  } finally {
                    setGerandoPdf(false)
                  }
                }}
                disabled={loading || gerandoPdf || registrosDetalhados.length === 0}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium"
              >
                <Download className={`w-3.5 h-3.5 ${gerandoPdf ? 'animate-bounce' : ''}`} />
                {gerandoPdf ? 'Gerando PDF...' : 'Exportar PDF'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={carregar}
                disabled={loading}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Badge variant="outline" className="text-xs font-mono">
                {safras.length} Safra(s) Registrada(s)
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Seletor do Indicador para o Gráfico de Evolução */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Comparativo de Evolução por Indicador
              </span>
              <p className="text-xs text-muted-foreground">
                Selecione o indicador para acompanhar a trajetória de Média, Referência, TOP e Alvo
                da Fazenda.
              </p>
            </div>

            <div className="w-full sm:w-80">
              <Select value={indicadorSelecionado} onValueChange={setIndicadorSelecionado}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um indicador" />
                </SelectTrigger>
                <SelectContent>
                  {indicadoresDisponiveis.map((ind) => (
                    <SelectItem key={ind.codigo} value={ind.codigo} className="text-xs">
                      {ind.indicador} {ind.unidade ? `(${ind.unidade})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gráfico Recharts de Evolução das Metas Safra a Safra */}
          <div className="bg-background rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <span>{infoIndicadorAtual?.indicador}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {infoIndicadorAtual?.unidade}
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trajetória das faixas comparadas ao longo das safras recalibradas
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Média
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Referência
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> TOP
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Alvo
                  Fazenda
                </span>
              </div>
            </div>

            {dadosGrafico.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dadosGrafico}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="safra"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload
                          return (
                            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs space-y-1.5">
                              <p className="font-bold text-foreground border-b pb-1">
                                Safra {label} — {item.data}
                              </p>
                              <p className="text-amber-600">
                                📊 Média: <strong>{Number(item.media).toFixed(2)}</strong>{' '}
                                {infoIndicadorAtual?.unidade}
                              </p>
                              <p className="text-blue-600">
                                🟢 Referência: <strong>{Number(item.referencia).toFixed(2)}</strong>{' '}
                                {infoIndicadorAtual?.unidade}
                              </p>
                              <p className="text-purple-600">
                                ⭐ TOP Brasil: <strong>{Number(item.top).toFixed(2)}</strong>{' '}
                                {infoIndicadorAtual?.unidade}
                              </p>
                              <p className="text-emerald-600 font-bold border-t pt-1">
                                🎯 Alvo Fazenda: <strong>{Number(item.alvo).toFixed(2)}</strong>{' '}
                                {infoIndicadorAtual?.unidade}
                              </p>
                              <p className="text-[10px] text-muted-foreground pt-0.5">
                                Registrado por: {item.usuario}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="media"
                      name="Média Exagro"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="referencia"
                      name="Referência"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="top"
                      name="TOP Brasil"
                      stroke="#9333ea"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="alvo"
                      name="Alvo da Fazenda"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                <History className="w-8 h-8 opacity-40" />
                <span>Nenhum histórico registrado para este indicador ainda.</span>
              </div>
            )}
          </div>

          {/* Tabela de Snapshots Históricos das Recalibrações */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                Registros de Snapshots Gravados
              </h4>
              <span className="text-xs text-muted-foreground">
                Total de {registrosDetalhados.length} calibrações arquivadas
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Data Calibração</TableHead>
                    <TableHead className="w-24">Safra</TableHead>
                    <TableHead className="min-w-[200px]">Indicador</TableHead>
                    <TableHead className="w-20 text-right">Média</TableHead>
                    <TableHead className="w-20 text-right">Referência</TableHead>
                    <TableHead className="w-20 text-right">TOP</TableHead>
                    <TableHead className="w-24 text-right">Alvo Fazenda</TableHead>
                    <TableHead className="min-w-[140px]">Registrado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosDetalhados.map((r) => {
                    const dataFormatada = r.data_recalibracao
                      ? new Date(r.data_recalibracao).toLocaleDateString('pt-BR')
                      : '—'

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {dataFormatada}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px] font-semibold">
                            {r.ano_safra}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs text-foreground">{r.indicador}</div>
                          {r.unidade && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {r.unidade}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {r.valor_media.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                          {r.valor_referencia.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-purple-600 dark:text-purple-400">
                          {r.valor_top.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {r.alvo_fazenda.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {r.usuario_nome || 'Gestor'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {registrosDetalhados.length === 0 && !loading && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground text-xs"
                      >
                        Nenhum snapshot de recalibração registrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
