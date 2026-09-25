import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useRealtime } from '@/hooks/use-realtime'
import { getLots, LotRecord } from '@/services/lots'
import {
  getPesagens,
  createPesagem,
  deletePesagem,
  calculateGMD,
  calculateArrobasProduzidas,
  calculateGDC,
  PesagemRecord,
  PesagemInput,
} from '@/services/pesagens'
import { ScaleIntegrationModal, BatchWeightItem } from '@/components/ScaleIntegrationModal'
import { ScannerModal } from '@/components/ScannerModal'
import { LotPerformanceDrawer } from '@/components/LotPerformanceDrawer'
import { EditarMetaLoteModal } from '@/components/gmd/EditarMetaLoteModal'
import { CurvaPesoComparativa } from '@/components/CurvaPesoComparativa'
import { SemaforoGmdBadge } from '@/components/gmd/SemaforoGmdBadge'
import { calcularDesvioGMD, calcularSemaforoGMD, analisarLoteGMD } from '@/services/gmdAlertas'
import { formatWeight, formatNumber } from '@/lib/utils'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Scale,
  Plus,
  TrendingUp,
  Beef,
  Calendar,
  AlertTriangle,
  Filter,
  Trash2,
  Activity,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export default function Pesagens() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { isOnline, addAction } = useOffline()

  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [lots, setLots] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroLote, setFiltroLote] = useState<string>('all')
  const [filtroSetor, setFiltroSetor] = useState<string>('all')
  const [filtroSexo, setFiltroSexo] = useState<string>('all')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('all')
  const [filtroTipo, setFiltroTipo] = useState<string>('all')
  const [buscaTermo, setBuscaTermo] = useState<string>('')

  // Drawer de Desempenho e Modal de Meta
  const [drawerLoteId, setDrawerLoteId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loteParaMeta, setLoteParaMeta] = useState<LotRecord | null>(null)
  const [modalMetaOpen, setModalMetaOpen] = useState(false)

  // Estado do Modal de Nova Pesagem
  const [modalOpen, setModalOpen] = useState(false)
  const [tipoPesagem, setTipoPesagem] = useState<'lote' | 'individual'>('lote')
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string>('')
  const [dataPesagem, setDataPesagem] = useState<string>(new Date().toISOString().split('T')[0])
  const [pesoMedio, setPesoMedio] = useState<string>('')
  const [qtdAnimais, setQtdAnimais] = useState<string>('')
  const [pesoTotalManual, setPesoTotalManual] = useState<string>('')
  const [isParcial, setIsParcial] = useState(false)
  const [animalBrinco, setAnimalBrinco] = useState<string>('')
  const [ecc, setEcc] = useState<string>('3.5')
  const [origem, setOrigem] = useState<'manual' | 'balanca'>('manual')
  const [observacoes, setObservacoes] = useState<string>('')

  // Fechamento de Lote / Saída para Abate & Venda
  const [isSaidaAbate, setIsSaidaAbate] = useState(false)
  const [rendimentoCarcaca, setRendimentoCarcaca] = useState<string>('53.5')

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [lotsData, pesagensData] = await Promise.all([getLots(), getPesagens()])
      setLots(lotsData || [])
      setPesagens(pesagensData || [])
    } catch (err) {
      console.error('Erro ao carregar pesagens/lotes:', err)
      toast({
        title: 'Aviso de Conexão',
        description: 'Usando cache local ou verificando disponibilidade da rede.',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('pesagens', () => loadData())
  useRealtime('lots', () => loadData())

  // Obter lote atual selecionado no modal
  const activeModalLot = useMemo(
    () => lots.find((l) => l.id === loteSelecionadoId),
    [lots, loteSelecionadoId],
  )

  // Quando o lote muda no modal, inicializar contagem padrão de cabeças
  useEffect(() => {
    if (activeModalLot) {
      if (tipoPesagem === 'individual') {
        setQtdAnimais('1')
      } else {
        setQtdAnimais(String(activeModalLot.headcount || 1))
      }
    }
  }, [activeModalLot, tipoPesagem])

  // Pré-cálculo de GMD interativo no formulário para feedback imediato
  const gmdPreview = useMemo(() => {
    const pesoNum = parseFloat(pesoMedio)
    if (!loteSelecionadoId || !pesoNum || !dataPesagem) return null

    const historicoLote = pesagens.filter((p) => p.lote_id === loteSelecionadoId)
    return calculateGMD(pesoNum, dataPesagem, historicoLote)
  }, [pesoMedio, loteSelecionadoId, dataPesagem, pesagens])

  // Categorias únicas dos lotes para o filtro
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>()
    lots.forEach((l) => {
      if (l.category) cats.add(l.category)
    })
    return Array.from(cats)
  }, [lots])

  // Pesagens filtradas
  const pesagensFiltradas = useMemo(() => {
    return pesagens.filter((p) => {
      const lote = p.expand?.lote_id || lots.find((l) => l.id === p.lote_id)

      if (filtroLote !== 'all' && p.lote_id !== filtroLote) return false
      if (filtroTipo !== 'all' && p.tipo !== filtroTipo) return false
      if (filtroSetor !== 'all' && lote?.sector !== filtroSetor) return false
      if (filtroSexo !== 'all' && lote?.sex !== filtroSexo) return false
      if (filtroCategoria !== 'all' && lote?.category !== filtroCategoria) return false

      if (buscaTermo.trim()) {
        const query = buscaTermo.toLowerCase()
        const matchLote = lote?.name?.toLowerCase().includes(query)
        const matchAnimal = p.animal_id?.toLowerCase().includes(query)
        const matchResp = p.responsavel_id?.toLowerCase().includes(query)
        const matchObs = p.observacoes?.toLowerCase().includes(query)
        if (!matchLote && !matchAnimal && !matchResp && !matchObs) return false
      }

      return true
    })
  }, [pesagens, lots, filtroLote, filtroTipo, filtroSetor, filtroSexo, filtroCategoria, buscaTermo])

  // KPIs Resumo do período
  const kpis = useMemo(() => {
    const totalRegistros = pesagensFiltradas.length
    const totalAnimais = pesagensFiltradas.reduce((acc, curr) => acc + (curr.qtd_animais || 1), 0)
    const mediaPesoGeral =
      totalRegistros > 0
        ? pesagensFiltradas.reduce((acc, curr) => acc + (curr.peso_medio_kg || 0), 0) /
          totalRegistros
        : 0

    const validGmds = pesagensFiltradas
      .filter((p) => typeof p.gmd_intervalo === 'number' && p.gmd_intervalo > 0)
      .map((p) => p.gmd_intervalo!)

    const gmdMedioGeral =
      validGmds.length > 0 ? validGmds.reduce((a, b) => a + b, 0) / validGmds.length : 0

    return { totalRegistros, totalAnimais, mediaPesoGeral, gmdMedioGeral }
  }, [pesagensFiltradas])

  // Salvar nova pesagem
  const handleSavePesagem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loteSelecionadoId) {
      toast({
        title: 'Selecione o Lote',
        description: 'É obrigatório selecionar o lote da pesagem.',
        variant: 'destructive',
      })
      return
    }

    const todayStr = new Date().toISOString().split('T')[0]
    if (dataPesagem > todayStr) {
      toast({
        title: 'Data Inválida',
        description: 'Não é permitido registrar pesagens com data futura.',
        variant: 'destructive',
      })
      return
    }

    const pesoNum = parseFloat(pesoMedio)
    if (isNaN(pesoNum) || pesoNum <= 0) {
      toast({
        title: 'Peso Inválido',
        description: 'Informe um peso médio numérico válido em kg.',
        variant: 'destructive',
      })
      return
    }

    const qtdNum = tipoPesagem === 'individual' ? 1 : parseInt(qtdAnimais, 10)
    if (isNaN(qtdNum) || qtdNum <= 0) {
      toast({
        title: 'Qtd de Animais Obrigatória',
        description: 'Informe a quantidade de animais pesados.',
        variant: 'destructive',
      })
      return
    }

    if (isParcial && activeModalLot && qtdNum >= (activeModalLot.headcount || 0)) {
      toast({
        title: 'Pesagem Parcial',
        description: 'A quantidade de animais pesados na parcial deve ser menor que o lote total.',
        variant: 'destructive',
      })
      return
    }

    const rendimentoNum = isSaidaAbate ? parseFloat(rendimentoCarcaca) || 53.5 : undefined
    const pesoTotalCalc = pesoTotalManual
      ? parseFloat(pesoTotalManual)
      : Number((pesoNum * qtdNum).toFixed(2))

    const payload: PesagemInput = {
      data_pesagem: new Date(dataPesagem).toISOString(),
      lote_id: loteSelecionadoId,
      tipo: tipoPesagem,
      animal_id: tipoPesagem === 'individual' ? animalBrinco : undefined,
      qtd_animais: qtdNum,
      peso_medio_kg: pesoNum,
      peso_total_kg: pesoTotalCalc,
      ecc: ecc ? parseFloat(ecc) : undefined,
      responsavel_id: user.name,
      origem,
      observacoes: isSaidaAbate
        ? `Saída para abate/venda registrada. Rendimento carcaça: ${rendimentoNum}%. ${observacoes}`
        : observacoes,
      is_saida_abate: isSaidaAbate,
      rendimento_carcaca_pct: rendimentoNum,
    }

    try {
      if (isOnline) {
        await createPesagem(payload)
        toast({
          title: 'Pesagem Registrada',
          description: `Pesagem de ${pesoNum} kg gravada no banco real com GMD calculado.`,
        })
        loadData()
      } else {
        await addAction({
          type: 'REGISTER_PESAGEM',
          payload,
        })
        toast({
          title: 'Salvo Offline',
          description: 'Registro adicionado à fila local para sincronização assim que houver rede.',
        })
      }

      setModalOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Erro ao salvar pesagem:', err)
      toast({
        title: 'Erro no Registro',
        description: err?.message || 'Falha ao gravar pesagem.',
        variant: 'destructive',
      })
    }
  }

  // Importar lote de pesagens a partir da balança
  const handleBatchImport = async (items: BatchWeightItem[]) => {
    if (!loteSelecionadoId) {
      toast({
        title: 'Selecione o Lote Primeiro',
        description: 'Selecione o lote de destino antes de importar pesagens em lote.',
        variant: 'destructive',
      })
      return
    }

    let sucessos = 0
    for (const item of items) {
      const payload: PesagemInput = {
        data_pesagem: new Date(dataPesagem).toISOString(),
        lote_id: loteSelecionadoId,
        tipo: 'individual',
        animal_id: item.identificador,
        qtd_animais: 1,
        peso_medio_kg: item.peso,
        peso_total_kg: item.peso,
        ecc: item.ecc,
        responsavel_id: user.name,
        origem: 'balanca',
        observacoes: `Importação em lote de balança eletrônica.`,
      }

      try {
        if (isOnline) {
          await createPesagem(payload)
        } else {
          await addAction({ type: 'REGISTER_PESAGEM', payload })
        }
        sucessos++
      } catch (e) {
        console.error('Erro ao gravar item de lote da balança:', e)
      }
    }

    toast({
      title: 'Importação Concluída',
      description: `${sucessos} pesagens registradas para o lote selecionado.`,
    })
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este registro de pesagem?')) return
    try {
      await deletePesagem(id)
      toast({ title: 'Excluído', description: 'Registro de pesagem removido.' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' })
    }
  }

  const resetForm = () => {
    setPesoMedio('')
    setPesoTotalManual('')
    setAnimalBrinco('')
    setObservacoes('')
    setIsParcial(false)
    setIsSaidaAbate(false)
    setOrigem('manual')
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" /> Módulo de Pesagens
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão zootécnica de pesagens por lote e individuais, monitoramento de GMD e fechamento
            de arrobas (@) padrão Exagro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ScaleIntegrationModal
            animalId={activeModalLot ? activeModalLot.name : 'Curral Principal'}
            onSaveBatchWeights={handleBatchImport}
            triggerButton={
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4 text-blue-600" /> Balança (Importar Lote)
              </Button>
            }
          />

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova Pesagem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Scale className="h-5 w-5 text-primary" /> Registrar Pesagem
                </DialogTitle>
                <DialogDescription>
                  Informe os dados aferidos no curral ou importe diretamente da balança eletrônica.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSavePesagem} className="space-y-5 py-2">
                {/* Tipo de Pesagem */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={tipoPesagem === 'lote' ? 'default' : 'outline'}
                    className="h-11"
                    onClick={() => {
                      setTipoPesagem('lote')
                      if (activeModalLot) setQtdAnimais(String(activeModalLot.headcount || 1))
                    }}
                  >
                    <Beef className="h-4 w-4 mr-2" /> Pesagem por Lote
                  </Button>
                  <Button
                    type="button"
                    variant={tipoPesagem === 'individual' ? 'default' : 'outline'}
                    className="h-11"
                    onClick={() => {
                      setTipoPesagem('individual')
                      setQtdAnimais('1')
                    }}
                  >
                    <Activity className="h-4 w-4 mr-2" /> Pesagem Individual
                  </Button>
                </div>

                {/* Seleção do Lote e Data */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Lote *</Label>
                    <Select
                      value={loteSelecionadoId}
                      onValueChange={(val) => setLoteSelecionadoId(val)}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione o lote..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            {lot.name} ({lot.sector?.toUpperCase() || 'GERAL'}) •{' '}
                            {lot.headcount || 0} cab • Atual:{' '}
                            {lot.peso_medio_atual || lot.final_weight || 0} kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold">Data da Pesagem *</Label>
                    <Input
                      type="date"
                      value={dataPesagem}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDataPesagem(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Dados de entrada Exagro do lote selecionado */}
                {activeModalLot && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-muted-foreground block">Data Entrada:</span>
                      <span className="font-semibold">
                        {activeModalLot.data_entrada || activeModalLot.entry_date
                          ? format(
                              parseISO(activeModalLot.data_entrada || activeModalLot.entry_date),
                              'dd/MM/yyyy',
                            )
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Permanência:</span>
                      <span className="font-semibold">
                        {activeModalLot.data_entrada || activeModalLot.entry_date
                          ? `${differenceInDays(new Date(), parseISO(activeModalLot.data_entrada || activeModalLot.entry_date))} dias`
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Peso Entrada:</span>
                      <span className="font-semibold">
                        {activeModalLot.peso_entrada_medio || activeModalLot.initial_weight || 0} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Pasto Atual:</span>
                      <span className="font-semibold">
                        {activeModalLot.pasto_atual || 'Pasto 01'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Campos Específicos de Individual */}
                {tipoPesagem === 'individual' && (
                  <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-xl bg-muted/20">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold">Brinco / RFID *</Label>
                        <ScannerModal />
                      </div>
                      <Input
                        placeholder="Ex: TAG-1234"
                        value={animalBrinco}
                        onChange={(e) => setAnimalBrinco(e.target.value)}
                        required
                        className="h-11 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-semibold">ECC - Escore Corporal (1 a 5)</Label>
                      <Select value={ecc} onValueChange={setEcc}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1.0 - Muito Magro</SelectItem>
                          <SelectItem value="2">2.0 - Magro</SelectItem>
                          <SelectItem value="3">3.0 - Regular</SelectItem>
                          <SelectItem value="3.5">3.5 - Bom (Adequado)</SelectItem>
                          <SelectItem value="4">4.0 - Muito Bom / Gordo</SelectItem>
                          <SelectItem value="5">5.0 - Obeso / Acabamento Superior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Pesagem por Lote: Parcial ou Total */}
                {tipoPesagem === 'lote' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div>
                        <Label className="font-semibold cursor-pointer">
                          Pesagem Parcial do Lote
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Ative se estiver pesando apenas uma amostragem/categoria do lote
                        </p>
                      </div>
                      <Switch checked={isParcial} onCheckedChange={setIsParcial} />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-semibold">
                          {isParcial
                            ? 'Nº de Animais Pesados (Obrigatório) *'
                            : 'Total de Cabeças Pesadas *'}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={qtdAnimais}
                          onChange={(e) => setQtdAnimais(e.target.value)}
                          required
                          className="h-11 font-mono text-base"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-semibold">Origem da Pesagem</Label>
                        <Select value={origem} onValueChange={(val: any) => setOrigem(val)}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Digitação Manual</SelectItem>
                            <SelectItem value="balanca">
                              Balança Integrada (Tru-Test/Coimma)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pesos e Captura de Balança */}
                <div className="p-4 border rounded-xl bg-card space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-bold">
                      {tipoPesagem === 'individual'
                        ? 'Peso do Animal (kg) *'
                        : 'Peso Médio por Cabeça (kg) *'}
                    </Label>
                    <ScaleIntegrationModal
                      animalId={activeModalLot ? activeModalLot.name : 'Lote'}
                      onSaveWeight={(w) => {
                        setPesoMedio(w)
                        setOrigem('balanca')
                      }}
                    />
                  </div>

                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 485.5"
                    value={pesoMedio}
                    onChange={(e) => setPesoMedio(e.target.value)}
                    required
                    className="h-16 text-3xl font-bold text-center font-mono"
                  />

                  {/* Detalhes calculados em tempo real */}
                  {pesoMedio && parseFloat(pesoMedio) > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
                      <div className="bg-muted/40 p-2 rounded">
                        <span className="text-muted-foreground block">Peso Total Estimado:</span>
                        <span className="font-semibold text-foreground text-sm">
                          {formatWeight(
                            parseFloat(pesoMedio) * (parseInt(qtdAnimais, 10) || 1),
                            'kg',
                          )}
                        </span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded">
                        <span className="text-muted-foreground block">Em Arrobas (@):</span>
                        <span className="font-semibold text-primary text-sm">
                          {(parseFloat(pesoMedio) / 30).toFixed(2)} @ (PV) / cab
                        </span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block">
                          GMD Real vs Meta (
                          {((activeModalLot?.gmd_alvo_g_dia || 900) > 10
                            ? (activeModalLot?.gmd_alvo_g_dia || 900) / 1000
                            : activeModalLot?.gmd_alvo_g_dia || 0.9
                          ).toFixed(2)}{' '}
                          kg/dia):
                        </span>
                        <span className="font-semibold text-emerald-600 text-sm flex items-center gap-1.5">
                          {gmdPreview?.gmd !== null && gmdPreview?.gmd !== undefined
                            ? `${gmdPreview.gmd.toFixed(2)} kg/dia (${calcularDesvioGMD(gmdPreview.gmd, (activeModalLot?.gmd_alvo_g_dia || 900) > 10 ? (activeModalLot?.gmd_alvo_g_dia || 900) / 1000 : activeModalLot?.gmd_alvo_g_dia || 0.9)}%)`
                            : 'Primeira pesagem'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Warning de intervalo de dias */}
                  {gmdPreview?.warning && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-2.5 rounded-lg border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>{gmdPreview.warning}</span>
                    </div>
                  )}
                </div>

                {/* Fechamento de Lote / Saída para Abate & Venda */}
                <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-base cursor-pointer">
                        Registro de Saída para Abate / Venda
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Fecha o ciclo do lote, capturando peso de embarque e rendimento de carcaça.
                      </p>
                    </div>
                    <Switch checked={isSaidaAbate} onCheckedChange={setIsSaidaAbate} />
                  </div>

                  {isSaidaAbate && (
                    <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Rendimento de Carcaça (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={rendimentoCarcaca}
                          onChange={(e) => setRendimentoCarcaca(e.target.value)}
                          placeholder="Ex: 54.0"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Peso de Carcaça Est. (@)</Label>
                        <div className="h-10 px-3 flex items-center bg-background rounded-md border font-mono font-bold text-emerald-600">
                          {pesoMedio
                            ? `${(
                                (parseFloat(pesoMedio) * (parseFloat(rendimentoCarcaca) || 53.5)) /
                                100 /
                                15
                              ).toFixed(2)} @`
                            : '-'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">GDC (Ganho Carcaça)</Label>
                        <div className="h-10 px-3 flex items-center bg-background rounded-md border font-mono font-bold text-primary">
                          {gmdPreview?.gmd
                            ? `${calculateGDC(gmdPreview.gmd, parseFloat(rendimentoCarcaca) || 53.5)} kg/d`
                            : '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label>Observações do Curral</Label>
                  <Input
                    placeholder="Ex: Lote muito dócil, boa conversão alimentar, pasto limpo..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base shadow-md">
                  Gravar Pesagem no Banco {isOnline ? 'Online' : '(Fila Offline)'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Abas Principais do Módulo de Pesagens: Histórico e Curva Comparativa */}
      <Tabs defaultValue="historico" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 h-auto p-1 bg-muted/70">
          <TabsTrigger
            value="historico"
            className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5"
          >
            <Scale className="h-4 w-4" /> Histórico & Lançamentos
          </TabsTrigger>
          <TabsTrigger
            value="curva_comparativa"
            className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5"
          >
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Curva de Peso Comparativa
            (Multi-lotes)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curva_comparativa" className="mt-0">
          <CurvaPesoComparativa
            lots={lots}
            pesagens={pesagens}
            onOpenLotDetails={(id) => {
              setDrawerLoteId(id)
              setDrawerOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="historico" className="space-y-6 mt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  Total de Pesagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{kpis.totalRegistros}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.totalAnimais} cabeças processadas no filtro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Peso Médio Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-1.5">
                  <Scale className="h-6 w-6 text-muted-foreground" />
                  {kpis.mediaPesoGeral > 0 ? `${kpis.mediaPesoGeral.toFixed(1)} kg` : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{(kpis.mediaPesoGeral / 30).toFixed(1)} @ (PV) por cabeça
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  GMD Médio Ponderado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 flex items-center gap-1.5">
                  <TrendingUp className="h-6 w-6" />
                  {kpis.gmdMedioGeral > 0 ? `${kpis.gmdMedioGeral.toFixed(3)} kg/d` : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ganho Médio Diário aferido</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lotes Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {lots.filter((l) => l.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Monitorados com dados reais</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Filtros */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Filter className="h-4 w-4" /> Filtros e Busca de Histórico
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lote, brinco, operador..."
                    className="pl-9 h-10"
                    value={buscaTermo}
                    onChange={(e) => setBuscaTermo(e.target.value)}
                  />
                </div>

                <div>
                  <Select value={filtroLote} onValueChange={setFiltroLote}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Lote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Lotes</SelectItem>
                      {lots.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Setores</SelectItem>
                      <SelectItem value="cria">Cria</SelectItem>
                      <SelectItem value="recria">Recria</SelectItem>
                      <SelectItem value="engorda">Engorda</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={filtroSexo} onValueChange={setFiltroSexo}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ambos os Sexos</SelectItem>
                      <SelectItem value="macho">Machos</SelectItem>
                      <SelectItem value="femea">Fêmeas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {categoriasDisponiveis.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela do Histórico de Pesagens */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle>Histórico de Pesagens Zootécnicas</CardTitle>
                <CardDescription>
                  Registros com peso médio, variação em kg e @, GMD do intervalo e dias decorridos
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {pesagensFiltradas.length} registro(s)
              </Badge>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Animais</TableHead>
                      <TableHead className="text-right">Peso Médio</TableHead>
                      <TableHead className="text-right">Var. (kg / @)</TableHead>
                      <TableHead className="text-right">Dias Interv.</TableHead>
                      <TableHead className="text-right">GMD Interv.</TableHead>
                      <TableHead className="text-right">GDC Carcaça</TableHead>
                      <TableHead className="text-right">Desvio vs Meta</TableHead>
                      <TableHead>Semáforo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pesagensFiltradas.map((pesagem) => {
                      const lote =
                        pesagem.expand?.lote_id || lots.find((l) => l.id === pesagem.lote_id)
                      const metaG = lote?.gmd_alvo_g_dia || 900
                      const metaKg = metaG / 1000
                      const gmd = pesagem.gmd_intervalo
                      const desvio =
                        typeof gmd === 'number' && gmd > 0 ? calcularDesvioGMD(gmd, metaKg) : null
                      const semaforo = calcularSemaforoGMD(desvio, null)
                      const rendimento = lote?.rendimento_carcaca_pct || 0
                      const gdc =
                        typeof gmd === 'number' && gmd > 0 && rendimento > 0
                          ? Number((gmd * (rendimento / 100)).toFixed(3))
                          : null

                      const variacaoKg =
                        pesagem.peso_anterior_kg !== undefined && pesagem.peso_anterior_kg !== null
                          ? Number((pesagem.peso_medio_kg - pesagem.peso_anterior_kg).toFixed(1))
                          : null
                      // Arroba de peso vivo = 30 kg
                      const variacaoArr = variacaoKg !== null ? (variacaoKg / 30).toFixed(2) : null

                      return (
                        <TableRow key={pesagem.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="whitespace-nowrap font-medium">
                            {pesagem.data_pesagem
                              ? format(parseISO(pesagem.data_pesagem), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => {
                                  if (lote) {
                                    setDrawerLoteId(lote.id)
                                    setDrawerOpen(true)
                                  }
                                }}
                                className="font-semibold text-primary hover:underline text-left"
                              >
                                {lote?.name || 'Lote Não Identificado'}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {lote?.category || lote?.sector || ''} • Meta: {metaG} g/d
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={pesagem.tipo === 'individual' ? 'outline' : 'secondary'}
                              className="text-[11px]"
                            >
                              {pesagem.tipo === 'individual'
                                ? `Individual (${pesagem.animal_id || '-'})`
                                : 'Lote'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {pesagem.qtd_animais}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-bold text-foreground">
                            {pesagem.peso_medio_kg.toFixed(1)} kg
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {variacaoKg !== null ? (
                              <span
                                className={
                                  variacaoKg >= 0
                                    ? 'text-emerald-600 font-semibold'
                                    : 'text-destructive font-semibold'
                                }
                              >
                                {variacaoKg >= 0 ? `+${variacaoKg} kg` : `${variacaoKg} kg`}{' '}
                                <span className="text-xs text-muted-foreground">
                                  ({variacaoArr} @)
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {pesagem.dias_intervalo ? `${pesagem.dias_intervalo} d` : '-'}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-mono">
                            {pesagem.gmd_intervalo !== undefined &&
                            pesagem.gmd_intervalo !== null ? (
                              <Badge
                                variant={pesagem.gmd_intervalo > 0 ? 'default' : 'secondary'}
                                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                              >
                                {pesagem.gmd_intervalo.toFixed(3)} kg/d
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Inicial</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-mono text-xs">
                            {gdc ? (
                              <span className="text-purple-600 font-semibold">
                                {Math.round(gdc * 1000)} g/d
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-mono text-xs font-semibold">
                            {desvio !== null ? (
                              <span
                                className={
                                  desvio >= -10
                                    ? 'text-emerald-600'
                                    : desvio >= -20
                                      ? 'text-amber-600'
                                      : 'text-destructive'
                                }
                              >
                                {desvio > 0 ? `+${desvio}%` : `${desvio}%`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SemaforoGmdBadge status={semaforo} desvioPct={desvio} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                pesagem.origem === 'balanca'
                                  ? 'text-blue-600 border-blue-200 bg-blue-50/50'
                                  : 'text-muted-foreground'
                              }
                            >
                              {pesagem.origem === 'balanca' ? 'Balança' : 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  if (lote) {
                                    setDrawerLoteId(lote.id)
                                    setDrawerOpen(true)
                                  }
                                }}
                                title="Ver Desempenho / Gráfico"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(pesagem.id)}
                                title="Excluir pesagem"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {pesagensFiltradas.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                          Nenhuma pesagem encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawer de Desempenho do Lote */}
      <LotPerformanceDrawer loteId={drawerLoteId} open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Modal de Configuração de Meta do Lote */}
      <EditarMetaLoteModal
        lote={loteParaMeta}
        open={modalMetaOpen}
        onOpenChange={setModalMetaOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
