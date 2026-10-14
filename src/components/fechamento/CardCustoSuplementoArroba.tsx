import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, ChevronDown, ChevronUp, Factory, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  calcularCustoSuplementoPorArroba,
  CustoSuplementoArrobaResult,
} from '@/services/custoSuplementoArroba'
import { EstoqueInsumoRecord, LancamentoFinanceiroRecord } from '@/services/fechamento'
import { ConfigBenchmarkRecord } from '@/services/configBenchmark'

interface CardCustoSuplementoProps {
  estoque: EstoqueInsumoRecord[]
  financeiro: LancamentoFinanceiroRecord[]
  benchmarks: ConfigBenchmarkRecord[]
  /** Produção de @ do fechamento/projeção (não inventar terceira base) */
  arrobasProduzidasTotal: number
  /** Kg de ganho acumulado do rebanho no período (fallback: kg ÷ 30 = @) */
  kgGanhoAcumulado?: number
  anoSafra?: string
  periodo?: string
}

export function CardCustoSuplementoArroba({
  estoque,
  financeiro,
  benchmarks,
  arrobasProduzidasTotal,
  kgGanhoAcumulado = 0,
  anoSafra,
  periodo,
}: CardCustoSuplementoProps) {
  const [mostrarBase, setMostrarBase] = useState(false)
  const [resultado, setResultado] = useState<CustoSuplementoArrobaResult | null>(null)

  useEffect(() => {
    let ativo = true
    calcularCustoSuplementoPorArroba({
      periodo: periodo || new Date().toISOString().slice(0, 7),
      anoSafra,
      lancamentosFinanceiros: financeiro,
      estoqueInsumos: estoque,
      arrobasProduzidasTotal,
      kgGanhoAcumulado,
      benchmarks,
    })
      .then((r) => {
        if (ativo) setResultado(r)
      })
      .catch((e) => console.warn('Erro ao calcular custo de suplemento por @:', e))
    return () => {
      ativo = false
    }
  }, [estoque, financeiro, benchmarks, arrobasProduzidasTotal, kgGanhoAcumulado, anoSafra, periodo])

  const badgeStatus = useMemo(() => {
    if (!resultado) return null
    switch (resultado.statusComparativo) {
      case 'abaixo_meta':
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200 gap-1"
          >
            <TrendingDown className="h-3 w-3" /> Abaixo da meta
          </Badge>
        )
      case 'alinhado':
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200"
          >
            Alinhado à meta
          </Badge>
        )
      case 'acima_meta':
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-bold text-rose-700 bg-rose-50 border-rose-200 gap-1"
          >
            <TrendingUp className="h-3 w-3" /> Acima da meta
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            Sem meta configurada
          </Badge>
        )
    }
  }, [resultado])

  return (
    <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
      <CardHeader className="pb-1 pt-4">
        <div className="flex justify-between items-start gap-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5" /> Custo de Suplemento por @ Produzida
          </CardDescription>
          {badgeStatus}
        </div>

        {resultado?.temArrobasValidas && resultado.custoPorArrobaProduzida !== null ? (
          <CardTitle className="text-3xl font-black text-foreground font-mono flex items-baseline gap-1">
            R$ {resultado.custoPorArrobaProduzida.toFixed(2)}
            <span className="text-sm font-semibold text-muted-foreground">/@</span>
          </CardTitle>
        ) : (
          <CardTitle className="text-base font-bold text-muted-foreground">
            Sem @ produzidas no período
          </CardTitle>
        )}
      </CardHeader>

      <CardContent className="pb-4 pt-1 space-y-3">
        {resultado?.temArrobasValidas ? (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Custo total do suplemento no período:{' '}
              <strong className="text-foreground font-mono">
                {formatCurrency(resultado.custoTotalSuplementoRs)}
              </strong>{' '}
              · Produção:{' '}
              <strong className="text-foreground font-mono">
                {resultado.arrobasProduzidasTotal.toFixed(1)} @
              </strong>
            </p>
            {resultado.metaSafraRsArroba !== null && (
              <p>
                Meta da safra:{' '}
                <strong className="text-foreground font-mono">
                  R$ {resultado.metaSafraRsArroba.toFixed(2)}/@
                </strong>
                {' · '}
              </p>
            )}
            {resultado.referenciaMercadoRsArroba !== null && (
              <p>
                Referência de Mercado:{' '}
                <strong className="text-foreground font-mono">
                  R$ {resultado.referenciaMercadoRsArroba.toFixed(2)}/@
                </strong>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Não houve arrobas produzidas no período selecionado (ganho zero ou produção não
            apurada), então o custo por @ não pode ser calculado — evitar divisão por zero. Lance
            pesagens/movimentações de rebanho ou selecione outro período.
          </p>
        )}

        {/* Base de Cálculo Transparente (padrão do card de Projeção de Safra) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarBase(!mostrarBase)}
          className="w-full text-xs text-muted-foreground hover:text-foreground justify-between border border-dashed h-9"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-primary" /> Base de Cálculo Transparente (fórmula e
            premissas)
          </span>
          {mostrarBase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {mostrarBase && resultado && (
          <div className="p-4 rounded-xl border bg-muted/30 text-xs space-y-3 animate-fade-in">
            <div className="space-y-1.5">
              <h5 className="font-bold text-foreground">1. Fórmula do Custo de Suplemento por @</h5>
              <code className="block bg-muted px-2 py-1 rounded font-mono text-[10px] text-foreground">
                Custo/@ = {formatCurrency(resultado.custoTotalSuplementoRs)} (custo total) ÷{' '}
                {resultado.arrobasProduzidasTotal.toFixed(1)} @ ={' '}
                {resultado.custoPorArrobaProduzida !== null
                  ? `R$ ${resultado.custoPorArrobaProduzida.toFixed(2)}/@`
                  : '— (sem @ no período)'}
              </code>
              <p className="text-muted-foreground text-[11px]">
                {resultado.baseCalculo.formulaTexto}
              </p>
              <p className="text-muted-foreground text-[11px]">
                <strong>Premissa de arroba:</strong> {resultado.baseCalculo.premisaArroba}
              </p>
            </div>

            <div className="space-y-1.5">
              <h5 className="font-bold text-foreground">2. Fonte do custo do período</h5>
              <p className="text-muted-foreground text-[11px]">
                {resultado.baseCalculo.centroCusto} — {resultado.baseCalculo.custoFonte}
              </p>
              {resultado.detalhamentoLancamentos.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                  {resultado.detalhamentoLancamentos.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '—'} ·{' '}
                      {formatCurrency(l.valor)} · {l.descricao?.slice(0, 70) || l.plano_contas}
                    </li>
                  ))}
                </ul>
              )}
              {resultado.detalhamentoInsumos.length > 0 && (
                <div className="border rounded-lg overflow-x-auto bg-card mt-2">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Insumo</th>
                        <th className="py-1.5 px-3 text-right">Consumo</th>
                        <th className="py-1.5 px-3 text-right">Preço Unit.</th>
                        <th className="py-1.5 px-3 text-right">Custo (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {resultado.detalhamentoInsumos.slice(0, 10).map((d, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-3 font-sans">{d.produto}</td>
                          <td className="py-1.5 px-3 text-right">
                            {d.quantidadeConsumida.toFixed(2)} {d.unidade}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {formatCurrency(d.precoUnitario)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-rose-600">
                            {formatCurrency(d.custoTotalRs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h5 className="font-bold text-foreground">3. Balizadores</h5>
              <p className="text-muted-foreground text-[11px]">
                Referência de Mercado (config_benchmark · custo_arroba_produzida_engorda):{' '}
                <strong className="text-foreground">
                  {resultado.referenciaMercadoRsArroba !== null
                    ? `R$ ${resultado.referenciaMercadoRsArroba.toFixed(2)}/@`
                    : 'não configurada'}
                </strong>
                {' · '}Meta da safra (metas_safra · custo_arroba):{' '}
                <strong className="text-foreground">
                  {resultado.metaSafraRsArroba !== null
                    ? `R$ ${resultado.metaSafraRsArroba.toFixed(2)}/@`
                    : 'não configurada'}
                </strong>
                {' · '}Semáforo: ≤95% da balizadora verde (abaixo da meta) · 95–105% azul (alinhado)
                · &gt;105% vermelho (acima da meta). Nenhum valor está fixo no código — ambos vêm de
                configuração editável.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
