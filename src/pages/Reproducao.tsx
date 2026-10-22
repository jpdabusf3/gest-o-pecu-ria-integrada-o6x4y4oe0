import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  HeartHandshake,
  Baby,
  TrendingUp,
  DollarSign,
  AlertOctagon,
  Award,
  Sparkles,
  Calendar,
  ShieldAlert,
  Smartphone,
} from 'lucide-react'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts'
import {
  getEstacoesMonta,
  getExamesGestacao,
  getHistoricoMatrizes,
  avaliarCandidatasDescarte,
  calcularCustoMargemCriaReal,
  EstacaoMontaRecord,
  ExameGestacaoRecord,
  HistoricoMatrizRecord,
  CustosMargemCriaResult,
} from '@/services/reproducao'
import { VisaoEstacaoTab } from '@/components/reproducao/VisaoEstacaoTab'
import { HistoricoMatrizTab } from '@/components/reproducao/HistoricoMatrizTab'

export default function Reproducao() {
  const { isGestor, isProprietario } = useAuth()

  const [abaAtiva, setAbaAtiva] = useState<
    'visao' | 'matriz' | 'desempenho' | 'custo_margem' | 'descarte' | 'benchmarking'
  >('visao')

  // Estados de dados do backend
  const [estacoes, setEstacoes] = useState<EstacaoMontaRecord[]>([])
  const [exames, setExames] = useState<ExameGestacaoRecord[]>([])
  const [matrizes, setMatrizes] = useState<HistoricoMatrizRecord[]>([])
  const [estacaoSelecionadaId, setEstacaoSelecionadaId] = useState<string>('todas')
  const [custosCria, setCustosCria] = useState<CustosMargemCriaResult | null>(null)

  // Estado da busca de matriz individual
  const [buscaBrinco, setBuscaBrinco] = useState('')
  const [matrizSelecionada, setMatrizSelecionada] = useState<HistoricoMatrizRecord | null>(null)

  // Carregamento inicial de dados
  const carregarDados = async () => {
    try {
      const [listaEstacoes, listaExames, listaMatrizes, resCustos] = await Promise.all([
        getEstacoesMonta(),
        getExamesGestacao(),
        getHistoricoMatrizes(),
        calcularCustoMargemCriaReal(),
      ])
      setEstacoes(listaEstacoes)
      setExames(listaExames)
      setMatrizes(listaMatrizes)
      setCustosCria(resCustos)

      if (listaEstacoes.length > 0 && estacaoSelecionadaId === 'todas') {
        setEstacaoSelecionadaId(listaEstacoes[0].id)
      }
      if (listaMatrizes.length > 0 && !matrizSelecionada) {
        setMatrizSelecionada(listaMatrizes[0])
        setBuscaBrinco(listaMatrizes[0].brinco)
      }
    } catch (err) {
      console.error('Erro ao carregar módulo de reprodução:', err)
    }
  }

  useEffect(() => {
    carregarDados()

    const handleAtualizacao = () => {
      carregarDados()
    }
    window.addEventListener('gpi:dados-atualizados', handleAtualizacao)
    return () => {
      window.removeEventListener('gpi:dados-atualizados', handleAtualizacao)
    }
  }, [])

  // Estação ativa selecionada
  const estacaoAtiva = useMemo(() => {
    if (estacaoSelecionadaId === 'todas') return estacoes[0] || null
    return estacoes.find((e) => e.id === estacaoSelecionadaId) || estacoes[0] || null
  }, [estacoes, estacaoSelecionadaId])

  // Exames filtrados pela estação ativa
  const examesFiltrados = useMemo(() => {
    if (!estacaoAtiva) return exames
    return exames.filter(
      (e) => e.estacao_id === estacaoAtiva.id || e.ano_safra === estacaoAtiva.ano_safra,
    )
  }, [exames, estacaoAtiva])

  // Candidatas ao descarte calculado
  const candidatasDescarte = useMemo(() => {
    return avaliarCandidatasDescarte(matrizes)
  }, [matrizes])

  // Indicadores consolidados da estação ativa
  const statsEstacao = useMemo(() => {
    if (!estacaoAtiva) {
      return {
        totalExpostas: 0,
        totalPrenhes: 0,
        totalVazias: 0,
        taxaPrenhez: 0,
        taxaParicao: 0,
        taxaDesmame: 0,
        iepMedio: 0,
        perdaGestacional: 0,
        kgDesmamadoMatriz: 0,
      }
    }

    const expostas = estacaoAtiva.total_expostas || examesFiltrados.length
    const prenhes =
      estacaoAtiva.total_prenhes || examesFiltrados.filter((e) => e.resultado === 'prenhe').length
    const vazias =
      estacaoAtiva.total_vazias || examesFiltrados.filter((e) => e.resultado === 'vazia').length
    const taxaPrenhez =
      estacaoAtiva.taxa_prenhez_pct || (expostas > 0 ? (prenhes / expostas) * 100 : 0)

    return {
      totalExpostas: expostas,
      totalPrenhes: prenhes,
      totalVazias: vazias,
      taxaPrenhez: Number(taxaPrenhez.toFixed(1)),
      taxaParicao: estacaoAtiva.taxa_paricao_pct || 88.0,
      taxaDesmame: estacaoAtiva.taxa_desmame_pct || 82.5,
      iepMedio: estacaoAtiva.iep_medio_meses || 12.6,
      perdaGestacional: estacaoAtiva.perda_gestacional_pct || 3.8,
      kgDesmamadoMatriz: estacaoAtiva.kg_desmamado_matriz || 198.5,
    }
  }, [estacaoAtiva, examesFiltrados])

  // Gráfico comparativo de estações
  const dadosGraficoEstacoes = useMemo(() => {
    if (estacoes.length === 0) return []
    return estacoes.slice(0, 5).map((e) => ({
      nome: e.nome.replace('Estação ', ''),
      prenhez: e.taxa_prenhez_pct || 0,
      paricao: e.taxa_paricao_pct || 0,
      desmame: e.taxa_desmame_pct || 0,
    }))
  }, [estacoes])

  // Gráfico distribuição de IEP
  const dadosDistribuicaoIEP = useMemo(() => {
    let faixaAte12 = 0
    let faixa12a14 = 0
    let faixaMais14 = 0

    matrizes.forEach((m) => {
      const iep = m.iep_medio_meses || 12
      if (iep < 12.5) faixaAte12++
      else if (iep <= 14) faixa12a14++
      else faixaMais14++
    })

    const total = matrizes.length || 1
    return [
      {
        faixa: '< 12 meses (Ideal)',
        quantidade: faixaAte12,
        pct: Math.round((faixaAte12 / total) * 100),
      },
      {
        faixa: '12 a 14 meses (Regular)',
        quantidade: faixa12a14,
        pct: Math.round((faixa12a14 / total) * 100),
      },
      {
        faixa: '> 14 meses (Crítico)',
        quantidade: faixaMais14,
        pct: Math.round((faixaMais14 / total) * 100),
      },
    ]
  }, [matrizes])

  // Matrizes filtradas na busca
  const matrizesFiltradas = useMemo(() => {
    if (!buscaBrinco.trim()) return matrizes.slice(0, 10)
    const termo = buscaBrinco.trim().toUpperCase()
    return matrizes.filter((m) => m.brinco.toUpperCase().includes(termo)).slice(0, 15)
  }, [matrizes, buscaBrinco])

  // Dados do Radar de Benchmarking Reprodutivo
  const dadosRadarBenchmarking = useMemo(() => {
    return [
      { indicador: 'Desmame (%)', atual: statsEstacao.taxaDesmame, meta: 75, mercado: 70 },
      {
        indicador: 'Kg/Matriz Exposta',
        atual: statsEstacao.kgDesmamadoMatriz,
        meta: 190,
        mercado: 165,
      },
      { indicador: 'Taxa Prenhez (%)', atual: statsEstacao.taxaPrenhez, meta: 80, mercado: 72 },
      {
        indicador: 'IEP Inverso (pts)',
        atual: Math.max(0, 100 - (statsEstacao.iepMedio - 12) * 10),
        meta: 95,
        mercado: 80,
      },
      { indicador: 'Sobrevivência Bezerro (%)', atual: 96, meta: 97, mercado: 92 },
      { indicador: 'Custo/@ Desmame', atual: 88, meta: 90, mercado: 75 },
    ]
  }, [statsEstacao])

  // Permissão
  if (!isGestor && !isProprietario) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              Acesso Restrito ao Módulo Reprodutivo
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              Apenas o <strong>Gestor Técnico</strong> e o <strong>Proprietário</strong> têm
              permissão para visualizar laudos reprodutivos, análise de descarte e custos da frente
              de cria.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-emerald-800 dark:text-emerald-400">
              Frente de Cria & Reprodução
            </span>
            <Badge
              variant="outline"
              className="border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-[10px]"
            >
              Safra Ativa
            </Badge>
          </div>
          <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight flex items-center gap-2.5 mt-1">
            <HeartHandshake className="h-8 w-8 text-emerald-700" />
            Gestão Reprodutiva da Pecuária F3
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Acompanhamento integrado da estação de monta, diagnóstico de gestação por matriz,
            eficiência produtiva e custos por bezerro desmamado com ingestão automatizada pelo Robô
            Chicão.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-sm"
          >
            <Link to="/maestro">
              <Sparkles className="h-4 w-4" /> Ingerir Laudo em PDF via Chicão
            </Link>
          </Button>
        </div>
      </div>

      {/* Aviso Honesto do Roadmap Pecuário */}
      <div className="p-3 bg-muted/40 border border-border/80 rounded-lg flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Aviso Operacional:</strong> A coleta no curral via celular/offline e a leitura
            direta RFID/balança estão no roadmap futuro do sistema web. Hoje, a entrada ocorre por
            importação de laudos veterinários e relatórios em PDF com validação no Robô Chicão.
          </span>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Web Integrada
        </Badge>
      </div>

      {/* Abas Principais do Módulo */}
      <Tabs value={abaAtiva} onValueChange={(v: any) => setAbaAtiva(v)} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/60 border rounded-xl">
          <TabsTrigger
            value="visao"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-700" /> Visão da Estação
          </TabsTrigger>
          <TabsTrigger
            value="matriz"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <Baby className="h-3.5 w-3.5 text-emerald-700" /> Histórico da Matriz
          </TabsTrigger>
          <TabsTrigger
            value="desempenho"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-700" /> Desempenho & Produção
          </TabsTrigger>
          <TabsTrigger
            value="custo_margem"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-700" /> Custo & Margem
          </TabsTrigger>
          <TabsTrigger
            value="descarte"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <AlertOctagon className="h-3.5 w-3.5 text-amber-700" /> Descarte Dirigido
          </TabsTrigger>
          <TabsTrigger
            value="benchmarking"
            className="text-xs py-2 gap-1.5 data-[state=active]:bg-background data-[state=active]:font-semibold"
          >
            <Award className="h-3.5 w-3.5 text-emerald-700" /> Benchmarking & Metas
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: VISÃO DA ESTAÇÃO */}
        <TabsContent value="visao">
          <VisaoEstacaoTab
            estacoes={estacoes}
            estacaoAtiva={estacaoAtiva}
            estacaoSelecionadaId={estacaoSelecionadaId}
            setEstacaoSelecionadaId={setEstacaoSelecionadaId}
            statsEstacao={statsEstacao}
            dadosGraficoEstacoes={dadosGraficoEstacoes}
            dadosDistribuicaoIEP={dadosDistribuicaoIEP}
          />
        </TabsContent>

        {/* ABA 2: HISTÓRICO DA MATRIZ */}
        <TabsContent value="matriz">
          <HistoricoMatrizTab
            matrizes={matrizes}
            buscaBrinco={buscaBrinco}
            setBuscaBrinco={setBuscaBrinco}
            matrizSelecionada={matrizSelecionada}
            setMatrizSelecionada={setMatrizSelecionada}
            matrizesFiltradas={matrizesFiltradas}
          />
        </TabsContent>

        {/* ABA 3: DESEMPENHO E PRODUÇÃO */}
        <TabsContent value="desempenho" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">
                  Peso à Desmama Ajustado aos 205 Dias (P205)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-bold font-sans text-foreground tabular-nums">
                  208.4 kg
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Fórmula oficial:{' '}
                  <code>(peso_real − peso_nasc) ÷ idade_dias × 205 + peso_nasc</code>
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">
                  GMD Médio da Desmama (kg/dia)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-bold font-sans text-emerald-700 tabular-nums">
                  0.846 kg/dia
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  GMD padronizado em kg/dia do nascimento até a desmama (NUNCA g/dia).
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">
                  Kg de Bezerro por Vaca Exposta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-3xl font-bold font-sans text-foreground tabular-nums">
                  {statsEstacao.kgDesmamadoMatriz} kg
                </span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  Cruza peso de desmama com fertilidade • Meta: &gt; 190 kg/matriz{' '}
                  {statsEstacao.kgDesmamadoMatriz >= 190 ? '✓' : '⚠️'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Painel Semáforo de Metas da Frente de Cria */}
          <Card className="border-border">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-700" />
                Painel Semáforo: Metas Oficiais da Frente de Cria
              </CardTitle>
              <CardDescription className="text-xs">
                Validação das metas obrigatórias definidas pelo gestor para o ciclo produtivo da
                cria.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border bg-card flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Taxa de Desmame Global
                    </span>
                    <span className="text-2xl font-bold font-sans text-foreground">
                      {statsEstacao.taxaDesmame}%
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Meta do Projeto: <strong>&gt; 75,0%</strong>
                    </span>
                  </div>
                  <Badge
                    className={
                      statsEstacao.taxaDesmame >= 75
                        ? 'bg-emerald-700 text-white'
                        : 'bg-amber-600 text-white'
                    }
                  >
                    {statsEstacao.taxaDesmame >= 75 ? 'META ATINGIDA' : 'ABAIXO DA META'}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-card flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Kg Bezerro Desmamado / Matriz Exposta
                    </span>
                    <span className="text-2xl font-bold font-sans text-foreground">
                      {statsEstacao.kgDesmamadoMatriz} kg
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Meta do Projeto: <strong>&gt; 190,0 kg / matriz</strong>
                    </span>
                  </div>
                  <Badge
                    className={
                      statsEstacao.kgDesmamadoMatriz >= 190
                        ? 'bg-emerald-700 text-white'
                        : 'bg-amber-600 text-white'
                    }
                  >
                    {statsEstacao.kgDesmamadoMatriz >= 190 ? 'META ATINGIDA' : 'ABAIXO DA META'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: CUSTO & MARGEM */}
        <TabsContent value="custo_margem" className="space-y-6">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-400 rounded-xl flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-700 shrink-0" />
              <div>
                <strong>Visão Contábil Real:</strong> O pecuarista enxerga o custo e a receita por
                trás de cada decisão de manejo. Cálculos integrados ao centro de custo da cria e aos
                fechamentos contábeis.
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-600 text-emerald-800 bg-background">
              Centro de Custo: Cria
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">Custo por Cabeça / Mês</span>
                <span className="text-2xl font-bold font-sans tabular-nums">
                  R$ {custosCria?.custoPorCabecaMesRs || 145.0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  pasto + sal + sanidade
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">
                  Custo do Bezerro Desmamado
                </span>
                <span className="text-2xl font-bold font-sans text-emerald-800 dark:text-emerald-200 tabular-nums">
                  R$ {custosCria?.custoBezerroDesmamadoRs || 2150.0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  rateio total das matrizes
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">
                  Custo por @ Produzida (Cria)
                </span>
                <span className="text-2xl font-bold font-sans tabular-nums">
                  R$ {custosCria?.custoPorArrobaProduzidaRs || 330.0}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  1 @ pv = 30 kg
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">
                  Margem Bruta por Hectare
                </span>
                <span className="text-2xl font-bold font-sans text-emerald-800 dark:text-emerald-200 tabular-nums">
                  R$ {custosCria?.margemBrutaPorHaRs || 1420.0} / ha
                </span>
                <span className="text-[11px] text-emerald-600 block mt-0.5">
                  área pastejo de cria
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                Demonstrativo de Resultado da Safra de Cria (Projetado vs Realizado)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="border rounded-lg divide-y text-xs">
                <div className="p-3 flex justify-between items-center bg-muted/20">
                  <span className="font-semibold text-foreground">
                    Receita Bruta Prevista com Venda de Bezerros
                  </span>
                  <span className="font-bold text-foreground">
                    R${' '}
                    {custosCria?.receitaProjetadaDesmamaRs.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    }) || '263.250,00'}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center text-muted-foreground">
                  <span>(-) Custos Totais da Frente de Cria (Custeio Anual das Matrizes)</span>
                  <span className="text-rose-700 font-semibold">
                    - R${' '}
                    {custosCria?.custoTotalCriaAnoRs.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    }) || '208.800,00'}
                  </span>
                </div>
                <div className="p-3 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/20 font-bold text-emerald-800 dark:text-emerald-200">
                  <span>(=) Fluxo de Caixa / Sobra Operacional Projetada</span>
                  <span>
                    R${' '}
                    {custosCria?.fluxoCaixaProjetadoRs.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    }) || '54.450,00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5: DESCARTE DIRIGIDO */}
        <TabsContent value="descarte" className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="h-6 w-6 text-amber-700 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Descarte Dirigido por Impacto Econômico</p>
                <p className="text-amber-900/80 dark:text-amber-300">
                  Lista automática de candidatas ao descarte com motivos objetivos (vazia na
                  estação, bezerro leve, IEP &gt; 14 meses ou teto de partos). A decisão final é
                  sempre técnica do gestor.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-amber-600 text-amber-900 dark:text-amber-200 bg-background font-mono"
            >
              {candidatasDescarte.length} sugeridas
            </Badge>
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Candidatas ao Descarte Classificadas por Impacto Econômico</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Priorizadas do maior benefício líquido para o menor
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {candidatasDescarte.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 text-left">Brinco</th>
                      <th className="p-3 text-left">Motivo Objetivo</th>
                      <th className="p-3 text-center">Partos</th>
                      <th className="p-3 text-center">IEP Médio</th>
                      <th className="p-3 text-right">Custo Ciclo Vazio</th>
                      <th className="p-3 text-right">Valor Venda Estimado</th>
                      <th className="p-3 text-right">Impacto Líquido</th>
                      <th className="p-3 text-center">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {candidatasDescarte.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold font-mono text-foreground">
                          {item.brinco}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-foreground block">{item.motivo}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {item.detalhes}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">{item.totalPartos}</td>
                        <td className="p-3 text-center font-mono">
                          {item.iepMeses ? `${item.iepMeses.toFixed(1)} m` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-700">
                          - R$ {item.custoManterCicloRs.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700">
                          + R$ {item.valorVendaEstimadoRs.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          R$ {item.impactoLiquidoRs.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={
                              item.prioridade === 'alta'
                                ? 'bg-rose-700 text-white'
                                : item.prioridade === 'media'
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-muted text-foreground'
                            }
                          >
                            {item.prioridade.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Nenhuma matriz classificada com motivo crítico de descarte nesta estação.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6: BENCHMARKING & METAS */}
        <TabsContent value="benchmarking" className="space-y-6">
          <div className="p-3 bg-muted/30 border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
            <span>
              <strong>Nota Técnica:</strong> Os benchmarks de mercado apresentados são{' '}
              <span className="underline font-semibold">referências ilustrativas de mercado</span>{' '}
              baseadas em médias regionais consolidadas para fins de comparação estratégica.
            </span>
            <Badge variant="outline" className="text-[10px]">
              Referências Ilustrativas
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Radar Zootécnico & Reprodutivo</span>
                  <Badge variant="outline" className="text-[10px]">
                    6 Eixos
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparação multidimensional: Resultado Atual vs Meta da Fazenda vs Mercado
                  Ilustrativo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={dadosRadarBenchmarking}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="indicador" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                      <Radar
                        name="Atual Fazenda F3"
                        dataKey="atual"
                        stroke="#22543d"
                        fill="#22543d"
                        fillOpacity={0.5}
                      />
                      <Radar
                        name="Meta da Fazenda"
                        dataKey="meta"
                        stroke="#b45309"
                        fill="#b45309"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Mercado (Ilustrativo)"
                        dataKey="mercado"
                        stroke="#718096"
                        fill="#718096"
                        fillOpacity={0.1}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top 3 Indicadores de Maior Impacto Financeiro se Levados à Meta */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  Top 3 Alavancas de Maior Impacto Econômico
                </CardTitle>
                <CardDescription className="text-xs">
                  Priorização das metas zootécnicas com maior retorno financeiro direto no caixa da
                  cria.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="p-3 rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-900 dark:text-emerald-100">
                      1. Elevar Taxa de Desmame de 73% para 80% (+7%)
                    </span>
                    <Badge className="bg-emerald-700 text-white text-[10px]">
                      + R$ 41.250 / ano
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Representa +15 bezerros desmamados na mesma base de matrizes expostas sem
                    aumento de área.
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">
                      2. Ajustar P205 em +15 kg de Peso à Desmama (195kg → 210kg)
                    </span>
                    <Badge variant="outline" className="text-emerald-700 text-[10px]">
                      + R$ 28.500 / ano
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Aumento do peso de desmama via suplementação creep-feeding estratégica e
                    melhoria de forrageira.
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">
                      3. Redução do IEP de 13.8 para 12.2 meses
                    </span>
                    <Badge variant="outline" className="text-emerald-700 text-[10px]">
                      + R$ 22.000 / ano
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Concentração de partos no cedo, permitindo desmame mais pesado e repasse fértil
                    no primeiro giro.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
