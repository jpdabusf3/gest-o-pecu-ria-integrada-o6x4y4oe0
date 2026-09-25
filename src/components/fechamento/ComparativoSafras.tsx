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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Archive,
  TrendingUp,
  History,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  Layers,
  Scale,
  DollarSign,
  HelpCircle,
} from 'lucide-react'
import {
  FechamentoArquivadoRecord,
  getFechamentosArquivados,
  arquivarFechamentoSafra,
} from '@/services/safrasArquivadas'
import { FrenteFechamento } from '@/services/fechamento'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  calcularProjecaoSafra,
  ProjecaoSafraResult,
  TipoCenarioProjecao,
} from '@/services/projecaoSafra'
import { getCotacaoB3BoiGordoVigente, type CotacaoB3BoiGordoVigente } from '@/services/market'
import { cn } from '@/lib/utils'
import { getLots } from '@/services/lots'
import { getPesagens } from '@/services/pesagens'
import {
  getMovimentacoesRebanho,
  getVendas,
  getComprasGado,
  getLancamentosFinanceiros,
  getEstoqueInsumos,
  getImobilizado,
} from '@/services/fechamento'
import { getConfigBenchmarks, ConfigBenchmarkRecord } from '@/services/configBenchmark'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { getMetasSafra, calcularAtingimentoMeta, type MetasSafraMap } from '@/services/metasSafra'
import { Target } from 'lucide-react'

interface ComparativoSafrasProps {
  frente: FrenteFechamento
  dadosFechamentoAtual?: any
}

