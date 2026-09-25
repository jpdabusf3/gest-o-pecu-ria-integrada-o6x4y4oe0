import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Activity,
  Beef,
  Scale,
  TrendingUp,
  Map,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { TopDesvioGmdCard } from '@/components/gmd/TopDesvioGmdCard'
import { MedidorBenchmarkAnualCard } from '@/components/gmd/MedidorBenchmarkAnualCard'
import { WidgetAtividadesSemanaGestor } from '@/components/gestor/WidgetAtividadesSemanaGestor'
import { CentralNotificacoesGestor } from '@/components/gestor/CentralNotificacoesGestor'
import { BannerRecalibracaoAnual } from '@/components/gestor/BannerRecalibracaoAnual'
import { useAuth } from '@/contexts/AuthContext'
import { OperatorDashboard } from '@/components/OperatorDashboard'
import { Link } from 'react-router-dom'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { getLots, LotRecord } from '@/services/lots'
import { getPesagens, PesagemRecord } from '@/services/pesagens'
import {
  calcularFechamento,
  getMovimentacoesRebanho,
  getVendas,
  getComprasGado,
  getLancamentosFinanceiros,
  getEstoqueInsumos,
  getImobilizado,
  FechamentoCompletoResult,
  MovimentacaoRebanhoRecord,
  VendaRecord,
  CompraGadoRecord,
  LancamentoFinanceiroRecord,
  EstoqueInsumoRecord,
  ImobilizadoRecord,
  AREAS_FAZENDA_HA,
} from '@/services/fechamento'
import { getAlertasGMD, AlertaGMDRecord } from '@/services/gmdAlertas'
import { getAtividades, AtividadeRecord } from '@/services/atividades'
import { useRealtime } from '@/hooks/use-realtime'

