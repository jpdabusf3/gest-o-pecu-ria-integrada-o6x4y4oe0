import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Sparkles, Trophy, Save, RotateCcw, AlertCircle } from 'lucide-react'
import {
  getConfigBenchmarks,
  updateConfigBenchmark,
  registrarRecalibracaoBenchmark,
  ConfigBenchmarkRecord,
  DEFAULT_BENCHMARKS,
} from '@/services/configBenchmark'
import { useToast } from '@/hooks/use-toast'

export function BenchmarkingConfigTab() {
  const { toast } = useToast()
  const [benchmarks, setBenchmarks] = useState<ConfigBenchmarkRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        valor_media: number
        valor_referencia: number
        valor_top: number
        alvo_fazenda: number
      }
    >
  >({})

  const carregar = async () => {
    try {
      setLoading(true)
      const data = await getConfigBenchmarks()
      setBenchmarks(data)
      const initialEdits: Record<string, any> = {}
      data.forEach((b) => {
        initialEdits[b.id] = {
          valor_media: b.valor_media,
          valor_referencia: b.valor_referencia,
          valor_top: b.valor_top,
          alvo_fazenda: b.alvo_fazenda,
        }
      })
      setEdits(initialEdits)
    } catch (err) {
      console.error('Erro ao carregar benchmarking:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleChange = (
    id: string,
    field: 'valor_media' | 'valor_referencia' | 'valor_top' | 'alvo_fazenda',
    val: string,
  ) => {
    const num = parseFloat(val)
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: isNaN(num) ? 0 : num,
      },
    }))
  }

  const handleSalvarItem = async (b: ConfigBenchmarkRecord) => {
    const currentEdit = edits[b.id]
    if (!currentEdit) return

    try {
      setSavingId(b.id)
      await updateConfigBenchmark(b.id, {
        ...currentEdit,
        data_ultima_recalibracao: new Date().toISOString(),
        recalibracao_adiada_ate: '',
      })
      toast({
        title: 'Benchmark e Calibração Atualizados',
        description: `Indicador "${b.indicador}" salvo e recalibração registrada para a safra atual.`,
      })
      carregar()
    } catch (err: any) {
      console.error('Erro ao salvar benchmark:', err)
      toast({
        title: 'Erro ao Salvar',
        description: err?.message || 'Falha ao salvar calibração de benchmark.',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleRestaurarPadrao = (b: ConfigBenchmarkRecord) => {
    const padrao = DEFAULT_BENCHMARKS[b.codigo]
    if (!padrao) return
    setEdits((prev) => ({
      ...prev,
      [b.id]: {
        valor_media: padrao.valor_media,
        valor_referencia: padrao.valor_referencia,
        valor_top: padrao.valor_top,
        alvo_fazenda: padrao.alvo_fazenda,
      },
    }))
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-xl">Benchmarking Exagro & Metas da Fazenda</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Coleção editável <code className="text-xs font-mono">config_benchmark</code>:
              recalibre anualmente as faixas Média, Fazenda de Referência, TOP Brasil e o Alvo da
              Fazenda.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  setLoading(true)
                  await registrarRecalibracaoBenchmark(benchmarks)
                  toast({
                    title: 'Recalibração Anual Registrada',
                    description: 'Todas as metas foram marcadas como recalibradas na data de hoje.',
                  })
                  await carregar()
                } catch (e: any) {
                  toast({
                    title: 'Erro',
                    description: e?.message || 'Falha ao registrar recalibração.',
                    variant: 'destructive',
                  })
                } finally {
                  setLoading(false)
                }
              }}
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              <Trophy className="w-3.5 h-3.5" />
              Registrar Recalibração de Toda a Grade
            </Button>
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
              Metodologia Exagro MT / TIP
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-2 sm:px-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Regra de Unidades:</strong> O GMD é sempre calibrado e armazenado em{' '}
            <strong>kg/dia</strong> (ex: 1,30 kg/dia para Engorda/TIP e 0,50 kg/dia para Recria). A
            Cria não tem GMD obrigatório e é avaliada por taxa de desmame e kg bezerro/matriz.
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Indicador</TableHead>
                <TableHead className="w-24">Unidade</TableHead>
                <TableHead className="w-28 text-right">Média Exagro</TableHead>
                <TableHead className="w-28 text-right">Referência</TableHead>
                <TableHead className="w-28 text-right">TOP Brasil</TableHead>
                <TableHead className="w-32 text-right">Alvo da Fazenda</TableHead>
                <TableHead className="w-28 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((b) => {
                const edit = edits[b.id] || {
                  valor_media: b.valor_media,
                  valor_referencia: b.valor_referencia,
                  valor_top: b.valor_top,
                  alvo_fazenda: b.alvo_fazenda,
                }
                const isSaving = savingId === b.id

                return (
                  <TableRow key={b.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">{b.indicador}</div>
                      {b.observacao && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 max-w-sm truncate">
                          {b.observacao}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {b.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={edit.valor_media}
                        onChange={(e) => handleChange(b.id, 'valor_media', e.target.value)}
                        className="h-8 text-right font-mono text-xs w-24 ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={edit.valor_referencia}
                        onChange={(e) => handleChange(b.id, 'valor_referencia', e.target.value)}
                        className="h-8 text-right font-mono text-xs w-24 ml-auto font-medium"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={edit.valor_top}
                        onChange={(e) => handleChange(b.id, 'valor_top', e.target.value)}
                        className="h-8 text-right font-mono text-xs w-24 ml-auto text-purple-600 font-semibold"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={edit.alvo_fazenda}
                        onChange={(e) => handleChange(b.id, 'alvo_fazenda', e.target.value)}
                        className="h-8 text-right font-mono text-xs w-28 ml-auto font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Restaurar padrão Exagro original"
                          onClick={() => handleRestaurarPadrao(b)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={isSaving}
                          onClick={() => handleSalvarItem(b)}
                        >
                          <Save className="w-3 h-3" />
                          {isSaving ? '...' : 'Salvar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {benchmarks.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum indicador de benchmark carregado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
