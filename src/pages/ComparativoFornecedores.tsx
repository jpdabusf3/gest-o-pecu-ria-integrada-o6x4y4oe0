/**
 * COMPARATIVO DE FORNECEDORES — Robô Chicão / Gestão Pecuária Integrada
 *
 * Ranking de ágio médio PAGO POR FORNECEDOR ao longo da safra, a partir dos
 * registros REAIS de compras_gado (coleção do fluxo de compra de gado do
 * Chicão). Nenhum dado é inventado: sem compras na safra, a tela exibe estado
 * vazio explicativo.
 *
 * Ágio = (R$/@ compra ÷ cotação de referência − 1) × 100 (regra de projeto).
 * O ágio exibido é o valor GRAVADO na compra (agio_pct); compras sem ágio
 * gravado ficam fora do ranking de ágio, mas continuam no ranking de volume.
 *
 * Semáforo do ágio (igual ao painel de compra):
 *   verde ≤ 0% | amarelo ≤ 10% | vermelho > 10%
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw, Bot, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { compararFornecedores, getSafrasDisponiveis } from '@/services/comparativoFornecedores'
import type { RankingFornecedor } from '@/services/comparativoFornecedores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fmtRs = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtNum = (v: number, dec = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Semáforo do ágio — mesma faixa do painel de compra (sem benchmark): ≤0 verde, ≤10 amarelo, >10 vermelho */
function semaforoAgio(agioPct: number | null): {
  cor: 'verde' | 'amarelo' | 'vermelho' | 'neutro'
  label: string
} {
  if (agioPct === null) return { cor: 'neutro', label: 'Sem ágio calculado' }
  if (agioPct <= 0) return { cor: 'verde', label: 'Compra com desconto/bom preço' }
  if (agioPct <= 10) return { cor: 'amarelo', label: 'Ágio moderado' }
  return { cor: 'vermelho', label: 'Ágio alto' }
}

const CORES_SEMAFORO: Record<string, string> = {
  verde:
    'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
  amarelo: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
  vermelho: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
  neutro: 'bg-muted text-muted-foreground border-border',
}

