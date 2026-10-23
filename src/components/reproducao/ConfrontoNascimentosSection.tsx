import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Baby,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { EstacaoMontaRecord, NascimentoEstacaoRecord } from '@/services/reproducao'

interface ConfrontoEstatistica {
  mes: string
  previsto: number
  realizado: number
  diferenca: number
  diferencaPct: number
  status: 'sem_registro' | 'conforme' | 'acima' | 'abaixo'
}

interface ConfrontoNascimentosProps {
  estacaoAtiva: EstacaoMontaRecord | null
  nascimentos: NascimentoEstacaoRecord[]
  onAbrirCadastroResultadoFinal?: () => void
}

const PALETA = {
  mata: '#22543d', // verde-mata
  terracota: '#b45309', // terracota/âmbar
  areia: '#d69e2e', // areia/ouro
  azul: '#2b6cb0',
  cinza: '#718096',
  rose: '#e53e3e',
}

export function ConfrontoNascimentosSection({
  estacaoAtiva,
  nascimentos,
  onAbrirCadastroResultadoFinal,
}: ConfrontoNascimentosProps) {
  // Filtra nascimentos para a safra ou estação ativa
  const nascimentosFiltrados = useMemo(() => {
    if (!estacaoAtiva) return nascimentos
    return nascimentos.filter(
      (n) => n.estacao_id === estacaoAtiva.id || n.ano_safra === estacaoAtiva.ano_safra,
    )
  }, [estacaoAtiva, nascimentos])

  const totalNascidosRealizados = useMemo(() => {
    return nascimentosFiltrados.reduce((acc, n) => acc + (Number(n.quantidade) || 0), 0)
  }, [nascimentosFiltrados])

  // Mapa de previsão mensal projetada da estação de monta
  const mapaPrevisao = useMemo(() => {
    const mapaObj: Record<string, number> = {}
    if (estacaoAtiva?.mapa_paricao_mensal && Array.isArray(estacaoAtiva.mapa_paricao_mensal)) {
      estacaoAtiva.mapa_paricao_mensal.forEach((item) => {
        if (item.mes) {
          mapaObj[item.mes.trim().toUpperCase()] = Number(item.qtd) || 0
        }
      })
    } else {
      // Se não houver mapa_paricao_mensal salvo, usa a distribuição proporcional padrão de 6 meses
      const totalPrevisto = estacaoAtiva?.total_prenhes || 756
      mapaObj['JUL'] = Math.round(totalPrevisto * 0.27)
      mapaObj['AGO'] = Math.round(totalPrevisto * 0.13)
      mapaObj['SET'] = Math.round(totalPrevisto * 0.1)
      mapaObj['OUT'] = Math.round(totalPrevisto * 0.14)
      mapaObj['NOV'] = Math.round(totalPrevisto * 0.2)
      mapaObj['DEZ'] = Math.max(
        0,
        totalPrevisto -
          (mapaObj['JUL'] + mapaObj['AGO'] + mapaObj['SET'] + mapaObj['OUT'] + mapaObj['NOV']),
      )
    }
    return mapaObj
  }, [estacaoAtiva])

  // Agrupamento mensal dos nascimentos realizados
  const mapaRealizado = useMemo(() => {
    const mapaObj: Record<string, number> = {}
    nascimentosFiltrados.forEach((n) => {
      const mes = (n.mes_referencia || 'JUL').trim().toUpperCase()
      mapaObj[mes] = (mapaObj[mes] || 0) + (Number(n.quantidade) || 0)
    })
    return mapaObj
  }, [nascimentosFiltrados])

  // Confronto Previsto x Realizado por Mês
  const confrontoMensal: ConfrontoEstatistica[] = useMemo(() => {
    const mesesOrdem = ['JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ', 'JAN', 'FEV']
    // Considera apenas meses que tenham previsão > 0 ou realização > 0
    const mesesAtivos = mesesOrdem.filter(
      (m) => (mapaPrevisao[m] || 0) > 0 || (mapaRealizado[m] || 0) > 0,
    )
    if (mesesAtivos.length === 0) {
      mesesAtivos.push('JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ')
    }

    return mesesAtivos.map((mes) => {
      const prev = mapaPrevisao[mes] || 0
      const real = mapaRealizado[mes] || 0
      const diff = real - prev
      const diffPct = prev > 0 ? Number(((diff / prev) * 100).toFixed(1)) : real > 0 ? 100 : 0

      let status: ConfrontoEstatistica['status'] = 'conforme'
      if (real === 0 && prev > 0) {
        status = 'sem_registro'
      } else if (Math.abs(diffPct) <= 10) {
        status = 'conforme' // Tolerância de +/- 10%
      } else if (diff > 0) {
        status = 'acima'
      } else {
        status = 'abaixo'
      }

      return {
        mes,
        previsto: prev,
        realizado: real,
        diferenca: diff,
        diferencaPct: diffPct,
        status,
      }
    })
  }, [mapaPrevisao, mapaRealizado])

  // Estatísticas Consolidadas do Confronto
  const statsConfronto = useMemo(() => {
    const totalPrev = Object.values(mapaPrevisao).reduce((a, b) => a + b, 0)
    const totalReal = totalNascidosRealizados
    const diffTotal = totalReal - totalPrev
    const diffTotalPct = totalPrev > 0 ? Number(((diffTotal / totalPrev) * 100).toFixed(1)) : 0

    // Cálculo do desvio padrão das diferenças mensais (dispersão)
    const diffs = confrontoMensal.map((c) => c.diferenca)
    const mediaDiff = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0
    const variancia =
      diffs.length > 0
        ? diffs.reduce((acc, d) => acc + Math.pow(d - mediaDiff, 2), 0) / diffs.length
        : 0
    const desvioPadrao = Number(Math.sqrt(variancia).toFixed(1))

    // Classificação simples de dispersão e ritmo
    let classificacaoRitmo = 'Conforme o previsto'
    if (totalReal === 0) {
      classificacaoRitmo = 'Aguardando registro de nascimentos'
    } else {
      // Avalia se a concentração no início (JUL/AGO) foi superior ou inferior
      const realInicio = (mapaRealizado['JUL'] || 0) + (mapaRealizado['AGO'] || 0)
      const prevInicio = (mapaPrevisao['JUL'] || 0) + (mapaPrevisao['AGO'] || 0)
      if (realInicio > prevInicio * 1.1) {
        classificacaoRitmo = 'Parição adiantada (concentrada no cedo)'
      } else if (realInicio < prevInicio * 0.85) {
        classificacaoRitmo = 'Parição atrasada / postergada'
      } else {
        classificacaoRitmo = 'Parição conforme curva projetada'
      }
    }

    return {
      totalPrevisto: totalPrev,
      totalRealizado: totalReal,
      diferencaTotal: diffTotal,
      diferencaTotalPct: diffTotalPct,
      desvioPadrao,
      classificacaoRitmo,
    }
  }, [mapaPrevisao, totalNascidosRealizados, confrontoMensal, mapaRealizado])

  // GRÁFICO 3a: Matrizes paridas por Categoria (Nulípara, Primípara, Multípara) e Classe (PO, Comercial)
  const dadosMatrizesCategoriaClasse = useMemo(() => {
    // Categorias: nulípara, primípara, multípara
    const cats: Record<string, { PO: number; comercial: number; total: number }> = {
      nulipara: { PO: 0, comercial: 0, total: 0 },
      primipara: { PO: 0, comercial: 0, total: 0 },
      multipara: { PO: 0, comercial: 0, total: 0 },
    }

    nascimentosFiltrados.forEach((n) => {
      const cat = n.categoria_matriz || 'indefinida'
      const cl = n.classe_matriz || 'indefinida'
      const qtd = Number(n.quantidade) || 0

      const key = cat === 'nulipara' ? 'nulipara' : cat === 'primipara' ? 'primipara' : 'multipara' // agrega outras como multípara

      if (cl === 'PO') {
        cats[key].PO += qtd
      } else {
        cats[key].comercial += qtd
      }
      cats[key].total += qtd
    })

    return [
      {
        categoria: 'Nulíparas',
        PO: cats.nulipara.PO,
        Comercial: cats.nulipara.comercial,
        total: cats.nulipara.total,
      },
      {
        categoria: 'Primíparas',
        PO: cats.primipara.PO,
        Comercial: cats.primipara.comercial,
        total: cats.primipara.total,
      },
      {
        categoria: 'Multíparas',
        PO: cats.multipara.PO,
        Comercial: cats.multipara.comercial,
        total: cats.multipara.total,
      },
    ]
  }, [nascimentosFiltrados])

  // GRÁFICO 3b: Nascimentos por Sexo e Raça
  const dadosNascimentosSexoRaca = useMemo(() => {
    const mapaRacas: Record<
      string,
      { raca: string; Machos: number; Femeas: number; Total: number }
    > = {}

    nascimentosFiltrados.forEach((n) => {
      const racaNome = n.raca?.trim() ? n.raca.trim() : 'Não informado'
      if (!mapaRacas[racaNome]) {
        mapaRacas[racaNome] = { raca: racaNome, Machos: 0, Femeas: 0, Total: 0 }
      }

      const qtd = Number(n.quantidade) || 0
      if (n.sexo === 'macho') {
        mapaRacas[racaNome].Machos += qtd
      } else if (n.sexo === 'femea') {
        mapaRacas[racaNome].Femeas += qtd
      } else {
        // Se indefinido, divide proporcionalmente ou divide 50/50
        mapaRacas[racaNome].Machos += Math.ceil(qtd / 2)
        mapaRacas[racaNome].Femeas += Math.floor(qtd / 2)
      }
      mapaRacas[racaNome].Total += qtd
    })

    return Object.values(mapaRacas)
  }, [nascimentosFiltrados])

  const temNascimentos = totalNascidosRealizados > 0

  return (
    <div className="space-y-6 pt-2">
      {/* Cabeçalho da Seção de Confronto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              Confronto Reprodutivo: Previsão de Parto × Nascimentos Realizados
            </h2>
            <p className="text-xs text-muted-foreground">
              Comparação detalhada do mapa de parição projetado com os nascimentos confirmados na
              safra <strong>{estacaoAtiva?.ano_safra || '2025/2026'}</strong>.
            </p>
          </div>
        </div>

        {onAbrirCadastroResultadoFinal && (
          <Button
            type="button"
            size="sm"
            onClick={onAbrirCadastroResultadoFinal}
            className="h-8 text-xs gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
          >
            <Baby className="h-3.5 w-3.5" />
            Editar Nascimentos no Fechamento
          </Button>
        )}
      </div>

      {/* Cards Indicadores de Dispersão e Desvio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Previsão Total de Partos
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums">
              {statsConfronto.totalPrevisto}{' '}
              <span className="text-xs font-normal text-muted-foreground">bezerros</span>
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              curva projetada de IATF e repasse
            </span>
          </CardContent>
        </Card>

        <Card
          className={
            temNascimentos
              ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15'
              : 'border-border'
          }
        >
          <CardContent className="p-4">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-medium block">
              Nascimentos Realizados
            </span>
            <span className="text-2xl font-bold font-sans tracking-tight tabular-nums text-foreground">
              {statsConfronto.totalRealizado}{' '}
              <span className="text-xs font-normal text-muted-foreground">bezerros</span>
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">
              {temNascimentos
                ? `${((statsConfronto.totalRealizado / (statsConfronto.totalPrevisto || 1)) * 100).toFixed(1)}% do previsto`
                : 'Nenhum registro ainda'}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Diferença Previsto × Real
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-sans tracking-tight tabular-nums ${
                  statsConfronto.diferencaTotal === 0
                    ? 'text-foreground'
                    : statsConfronto.diferencaTotal > 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                }`}
              >
                {statsConfronto.diferencaTotal > 0
                  ? `+${statsConfronto.diferencaTotal}`
                  : statsConfronto.diferencaTotal}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                (
                {statsConfronto.diferencaTotalPct > 0
                  ? `+${statsConfronto.diferencaTotalPct}`
                  : statsConfronto.diferencaTotalPct}
                %)
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              desvio absoluto acumulado
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-[11px] text-muted-foreground uppercase font-medium block">
              Ritmo & Dispersão Mensal
            </span>
            <div
              className="text-sm font-bold text-foreground truncate"
              title={statsConfronto.classificacaoRitmo}
            >
              {statsConfronto.classificacaoRitmo}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Desvio padrão mensal: ±{statsConfronto.desvioPadrao} cab.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Matriz: Previsto vs Realizado vs Diferença Mensal */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              Matriz de Parição Mensal: Previsto × Realizado × Variação
            </span>
            <Badge variant="outline" className="text-[10px]">
              Tolerância ±10%
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Acompanhamento mês a mês da dispersão dos partos e diferença percentual entre a projeção
            do laudo e os nascimentos de campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 text-left">Mês de Parição</th>
                <th className="p-3 text-right">Previsão (cab)</th>
                <th className="p-3 text-right">Realizado (cab)</th>
                <th className="p-3 text-right">Diferença Absoluta</th>
                <th className="p-3 text-right">Diferença %</th>
                <th className="p-3 text-center">Diagnóstico do Mês</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {confrontoMensal.map((item) => (
                <tr key={item.mes} className="hover:bg-muted/20">
                  <td className="p-3 font-semibold font-mono text-foreground">{item.mes}</td>
                  <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                    {item.previsto}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums font-bold text-foreground">
                    {item.realizado}
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums font-semibold ${
                      item.diferenca === 0
                        ? 'text-muted-foreground'
                        : item.diferenca > 0
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      item.diferencaPct === 0
                        ? 'text-muted-foreground'
                        : item.diferencaPct > 0
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {item.diferencaPct > 0 ? `+${item.diferencaPct}%` : `${item.diferencaPct}%`}
                  </td>
                  <td className="p-3 text-center">
                    {item.status === 'sem_registro' ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Sem registro
                      </Badge>
                    ) : item.status === 'conforme' ? (
                      <Badge className="bg-emerald-700 text-white text-[10px]">
                        Conforme Previsto (±10%)
                      </Badge>
                    ) : item.status === 'acima' ? (
                      <Badge className="bg-blue-700 text-white text-[10px]">
                        Acima da Projeção
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        Abaixo da Projeção
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {/* Linha de Totais */}
              <tr className="bg-muted/40 font-bold border-t-2">
                <td className="p-3 font-semibold">TOTAL DA SAFRA</td>
                <td className="p-3 text-right font-mono">{statsConfronto.totalPrevisto}</td>
                <td className="p-3 text-right font-mono text-emerald-800 dark:text-emerald-300">
                  {statsConfronto.totalRealizado}
                </td>
                <td
                  className={`p-3 text-right font-mono ${
                    statsConfronto.diferencaTotal >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {statsConfronto.diferencaTotal > 0
                    ? `+${statsConfronto.diferencaTotal}`
                    : statsConfronto.diferencaTotal}
                </td>
                <td
                  className={`p-3 text-right font-mono ${
                    statsConfronto.diferencaTotalPct >= 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {statsConfronto.diferencaTotalPct > 0
                    ? `+${statsConfronto.diferencaTotalPct}%`
                    : `${statsConfronto.diferencaTotalPct}%`}
                </td>
                <td className="p-3 text-center">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {statsConfronto.classificacaoRitmo}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Gráfico de Barras Comparativas Previsto vs Realizado por Mês */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Distribuição Temporal da Parição: Previsto × Realizado por Mês</span>
            <Badge variant="outline" className="text-[10px]">
              Curva de Partos
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Visualização da concentração dos nascimentos ao longo dos meses da estação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confrontoMensal}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} unit=" cab." />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="previsto"
                  name="Partos Previstos (cab)"
                  fill={PALETA.mata}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="realizado"
                  name="Nascimentos Realizados (cab)"
                  fill={PALETA.terracota}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* GRÁFICOS CONSOLIDADOS ADICIONAIS: Matrizes Paridas por Categoria/Classe & Nascimentos por Sexo/Raça */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO A: Matrizes Paridas por Categoria e Classe */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-700" />
                Matrizes Paridas por Categoria e Classe
              </span>
              <Badge variant="outline" className="text-[10px]">
                Nulípara • Primípara • Multípara
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Cruzamento entre categoria reprodutiva e classe zootécnica (PO e Comercial).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!temNascimentos ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <Baby className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="font-semibold text-foreground">
                  Nenhum nascimento registrado nesta safra
                </p>
                <p className="mt-1 max-w-xs">
                  Abra "Editar Fechamento" acima para cadastrar os bezerros nascidos por categoria e
                  classe.
                </p>
              </div>
            ) : (
              <div className="h-[260px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosMatrizesCategoriaClasse}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="categoria" fontSize={11} />
                    <YAxis fontSize={11} unit=" cab." />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar
                      dataKey="PO"
                      name="Classe PO (cab)"
                      fill={PALETA.mata}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Comercial"
                      name="Classe Comercial (cab)"
                      fill={PALETA.terracota}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GRÁFICO B: Nascimentos por Sexo e Raça */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-amber-700" />
                Nascimentos por Sexo e Raça
              </span>
              <Badge variant="outline" className="text-[10px]">
                Machos × Fêmeas
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidação de bezerros por sexo e quebra por raça informada (Nelore, Cruzamento,
              etc.).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!temNascimentos ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <Baby className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="font-semibold text-foreground">
                  Nenhum nascimento registrado nesta safra
                </p>
                <p className="mt-1 max-w-xs">
                  Abra "Editar Fechamento" para registrar nascimentos por sexo e raça.
                </p>
              </div>
            ) : (
              <div className="h-[260px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosNascimentosSexoRaca}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="raca" fontSize={11} />
                    <YAxis fontSize={11} unit=" cab." />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar
                      dataKey="Machos"
                      name="Machos (cab)"
                      fill={PALETA.azul}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Femeas"
                      name="Fêmeas (cab)"
                      fill="#d53f8c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
