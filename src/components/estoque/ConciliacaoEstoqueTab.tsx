import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useFarm } from '@/contexts/FarmContext'
import { getEstoqueInsumos, EstoqueInsumoRecord } from '@/services/fechamento'
import {
  salvarConciliacaoEstoque,
  aplicarAjusteEstoqueFisico,
  calcularDivergenciaItem,
  getHistoricoConciliacoes,
  ConciliacaoEstoqueRecord,
} from '@/services/conciliacaoEstoque'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Scale, Info, ChevronDown, ChevronUp, ClipboardCheck, History } from 'lucide-react'

interface LinhaContagem {
  insumo_id: string
  produto: string
  categoria: string
  saldo_sistema: number
  unidade_sistema: string
  contagem_fisica: string
  unidade_contada: 'kg' | 'saco' | 'l' | 'dose' | 'un'
  preco_unitario: number
  justificativa: string
}

const TOLERANCIA_PADRAO_PCT = 2.0

export function ConciliacaoEstoqueTab() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { inventory, reloadInventory } = useFarm()
  const [itensEstoque, setItensEstoque] = useState<EstoqueInsumoRecord[]>([])
  const [linhas, setLinhas] = useState<LinhaContagem[]>([])
  const [tolerancia, setTolerancia] = useState<number>(TOLERANCIA_PADRAO_PCT)
  const [periodoMes, setPeriodoMes] = useState<string>(new Date().toISOString().slice(0, 7))
  const [mostrarBase, setMostrarBase] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState<ConciliacaoEstoqueRecord[]>([])
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  const carregar = async () => {
    try {
      const items = await getEstoqueInsumos()
      setItensEstoque(items)
      setLinhas(
        items.map((i) => ({
          insumo_id: i.id,
          produto: i.produto,
          categoria: i.categoria || 'geral',
          saldo_sistema: i.estoque_final || 0,
          unidade_sistema: i.unidade || 'kg',
          contagem_fisica: '',
          unidade_contada: (i.unidade === 'saco' ? 'saco' : 'kg') as 'kg' | 'saco',
          preco_unitario: i.preco_unitario || 0,
          justificativa: '',
        })),
      )
      const hist = await getHistoricoConciliacoes()
      setHistorico(hist)
    } catch (e) {
      console.warn('Erro ao carregar estoque para conciliação:', e)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const linhasCalculadas = useMemo(() => {
    return linhas.map((l) => {
      const qtd = Number(l.contagem_fisica)
      if (Number.isNaN(qtd)) {
        return null
      }
      const calc = calcularDivergenciaItem(
        {
          insumo_id: l.insumo_id,
          produto: l.produto,
          categoria: l.categoria,
          saldo_sistema: l.saldo_sistema,
          unidade_sistema: l.unidade_sistema,
          contagem_fisica: qtd,
          unidade_contada: l.unidade_contada,
          preco_unitario: l.preco_unitario,
          justificativa: l.justificativa,
        },
        tolerancia,
      )
      return { linha: l, calc }
    })
  }, [linhas, tolerancia])

  const divergentes = linhasCalculadas.filter((x) => x && !x.calc.dentro_tolerancia)
  const totalItensContados = linhasCalculadas.filter((x) => x !== null).length
  const totalDivergenciaRs = linhasCalculadas.reduce(
    (acc, x) => acc + (x ? x.calc.diferenca_rs : 0),
    0,
  )

  const faltandoJustificativa = divergentes.filter((x) => !x.linha.justificativa.trim())

  const atualizarLinha = (insumoId: string, campo: keyof LinhaContagem, valor: any) => {
    setLinhas((prev) => prev.map((l) => (l.insumo_id === insumoId ? { ...l, [campo]: valor } : l)))
  }

  const handleSalvarConciliacao = async () => {
    if (!user) return
    if (totalItensContados === 0) {
      toast({
        title: 'Nenhuma contagem lançada',
        description: 'Informe a contagem física de pelo menos um insumo.',
        variant: 'destructive',
      })
      return
    }
    if (faltandoJustificativa.length > 0) {
      toast({
        title: 'Justificativa obrigatória',
        description: `${faltandoJustificativa.length} divergência(s) fora da tolerância sem justificativa. Justifique antes de concluir.`,
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const result = await salvarConciliacaoEstoque({
        periodo_mes: periodoMes,
        usuario: {
          id: user.id || 'anonimo',
          nome: user.name || 'Gestor',
          perfil: user.role || 'gestor',
        },
        tolerancia_pct: tolerancia,
        itens: linhasCalculadas.filter(Boolean).map((x: any) => x.calc),
      })

      if (result) {
        toast({
          title: 'Conciliação registrada',
          description: `Protocolo de auditoria: ${result.protocolo_audit_id || '—'}`,
        })
        await carregar()
        await reloadInventory()
      } else {
        toast({
          title: 'Erro ao registrar conciliação',
          description: 'Verifique a conexão e tente novamente.',
          variant: 'destructive',
        })
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleAjustarEstoque = async (conciliacaoId: string) => {
    if (!user) return
    const result = await aplicarAjusteEstoqueFisico(conciliacaoId, {
      id: user.id || 'anonimo',
      nome: user.name || 'Gestor',
      perfil: user.role || 'gestor',
    })
    if (result.sucesso) {
      toast({
        title: 'Ajuste de estoque aplicado',
        description: result.mensagem,
      })
      await carregar()
      await reloadInventory()
    } else {
      toast({
        title: 'Erro no ajuste',
        description: result.mensagem,
        variant: 'destructive',
      })
    }
  }

  const semaforoBadge = (dentroTolerancia: boolean, pct: number) => {
    const abs = Math.abs(pct)
    if (dentroTolerancia) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
          Dentro da tolerância
        </Badge>
      )
    }
    if (abs <= 5) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
          Divergente ({pct > 0 ? '+' : ''}
          {formatNumber(pct, 2)}%)
        </Badge>
      )
    }
    return (
      <Badge variant="destructive">
        Crítico ({pct > 0 ? '+' : ''}
        {formatNumber(pct, 2)}%)
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" /> Conciliação de Estoque — Planilha vs. Físico
          </CardTitle>
          <CardDescription>
            Lance a contagem física de cada insumo para confrontar com o estoque do sistema
            (planilha importada pelo Chicão ou saldo atual de estoque_insumos). Divergências fora da
            tolerância exigem justificativa do gestor — nunca corrigem o estoque silenciosamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Período de Referência
              </Label>
              <Input
                type="month"
                value={periodoMes}
                onChange={(e) => setPeriodoMes(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tolerância (%)
              </Label>
              <Input
                type="number"
                step="0.5"
                value={tolerancia}
                onChange={(e) => setTolerancia(Number(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Conversão Canônica
              </Label>
              <div className="h-10 flex items-center text-sm font-semibold text-muted-foreground bg-muted/40 rounded-md px-3 border">
                1 saco = 30 kg
              </div>
            </div>
          </div>

          {/* Base de Cálculo Transparente */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarBase(!mostrarBase)}
            className="w-full text-xs text-muted-foreground hover:text-foreground justify-between border border-dashed h-9"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-primary" /> Base de Cálculo Transparente
            </span>
            {mostrarBase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {mostrarBase && (
            <div className="p-4 rounded-xl border bg-muted/30 text-xs space-y-2 animate-fade-in">
              <p>
                <strong>Divergência (kg) =</strong> contagem física convertida em kg − saldo do
                sistema convertido em kg (1 saco = 30 kg). Para unidades não ponderais (l, dose, un)
                compara-se a quantidade pura.
              </p>
              <p>
                <strong>Divergência (R$) =</strong> divergência (kg) × preço unitário atual do
                insumo (preço por saco é dividido por 30 para comparar em kg).
              </p>
              <p>
                <strong>Saldo do sistema =</strong> estoque_final da coleção estoque_insumos (último
                saldo registrado/importado pelo Chicão ou movimentações do fluxo único).
              </p>
              <p>
                <strong>Tolerância configurável:</strong> {formatNumber(tolerancia, 2)}% — dentro
                dela a divergência fica em verde; acima, amarelo (até 5%) ou vermelho (crítico).
              </p>
            </div>
          )}

          {/* Tabela de Contagem Física */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead className="text-right">Saldo Sistema</TableHead>
                  <TableHead className="text-center">Contagem Física</TableHead>
                  <TableHead className="text-center">Unid. Contada</TableHead>
                  <TableHead className="text-right">Divergência</TableHead>
                  <TableHead className="text-right">Impacto R$</TableHead>
                  <TableHead>Semáforo</TableHead>
                  <TableHead>Justificativa (obrigatória fora da tolerância)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const x = linhasCalculadas.find((c) => c?.linha.insumo_id === l.insumo_id)
                  const calc = x?.calc
                  return (
                    <TableRow
                      key={l.insumo_id}
                      className={
                        !calc?.dentro_tolerancia ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                      }
                    >
                      <TableCell className="font-medium whitespace-nowrap">{l.produto}</TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {formatNumber(l.saldo_sistema, 2)} {l.unidade_sistema}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-24 text-right font-mono"
                          value={l.contagem_fisica}
                          placeholder="—"
                          onChange={(e) =>
                            atualizarLinha(l.insumo_id, 'contagem_fisica', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <select
                          className="h-8 w-20 border rounded-md bg-background text-xs px-1"
                          value={l.unidade_contada}
                          onChange={(e) =>
                            atualizarLinha(l.insumo_id, 'unidade_contada', e.target.value)
                          }
                        >
                          <option value="kg">kg</option>
                          <option value="saco">saco</option>
                          <option value="l">l</option>
                          <option value="dose">dose</option>
                          <option value="un">un</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {calc ? (
                          <>
                            {calc.diferenca_qtd > 0 ? '+' : ''}
                            {formatNumber(calc.diferenca_qtd, 2)} kg
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono whitespace-nowrap ${
                          calc && Math.abs(calc.diferenca_rs) > 0
                            ? calc.diferenca_rs < 0
                              ? 'text-destructive'
                              : 'text-emerald-600'
                            : ''
                        }`}
                      >
                        {calc ? formatCurrency(calc.diferenca_rs) : '—'}
                      </TableCell>
                      <TableCell>
                        {calc ? semaforoBadge(calc.dentro_tolerancia, calc.diferenca_pct) : '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs min-w-[220px]"
                          placeholder={calc && !calc.dentro_tolerancia ? 'Obrigatório' : 'Opcional'}
                          value={l.justificativa}
                          onChange={(e) =>
                            atualizarLinha(l.insumo_id, 'justificativa', e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Nenhum insumo no estoque para conciliar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumo + Ação */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border rounded-lg p-4 bg-muted/20">
            <div className="text-sm space-y-0.5">
              <p>
                Itens contados: <strong className="font-mono">{totalItensContados}</strong> ·
                Divergências fora da tolerância:{' '}
                <strong className={`font-mono ${divergentes.length > 0 ? 'text-amber-600' : ''}`}>
                  {divergentes.length}
                </strong>
              </p>
              <p className="text-muted-foreground text-xs">
                Impacto financeiro total da divergência:{' '}
                <strong className="font-mono">{formatCurrency(totalDivergenciaRs)}</strong> — o
                ajuste NÃO é automático: gera movimentação pelo fluxo único com evento de auditoria
                encadeado.
              </p>
            </div>
            <Button onClick={handleSalvarConciliacao} disabled={salvando} className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {salvando ? 'Registrando...' : 'Registrar Conciliação'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Conciliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" /> Histórico de Conciliações
          </CardTitle>
          <CardDescription>
            Data, responsável, nº de itens conciliados, divergências, justificativas e protocolos de
            auditoria (append-only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className="gap-2"
          >
            {mostrarHistorico ? 'Ocultar' : 'Mostrar'} Histórico ({historico.length})
            {mostrarHistorico ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {mostrarHistorico && (
            <div className="space-y-4">
              {historico.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">{c.periodo_mes}</span> ·{' '}
                      {new Date(c.data_conciliacao).toLocaleDateString('pt-BR')} ·{' '}
                      <span className="text-muted-foreground">{c.responsavel_nome}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Badge variant="outline" className="text-xs">
                        {c.total_itens} itens
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          c.total_divergentes > 0
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {c.total_divergentes} divergentes
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatCurrency(c.total_divergencia_rs)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Protocolo de auditoria:{' '}
                    <code className="font-mono">{c.protocolo_audit_id || '—'}</code>
                  </p>
                  {c.itens && c.itens.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produto</TableHead>
                            <TableHead className="text-xs text-right">Sistema</TableHead>
                            <TableHead className="text-xs text-right">Físico</TableHead>
                            <TableHead className="text-xs text-right">Diverg. (kg)</TableHead>
                            <TableHead className="text-xs text-right">Diverg. (R$)</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Justificativa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {c.itens.map((it: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium">{it.produto}</TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatNumber(it.saldo_sistema, 2)} {it.unidade_sistema}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatNumber(it.contagem_fisica, 2)} {it.unidade_contada}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {it.diferenca_qtd > 0 ? '+' : ''}
                                {formatNumber(it.diferenca_qtd, 2)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(it.diferenca_rs)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {it.dentro_tolerancia ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Divergente
                                  </Badge>
                                )}
                                {it.ajustado && (
                                  <Badge variant="outline" className="text-[10px] ml-1">
                                    Ajustado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                                {it.justificativa || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {c.status === 'pendente' && c.total_divergentes > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-primary text-primary hover:bg-primary/10"
                      onClick={() => handleAjustarEstoque(c.id)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Ajustar estoque pela contagem física
                    </Button>
                  )}
                </div>
              ))}
              {historico.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  Nenhuma conciliação registrada ainda. A primeira rodada aparecerá aqui após o
                  registro com a trilha de auditoria.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