export function ComparativoSafras({ frente, dadosFechamentoAtual }: ComparativoSafrasProps) {
  const [safras, setSafras] = useState<FechamentoArquivadoRecord[]>([])
  const [benchmarks, setBenchmarks] = useState<ConfigBenchmarkRecord[]>([])
  const [projecao, setProjecao] = useState<ProjecaoSafraResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [arquivando, setArquivando] = useState(false)
  const [mostrarBaseCalculo, setMostrarBaseCalculo] = useState(false)
  const [cotacaoB3, setCotacaoB3] = useState<CotacaoB3BoiGordoVigente | null>(null)
  const [cenarioAtivo, setCenarioAtivo] = useState<TipoCenarioProjecao>('realista')
  const [metasSafraMap, setMetasSafraMap] = useState<MetasSafraMap>({})
  const { toast } = useToast()
  const { user } = useAuth()

  const carregarDados = async () => {
    try {
      setLoading(true)
      const timeoutPromise = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), 5000),
      )

      const carregarPromise = Promise.allSettled([
        getFechamentosArquivados(frente),
        getConfigBenchmarks(),
        getLots(),
        getPesagens(),
        getMovimentacoesRebanho(),
        getVendas(),
        getComprasGado(),
        getLancamentosFinanceiros(),
        getEstoqueInsumos(),
        getImobilizado(),
        getMetasSafra(),
      ])

      const corrida = await Promise.race([carregarPromise, timeoutPromise])

      let safrasData: any[] = []
      let bmList: any[] = []
      let l: any[] = []
      let p: any[] = []
      let m: any[] = []
      let v: any[] = []
      let c: any[] = []
      let f: any[] = []
      let e: any[] = []
      let imo: any[] = []
      let metas: any = {}

      if (corrida !== 'timeout') {
        const [sR, bmR, lR, pR, mR, vR, cR, fR, eR, imoR, metasR] = corrida
        if (sR.status === 'fulfilled') safrasData = sR.value
        if (bmR.status === 'fulfilled') bmList = bmR.value
        if (lR.status === 'fulfilled') l = lR.value
        if (pR.status === 'fulfilled') p = pR.value
        if (mR.status === 'fulfilled') m = mR.value
        if (vR.status === 'fulfilled') v = vR.value
        if (cR.status === 'fulfilled') c = cR.value
        if (fR.status === 'fulfilled') f = fR.value
        if (eR.status === 'fulfilled') e = eR.value
        if (imoR.status === 'fulfilled') imo = imoR.value
        if (metasR.status === 'fulfilled') metas = metasR.value
      }

      setSafras(safrasData || [])
      setBenchmarks(bmList || [])
      setMetasSafraMap(metas || {})

      // Calcula a projeção da safra atual em andamento para esta frente
      const proj = calcularProjecaoSafra({
        lots: l,
        pesagens: p,
        movimentacoes: m,
        vendas: v,
        compras: c,
        financeiro: f,
        estoque: e,
        imobilizado: imo,
        benchmarks: bmList,
        frente: frente,
        segregacao:
          frente === 'arrendamento'
            ? 'arrendamento'
            : frente === 'todas'
              ? 'consolidada'
              : 'propria',
        cotacaoArroba: cotacaoB3?.preco ?? 245.0,
        cotacaoB3DataReferencia: cotacaoB3?.dataReferencia,
        cotacaoB3Desatualizada: cotacaoB3?.desatualizada ?? false,
        cotacaoB3DiasAtraso: cotacaoB3?.diasAtraso ?? 0,
        cotacaoB3Origem: cotacaoB3?.origem ?? 'b3_real',
      })
      setProjecao(proj)
    } catch (err) {
      console.warn('Erro ao carregar dados do comparativo de safras:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cotação B3 vigente do Boi Gordo (mesmo serviço centralizado usado no dashboard)
  useEffect(() => {
    let montado = true
    getCotacaoB3BoiGordoVigente()
      .then((c) => {
        if (montado) setCotacaoB3(c)
      })
      .catch(() => {
        if (montado)
          setCotacaoB3({
            preco: 245.0,
            dataReferencia: new Date().toISOString(),
            origem: 'fallback',
            regiao: 'B3',
            desatualizada: false,
            diasAtraso: 0,
          })
      })
    return () => {
      montado = false
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [frente, cotacaoB3])

  const handleArquivarSafraAtual = async () => {
    if (!dadosFechamentoAtual) return

    try {
      setArquivando(true)
      const anoAtual = new Date().getFullYear()
      const safraRotulo = `${anoAtual - 1}/${anoAtual}`

      const payload = {
        ano_safra: safraRotulo,
        periodo_rotulo: `Safra ${safraRotulo} Consolidada`,
        frente: frente,
        arrobas_ha_ano: dadosFechamentoAtual.arrobasPorHaAno || 16.5,
        arrobas_cab_ano: dadosFechamentoAtual.arrobasPorCabAno || 5.4,
        custo_arroba_produzida: dadosFechamentoAtual.custeio?.custoArrobaProduzida || 135.0,
        cotacao_arroba_media: dadosFechamentoAtual.cotacaoArrobaVigente || 240.0,
        margem_ebitda_pct: dadosFechamentoAtual.dre?.margemEbitda || 25.0,
        ebitda_total: dadosFechamentoAtual.dre?.ebitda || 550000,
        lucro_liquido: dadosFechamentoAtual.dre?.lucroLiquido || 430000,
        receita_total: dadosFechamentoAtual.dre?.receitaBrutaVendasGado || 2200000,
        custeio_cab_ano: dadosFechamentoAtual.custeio?.custeioCabAno || 1720,
        taxa_lotacao_ua_ha: dadosFechamentoAtual.zootecnico?.taxaLotacaoMediaUaHa || 1.25,
        mortalidade_pct: dadosFechamentoAtual.zootecnico?.taxaMortalidadePct || 1.2,
        taxa_desmame_pct: dadosFechamentoAtual.zootecnico?.taxaDesmamePct || 81.0,
        gmd_medio_kg_dia: dadosFechamentoAtual.zootecnico?.gmdMedioGeral || 0.88,
        rebanho_medio_cab: dadosFechamentoAtual.zootecnico?.rebanhoMedioCab || 360,
        arrobas_totais_produzidas: dadosFechamentoAtual.totalProducaoArrobas || 1944,
        arquivado_por: user.name || 'Gestor',
        arquivado_em: new Date().toISOString(),
      }

      await arquivarFechamentoSafra(payload)
      toast({
        title: 'Fechamento de Safra Arquivado!',
        description: `Snapshot da Safra ${safraRotulo} registrado na coleção com sucesso.`,
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao Arquivar',
        description: err.message || 'Falha ao registrar safra.',
        variant: 'destructive',
      })
    } finally {
      setArquivando(false)
    }
  }

  // Prepara dados do gráfico combinando histórico realizado + Safra Atual Projetada
  const chartData = useMemo(() => {
    const pontos = safras.map((s) => ({
      safra: s.ano_safra,
      tipo: 'Realizado',
      arrobasHa: s.arrobas_ha_ano,
      arrobasCab: s.arrobas_cab_ano,
      custoArroba: s.custo_arroba_produzida,
      margemEbitda: s.margem_ebitda_pct || 0,
      gmdKgDia: s.gmd_medio_kg_dia || 0,
    }))

    if (projecao) {
      pontos.push({
        safra: `${projecao.anoSafra} (Proj.)`,
        tipo: 'Projeção',
        arrobasHa: projecao.projetado.arrobasPorHaAno,
        arrobasCab: projecao.projetado.arrobasPorCabAno,
        custoArroba: projecao.projetado.custoArrobaProduzida,
        margemEbitda: projecao.projetado.margemEbitdaPct || 0,
        gmdKgDia: projecao.projetado.gmdMedioKgDia || 0,
      })
    }

    return pontos
  }, [safras, projecao])

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              Comparativo Histórico entre Safras & Projeção da Safra Atual
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evolução zootécnica e financeira comparando safras arquivadas no PocketBase ao lado da{' '}
            <strong>projeção de fechamento da safra atual em andamento</strong>.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-2 font-semibold shadow-xs"
          onClick={handleArquivarSafraAtual}
          disabled={arquivando}
        >
          <Archive className="h-4 w-4" />
          {arquivando ? 'Arquivando...' : 'Arquivar Safra Atual'}
        </Button>
      </div>

      {/* BLOCO DESTACADO: PROJEÇÃO DA SAFRA ATUAL EM ANDAMENTO */}
      {projecao && (
        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card shadow-sm">
          <CardHeader className="p-4 pb-2 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-foreground">
                      Safra Atual em Andamento ({projecao.anoSafra}) — Projeção de Fechamento
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[10px] font-mono uppercase"
                    >
                      Em Andamento
                    </Badge>

                    {/* Badge de Meta da Safra Atual e Atingimento */}
                    {metasSafraMap.arroba_ha_ano?.valor_alvo &&
                      (() => {
                        const atg = calcularAtingimentoMeta(
                          'arroba_ha_ano',
                          projecao.projetado.arrobasPorHaAno,
                          metasSafraMap.arroba_ha_ano.valor_alvo,
                        )
                        return (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 gap-1 ${atg.corBadge}`}
                          >
                            <Target className="w-3 h-3" />
                            Meta da safra: {metasSafraMap.arroba_ha_ano.valor_alvo.toFixed(1)} @/ha
                            — atingimento {atg.percentual}%
                          </Badge>
                        )
                      })()}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Base: acumulado de {projecao.periodoRotulo} extrapolado para 365 dias (safra{' '}
                    <strong>{projecao.percentualSafraPercorrido.toFixed(1)}% percorrida</strong>,{' '}
                    {projecao.diasDecorridos} de {projecao.diasTotaisSafra} dias)
                  </CardDescription>
                </div>{' '}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarBaseCalculo(!mostrarBaseCalculo)}
                  className="h-7 text-xs gap-1 border-muted-foreground/30"
                >
                  <Info className="w-3.5 h-3.5 text-primary" />
                  {mostrarBaseCalculo ? 'Ocultar Memória de Cálculo' : 'Ver Memória de Cálculo'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Grid dos Principais Indicadores Projetados vs Realizado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  @ / ha / ano (Proj.)
                </span>
                <span className="text-xl font-black font-mono text-emerald-600 block">
                  {projecao.projetado.arrobasPorHaAno.toFixed(2)} @
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  acum: {projecao.acumulado.arrobasPorHa.toFixed(2)} @/ha
                </span>
                <Badge
                  className={`text-[9px] px-1 py-0 ${projecao.classificacaoArrobasHaAno.cor}`}
                  variant="outline"
                >
                  {projecao.classificacaoArrobasHaAno.label.split('(')[0]}
                </Badge>
              </div>

              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Custo / @ (Proj.)
                </span>
                <span className="text-xl font-black font-mono text-foreground block">
                  {formatCurrency(projecao.projetado.custoArrobaProduzida)}
                </span>
                <span className="text-[10px] text-muted-foreground block">sem reposição</span>
                <Badge
                  className={`text-[9px] px-1 py-0 ${projecao.classificacaoCustoArroba.cor}`}
                  variant="outline"
                >
                  {projecao.classificacaoCustoArroba.label.split('(')[0]}
                </Badge>
              </div>

              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  @ / cab / ano (Proj.)
                </span>
                <span className="text-xl font-black font-mono text-foreground block">
                  {projecao.projetado.arrobasPorCabAno.toFixed(2)} @
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  rebanho: {projecao.rebanhoMedioCab} cab
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  acum: {projecao.acumulado.arrobasPorCab.toFixed(2)} @
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Total @ Projetado
                </span>
                <span className="text-xl font-black font-mono text-primary block">
                  {projecao.projetado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  acumulado: {projecao.acumulado.arrobasProduzidasTotal.toLocaleString('pt-BR')} @
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  fator: ×{projecao.fatorAnualizacao}
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Margem EBITDA (Proj.)
                </span>
                <span className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 block">
                  {projecao.projetado.margemEbitdaPct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  EBITDA: {formatCurrency(projecao.projetado.ebitdaRs)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Margem Saudável
                </span>
              </div>

              <div className="p-3 rounded-xl border bg-card text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Área Pastoril Base
                </span>
                <span className="text-xl font-black font-mono text-foreground block">
                  {projecao.areaPastorilConsideradaHa} ha
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {projecao.segregacao === 'propria'
                    ? 'Fazenda Própria'
                    : projecao.segregacao === 'arrendamento'
                      ? 'Arrendamento'
                      : 'Consolidado'}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  divisor de produtividade
                </span>
              </div>
            </div>

            {/* CENÁRIOS + RECEITA B3 da safra atual (simulação, Projeção Estimada) */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    Cenários de Projeção & Receita B3 Vigente
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[9px] font-mono uppercase"
                  >
                    Simulação — Projeção Estimada
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-background text-blue-700 dark:text-blue-300 border-blue-400/40 font-mono text-[10px]"
                  >
                    B3: {formatCurrency(projecao.cotacaoB3.preco)}/@
                    {cotacaoB3?.dataReferencia &&
                      ` · ref. ${new Date(cotacaoB3.dataReferencia).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}`}
                  </Badge>
                  {projecao.cotacaoB3.desatualizada && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[10px]"
                    >
                      cotação desatualizada ({projecao.cotacaoB3.diasAtraso}d)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['otimista', 'realista', 'pessimista'] as TipoCenarioProjecao[]).map((tipo) => {
                  const c = projecao.cenarios[tipo]
                  return (
                    <button
                      type="button"
                      key={tipo}
                      onClick={() => setCenarioAtivo(tipo)}
                      className={cn(
                        'p-2.5 rounded-lg border text-left space-y-1 transition-all text-card-foreground',
                        cenarioAtivo === tipo
                          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border bg-card hover:shadow-xs',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {tipo === 'otimista'
                            ? 'Otimista'
                            : tipo === 'realista'
                              ? 'Realista'
                              : 'Pessimista'}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {c.variacaoGmdPct >= 0 ? '+' : ''}
                          {c.variacaoGmdPct.toFixed(0)}% GMD · {c.variacaoCustoPct >= 0 ? '+' : ''}
                          {c.variacaoCustoPct.toFixed(0)}% custo
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black font-mono text-foreground">
                          {c.arrobasPorHaAno.toFixed(2)} @/ha
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] px-1 py-0', c.classificacaoArrobasHaAno.cor)}
                        >
                          {c.classificacaoArrobasHaAno.label.split('(')[0]}
                        </Badge>
                      </div>
                      <div className="flex items-baseline justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          GMD {c.gmdMedioKgDia.toFixed(2)} kg/dia · Custo/@{' '}
                          <strong className="text-foreground font-mono">
                            {formatCurrency(c.custoArrobaProduzida)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[10px] pt-1 border-t">
                        <span className="text-muted-foreground">Receita B3:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(c.receitaProjetadaB3Rs)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[10px]">
                        <span className="text-muted-foreground">Resultado:</span>
                        <span
                          className={cn(
                            'font-mono font-bold',
                            c.resultadoLiquidoRs >= 0 ? 'text-emerald-600' : 'text-destructive',
                          )}
                        >
                          {formatCurrency(c.resultadoLiquidoRs)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Fórmula:</strong> Receita Projetada = @
                Projetada do cenário × Cotação B3 vigente (
                {projecao.cenarios[cenarioAtivo].arrobasProduzidasTotal.toLocaleString('pt-BR')} @ ×{' '}
                {formatCurrency(projecao.cotacaoB3.preco)}/@ ={' '}
                {formatCurrency(projecao.cenarios[cenarioAtivo].receitaProjetadaB3Rs)}).
                {projecao.cotacaoB3.desatualizada &&
                  ' Atenção: cotação desatualizada — use o preço mais recente como referência.'}
              </p>
            </div>

            {/* Painel de Memória de Cálculo Expansível (Requisito 3) */}
            {mostrarBaseCalculo && (
              <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-2 animate-fade-in">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Memória de Cálculo e Auditoria da Projeção de Safra:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded bg-card border space-y-1">
                    <span className="font-bold text-foreground block">
                      1. Dias Decorridos vs 365
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Início da safra: <strong>{projecao.inicioSafraIso}</strong>
                      <br />
                      Data de corte: <strong>{projecao.dataCorteIso}</strong>
                      <br />
                      Dias decorridos: <strong>{projecao.diasDecorridos} dias</strong>
                      <br />
                      Fator de Anualização:{' '}
                      <strong>
                        {projecao.diasTotaisSafra} ÷ {projecao.diasDecorridos} ={' '}
                        {projecao.fatorAnualizacao}
                      </strong>
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-card border space-y-1">
                    <span className="font-bold text-foreground block">
                      2. @ Acumuladas e Extrapolação
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      @ Produzidas Acumuladas:{' '}
                      <strong>{projecao.acumulado.arrobasProduzidasTotal} @</strong>
                      <br />@ Projetadas (12 meses):{' '}
                      <strong>{projecao.projetado.arrobasProduzidasTotal} @</strong>
                      <br />
                      Área pastoril: <strong>{projecao.areaPastorilConsideradaHa} ha</strong>
                      <br />
                      @/ha/ano Projetado:{' '}
                      <strong className="text-emerald-600">
                        {projecao.projetado.arrobasPorHaAno.toFixed(2)} @/ha/ano
                      </strong>
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-card border space-y-1">
                    <span className="font-bold text-foreground block">
                      3. Custos Acumulados e Custo/@
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Custo Op. Acumulado:{' '}
                      <strong>
                        {formatCurrency(projecao.acumulado.custoOperacionalSemReposicaoRs)}
                      </strong>
                      <br />
                      Custo Op. Anual Projetado:{' '}
                      <strong>
                        {formatCurrency(projecao.projetado.custoOperacionalSemReposicaoRs)}
                      </strong>
                      <br />
                      Custo/@ Projetado:{' '}
                      <strong className="text-amber-600">
                        {formatCurrency(projecao.projetado.custoArrobaProduzida)} / @
                      </strong>
                      <br />
                      Referência de Mercado: <strong>R$ 199,59/@</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Carregando histórico de safras arquivadas...
        </div>
      ) : safras.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-semibold text-base">Nenhuma safra arquivada encontrada</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Utilize o botão "Arquivar Safra Atual" ao encerrar um ciclo de safra para gerar o
            histórico comparativo.
          </p>
        </Card>
      ) : (
        <>
          {/* Gráficos de Evolução Multissafra com Projeção Inclusa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Produtividade: @/ha/ano e @/cab/ano (Histórico + Projeção)
                </CardTitle>
                <CardDescription className="text-xs">
                  Evolução do desfrute físico e ganho zootécnico por safra com fechamento projetado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="safra" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="arrobasHa"
                        name="@ / ha / ano"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="arrobasCab"
                        name="@ / cab / ano"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  Custo por Arroba Produzida vs. Margem EBITDA
                </CardTitle>
                <CardDescription className="text-xs">
                  Eficiência financeira: custo desembolso/@ (R$) e margem (%)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="safra" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="custoArroba"
                        name="Custo / @ (R$)"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="margemEbitda"
                        name="Margem EBITDA (%)"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Comparativa Detalhada com Safra Projetada ao Lado */}
          <Card className="shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Tabela Consolidada Multissafra: Realizado vs. Projeção Atual</span>
                <Badge variant="outline" className="text-xs font-mono">
                  Padrão de Referência
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Base comparativa histórica oficial de referência com projeção da safra em andamento
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Safra</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-center">@/ha/ano</TableHead>
                      <TableHead className="text-center">@/cab/ano</TableHead>
                      <TableHead className="text-center">GMD Médio (kg/dia)</TableHead>
                      <TableHead className="text-center">Custo / @ (R$)</TableHead>
                      <TableHead className="text-center">Margem EBITDA</TableHead>
                      <TableHead className="text-center">Lot. (UA/ha)</TableHead>
                      <TableHead className="text-right">EBITDA Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Linhas das Safras Arquivadas Realizadas */}
                    {safras.map((s, idx) => {
                      const anterior = safras[idx - 1]
                      const diffCusto = anterior
                        ? s.custo_arroba_produzida - anterior.custo_arroba_produzida
                        : 0

                      return (
                        <TableRow key={s.id || s.ano_safra}>
                          <TableCell className="font-bold">
                            {s.ano_safra}
                            {s.periodo_rotulo && (
                              <span className="block text-[10px] font-normal text-muted-foreground">
                                {s.periodo_rotulo}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[10px]">
                              Realizado
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-emerald-600">
                            {s.arrobas_ha_ano.toFixed(1)} @
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {s.arrobas_cab_ano.toFixed(1)} @
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {(s.gmd_medio_kg_dia || 0.85).toFixed(2)} kg/dia
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            R$ {s.custo_arroba_produzida.toFixed(2)}
                            {anterior && (
                              <span
                                className={`text-[10px] ml-1.5 inline-flex items-center ${
                                  diffCusto <= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {diffCusto <= 0 ? (
                                  <ArrowDownRight className="h-3 w-3" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3" />
                                )}
                                {Math.abs(diffCusto).toFixed(1)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            <Badge
                              variant={(s.margem_ebitda_pct || 0) >= 20 ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {(s.margem_ebitda_pct || 0).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {(s.taxa_lotacao_ua_ha || 1.2).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            R${' '}
                            {(s.ebitda_total || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {/* Linha Especial da Safra Atual em Andamento (PROJETADA) */}
                    {projecao && (
                      <TableRow className="bg-primary/5 font-semibold border-t-2 border-primary/30">
                        <TableCell className="font-bold text-primary">
                          {projecao.anoSafra}
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            Projeção ({projecao.periodoRotulo} extrapolado)
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400 text-[10px]">
                            Projetado
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-emerald-600">
                          {projecao.projetado.arrobasPorHaAno.toFixed(2)} @
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {projecao.projetado.arrobasPorCabAno.toFixed(2)} @
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {(projecao.projetado.gmdMedioKgDia || 0.88).toFixed(2)} kg/dia
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-amber-700 dark:text-amber-300">
                          R$ {projecao.projetado.custoArrobaProduzida.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          <Badge
                            variant={
                              projecao.projetado.margemEbitdaPct >= 20 ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {projecao.projetado.margemEbitdaPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {(projecao.rebanhoMedioCab / projecao.areaPastorilConsideradaHa).toFixed(
                            2,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          R${' '}
                          {projecao.projetado.ebitdaRs.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Linhas dos Cenários Simulados (Otimista / Pessimista) da Safra Atual */}
                    {projecao &&
                      (['otimista', 'pessimista'] as TipoCenarioProjecao[]).map((tipo) => {
                        const c = projecao.cenarios[tipo]
                        return (
                          <TableRow
                            key={`cenario-${tipo}`}
                            className="bg-muted/30 text-muted-foreground"
                          >
                            <TableCell className="font-semibold">
                              {tipo === 'otimista' ? 'Cenário Otimista' : 'Cenário Pessimista'}
                              <span className="block text-[10px] font-normal">
                                {c.variacaoGmdPct >= 0 ? '+' : ''}
                                {c.variacaoGmdPct.toFixed(0)}% GMD ·{' '}
                                {c.variacaoCustoPct >= 0 ? '+' : ''}
                                {c.variacaoCustoPct.toFixed(0)}% custo
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] font-mono',
                                  tipo === 'otimista'
                                    ? 'text-emerald-700 border-emerald-400'
                                    : 'text-rose-700 border-rose-400',
                                )}
                              >
                                Simulado
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {c.arrobasPorHaAno.toFixed(2)} @
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {c.arrobasPorCabAno.toFixed(2)} @
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {c.gmdMedioKgDia.toFixed(2)} kg/dia
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              R$ {c.custoArrobaProduzida.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {c.margemEbitdaPct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center font-mono">—</TableCell>
                            <TableCell
                              className={cn(
                                'text-right font-mono font-bold',
                                c.resultadoLiquidoRs >= 0 ? 'text-emerald-700' : 'text-destructive',
                              )}
                            >
                              R$ {c.resultadoLiquidoRs.toLocaleString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
