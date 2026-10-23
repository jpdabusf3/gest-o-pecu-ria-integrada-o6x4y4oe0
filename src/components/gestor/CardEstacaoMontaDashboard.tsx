import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  HeartHandshake,
  Calendar,
  Baby,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  HelpCircle,
  Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatNumber, cn } from '@/lib/utils'
import type { EstacaoMontaRecord } from '@/services/reproducao'

interface CardEstacaoMontaDashboardProps {
  estacoes: EstacaoMontaRecord[]
  loading?: boolean
  className?: string
}

function formatarDataSimples(dataStr?: string): string {
  if (!dataStr) return '—'
  try {
    const raw = dataStr.slice(0, 10)
    const [ano, mes, dia] = raw.split('-')
    if (!ano || !mes || !dia) return raw
    return `${dia}/${mes}/${ano}`
  } catch {
    return dataStr
  }
}

export function CardEstacaoMontaDashboard({
  estacoes,
  loading = false,
  className = '',
}: CardEstacaoMontaDashboardProps) {
  // Ordena por ano_safra decrescente para garantir que a 1ª seja a mais recente
  const estacoesOrdenadas = useMemo(() => {
    return [...estacoes].sort((a, b) => (b.ano_safra || '').localeCompare(a.ano_safra || ''))
  }, [estacoes])

  const atual: EstacaoMontaRecord | undefined = estacoesOrdenadas[0]
  const anterior: EstacaoMontaRecord | undefined = estacoesOrdenadas[1]

  // Indicadores da safra atual
  const expostas = atual ? atual.total_expostas || 0 : 0
  const prenhes = atual ? atual.total_prenhes || 0 : 0
  const taxaPrenhezAtual = atual
    ? (atual.taxa_prenhez_pct ?? (expostas > 0 ? (prenhes / expostas) * 100 : 0))
    : 0

  const gestIatf = atual?.gestantes_iatf ?? 0
  const gestTouro = atual?.gestantes_touro ?? 0
  const somaIatfTouro = gestIatf + gestTouro
  const pctIatf = somaIatfTouro > 0 ? (gestIatf / somaIatfTouro) * 100 : 0
  const pctTouro = somaIatfTouro > 0 ? (gestTouro / somaIatfTouro) * 100 : 0

  // Comparativo com a safra anterior
  const taxaPrenhezAnterior = anterior
    ? (anterior.taxa_prenhez_pct ??
      (anterior.total_expostas > 0
        ? ((anterior.total_prenhes || 0) / anterior.total_expostas) * 100
        : 0))
    : null

  const diferencaTaxa = taxaPrenhezAnterior !== null ? taxaPrenhezAtual - taxaPrenhezAnterior : null

  // Meta de prenhez de referência
  const metaPrenhez = 80.0
  const acimaDaMeta = taxaPrenhezAtual >= metaPrenhez

  // Formatação das datas da estação e parição
  const inicioEstacao = formatarDataSimples(atual?.data_inicio)
  const fimEstacao = formatarDataSimples(atual?.data_fim)
  const inicioParto = formatarDataSimples(atual?.data_inicio_parto)
  const fimParto = formatarDataSimples(atual?.data_fim_parto)

  if (loading && (!estacoes || estacoes.length === 0)) {
    return (
      <Card className={cn('border-primary/20 bg-card p-5 animate-pulse', className)}>
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="h-5 w-44 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="h-16 bg-muted/60 rounded-xl" />
          <div className="h-16 bg-muted/60 rounded-xl" />
          <div className="h-16 bg-muted/60 rounded-xl" />
          <div className="h-16 bg-muted/60 rounded-xl" />
        </div>
      </Card>
    )
  }

  if (!atual) {
    return (
      <Card className={cn('border-muted bg-card p-6 text-center space-y-3', className)}>
        <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
        <h3 className="text-base font-semibold text-foreground">
          Nenhuma Estação de Monta Registrada
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Não há dados reprodutivos cadastrados na safra atual. Laudos e dados podem ser importados
          no módulo de reprodução ou via Robô Chicão.
        </p>
        <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 border-primary/30">
          <Link to="/reproducao">
            <span>Acessar Módulo de Reprodução</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        className,
      )}
    >
      <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Estação de Monta {atual.ano_safra ? `• Safra ${atual.ano_safra}` : ''}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono uppercase font-semibold px-2 py-0.5',
                    atual.status === 'em_andamento'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {atual.status === 'em_andamento' ? 'Safra Atual' : atual.status}
                </Badge>
                {acimaDaMeta && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono bg-primary/10 text-primary border-primary/30 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Acima da Meta ({metaPrenhez}%)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {atual.nome || 'Acompanhamento do desempenho reprodutivo e fertilidade do rebanho'}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 font-medium self-end sm:self-auto"
          >
            <Link to="/reproducao">
              <span>Visão da Estação</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Grade de Indicadores Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: Taxa de Prenhez com Destaque Visual */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Taxa de Prenhez
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-3.5 w-3.5 text-primary/70" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-xs">
                    Percentual de prenhez diagnosticada sobre o total de matrizes expostas na
                    estação. Meta de referência: &ge; {metaPrenhez}%.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                {formatNumber(taxaPrenhezAtual, 1)}%
              </span>
              {diferencaTaxa !== null && (
                <span
                  className={cn(
                    'text-[11px] font-mono font-semibold flex items-center gap-0.5',
                    diferencaTaxa >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-600',
                  )}
                >
                  {diferencaTaxa >= 0 ? (
                    <TrendingUp className="h-3 w-3 inline" />
                  ) : (
                    <TrendingDown className="h-3 w-3 inline" />
                  )}
                  {diferencaTaxa >= 0
                    ? `+${formatNumber(diferencaTaxa, 1)}%`
                    : `${formatNumber(diferencaTaxa, 1)}%`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {prenhes} gestantes de {expostas} expostas
            </p>
          </div>

          {/* KPI 2: Animais Trabalhados e Gestantes */}
          <div className="p-3.5 rounded-xl border bg-background/80 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Matrizes / Gestantes
              </span>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
              {prenhes}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {expostas} cab</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {atual.total_vazias || Math.max(0, expostas - prenhes)} vazias ao final do manejo
            </p>
          </div>

          {/* KPI 3: Quebra IATF vs Touro / Repasse */}
          <div className="p-3.5 rounded-xl border bg-background/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quebra IATF vs Repasse
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {somaIatfTouro} prenhes
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-primary font-bold">
                IATF: {gestIatf}{' '}
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({pctIatf.toFixed(0)}%)
                </span>
              </span>
              <span className="text-secondary font-bold">
                Touro: {gestTouro}{' '}
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({pctTouro.toFixed(0)}%)
                </span>
              </span>
            </div>
            {/* Barra empilhada visual IATF vs Touro */}
            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${pctIatf}%` }}
                title={`IATF: ${gestIatf} (${pctIatf.toFixed(1)}%)`}
              />
              <div
                className="bg-secondary h-full transition-all duration-500"
                style={{ width: `${pctTouro}%` }}
                title={`Touro / Repasse: ${gestTouro} (${pctTouro.toFixed(1)}%)`}
              />
            </div>
          </div>

          {/* KPI 4: Parição Projetada e Período da Estação */}
          <div className="p-3.5 rounded-xl border bg-background/80 space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Parição Projetada
              </span>
              <Baby className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-foreground leading-snug">
              {inicioParto} a {fimParto}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                Estação: {inicioEstacao} a {fimEstacao}
                {atual.duracao_dias ? ` (${atual.duracao_dias}d)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Evolução: Safra Atual vs Safra Anterior */}
        {taxaPrenhezAnterior !== null && (
          <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-primary/10 text-primary shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Evolução Reprodutiva Inter-Safra:
                </span>{' '}
                <span className="text-muted-foreground">
                  Taxa de prenhez subiu de{' '}
                  <strong className="text-foreground font-mono">
                    {formatNumber(taxaPrenhezAnterior, 1)}%
                  </strong>{' '}
                  (Safra {anterior?.ano_safra || 'anterior'}) para{' '}
                  <strong className="text-primary font-mono">
                    {formatNumber(taxaPrenhezAtual, 1)}%
                  </strong>{' '}
                  (Safra {atual.ano_safra || 'atual'}).
                </span>
              </div>
            </div>

            {/* Comparador em barra visual */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-muted-foreground">{anterior?.ano_safra || 'Anterior'}:</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(taxaPrenhezAnterior, 1)}%
                </span>
              </div>
              <div className="w-24 sm:w-32 bg-muted/80 h-2 rounded-full overflow-hidden relative">
                <div
                  className="bg-muted-foreground/40 h-full absolute left-0"
                  style={{ width: `${Math.min(100, (taxaPrenhezAnterior / 100) * 100)}%` }}
                />
                <div
                  className="bg-primary h-full absolute left-0 opacity-80"
                  style={{ width: `${Math.min(100, (taxaPrenhezAtual / 100) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-primary font-bold">{atual.ano_safra || 'Atual'}:</span>
                <span className="font-bold text-primary">{formatNumber(taxaPrenhezAtual, 1)}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
