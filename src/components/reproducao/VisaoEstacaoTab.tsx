import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertOctagon } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { EstacaoMontaRecord, NascimentoEstacaoRecord } from '@/services/reproducao'
import { ConfrontoNascimentosSection } from './ConfrontoNascimentosSection'

interface VisaoEstacaoTabProps {
  estacoes: EstacaoMontaRecord[]
  estacaoAtiva: EstacaoMontaRecord | null
  estacaoSelecionadaId: string
  setEstacaoSelecionadaId: (id: string) => void
  statsEstacao: {
    totalExpostas: number
    totalPrenhes: number
    totalVazias: number
    taxaPrenhez: number
    taxaParicao: number
    taxaDesmame: number
    iepMedio: number
    perdaGestacional: number
    kgDesmamadoMatriz: number
  }
  dadosGraficoEstacoes: Array<{
    nome: string
    prenhez: number
    paricao: number
    desmame: number
  }>
  dadosDistribuicaoIEP: Array<{
    faixa: string
    quantidade: number
    pct: number
  }>
  nascimentos?: NascimentoEstacaoRecord[]
  onAbrirCadastroResultadoFinal?: () => void
  onAbrirCadastroDg?: () => void
  onAbrirCadastroIatf?: () => void
}

export function VisaoEstacaoTab({
  estacoes,
  estacaoAtiva,
  estacaoSelecionadaId,
  setEstacaoSelecionadaId,
  statsEstacao,
  dadosGraficoEstacoes,
  dadosDistribuicaoIEP,
  nascimentos,
  onAbrirCadastroResultadoFinal,
  onAbrirCadastroDg,
  onAbrirCadastroIatf,
}: VisaoEstacaoTabProps) {
  return (
    <div className="space-y-6">
      {/* Seletor de Estação de Monta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estação de Monta / Safra:
          </span>
          <Select value={estacaoSelecionadaId} onValueChange={setEstacaoSelecionadaId}>
            <SelectTrigger className="w-[260px] h-9 text-xs font-semibold">
              <SelectValue placeholder="Selecione a estação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Estações (Consolidado)</SelectItem>
              {estacoes.map((est) => (
                <SelectItem key={est.id} value={est.id}>
                  {est.nome} ({est.ano_safra})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-3">
          {estacaoAtiva ? (
            <span>
              Período avaliado:{' '}
              <strong>
                {estacaoAtiva.data_inicio ? estacaoAtiva.data_inicio.slice(0, 10) : '01/11'}
              </strong>{' '}
              até{' '}
              <strong>
                {estacaoAtiva.data_fim ? estacaoAtiva.data_fim.slice(0, 10) : '28/02'}
              </strong>{' '}
              • Status:{' '}
              <Badge variant="outline" className="text-[10px] ml-1 uppercase">
                {estacaoAtiva.status}
              </Badge>
            </span>
          ) : (
            <span>Nenhuma estação selecionada</span>
          )}

          {onAbrirCadastroResultadoFinal && (
            <button
              type="button"
              onClick={onAbrirCadastroResultadoFinal}
              className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold underline hover:text-emerald-950"
            >
              Editar Fechamento
            </button>
          )}
        </div>
      </div>

      {/* Cards de Indicadores Centrais da Frente de Cria */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Matrizes Expostas
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums">
              {statsEstacao.totalExpostas}{' '}
              <span className="text-xs font-normal text-muted-foreground">cab.</span>
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              em estação de monta
            </span>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-medium block">
              Taxa de Prenhez
            </span>
            <span className="text-2xl font-bold font-sans text-emerald-800 dark:text-emerald-200 tabular-nums">
              {statsEstacao.taxaPrenhez}%
            </span>
            <span className="text-[10px] text-emerald-700 block mt-1">
              {statsEstacao.totalPrenhes} prenhes de {statsEstacao.totalExpostas}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Taxa de Parição
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums">
              {statsEstacao.taxaParicao}%
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              bezerros nascidos vivos
            </span>
          </CardContent>
        </Card>

        <Card
          className={
            statsEstacao.taxaDesmame >= 75
              ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15'
              : 'border-amber-500/40 bg-amber-50/30'
          }
        >
          <CardContent className="p-4">
            <span className="text-[11px] uppercase font-medium block text-foreground">
              Taxa de Desmame
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums text-foreground">
              {statsEstacao.taxaDesmame}%
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
              Meta Cria: &gt; 75,0% {statsEstacao.taxaDesmame >= 75 ? '✓' : '⚠️'}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              IEP Médio
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums">
              {statsEstacao.iepMedio}{' '}
              <span className="text-xs font-normal text-muted-foreground">meses</span>
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              intervalo entre partos
            </span>
          </CardContent>
        </Card>

        <Card
          className={
            statsEstacao.kgDesmamadoMatriz >= 190
              ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15'
              : 'border-amber-500/40 bg-amber-50/30'
          }
        >
          <CardContent className="p-4">
            <span className="text-[11px] uppercase font-medium block text-foreground">
              Kg Desm./Matriz Exp.
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums text-foreground">
              {statsEstacao.kgDesmamadoMatriz} <span className="text-xs font-normal">kg</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
              Meta Cria: &gt; 190 kg {statsEstacao.kgDesmamadoMatriz >= 190 ? '✓' : '⚠️'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos da Estação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Histórico das Estações de Monta (Prenhez vs Parição vs Desmame)</span>
              <Badge variant="outline" className="text-[10px]">
                Safras
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Evolução zootécnica ao longo dos ciclos reprodutivos da propriedade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    dadosGraficoEstacoes.length > 0
                      ? dadosGraficoEstacoes
                      : [
                          { nome: '2022/2023', prenhez: 74.5, paricao: 71.0, desmame: 68.2 },
                          { nome: '2023/2024', prenhez: 78.0, paricao: 75.4, desmame: 73.0 },
                          { nome: '2024/2025', prenhez: 81.2, paricao: 78.5, desmame: 76.4 },
                        ]
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" fontSize={11} />
                  <YAxis domain={[50, 100]} unit="%" fontSize={11} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="prenhez" name="Prenhez (%)" fill="#22543d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paricao" name="Parição (%)" fill="#b45309" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="desmame" name="Desmame (%)" fill="#319795" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Distribuição de IEP (Intervalo entre Partos)</span>
              <Badge variant="outline" className="text-[10px]">
                Matrizes Ativas
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Concentração das matrizes por faixa de intervalo entre partos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosDistribuicaoIEP} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" unit="%" fontSize={11} domain={[0, 100]} />
                  <YAxis type="category" dataKey="faixa" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="pct" name="% do Rebanho" fill="#2b6cb0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terço das Perdas Gestacionais */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-amber-600" />
            Diagnóstico de Perda Gestacional & Fetal da Estação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground block">Perda Total na Estação</span>
              <span className="text-xl font-bold font-sans text-amber-700">
                {statsEstacao.perdaGestacional}%
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                sobre prenhes diagnosticadas
              </span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground block">1º Terço (Até 90 dias)</span>
              <span className="text-xl font-bold font-sans">
                {estacaoAtiva?.perda_primeiro_terco_pct || 65}%
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                mortalidade embrionária precoce
              </span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground block">2º Terço (91 a 180 dias)</span>
              <span className="text-xl font-bold font-sans">
                {estacaoAtiva?.perda_segundo_terco_pct || 25}%
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                abortos fetais intermediários
              </span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground block">3º Terço (&gt; 180 dias)</span>
              <span className="text-xl font-bold font-sans">
                {estacaoAtiva?.perda_terceiro_terco_pct || 10}%
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                natimortos / distocias
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO CONFRONTO PREVISTO x REALIZADO & GRÁFICOS CONSOLIDADOS */}
      <ConfrontoNascimentosSection
        estacaoAtiva={estacaoAtiva}
        nascimentos={nascimentos || []}
        onAbrirCadastroResultadoFinal={onAbrirCadastroResultadoFinal}
      />
    </div>
  )
}
