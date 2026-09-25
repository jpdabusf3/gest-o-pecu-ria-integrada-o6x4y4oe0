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
  Check,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  FechamentoArquivadoRecord,
  getFechamentosArquivados,
  arquivarFechamentoSafra,
} from '@/services/safrasArquivadas'
import { FrenteFechamento } from '@/services/fechamento'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ComparativoSafrasProps {
  frente: FrenteFechamento
  dadosFechamentoAtual?: any
}

export function ComparativoSafras({ frente, dadosFechamentoAtual }: ComparativoSafrasProps) {
  const [safras, setSafras] = useState<FechamentoArquivadoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [arquivando, setArquivando] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const carregarSafras = async () => {
    try {
      setLoading(true)
      const data = await getFechamentosArquivados(frente)
      setSafras(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarSafras()
  }, [frente])

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
      await carregarSafras()
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

  const chartData = safras.map((s) => ({
    safra: s.ano_safra,
    arrobasHa: s.arrobas_ha_ano,
    arrobasCab: s.arrobas_cab_ano,
    custoArroba: s.custo_arroba_produzida,
    margemEbitda: s.margem_ebitda_pct || 0,
    gmdKgDia: s.gmd_medio_kg_dia || 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              Comparativo Histórico entre Safras (Ano a Ano)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evolução zootécnica e financeira comparando safras arquivadas no PocketBase (@/ha,
            @/cab, custo/@ e EBITDA)
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
          {/* Gráficos de Evolução Multissafra */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Produtividade: @/ha/ano e @/cab/ano
                </CardTitle>
                <CardDescription className="text-xs">
                  Evolução do desfrute físico e ganho zootécnico por safra
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

          {/* Tabela Comparativa Detalhada */}
          <Card className="shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">
                Tabela Consolidada de Indicadores Multissafra
              </CardTitle>
              <CardDescription className="text-xs">
                Base comparativa histórica oficial Padrão Exagro
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Safra</TableHead>
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
