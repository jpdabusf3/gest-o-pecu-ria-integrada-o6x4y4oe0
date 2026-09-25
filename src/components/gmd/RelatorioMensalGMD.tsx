import { useState, useEffect, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  Beef,
  Layers,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { getLots, LotRecord } from '@/services/lots'
import { getPesagens, PesagemRecord } from '@/services/pesagens'
import {
  getAlertasGMD,
  AlertaGMDRecord,
  analisarLoteGMD,
  LoteGMDAnalise,
  labelFaixaPermanencia,
} from '@/services/gmdAlertas'
import { SemaforoGmdBadge } from './SemaforoGmdBadge'
import { ResolverAlertaModal } from './ResolverAlertaModal'
import { EditarMetaLoteModal } from './EditarMetaLoteModal'
import { PrintReportGMD } from './PrintReportGMD'
import { downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import { useToast } from '@/hooks/use-toast'
import { format, parseISO } from 'date-fns'

export function RelatorioMensalGMD() {
  const { toast } = useToast()
  const [lots, setLots] = useState<LotRecord[]>([])
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [alertas, setAlertas] = useState<AlertaGMDRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroFrente, setFiltroFrente] = useState<string>('all')
  const [filtroSexo, setFiltroSexo] = useState<string>('all')
  const [filtroFaixa, setFiltroFaixa] = useState<string>('all')
  const [filtroStatus, setFiltroStatus] = useState<string>('all')

  // Modais
  const [alertaParaResolver, setAlertaParaResolver] = useState<AlertaGMDRecord | null>(null)
  const [loteParaEditarMeta, setLoteParaEditarMeta] = useState<LotRecord | null>(null)
  const [modalResolverOpen, setModalResolverOpen] = useState(false)
  const [modalMetaOpen, setModalMetaOpen] = useState(false)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [lotsData, pesagensData, alertasData] = await Promise.all([
        getLots(),
        getPesagens(),
        getAlertasGMD(),
      ])
      setLots(lotsData || [])
      setPesagens(pesagensData || [])
      setAlertas(alertasData || [])
    } catch (err) {
      console.error('Erro ao carregar dados do relatório mensal:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Análise consolidada de todos os lotes
  const analisesGerais = useMemo(() => {
    return lots.map((lot) => {
      const pesagensDoLote = pesagens.filter((p) => p.lote_id === lot.id)
      return analisarLoteGMD(lot, pesagensDoLote, alertas)
    })
  }, [lots, pesagens, alertas])

  // Lotes filtrados
  const analisesFiltradas = useMemo(() => {
    return analisesGerais.filter((item) => {
      const { lote } = item

      // Filtro de frente (com segregação explícita de Arrendamento)
      if (filtroFrente !== 'all') {
        if (filtroFrente === 'arrendamento') {
          if (!lote.is_arrendamento && lote.frente !== 'arrendamento') return false
        } else {
          if (lote.is_arrendamento || lote.frente === 'arrendamento') return false
          const frenteOuSetor = lote.frente || lote.sector
          if (frenteOuSetor !== filtroFrente) return false
        }
      }

      // Filtro de sexo
      if (filtroSexo !== 'all' && lote.sex !== filtroSexo) return false

      // Filtro de faixa de permanência Exagro
      if (filtroFaixa !== 'all' && item.faixaPermanencia !== filtroFaixa) return false

      // Filtro de status do semáforo
      if (filtroStatus !== 'all' && item.statusSemaforo !== filtroStatus) return false

      return true
    })
  }, [analisesGerais, filtroFrente, filtroSexo, filtroFaixa, filtroStatus])

  // Recortes Exagro 1: Separação por Sexo em blocos distintos (Machos vs. Fêmeas)
  const lotesMachos = useMemo(
    () => analisesFiltradas.filter((a) => a.lote.sex === 'macho'),
    [analisesFiltradas],
  )
  const lotesFemeas = useMemo(
    () => analisesFiltradas.filter((a) => a.lote.sex === 'femea'),
    [analisesFiltradas],
  )
  const lotesOutros = useMemo(
    () => analisesFiltradas.filter((a) => a.lote.sex !== 'macho' && a.lote.sex !== 'femea'),
    [analisesFiltradas],
  )

  // Estatística agregada auxiliar
  const calcAgregados = (lista: LoteGMDAnalise[]) => {
    const comGmd = lista.filter((i) => i.gmdRealKg !== null && i.gmdRealKg > 0)
    const cabTotal = lista.reduce((sum, i) => sum + (i.lote.headcount || 0), 0)

    // Média ponderada por cabeças do GMD Real
    const somaPonderadaGmd = comGmd.reduce(
      (sum, i) => sum + i.gmdRealKg! * (i.lote.headcount || 1),
      0,
    )
    const somaCabGmd = comGmd.reduce((sum, i) => sum + (i.lote.headcount || 1), 0)
    const gmdMedioPonderadoKg = somaCabGmd > 0 ? somaPonderadaGmd / somaCabGmd : 0

    // Média de GMD Meta
    const gmdMetaMedioG =
      lista.length > 0 ? lista.reduce((sum, i) => sum + i.gmdAlvoG, 0) / lista.length : 0

    // Desvio médio ponderado
    const desvioMedio =
      gmdMetaMedioG > 0
        ? Number((((gmdMedioPonderadoKg * 1000 - gmdMetaMedioG) / gmdMetaMedioG) * 100).toFixed(1))
        : 0

    // GDC médio ponderado
    const comGdc = comGmd.filter((i) => i.gdcRealKg !== null)
    const somaGdc = comGdc.reduce((sum, i) => sum + i.gdcRealKg! * (i.lote.headcount || 1), 0)
    const somaCabGdc = comGdc.reduce((sum, i) => sum + (i.lote.headcount || 1), 0)
    const gdcMedioPonderadoKg = somaCabGdc > 0 ? somaGdc / somaCabGdc : null

    return {
      totalLotes: lista.length,
      cabTotal,
      gmdMedioPonderadoG: Math.round(gmdMedioPonderadoKg * 1000),
      gmdMedioPonderadoKg,
      gmdMetaMedioG: Math.round(gmdMetaMedioG),
      desvioMedio,
      gdcMedioPonderadoG: gdcMedioPonderadoKg ? Math.round(gdcMedioPonderadoKg * 1000) : null,
      emAlerta: lista.filter((i) => i.statusSemaforo === 'vermelho').length,
    }
  }

  const kpisGerais = useMemo(() => calcAgregados(analisesFiltradas), [analisesFiltradas])
  const kpisMachos = useMemo(() => calcAgregados(lotesMachos), [lotesMachos])
  const kpisFemeas = useMemo(() => calcAgregados(lotesFemeas), [lotesFemeas])

  // Recorte Exagro 2: Por Faixa de Permanência (até 90 dias, 91-120 dias, acima de 120 dias)
  const recortesFaixa = useMemo(() => {
    const faixas: Array<'ate_90' | '91_120' | 'acima_120'> = ['ate_90', '91_120', 'acima_120']
    return faixas.map((faixa) => {
      const itensMachos = lotesMachos.filter((i) => i.faixaPermanencia === faixa)
      const itensFemeas = lotesFemeas.filter((i) => i.faixaPermanencia === faixa)
      const itensGerais = analisesFiltradas.filter((i) => i.faixaPermanencia === faixa)
      return {
        faixa,
        label: labelFaixaPermanencia(faixa),
        statsGeral: calcAgregados(itensGerais),
        statsMachos: calcAgregados(itensMachos),
        statsFemeas: calcAgregados(itensFemeas),
      }
    })
  }, [analisesFiltradas, lotesMachos, lotesFemeas])

  // Recorte Exagro 3: Consolidação por Frente (cria, recria, engorda, arrendamento) - NUNCA misturar arrendamento
  const recortesFrente = useMemo(() => {
    const frentes = [
      { key: 'cria', label: 'Cria (Fazenda Própria)' },
      { key: 'recria', label: 'Recria (Fazenda Própria)' },
      { key: 'engorda', label: 'Engorda / Confinamento (Fazenda Própria)' },
      { key: 'arrendamento', label: 'Arrendamento (Segregado)' },
    ]

    return frentes.map((f) => {
      let itens: LoteGMDAnalise[] = []
      if (f.key === 'arrendamento') {
        itens = analisesFiltradas.filter(
          (i) => i.lote.is_arrendamento || i.lote.frente === 'arrendamento',
        )
      } else {
        itens = analisesFiltradas.filter(
          (i) =>
            !i.lote.is_arrendamento &&
            i.lote.frente !== 'arrendamento' &&
            (i.lote.frente === f.key || i.lote.sector === f.key),
        )
      }

      return {
        frente: f.key,
        label: f.label,
        stats: calcAgregados(itens),
        isArrendamento: f.key === 'arrendamento',
      }
    })
  }, [analisesFiltradas])

  // Recorte Exagro 4: Por Categoria Animal (Bois, Garrotes, Bezerros, Vacas...)
  const recortesCategoria = useMemo(() => {
    const catsMap = new Map<string, LoteGMDAnalise[]>()
    analisesFiltradas.forEach((item) => {
      const cat = item.lote.category || 'Não categorizado'
      if (!catsMap.has(cat)) catsMap.set(cat, [])
      catsMap.get(cat)!.push(item)
    })

    return Array.from(catsMap.entries())
      .map(([categoria, itens]) => ({
        categoria,
        sexo: itens[0]?.lote.sex || 'outro',
        stats: calcAgregados(itens),
      }))
      .sort((a, b) =>
        a.sexo === b.sexo ? a.categoria.localeCompare(b.categoria) : a.sexo.localeCompare(b.sexo),
      )
  }, [analisesFiltradas])

  // Lotes em alerta e histórico de alertas com causas
  const alertasComCausas = useMemo(() => {
    return alertas.map((a) => {
      const lote = a.expand?.lote_id || lots.find((l) => l.id === a.lote_id)
      return {
        ...a,
        loteNome: lote?.name || 'Lote',
        loteSetor: lote?.sector || '',
      }
    })
  }, [alertas, lots])

  // Exportações
  const handleExportExcel = () => {
    const dadosExcel = analisesFiltradas.map((item) => ({
      Lote: item.lote.name,
      Sexo: item.lote.sex?.toUpperCase(),
      Categoria: item.lote.category || '-',
      Fase: item.lote.fase_atual || item.lote.sector,
      Frente: item.frenteSegregada,
      'Permanência (dias)': item.permanenciaDias,
      'Faixa Permanência': labelFaixaPermanencia(item.faixaPermanencia),
      Cabeças: item.lote.headcount || 0,
      'GMD Alvo (g/dia)': item.gmdAlvoG,
      'GMD Real (g/dia)': item.gmdRealG || '-',
      'GDC Carcaça (g/dia)': item.gdcRealKg ? Math.round(item.gdcRealKg * 1000) : '-',
      'Desvio (%)': item.desvioPct !== null ? `${item.desvioPct}%` : '-',
      Semáforo: item.statusSemaforo.toUpperCase(),
      'Dias sem Pesagem': item.diasSemPesagem !== null ? item.diasSemPesagem : '-',
    }))

    downloadExcel(dadosExcel, 'relatorio_mensal_gmd_exagro')
    toast({
      title: 'Excel Exportado',
      description: 'Relatório mensal de GMD gerado no padrão Exagro.',
    })
  }

  const handleExportPdf = () => {
    window.print()
    toast({
      title: 'Gerando PDF Exagro',
      description: 'Relatório zootécnico pronto para nutricionista e reunião de sócios.',
    })
  }

  // Componente de Tabela de Lotes Reutilizável por Bloco
  const renderLotesTable = (lista: LoteGMDAnalise[], tituloBloco: string, badgeCor: string) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Badge className={badgeCor}>{tituloBloco}</Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {lista.length} lote(s) • {lista.reduce((sum, i) => sum + (i.lote.headcount || 0), 0)}{' '}
              cabeças
            </span>
          </div>
          {lista.length > 0 && (
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-3">
              <span>
                GMD Médio:{' '}
                <strong className="text-foreground">
                  {calcAgregados(lista).gmdMedioPonderadoG} g/d
                </strong>
              </span>
              <span>
                Desvio:{' '}
                <strong
                  className={
                    calcAgregados(lista).desvioMedio >= -10
                      ? 'text-emerald-600'
                      : calcAgregados(lista).desvioMedio >= -20
                        ? 'text-amber-600'
                        : 'text-destructive'
                  }
                >
                  {calcAgregados(lista).desvioMedio}%
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fase / Frente</TableHead>
                <TableHead className="text-right">Permanência</TableHead>
                <TableHead className="text-right">Cab</TableHead>
                <TableHead className="text-right">GMD Alvo</TableHead>
                <TableHead className="text-right">GMD Real</TableHead>
                <TableHead className="text-right">GDC Carcaça</TableHead>
                <TableHead className="text-right">Desvio (%)</TableHead>
                <TableHead>Semáforo</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((item) => {
                const { lote } = item
                return (
                  <TableRow key={lote.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold text-primary">
                      {lote.name}
                      {lote.is_arrendamento && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] text-amber-600 border-amber-300"
                        >
                          Arrendamento
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lote.category || '-'}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {lote.fase_atual || lote.sector} •{' '}
                      <span className="text-muted-foreground">{item.frenteSegregada}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {item.permanenciaDias} d{' '}
                      <span className="text-[10px] text-muted-foreground block">
                        ({labelFaixaPermanencia(item.faixaPermanencia)})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {lote.headcount || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-xs">
                      {item.gmdAlvoG} g/d
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs whitespace-nowrap">
                      {item.gmdRealKg !== null ? (
                        <span
                          className={
                            item.gmdRealG! >= item.gmdAlvoG ? 'text-emerald-600' : 'text-foreground'
                          }
                        >
                          {item.gmdRealG} g/d
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                      {item.gdcRealKg !== null ? (
                        <span className="text-purple-600 font-semibold">
                          {Math.round(item.gdcRealKg * 1000)} g/d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-xs whitespace-nowrap">
                      {item.desvioPct !== null ? (
                        <span
                          className={
                            item.desvioPct >= -10
                              ? 'text-emerald-600'
                              : item.desvioPct >= -20
                                ? 'text-amber-600'
                                : 'text-destructive'
                          }
                        >
                          {item.desvioPct > 0 ? `+${item.desvioPct}%` : `${item.desvioPct}%`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SemaforoGmdBadge
                        status={item.statusSemaforo}
                        desvioPct={item.desvioPct}
                        diasSemPesagem={item.diasSemPesagem}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setLoteParaEditarMeta(lote)
                          setModalMetaOpen(true)
                        }}
                      >
                        Ajustar Meta
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}

              {lista.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="h-20 text-center text-muted-foreground text-xs"
                  >
                    Nenhum lote neste bloco com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Relatório Formatado Exclusivo para Impressão / Exportação PDF (Metodologia Exagro) */}
      <PrintReportGMD
        kpisGerais={kpisGerais}
        lotesMachos={lotesMachos}
        lotesFemeas={lotesFemeas}
        lotesOutros={lotesOutros}
        recortesFaixa={recortesFaixa}
        recortesFrente={recortesFrente}
        alertasComCausas={alertasComCausas}
      />

      <div className="space-y-6 print:hidden">
        {/* Cabeçalho do Relatório */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" /> Relatório Mensal de GMD (Padrão Exagro)
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Fechamento de desempenho ponderado, recortes por sexo, faixa de permanência, frente
              segregada e controle de alertas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <FileText className="h-4 w-4" /> Imprimir Relatório
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Planilha Exagro
            </Button>
          </div>
        </div>

        {/* KPIs Gerais do Fechamento */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Rebanho Monitorado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{kpisGerais.cabTotal} cab</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {kpisGerais.totalLotes} lote(s) no fechamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                GMD Médio Ponderado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {kpisGerais.gmdMedioPonderadoG} g/dia
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meta Média: {kpisGerais.gmdMetaMedioG} g/dia
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Desvio Geral vs Meta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  kpisGerais.desvioMedio >= -10
                    ? 'text-emerald-600'
                    : kpisGerais.desvioMedio >= -20
                      ? 'text-amber-600'
                      : 'text-destructive'
                }`}
              >
                {kpisGerais.desvioMedio > 0
                  ? `+${kpisGerais.desvioMedio}%`
                  : `${kpisGerais.desvioMedio}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Média ponderada do período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                GDC Carcaça Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {kpisGerais.gdcMedioPonderadoG ? `${kpisGerais.gdcMedioPonderadoG} g/dia` : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Ganho diário de carcaça</p>
            </CardContent>
          </Card>

          <Card
            className={kpisGerais.emAlerta > 0 ? 'bg-destructive/10 border-destructive/30' : ''}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Lotes Críticos (&gt;20%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  kpisGerais.emAlerta > 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {kpisGerais.emAlerta} lote(s)
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alertas.filter((a) => a.status === 'aberto').length} alerta(s) persistente(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros de Recorte */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-1 font-semibold">
                  Frente Operacional
                </span>
                <Select value={filtroFrente} onValueChange={setFiltroFrente}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Frentes</SelectItem>
                    <SelectItem value="cria">Cria (Fazenda Própria)</SelectItem>
                    <SelectItem value="recria">Recria (Fazenda Própria)</SelectItem>
                    <SelectItem value="engorda">Engorda (Fazenda Própria)</SelectItem>
                    <SelectItem value="arrendamento">Arrendamento (Segregado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1 font-semibold">Sexo</span>
                <Select value={filtroSexo} onValueChange={setFiltroSexo}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ambos os Sexos</SelectItem>
                    <SelectItem value="macho">Machos (Separado)</SelectItem>
                    <SelectItem value="femea">Fêmeas (Separado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1 font-semibold">
                  Faixa de Permanência (Exagro)
                </span>
                <Select value={filtroFaixa} onValueChange={setFiltroFaixa}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Faixas</SelectItem>
                    <SelectItem value="ate_90">Até 90 dias</SelectItem>
                    <SelectItem value="91_120">91 a 120 dias</SelectItem>
                    <SelectItem value="acima_120">Acima de 120 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1 font-semibold">
                  Semáforo de Desvio
                </span>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="verde">Verde (No Alvo: até 10%)</SelectItem>
                    <SelectItem value="amarelo">Amarelo (Atenção: 10-20%)</SelectItem>
                    <SelectItem value="vermelho">Vermelho (Crítico: &gt; 20%)</SelectItem>
                    <SelectItem value="cinza">Cinza (Sem dados &gt; 60 dias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abas com os 4 Recortes Exagro Principais */}
        <Tabs defaultValue="sexo" className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="sexo" className="py-2.5 text-xs sm:text-sm">
              1. Recorte por Sexo (Blocos)
            </TabsTrigger>
            <TabsTrigger value="faixa" className="py-2.5 text-xs sm:text-sm">
              2. Faixa de Permanência
            </TabsTrigger>
            <TabsTrigger value="frente" className="py-2.5 text-xs sm:text-sm">
              3. Frente Segregada
            </TabsTrigger>
            <TabsTrigger value="alertas" className="py-2.5 text-xs sm:text-sm">
              4. Lotes em Alerta & Causas ({alertas.length})
            </TabsTrigger>
          </TabsList>

          {/* 1. Recorte por Sexo (Machos e Fêmeas em blocos distintos) */}
          <TabsContent value="sexo" className="space-y-6 mt-2">
            {renderLotesTable(
              lotesMachos,
              'Bloco de Machos (Bois / Garrotes / Bezerros)',
              'bg-blue-600 text-white',
            )}

            {renderLotesTable(
              lotesFemeas,
              'Bloco de Fêmeas (Vacas / Novilhas / Bezerras)',
              'bg-rose-600 text-white',
            )}

            {lotesOutros.length > 0 &&
              renderLotesTable(
                lotesOutros,
                'Outros Lotes / Rebanho Misto',
                'bg-slate-700 text-white',
              )}
          </TabsContent>

          {/* 2. Recorte por Faixa de Permanência */}
          <TabsContent value="faixa" className="space-y-4 mt-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">GMD Médio por Faixa de Permanência</CardTitle>
                <CardDescription>
                  Padrão de fechamento Exagro: segregação entre lotes novos (&le;90d),
                  intermediários (91-120d) e de longa permanência (&gt;120d).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa de Permanência</TableHead>
                      <TableHead className="text-right">Lotes</TableHead>
                      <TableHead className="text-right">Total Cabeças</TableHead>
                      <TableHead className="text-right">GMD Machos</TableHead>
                      <TableHead className="text-right">GMD Fêmeas</TableHead>
                      <TableHead className="text-right">GMD Consolidado</TableHead>
                      <TableHead className="text-right">Desvio Médio</TableHead>
                      <TableHead className="text-right">Lotes Críticos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recortesFaixa.map((row) => (
                      <TableRow key={row.faixa}>
                        <TableCell className="font-semibold text-primary">{row.label}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.statsGeral.totalLotes}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {row.statsGeral.cabTotal} cab
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-700 font-semibold">
                          {row.statsMachos.gmdMedioPonderadoG > 0
                            ? `${row.statsMachos.gmdMedioPonderadoG} g/d`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-rose-700 font-semibold">
                          {row.statsFemeas.gmdMedioPonderadoG > 0
                            ? `${row.statsFemeas.gmdMedioPonderadoG} g/d`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700">
                          {row.statsGeral.gmdMedioPonderadoG > 0
                            ? `${row.statsGeral.gmdMedioPonderadoG} g/d`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span
                            className={
                              row.statsGeral.desvioMedio >= -10
                                ? 'text-emerald-600'
                                : row.statsGeral.desvioMedio >= -20
                                  ? 'text-amber-600'
                                  : 'text-destructive'
                            }
                          >
                            {row.statsGeral.desvioMedio > 0
                              ? `+${row.statsGeral.desvioMedio}%`
                              : `${row.statsGeral.desvioMedio}%`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.statsGeral.emAlerta > 0 ? (
                            <Badge variant="destructive">{row.statsGeral.emAlerta}</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-300"
                            >
                              0
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Recorte por Frente Operacional Segregada */}
          <TabsContent value="frente" className="space-y-4 mt-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">GMD Médio Ponderado por Frente</CardTitle>
                <CardDescription>
                  Segregação contábil e zootécnica:{' '}
                  <strong>Arrendamento NUNCA é misturado com a fazenda própria</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Frente Operacional</TableHead>
                      <TableHead className="text-right">Lotes</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">GMD Meta</TableHead>
                      <TableHead className="text-right">GMD Real Ponderado</TableHead>
                      <TableHead className="text-right">GDC Carcaça</TableHead>
                      <TableHead className="text-right">Desvio vs Meta</TableHead>
                      <TableHead className="text-right">Lotes Críticos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recortesFrente.map((row) => (
                      <TableRow
                        key={row.frente}
                        className={row.isArrendamento ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                      >
                        <TableCell className="font-semibold text-foreground">
                          {row.label}
                          {row.isArrendamento && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-amber-700 border-amber-300"
                            >
                              Segregado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.stats.totalLotes}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {row.stats.cabTotal} cab
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground text-xs">
                          {row.stats.gmdMetaMedioG > 0 ? `${row.stats.gmdMetaMedioG} g/d` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700">
                          {row.stats.gmdMedioPonderadoG > 0
                            ? `${row.stats.gmdMedioPonderadoG} g/d`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-purple-700 font-semibold text-xs">
                          {row.stats.gdcMedioPonderadoG
                            ? `${row.stats.gdcMedioPonderadoG} g/d`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span
                            className={
                              row.stats.desvioMedio >= -10
                                ? 'text-emerald-600'
                                : row.stats.desvioMedio >= -20
                                  ? 'text-amber-600'
                                  : 'text-destructive'
                            }
                          >
                            {row.stats.desvioMedio > 0
                              ? `+${row.stats.desvioMedio}%`
                              : `${row.stats.desvioMedio}%`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.stats.emAlerta > 0 ? (
                            <Badge variant="destructive">{row.stats.emAlerta}</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-300"
                            >
                              0
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Lotes em Alerta & Causas Registradas */}
          <TabsContent value="alertas" className="space-y-4 mt-2">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" /> Registro de Ocorrências e
                    Contramedidas
                  </CardTitle>
                  <CardDescription>
                    Histórico de alertas com diagnóstico de causas zootécnicas e planos de ação
                    registrados.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {alertasComCausas.length} registro(s)
                </Badge>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Desvio</TableHead>
                      <TableHead className="text-right">GMD Real / Meta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[200px]">Causa Diagnosticada</TableHead>
                      <TableHead className="min-w-[200px]">Contramedida Adotada</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertasComCausas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {alerta.data ? format(parseISO(alerta.data), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {alerta.loteNome}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive text-xs">
                          {alerta.desvio_pct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {alerta.gmd_real || '-'} / {alerta.gmd_alvo || 900} g/d
                        </TableCell>
                        <TableCell>
                          {alerta.status === 'aberto' ? (
                            <Badge variant="destructive" className="text-[10px] animate-pulse">
                              Aberto
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 bg-emerald-50"
                            >
                              Resolvido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs">
                          {alerta.causa || (
                            <span className="italic text-amber-600">Pendente de diagnóstico</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs">
                          {alerta.contramedida || (
                            <span className="italic text-amber-600">Pendente de contramedida</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {alerta.status === 'aberto' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive border-destructive/40"
                              onClick={() => {
                                setAlertaParaResolver(alerta)
                                setModalResolverOpen(true)
                              }}
                            >
                              Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {alertasComCausas.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground text-xs"
                        >
                          Nenhum alerta de desvio registrado no histórico.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <ResolverAlertaModal
          alerta={alertaParaResolver}
          open={modalResolverOpen}
          onOpenChange={setModalResolverOpen}
          onSuccess={carregarDados}
        />

        <EditarMetaLoteModal
          lote={loteParaEditarMeta}
          open={modalMetaOpen}
          onOpenChange={setModalMetaOpen}
          onSuccess={carregarDados}
        />
      </div>
    </div>
  )
}