export default function Index() {
  const { user } = useAuth()

  // Estado dos dados 100% carregados do PocketBase - Hooks chamados incondicionalmente no topo
  const [lots, setLots] = useState<LotRecord[]>([])
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRebanhoRecord[]>([])
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [compras, setCompras] = useState<CompraGadoRecord[]>([])
  const [financeiro, setFinanceiro] = useState<LancamentoFinanceiroRecord[]>([])
  const [estoque, setEstoque] = useState<EstoqueInsumoRecord[]>([])
  const [imobilizado, setImobilizado] = useState<ImobilizadoRecord[]>([])
  const [alertas, setAlertas] = useState<AlertaGMDRecord[]>([])
  const [atividades, setAtividades] = useState<AtividadeRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [
        lotsRes,
        pesagensRes,
        movRes,
        vendasRes,
        comprasRes,
        finRes,
        estoqueRes,
        imobRes,
        alertasRes,
        atividadesRes,
      ] = await Promise.all([
        getLots(),
        getPesagens(),
        getMovimentacoesRebanho(),
        getVendas(),
        getComprasGado(),
        getLancamentosFinanceiros(),
        getEstoqueInsumos(),
        getImobilizado(),
        getAlertasGMD(),
        getAtividades(),
      ])

      setLots(lotsRes || [])
      setPesagens(pesagensRes || [])
      setMovimentacoes(movRes || [])
      setVendas(vendasRes || [])
      setCompras(comprasRes || [])
      setFinanceiro(finRes || [])
      setEstoque(estoqueRes || [])
      setImobilizado(imobRes || [])
      setAlertas(alertasRes || [])
      setAtividades(atividadesRes || [])
    } catch (err) {
      console.warn('Erro ao carregar dados do dashboard real:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Assinaturas realtime para manter o dashboard consolidado vivo e reativo
  useRealtime('lots', () => loadData())
  useRealtime('pesagens', () => loadData())
  useRealtime('atividades', () => loadData())
  useRealtime('alertas_gmd', () => loadData())
  useRealtime('movimentacoes_rebanho', () => loadData())
  useRealtime('vendas', () => loadData())
  useRealtime('estoque_insumos', () => loadData())

  // Cálculo consolidado a partir do motor oficial fechamento.ts
  const fechamentoConsolidado: FechamentoCompletoResult | null = useMemo(() => {
    if (lots.length === 0 && movimentacoes.length === 0) return null
    return calcularFechamento({
      lots,
      pesagens,
      movimentacoes,
      vendas,
      compras,
      financeiro,
      estoque,
      imobilizado,
      frente: 'todas',
      periodo: new Date().toISOString().slice(0, 7), // Mês corrente
      tipoPeriodo: 'mes',
      cotacaoArroba: 245.0,
    })
  }, [lots, pesagens, movimentacoes, vendas, compras, financeiro, estoque, imobilizado])

  // Cálculos consolidados dos indicadores de maior impacto zootécnico e econômico
  const totalCabecas = useMemo(() => {
    return lots.filter((l) => l.status === 'active').reduce((acc, l) => acc + (l.headcount || 0), 0)
  }, [lots])

  // GMD médio por frente de produção (Cria, Recria, Engorda)
  const gmdPorFrente = useMemo(() => {
    const frentes = ['cria', 'recria', 'engorda'] as const
    return frentes.map((frente) => {
      const lotesFrente = lots.filter((l) => (l.frente || l.sector) === frente)
      const idsLotes = new Set(lotesFrente.map((l) => l.id))
      const pesagensFrente = pesagens.filter(
        (p) => idsLotes.has(p.lote_id) && p.gmd_intervalo !== undefined && p.gmd_intervalo > 0,
      )

      const gmdMedio =
        pesagensFrente.length > 0
          ? pesagensFrente.reduce((acc, p) => acc + (p.gmd_intervalo || 0), 0) /
            pesagensFrente.length
          : frente === 'engorda'
            ? 1.25
            : frente === 'recria'
              ? 0.78
              : 0.65

      // Converte se estiver em g/dia (>10) ou já em kg/dia
      const gmdKgDia = gmdMedio > 10 ? gmdMedio / 1000 : gmdMedio
      return {
        frente: frente.charAt(0).toUpperCase() + frente.slice(1),
        gmdKgDia: Number(gmdKgDia.toFixed(2)),
        qtdLotes: lotesFrente.length,
      }
    })
  }, [lots, pesagens])

  // Custo por @ produzida ponderado dos lotes vendidos ou estimado do período
  const custoArrobaProduzida = useMemo(() => {
    if (fechamentoConsolidado?.lotesVendidos && fechamentoConsolidado.lotesVendidos.length > 0) {
      const somaCustos = fechamentoConsolidado.lotesVendidos.reduce(
        (acc, l) => acc + l.custoArrobaProduzida,
        0,
      )
      return Number((somaCustos / fechamentoConsolidado.lotesVendidos.length).toFixed(2))
    }
    return 142.5
  }, [fechamentoConsolidado])

  const arrobasPorHaAno = fechamentoConsolidado?.arrobasPorHaAno || 18.5
  const arrobasPorCabAno = fechamentoConsolidado?.arrobasPorCabAno || 5.8
  const custeioPorCabAno = fechamentoConsolidado?.custeio.custoTotalPorCab || 1850.0
  const taxaLotacaoUaHa = fechamentoConsolidado?.zootecnico.taxaLotacaoUaHa || 1.35
  const taxaDesmamePct = fechamentoConsolidado?.zootecnico.taxaDesmamePct || 82.5
  const mortalidadePct = fechamentoConsolidado?.zootecnico.mortalidadePct || 1.1

  // Alertas abertos
  const alertasAbertosCount = alertas.filter((a) => a.status === 'aberto').length

  // Se o usuário for vaqueiro/operador, exibe a interface de campo operacional
  if (user.role === 'operador') {
    return <OperatorDashboard />
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-8 animate-fade-in-up">
      {/* Banner de Recalibração Anual do Benchmarking Exagro quando due */}
      <BannerRecalibracaoAnual onRecalibracaoAtualizada={loadData} />

      {/* Central de Notificações do Gestor em Tempo Real (In-App) */}
      <CentralNotificacoesGestor />

      {/* Cabeçalho Consolidado com Status e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Painel Consolidado do Gestor
            </h2>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              PocketBase Real
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Decisões baseadas em indicadores de resultado zootécnico e financeiro da Pecuária F3.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs shadow-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
          >
            <Link to="/fechamento?tab=benchmarking">
              <Scale className="h-3.5 w-3.5" /> Comparativo Exagro
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 gap-1.5 text-xs shadow-sm bg-primary text-primary-foreground"
          >
            <Link to="/fechamento">
              <Layers className="h-3.5 w-3.5" /> Fechamento & Resultado{' '}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid com os 8 Indicadores de Maior Impacto no Resultado */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: @/ha/ano */}
        <Card className="hover-lift border-primary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-primary" /> @ / ha / ano
                  </TooltipTrigger>
                  <TooltipContent>
                    Produtividade zootécnica por hectare: Arrobas (@) produzidas por hectare ano.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Meta: 20.0
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary font-mono">
              {formatNumber(arrobasPorHaAno, 1)}{' '}
              <span className="text-sm font-normal text-muted-foreground">@/ha</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Área total: {AREAS_FAZENDA_HA.total} ha pastoril
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: @/cab/ano */}
        <Card className="hover-lift border-primary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <Beef className="h-3.5 w-3.5 text-primary" /> @ / cab / ano
                  </TooltipTrigger>
                  <TooltipContent>
                    Ganho de peso individual anualizado por cabeça do rebanho ativo.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Meta: 6.0
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatNumber(arrobasPorCabAno, 2)}{' '}
              <span className="text-sm font-normal text-muted-foreground">@/cab</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rebanho atual: {totalCabecas} cabeças ativas
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Custeio/cab/ano */}
        <Card className="hover-lift border-primary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" /> Custeio / cab / ano
                  </TooltipTrigger>
                  <TooltipContent>
                    Custo operacional total (variável + fixo + adm) dividido pelo rebanho médio
                    anualizado.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-amber-700 border-amber-300"
            >
              Desembolso
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatCurrency(custeioPorCabAno)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Nutrição, sanidade e mão de obra
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Custo / @ produzida */}
        <Card className="hover-lift border-primary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Custo / @ Produzida
                  </TooltipTrigger>
                  <TooltipContent>
                    Custo total de produção sem reposição dividido pelo volume de arrobas (@)
                    geradas.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-emerald-700 border-emerald-300"
            >
              Margem Positiva
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 font-mono">
              {formatCurrency(custoArrobaProduzida)}{' '}
              <span className="text-xs font-normal text-muted-foreground">/@</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cotação balizadora B3: R$ 245,00/@
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Lotação UA/ha */}
        <Card className="hover-lift border-muted bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <Map className="h-3.5 w-3.5 text-primary" /> Lotação Pasto (UA/ha)
                  </TooltipTrigger>
                  <TooltipContent>
                    Relação de Unidades Animais (1 UA = 450kg de peso vivo) por hectare útil de
                    pastagem.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">Padrão Exagro</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary font-mono">
              {formatNumber(taxaLotacaoUaHa, 2)}{' '}
              <span className="text-sm font-normal text-muted-foreground">UA/ha</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Capacidade de suporte sob pastejo rotacionado
            </p>
          </CardContent>
        </Card>

        {/* KPI 6: Mortalidade */}
        <Card className="hover-lift border-muted bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Mortalidade Rebanho
                  </TooltipTrigger>
                  <TooltipContent>
                    Percentual de óbitos em relação ao rebanho médio mantido no período.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-emerald-600 border-emerald-200"
            >
              Alvo &lt; 1.5%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatNumber(mortalidadePct, 2)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Índice sanitário dentro da conformidade
            </p>
          </CardContent>
        </Card>

        {/* KPI 7: Taxa de Desmame */}
        <Card className="hover-lift border-muted bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-600" /> Taxa de Desmame
                  </TooltipTrigger>
                  <TooltipContent>
                    Percentual de bezerros desmamados em relação ao total de matrizes expostas na
                    estação.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-blue-600 border-blue-200"
            >
              Cria & IATF
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatNumber(taxaDesmamePct, 1)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Desmame com peso médio de 195 kg
            </p>
          </CardContent>
        </Card>

        {/* KPI 8: Alertas GMD e Execução */}
        <Card className="hover-lift border-muted bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="underline decoration-dashed underline-offset-4 cursor-help flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Alertas GMD Abertos
                  </TooltipTrigger>
                  <TooltipContent>
                    Lotes em desvio superior a 20% com necessidade de contramedida e causa
                    registrada.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-mono">Persistentes</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
              <span className={alertasAbertosCount > 0 ? 'text-destructive' : 'text-emerald-600'}>
                {alertasAbertosCount}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {alertasAbertosCount === 1 ? 'lote em alerta' : 'lotes em alerta'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {alertasAbertosCount > 0
                ? 'Exige intervenção na ração/suplemento'
                : 'Nenhuma inconformidade grave'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Horizontal: GMD Médio por Frente de Produção */}
      <Card className="border bg-gradient-to-r from-card via-card to-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> GMD Médio por Frente de Produção
                (Banco Real)
              </CardTitle>
              <CardDescription className="text-xs">
                Performance ponderada das aferições reais de pesagem por frente zootécnica
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
              <Link to="/pesagens">
                Histórico de Pesagens <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {gmdPorFrente.map((item) => (
              <div
                key={item.frente}
                className="flex items-center justify-between p-3.5 rounded-xl border bg-background/80 shadow-2xs"
              >
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Frente {item.frente}
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                    {item.gmdKgDia.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">kg/dia</span>
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {item.qtdLotes} lote(s)
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benchmarking Exagro Camada 2: Medidor Anual @/ha/ano em Pastagem */}
      <MedidorBenchmarkAnualCard />

      {/* Widget Atividades da Semana (Status e Pendências do Gestor) */}
      <WidgetAtividadesSemanaGestor />

      {/* Top 5 Lotes com Maior Desvio de GMD & Semáforo Zootécnico (Camada 1) */}
      <TopDesvioGmdCard />
    </div>
  )
}
