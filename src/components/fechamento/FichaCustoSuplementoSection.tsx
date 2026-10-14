import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, ChevronDown, ChevronUp, ListTree } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { FichaCustoSuplementoResult, ItemFichaCusto } from '@/services/fichaCustoSuplemento'

interface FichaCustoSuplementoSectionProps {
  ficha: FichaCustoSuplementoResult | null
  custoTotalPeriodo?: number
  /** Oculta o bloco de Base de Cálculo (já existe no card que hospeda a ficha) */
  ocultarBaseCalculo?: boolean
}

/** Cores de fatia da barra de composição (paleta Tailwind fixa) */
const CORES_FATIA = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-fuchsia-500',
]

function corFatia(i: number): string {
  return CORES_FATIA[i % CORES_FATIA.length]
}

/**
 * FICHA DE CUSTO DO SUPLEMENTO — seção expansível aditiva.
 * Decomposição do custo por @ produzida em ingredientes, a partir dos insumos
 * de nutrição consumidos no período. Não altera o cálculo do custo por @.
 */
export function FichaCustoSuplementoSection({
  ficha,
  ocultarBaseCalculo = false,
}: FichaCustoSuplementoSectionProps) {
  const [aberta, setAberta] = useState(false)

  if (!ficha) return null

  // Estado vazio explicativo (mesmo padrão do card existente)
  if (!ficha.disponivel || ficha.itens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-4 bg-muted/30 mt-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ListTree className="h-3.5 w-3.5" /> Ficha de Custo do Suplemento
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Não há consumo de insumos de nutrição registrado no período selecionado, portanto a
          decomposição do custo por @ em ingredientes (ração, núcleo, sal, milho, farelo, minerais
          etc.) ainda não pode ser montada. Lance o consumo de insumos no estoque de nutrição (aba
          Estoque Insumos) ou registre compras/consumo da fábrica de suplemento para habilitar a
          ficha.
        </p>
      </div>
    )
  }

  const totalRs = ficha.custoTotalRs
  const temArrobas = ficha.temArrobasValidas && ficha.arrobasProduzidas > 0

  return (
    <div className="rounded-xl border bg-card mt-2 overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAberta(!aberta)}
        className="w-full justify-between h-10 rounded-none border-b border-dashed hover:bg-muted/40"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
          <ListTree className="h-3.5 w-3.5 text-primary" /> Ficha de Custo do Suplemento
          <span className="font-medium normal-case text-muted-foreground">
            (decomposição por ingrediente)
          </span>
        </span>
        {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {aberta && (
        <div className="p-4 space-y-4 animate-fade-in">
          {/* Fonte da decomposição — sempre explícita */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <p>
              <strong className="text-foreground">Fonte da decomposição:</strong>{' '}
              {ficha.fonteComposicaoLabel}.{' '}
              {ficha.fonteComposicao === 'insumos_consumidos'
                ? 'Cada ingrediente entra pelo consumo registrado no estoque (insumo consumido = insumo com custo); não há formulação cadastrada da fábrica para o período.'
                : ''}
            </p>
          </div>

          {/* Barra de composição visual (empilhada, sem libs novas) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Composição do custo total</span>
              <span className="font-mono">{formatCurrency(totalRs)}</span>
            </div>
            <div className="flex h-4 w-full rounded-full overflow-hidden bg-muted">
              {ficha.itens.map((it, i) => (
                <div
                  key={it.produto}
                  className={`${corFatia(i)} h-full`}
                  style={{ width: `${Math.max(it.participacaoPct, 0)}%` }}
                  title={`${it.produto}: ${it.participacaoPct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              {ficha.itens.map((it, i) => (
                <span
                  key={it.produto}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${corFatia(i)}`} />
                  {it.produto} · {it.participacaoPct.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>

          {/* Tabela por ingrediente — ordenada do que mais pesa para o que menos pesa */}
          <div className="border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/60 text-muted-foreground border-b font-semibold">
                <tr>
                  <th className="py-1.5 px-3 text-left">Ingrediente</th>
                  <th className="py-1.5 px-3 text-right">Consumo (kg)</th>
                  <th className="py-1.5 px-3 text-right">Consumo (sacos 30kg)</th>
                  <th className="py-1.5 px-3 text-right">Custo (R$)</th>
                  <th className="py-1.5 px-3 text-right">Custo R$/@</th>
                  <th className="py-1.5 px-3 text-right font-bold">% do Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {ficha.itens.map((it, i) => (
                  <ItemRow key={it.produto} item={it} indice={i} temArrobas={temArrobas} />
                ))}
                <tr className="bg-muted/40 font-bold border-t-2">
                  <td className="py-1.5 px-3 font-sans">Total</td>
                  <td className="py-1.5 px-3 text-right">
                    {formatNumber(
                      ficha.itens.reduce((a, i) => a + i.quantidadeKg, 0),
                      2,
                    )}{' '}
                    kg
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    {formatNumber(
                      ficha.itens.reduce((a, i) => a + i.quantidadeSacos, 0),
                      2,
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right">{formatCurrency(totalRs)}</td>
                  <td className="py-1.5 px-3 text-right">
                    {ficha.custoPorArrobaTotal !== null
                      ? `R$ ${ficha.custoPorArrobaTotal.toFixed(2)}/@`
                      : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right">100,0%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destaques: maior e menor peso no custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm">
              <CardContent className="py-3 px-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Maior peso no custo
                </p>
                {ficha.maiorPeso && (
                  <p className="text-sm font-bold mt-0.5">
                    {ficha.maiorPeso.produto}{' '}
                    <span className="font-mono text-rose-600">
                      {ficha.maiorPeso.participacaoPct.toFixed(1)}%
                    </span>
                    <span className="block text-[10px] text-muted-foreground font-normal font-mono">
                      R$ {ficha.maiorPeso.custoTotalRs.toFixed(2)}
                      {ficha.maiorPeso.custoPorArroba !== null
                        ? ` · R$ ${ficha.maiorPeso.custoPorArroba.toFixed(2)}/@`
                        : ''}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
              <CardContent className="py-3 px-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Menor peso no custo
                </p>
                {ficha.menorPeso && (
                  <p className="text-sm font-bold mt-0.5">
                    {ficha.menorPeso.produto}{' '}
                    <span className="font-mono text-emerald-600">
                      {ficha.menorPeso.participacaoPct.toFixed(1)}%
                    </span>
                    <span className="block text-[10px] text-muted-foreground font-normal font-mono">
                      R$ {ficha.menorPeso.custoTotalRs.toFixed(2)}
                      {ficha.menorPeso.custoPorArroba !== null
                        ? ` · R$ ${ficha.menorPeso.custoPorArroba.toFixed(2)}/@`
                        : ''}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Base de Cálculo da decomposição (aditiva à Base de Cálculo do card) */}
          {!ocultarBaseCalculo && (
            <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-1.5">
              <h6 className="font-bold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" /> Base de Cálculo — Ficha de Custo
              </h6>
              <code className="block bg-muted px-2 py-1 rounded font-mono text-[10px] text-foreground">
                {ficha.baseCalculo.formulaTexto}
              </code>
              <p className="text-muted-foreground text-[11px]">
                <strong>Fonte dos dados:</strong> {ficha.baseCalculo.fonteDados}
              </p>
              <p className="text-muted-foreground text-[11px]">
                <strong>Período:</strong> {ficha.baseCalculo.periodo}
              </p>
              <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                {ficha.baseCalculo.premisas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {ficha.fonteComposicao === 'lancamentos_fabrica_sem_insumos' && (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Há custo consolidado da Fábrica de Suplemento (R${' '}
                  {ficha.custoTotalOriginal.toFixed(2)}), mas nenhum consumo de insumo de nutrição
                  lançado no estoque do período — a decomposição por ingrediente não é possível sem
                  inventar dados.
                </p>
              )}
            </div>
          )}

          <Badge variant="secondary" className="text-[10px]">
            Soma dos ingredientes = custo total do período ({formatCurrency(totalRs)}) — mesma base
            do card de Custo por @ Produzida.
          </Badge>
        </div>
      )}
    </div>
  )
}

function ItemRow({
  item,
  indice,
  temArrobas,
}: {
  item: ItemFichaCusto
  indice: number
  temArrobas: boolean
}) {
  return (
    <tr>
      <td className="py-1.5 px-3 font-sans font-medium">
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${corFatia(indice)}`} />
          {item.produto}
        </span>
      </td>
      <td className="py-1.5 px-3 text-right">{item.quantidadeKg.toFixed(2)} kg</td>
      <td className="py-1.5 px-3 text-right">{item.quantidadeSacos.toFixed(2)}</td>
      <td className="py-1.5 px-3 text-right font-bold text-rose-600">
        {formatCurrency(item.custoTotalRs)}
      </td>
      <td className="py-1.5 px-3 text-right">
        {temArrobas && item.custoPorArroba !== null ? `R$ ${item.custoPorArroba.toFixed(2)}` : '—'}
      </td>
      <td className="py-1.5 px-3 text-right font-bold">{item.participacaoPct.toFixed(1)}%</td>
    </tr>
  )
}