export default function ComparativoFornecedores() {
  const { user, isGestor, isProprietario } = useAuth()
  const safras = getSafrasDisponiveis()
  const [safraId, setSafraId] = useState(safras[0]?.id || '')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Awaited<
    ReturnType<typeof compararFornecedores>
  > | null>(null)

  const safraSelecionada = safras.find((s) => s.id === safraId) || safras[0]

  const carregar = useCallback(async () => {
    if (!safraSelecionada) return
    setCarregando(true)
    setErro(null)
    try {
      const r = await compararFornecedores(safraSelecionada.dataInicio, safraSelecionada.dataFim)
      setResultado(r)
    } catch (e: any) {
      console.warn('Erro ao comparar fornecedores:', e)
      setErro(e?.message || 'Falha ao carregar o comparativo')
    } finally {
      setCarregando(false)
    }
  }, [safraSelecionada])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Permissão estrita: Gestor ou Proprietário (sócio administrador herda via RoleRoute)
  const podeVer = isGestor || isProprietario
  if (!podeVer) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              Acesso Restrito ao Comparativo de Fornecedores
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              O ranking de ágio por fornecedor revela condições comerciais de compra. Apenas o{' '}
              <strong>Gestor Técnico</strong> e o <strong>Proprietário</strong> possuem autorização
              para visualizar.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ranking: RankingFornecedor[] = resultado?.ranking || []
  const semCompras = !carregando && !erro && resultado && resultado.comprasPeriodo === 0
  const comAgio = ranking.filter((f) => f.agioMedioPct !== null)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Comparativo de Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranking de ágio médio pago por fornecedor ao longo da safra — dados reais das compras de
            gado importadas pelo Robô Chicão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={safraId} onValueChange={setSafraId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione a safra" />
            </SelectTrigger>
            <SelectContent>
              {safras.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={carregar} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Estado de erro */}
      {erro && (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                Erro ao carregar o comparativo
              </p>
              <p className="text-sm text-rose-800 dark:text-rose-300">{erro}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio explicativo — banco zerado / sem compras na safra */}
      {semCompras && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-3">
            <Info className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">Nenhuma compra de gado nesta safra</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              O comparativo usa apenas os registros reais de compra de gado importados pelo Robô
              Chicão (com quantidade, peso médio, preço por cabeça/@ e fornecedor). Nenhuma compra
              foi registrada no período de <strong>{safraSelecionada?.label}</strong> (
              {safraSelecionada?.dataInicio} a {safraSelecionada?.dataFim}).
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Para popular o ranking, importe uma nota de compra de gado no Robô Chicão — o ágio é
              calculado na conferência (R$/@ ÷ cotação − 1 × 100) e gravado com a compra.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/maestro">
                <Bot className="h-4 w-4 mr-2" />
                Abrir Robô Chicão
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resumo do período */}
      {resultado && resultado.comprasPeriodo > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Compras</p>
              <p className="text-2xl font-bold">{fmtNum(resultado.comprasPeriodo)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Cabeças</p>
              <p className="text-2xl font-bold">
                {fmtNum(resultado.ranking.reduce((a, f) => a + f.totalCabecas, 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrobas (@)</p>
              <p className="text-2xl font-bold">{fmtNum(resultado.totalArrobas, 1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Investido</p>
              <p className="text-2xl font-bold">{fmtRs(resultado.totalInvestidoRs)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aviso de compras sem ágio */}
      {resultado && resultado.comprasPeriodo > 0 && resultado.comprasSemCotacao > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {resultado.comprasSemCotacao} de {resultado.comprasPeriodo} compra(s) sem ágio gravado
            (cotação de referência ausente na importação). Elas entram no ranking de volume, mas
            ficam fora do ágio — a cotação B3 nunca é inventada.
          </span>
        </div>
      )}

      {/* Ranking */}
      {ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking de ágio médio por fornecedor — {safraSelecionada?.label}</CardTitle>
            <CardDescription>
              Ágio médio ponderado por arrobas compradas ({fmtNum(resultado?.totalArrobas || 0, 1)}{' '}
              @ no período). Verde ≤ 0% · Amarelo ≤ 10% · Vermelho &gt; 10%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.map((f, idx) => {
              const sem = semaforoAgio(f.agioMedioPct)
              return (
                <div
                  key={f.fornecedor}
                  className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex items-center gap-3 md:w-1/3">
                    <span
                      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{f.fornecedor}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.numCompras} compra(s) · {fmtNum(f.totalCabecas)} cab. ·{' '}
                        {fmtNum(f.totalArrobas, 1)} @
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:w-2/3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Ágio médio
                      </p>
                      <div className="flex items-center gap-2">
                        {f.agioMedioPct !== null ? (
                          <>
                            {f.agioMedioPct > 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            <span className="font-bold">{fmtNum(f.agioMedioPct, 1)}%</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-[9px] ${CORES_SEMAFORO[sem.cor]}`}
                      >
                        {sem.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Preço médio
                      </p>
                      <p className="font-semibold">{fmtRs(f.precoMedioRsAt)}/@</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Investido
                      </p>
                      <p className="font-semibold">{fmtRs(f.totalInvestidoRs)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Período
                      </p>
                      <p className="text-xs">
                        {f.primeiraCompra && f.ultimaCompra
                          ? f.primeiraCompra === f.ultimaCompra
                            ? new Date(f.primeiraCompra + 'T12:00:00').toLocaleDateString('pt-BR')
                            : `${new Date(f.primeiraCompra + 'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(f.ultimaCompra + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {comAgio.length === 0 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Nenhuma compra com ágio gravado nesta safra — o ranking de volume permanece, mas o
                ágio só aparece quando a cotação de referência foi informada na importação.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rodapé de regras */}
      <p className="text-[11px] text-muted-foreground text-center">
        Regras de projeto: 1 @ de peso vivo = 30 kg · ágio = (R$/@ ÷ cotação − 1) × 100 · cotação B3
        nunca inventada · dados exclusivamente de compras_gado.
      </p>
    </div>
  )
}
