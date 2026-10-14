import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useFarm } from '@/contexts/FarmContext'
import { ModalCadastroRebanho } from '@/components/rebanho/ModalCadastroRebanho'
import {
  getPastosRebanho,
  getLotesRebanho,
  getAnimaisIndividuais,
  getMovimentacoesPasto,
  atualizarLoteRebanho,
  atualizarAnimalIndividual,
  mudarStatusLote,
  mudarStatusAnimalIndividual,
  transferirParaPasto,
  calcularConsistencia,
  resumoRebanho,
  FAIXA_PESO_CATEGORIA,
  CATEGORIAS_LABEL,
  FASE_LABEL,
  STATUS_LABEL,
  StatusRebanho,
  PastoRebanhoRecord,
  LoteRebanhoRecord,
  AnimalIndividualRecord,
  MovimentacaoPastoRecord,
  ContagemPorPasto,
  ConsistenciaRebanho,
} from '@/services/rebanho'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Beef,
  MapPin,
  Layers,
  ClipboardList,
  ArrowRightLeft,
  Pencil,
  Ban,
  RefreshCw,
  TriangleAlert,
  TrendingUp,
  Users,
  FileSpreadsheet,
} from 'lucide-react'

const KG_POR_ARROBA_VIVA = 30

export default function Rebanho() {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { reloadLots } = useFarm()

  const [pastos, setPastos] = useState<PastoRebanhoRecord[]>([])
  const [lotes, setLotes] = useState<LoteRebanhoRecord[]>([])
  const [animais, setAnimais] = useState<AnimalIndividualRecord[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoPastoRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCadastroOpen, setModalCadastroOpen] = useState(false)
  const [pastoCadastro, setPastoCadastro] = useState<string | undefined>(undefined)
  const [rebanhoEsperado, setRebanhoEsperado] = useState('')

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroSexo, setFiltroSexo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('ativo')

  // Transferência
  const [transfTipo, setTransfTipo] = useState<'lote' | 'animal' | null>(null)
  const [transfId, setTransfId] = useState<string | null>(null)
  const [transfNome, setTransfNome] = useState('')
  const [transfQtd, setTransfQtd] = useState(1)
  const [transfDestino, setTransfDestino] = useState('')
  const [transfMotivo, setTransfMotivo] = useState('')
  const [transfOpen, setTransfOpen] = useState(false)

  // Edição
  const [editTipo, setEditTipo] = useState<'lote' | 'animal' | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editCampos, setEditCampos] = useState<{
    nome?: string
    qtd?: string
    peso?: string
    pasto?: string
    ecc?: string
    obs?: string
  }>({})

  // Status
  const [statusTipo, setStatusTipo] = useState<'lote' | 'animal' | null>(null)
  const [statusId, setStatusId] = useState<string | null>(null)
  const [statusNome, setStatusNome] = useState('')
  const [statusNovo, setStatusNovo] = useState<StatusRebanho>('inativo')
  const [statusOpen, setStatusOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [p, l, a, m] = await Promise.all([
        getPastosRebanho(),
        getLotesRebanho(),
        getAnimaisIndividuais(),
        getMovimentacoesPasto(),
      ])
      setPastos(p)
      setLotes(l)
      setAnimais(a)
      setMovimentacoes(m)
    } catch (e) {
      console.warn('Erro ao carregar rebanho:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const consistencia: ConsistenciaRebanho = useMemo(
    () => calcularConsistencia(pastos, lotes, animais, parseInt(rebanhoEsperado, 10) || 0),
    [pastos, lotes, animais, rebanhoEsperado],
  )

  const resumo = useMemo(() => resumoRebanho(lotes, animais), [lotes, animais])

  // ---------- Filtros ----------
  const lotesFiltrados = useMemo(
    () =>
      lotes.filter((l) => {
        if (filtroStatus === 'ativo' && l.status !== 'active') return false
        if (filtroStatus !== 'ativo' && filtroStatus !== 'todos' && l.status !== filtroStatus)
          return false
        if (filtroSexo !== 'todos' && l.sex !== filtroSexo) return false
        if (filtroCategoria !== 'todas' && l.category !== filtroCategoria) return false
        return true
      }),
    [lotes, filtroCategoria, filtroSexo, filtroStatus],
  )

  const animaisFiltrados = useMemo(
    () =>
      animais.filter((a) => {
        if (filtroStatus === 'ativo' && a.status !== 'ativo') return false
        if (
          filtroStatus !== 'ativo' &&
          filtroStatus !== 'todos' &&
          a.status !== (filtroStatus as StatusRebanho)
        )
          return false
        if (filtroSexo !== 'todos' && a.sexo !== filtroSexo) return false
        if (filtroCategoria !== 'todas' && CATEGORIAS_LABEL[a.categoria] !== filtroCategoria)
          return false
        return true
      }),
    [animais, filtroCategoria, filtroSexo, filtroStatus],
  )

  // ---------- Ações ----------
  const abrirTransferencia = (
    tipo: 'lote' | 'animal',
    item: LoteRebanhoRecord | AnimalIndividualRecord,
  ) => {
    setTransfTipo(tipo)
    setTransfId(item.id)
    setTransfNome(
      tipo === 'lote' ? (item as LoteRebanhoRecord).name : (item as AnimalIndividualRecord).brinco,
    )
    setTransfQtd(tipo === 'lote' ? (item as LoteRebanhoRecord).headcount || 1 : 1)
    const origem =
      tipo === 'lote'
        ? (item as LoteRebanhoRecord).pasto_atual_id
        : (item as AnimalIndividualRecord).pasto_atual_id
    setTransfDestino(origem ? '' : pastos[0]?.id || '')
    setTransfMotivo('')
    setTransfOpen(true)
  }

  const confirmarTransferencia = async () => {
    if (!transfTipo || !transfId || !transfDestino) return
    const destino = pastos.find((p) => p.id === transfDestino)
    const origemId =
      transfTipo === 'lote'
        ? lotes.find((l) => l.id === transfId)?.pasto_atual_id
        : animais.find((a) => a.id === transfId)?.pasto_atual_id
    const origem = pastos.find((p) => p.id === origemId)
    if (!destino || !origem) {
      toast({
        title: 'Selecione o pasto de destino',
        variant: 'destructive',
      })
      return
    }
    if (origem.id === destino.id) {
      toast({
        title: 'Pasto de destino igual ao atual',
        description: 'Escolha um pasto diferente da localização atual.',
        variant: 'destructive',
      })
      return
    }
    try {
      await transferirParaPasto({
        tipo: transfTipo,
        registroId: transfId,
        nomeRegistro: transfNome,
        qtdCabecas: transfQtd,
        pastoOrigemId: origem.id,
        pastoOrigemNome: origem.nome,
        pastoDestinoId: destino.id,
        pastoDestinoNome: destino.nome,
        data: new Date().toISOString(),
        motivo: transfMotivo,
        usuarioId: user.id,
        usuarioNome: user.name,
        perfil: user.role,
      })
      toast({
        title: 'Transferência registrada',
        description: `${transfNome}: ${origem.nome} → ${destino.nome}.`,
      })
      setTransfOpen(false)
      loadData()
    } catch (e) {
      toast({
        title: 'Erro na transferência',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const abrirEdicao = (
    tipo: 'lote' | 'animal',
    item: LoteRebanhoRecord | AnimalIndividualRecord,
  ) => {
    setEditTipo(tipo)
    setEditId(item.id)
    if (tipo === 'lote') {
      const l = item as LoteRebanhoRecord
      setEditCampos({
        nome: l.name,
        qtd: String(l.headcount ?? 1),
        peso: String(l.peso_medio_atual ?? ''),
        pasto: l.pasto_atual_id || '',
      })
    } else {
      const a = item as AnimalIndividualRecord
      setEditCampos({
        peso: String(a.peso_kg ?? ''),
        ecc: a.ecc ? String(a.ecc) : '',
        obs: a.observacoes || '',
        pasto: a.pasto_atual_id || '',
      })
    }
    setEditOpen(true)
  }

  const confirmarEdicao = async () => {
    if (!editTipo || !editId) return
    try {
      const antes =
        editTipo === 'lote'
          ? lotes.find((l) => l.id === editId)
          : animais.find((a) => a.id === editId)
      const novoPasto = pastos.find((p) => p.id === editCampos.pasto)

      if (editTipo === 'lote') {
        const qtd = editCampos.qtd ? parseInt(editCampos.qtd, 10) : undefined
        const peso = editCampos.peso ? parseFloat(editCampos.peso) : undefined
        const mudouPasto =
          novoPasto && antes && (antes as LoteRebanhoRecord).pasto_atual_id !== novoPasto.id

        if (mudouPasto && novoPasto && antes) {
          // Mudança de pasto pela edição vai pelo caminho oficial (movimentação + auditoria)
          await transferirParaPasto({
            tipo: 'lote',
            registroId: editId,
            nomeRegistro: editCampos.nome || (antes as LoteRebanhoRecord).name,
            qtdCabecas: qtd ?? (antes as LoteRebanhoRecord).headcount,
            pastoOrigemId: (antes as LoteRebanhoRecord).pasto_atual_id || '',
            pastoOrigemNome: (antes as LoteRebanhoRecord).pasto_atual || '',
            pastoDestinoId: novoPasto.id,
            pastoDestinoNome: novoPasto.nome,
            data: new Date().toISOString(),
            motivo: 'Correção de cadastro',
            usuarioId: user.id,
            usuarioNome: user.name,
            perfil: user.role,
          })
        }
        await atualizarLoteRebanho(editId, {
          name: editCampos.nome?.trim(),
          headcount: qtd,
          peso_medio_kg: peso,
          fase: undefined,
        })
      } else {
        const antesAnimal = antes as AnimalIndividualRecord | undefined
        const mudouPastoAnimal =
          novoPasto && antesAnimal && antesAnimal.pasto_atual_id !== novoPasto.id

        if (mudouPastoAnimal && novoPasto && antesAnimal) {
          // Mudança de pasto pela edição vai pelo caminho oficial (movimentação + auditoria)
          await transferirParaPasto({
            tipo: 'animal',
            registroId: editId,
            nomeRegistro: antesAnimal.brinco,
            qtdCabecas: 1,
            pastoOrigemId: antesAnimal.pasto_atual_id || '',
            pastoOrigemNome: pastos.find((p) => p.id === antesAnimal.pasto_atual_id)?.nome || '',
            pastoDestinoId: novoPasto.id,
            pastoDestinoNome: novoPasto.nome,
            data: new Date().toISOString(),
            motivo: 'Correção de cadastro',
            usuarioId: user.id,
            usuarioNome: user.name,
            perfil: user.role,
          })
        }
        await atualizarAnimalIndividual(editId, {
          peso_kg: editCampos.peso ? parseFloat(editCampos.peso) : undefined,
          ecc: editCampos.ecc ? parseFloat(editCampos.ecc) : undefined,
          observacoes: editCampos.obs,
          // quando a mudança de pasto passou pela transferência oficial,
          // a localização já foi gravada por ela
          pasto_atual_id: mudouPastoAnimal ? undefined : editCampos.pasto || undefined,
        })
      }

      // Trilha append-only: correção gera NOVO evento, nunca apaga o original
      await import('@/services/rebanho').then((m) =>
        m.auditarRebanho({
          tipo_evento: 'correcao',
          payload_antes: antes
            ? editTipo === 'lote'
              ? {
                  name: (antes as LoteRebanhoRecord).name,
                  headcount: (antes as LoteRebanhoRecord).headcount,
                  peso_medio_atual: (antes as LoteRebanhoRecord).peso_medio_atual,
                  pasto_atual_id: (antes as LoteRebanhoRecord).pasto_atual_id,
                }
              : {
                  peso_kg: (antes as AnimalIndividualRecord).peso_kg,
                  ecc: (antes as AnimalIndividualRecord).ecc,
                  observacoes: (antes as AnimalIndividualRecord).observacoes,
                  pasto_atual_id: (antes as AnimalIndividualRecord).pasto_atual_id,
                }
            : undefined,
          payload_depois: editCampos as Record<string, unknown>,
          referencia_tipo: editTipo === 'lote' ? 'lote' : 'animal',
          referencia_id: editId,
          pasto_id: editCampos.pasto || '',
          motivo: 'Correção de registro do rebanho',
        }),
      )

      // Os lotes alimentam o dashboard/pesagens/fechamento — recarrega o contexto
      reloadLots().catch(() => {})
      toast({
        title: 'Registro corrigido',
        description: 'A correção foi gravada na trilha de auditoria.',
      })
      setEditOpen(false)
      loadData()
    } catch (e) {
      toast({
        title: 'Erro ao corrigir',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }
  const confirmarMudancaStatus = async () => {
    if (!statusTipo || !statusId) return
    try {
      if (statusTipo === 'lote') {
        await mudarStatusLote(
          statusId,
          statusNovo === 'ativo'
            ? 'active'
            : statusNovo === 'vendido'
              ? 'sold'
              : statusNovo === 'morto'
                ? 'abated'
                : 'inativo',
        )
      } else {
        await mudarStatusAnimalIndividual(statusId, statusNovo)
      }
      toast({
        title: `Registro marcado como ${STATUS_LABEL[statusNovo].toLowerCase()}`,
        description:
          statusNovo === 'ativo'
            ? 'O registro voltou a contar na lotação do pasto.'
            : 'O registro saiu da contagem atual, mas permanece no histórico.',
      })
      setStatusOpen(false)
      loadData()
    } catch (e) {
      toast({
        title: 'Erro ao alterar status',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const totalCabeças = consistencia.totalFazenda
  const pesoTotalKg = useMemo(() => {
    const pesoLotes = lotes
      .filter((l) => l.status === 'active')
      .reduce((acc, l) => acc + (l.headcount || 0) * (l.peso_medio_atual || 0), 0)
    const pesoAnimais = animais
      .filter((a) => a.status === 'ativo')
      .reduce((acc, a) => acc + (a.peso_kg || 0), 0)
    return pesoLotes + pesoAnimais
  }, [lotes, animais])

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    lotes.forEach((l) => l.category && set.add(l.category))
    animais.forEach((a) => set.add(CATEGORIAS_LABEL[a.categoria]))
    return Array.from(set).sort()
  }, [lotes, animais])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rebanho Atual</h1>
          <p className="text-muted-foreground mt-1">
            Registro do rebanho real por pasto — lotes e animais individuais, com validação de
            consistência.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground"
            onClick={() => {
              setPastoCadastro(undefined)
              setModalCadastroOpen(true)
            }}
          >
            <ClipboardList className="h-4 w-4" /> Registrar rebanho atual
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate('/maestro')}
          >
            <FileSpreadsheet className="h-4 w-4" /> Importar planilha (Chicão)
          </Button>
        </div>
      </div>
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de cabeças ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{totalCabeças}</div>
            {consistencia.totalEsperado > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {consistencia.faltam > 0
                  ? `Faltam ${consistencia.faltam} do rebanho informado (${consistencia.totalEsperado}).`
                  : consistencia.excedem > 0
                    ? `${consistencia.excedem} cabeça(s) acima do informado.`
                    : 'Rebanho informado completamente registrado.'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Peso total (vivo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{(pesoTotalKg / 1000).toFixed(1)} t</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ≈ {Math.round(pesoTotalKg / KG_POR_ARROBA_VIVA)} @ de peso vivo (1 @ = 30 kg)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Machos / Fêmeas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {resumo.porSexo.machos} <span className="text-muted-foreground text-sm">/</span>{' '}
              {resumo.porSexo.femeas}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {lotes.filter((l) => l.status === 'active').length} lote(s) •{' '}
              {animais.filter((a) => a.status === 'ativo').length} animal(is) identificado(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pastos ocupados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {consistencia.porPasto.filter((p) => p.cabecasAtivas > 0).length}
              <span className="text-muted-foreground text-sm"> / {pastos.length}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {consistencia.porPasto.filter((p) => p.acimaCapacidade).length} acima da capacidade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progresso do registro vs rebanho informado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Consistência do cadastro
          </CardTitle>
          <CardDescription>
            Informe o total de cabeças que o rebanho da fazenda tem — o sistema compara com o que já
            está registrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="space-y-1.5 w-full sm:w-48">
            <Label htmlFor="rebanho-esperado" className="text-xs">
              Rebanho informado (cabeças)
            </Label>
            <Input
              id="rebanho-esperado"
              type="number"
              min="0"
              value={rebanhoEsperado}
              onChange={(e) => setRebanhoEsperado(e.target.value)}
              placeholder="Ex.: 4000"
            />
          </div>
          <div className="flex-1 space-y-1.5 w-full">
            <div className="flex justify-between text-xs font-medium">
              <span>Progresso do registro</span>
              <span className="font-mono">
                {consistencia.totalFazenda} / {consistencia.totalEsperado || '—'} cabeças
                registradas
              </span>
            </div>
            <Progress value={Math.min(100, consistencia.pctProgresso)} className="h-2.5" />
            {consistencia.totalEsperado > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {consistencia.faltam > 0
                  ? `Foram registradas ${consistencia.totalFazenda} cabeças; o rebanho informado é de ${consistencia.totalEsperado} — faltam ${consistencia.faltam}.`
                  : consistencia.excedem > 0
                    ? `Foram registradas ${consistencia.totalFazenda} cabeças; o rebanho informado é de ${consistencia.totalEsperado} — excedem ${consistencia.excedem}.`
                    : 'Cadastro completo: o registro reflete o rebanho informado.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs defaultValue="por-pasto" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start h-auto py-1.5 px-1 flex flex-wrap sm:flex-nowrap">
          <TabsTrigger value="por-pasto" className="gap-2 py-2">
            <MapPin className="h-4 w-4" /> Visão por pasto
          </TabsTrigger>
          <TabsTrigger value="registros" className="py-2">
            <Layers className="h-4 w-4" /> Lotes & Animais
          </TabsTrigger>
          <TabsTrigger value="resumo" className="py-2">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="py-2">
            <ArrowRightLeft className="h-4 w-4" /> Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="por-pasto" className="space-y-4 mt-0">
          {pastos.length === 0 && !loading && (
            <Card className="border-dashed bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                <MapPin className="h-8 w-8 text-primary mb-3" />
                <h3 className="text-lg font-semibold">Nenhum pasto cadastrado</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  O cadastro do rebanho começa pela seleção do pasto. Cadastre o primeiro pasto em
                  "Registrar rebanho atual".
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {consistencia.porPasto.map((cont: ContagemPorPasto) => (
              <Card
                key={cont.pastoId}
                className={cont.acimaCapacidade ? 'border-destructive/40' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> {cont.nome}
                    </CardTitle>
                    {cont.acimaCapacidade && (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <TriangleAlert className="h-3 w-3" /> Acima da capacidade
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {cont.areaHa} ha • capacidade {cont.capacidadeUaHa} UA/ha
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-lg font-bold font-mono">{cont.cabecasAtivas}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">cabeças</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-lg font-bold font-mono">{cont.lotacaoUaHa.toFixed(2)}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">UA/ha atual</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-lg font-bold font-mono">
                        {cont.capacidadeUaTotal.toFixed(0)}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">UA capacidade</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={Math.min(100, cont.pctOcupacao)} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">
                      {cont.pctOcupacao.toFixed(0)}% da capacidade estimada •{' '}
                      {
                        movimentacoes.filter(
                          (m) =>
                            m.pasto_origem_id === cont.pastoId ||
                            m.pasto_destino_id === cont.pastoId,
                        ).length
                      }{' '}
                      movimentação(ões) no histórico
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {cont.lotes.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between text-xs rounded border px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium truncate">{l.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className="text-[10px]">
                            {l.headcount} cab.
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => abrirEdicao('lote', l)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => abrirTransferencia('lote', l)}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setStatusTipo('lote')
                              setStatusId(l.id)
                              setStatusNome(l.name)
                              setStatusNovo('inativo')
                              setStatusOpen(true)
                            }}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {cont.animais.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs rounded border px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Beef className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-mono font-medium truncate">{a.brinco}</span>
                          <span className="text-muted-foreground">
                            {CATEGORIAS_LABEL[a.categoria]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {a.peso_kg} kg
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => abrirEdicao('animal', a)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => abrirTransferencia('animal', a)}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setStatusTipo('animal')
                              setStatusId(a.id)
                              setStatusNome(a.brinco)
                              setStatusNovo('inativo')
                              setStatusOpen(true)
                            }}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {cont.lotes.length === 0 && cont.animais.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        Pasto vazio — nenhum lote ou animal vinculado.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setPastoCadastro(cont.pastoId)
                      setModalCadastroOpen(true)
                    }}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Registrar neste pasto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="registros" className="space-y-4 mt-0">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1 w-40">
              <Label className="text-xs">Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categoriasDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs">Sexo</Label>
              <Select value={filtroSexo} onValueChange={setFiltroSexo}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="macho">Machos</SelectItem>
                  <SelectItem value="femea">Fêmeas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-44">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativos (contam na lotação)</SelectItem>
                  <SelectItem value="vendido">Vendidos</SelectItem>
                  <SelectItem value="morto">Mortos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                  <SelectItem value="todos">Todos (histórico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lotes</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">Peso médio</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Pasto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesFiltrados.map((l) => {
                      const pasto = pastos.find((p) => p.id === l.pasto_atual_id)
                      const statusLabel =
                        l.status === 'active'
                          ? 'Ativo'
                          : l.status === 'sold'
                            ? 'Vendido'
                            : l.status === 'abated'
                              ? 'Morto'
                              : 'Inativo'
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name}</TableCell>
                          <TableCell>{l.category}</TableCell>
                          <TableCell>{l.sex === 'macho' ? 'Macho' : 'Fêmea'}</TableCell>
                          <TableCell className="text-right font-mono">{l.headcount}</TableCell>
                          <TableCell className="text-right font-mono">
                            {l.peso_medio_atual ? `${l.peso_medio_atual} kg` : '—'}
                          </TableCell>
                          <TableCell>
                            {l.fase_atual ? FASE_LABEL[l.fase_atual] || l.fase_atual : '—'}
                          </TableCell>
                          <TableCell>{pasto?.nome || l.pasto_atual || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={l.status === 'active' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirEdicao('lote', l)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirTransferencia('lote', l)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setStatusTipo('lote')
                                  setStatusId(l.id)
                                  setStatusNome(l.name)
                                  setStatusNovo('inativo')
                                  setStatusOpen(true)
                                }}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {lotesFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                          Nenhum lote com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Animais individuais (brinco)</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brinco</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead className="text-right">ECC</TableHead>
                      <TableHead>Pasto</TableHead>
                      <TableHead>Registrado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animaisFiltrados.map((a) => {
                      const pasto = pastos.find((p) => p.id === a.pasto_atual_id)
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-medium">{a.brinco}</TableCell>
                          <TableCell>{CATEGORIAS_LABEL[a.categoria]}</TableCell>
                          <TableCell>{a.sexo === 'macho' ? 'Macho' : 'Fêmea'}</TableCell>
                          <TableCell className="text-right font-mono">{a.peso_kg} kg</TableCell>
                          <TableCell className="text-right font-mono">{a.ecc ?? '—'}</TableCell>
                          <TableCell>{pasto?.nome || '—'}</TableCell>
                          <TableCell>
                            {a.created
                              ? format(new Date(a.created), 'dd MMM yyyy', { locale: ptBR })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={a.status === 'ativo' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {STATUS_LABEL[a.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirEdicao('animal', a)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirTransferencia('animal', a)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setStatusTipo('animal')
                                  setStatusId(a.id)
                                  setStatusNome(a.brinco)
                                  setStatusNovo('inativo')
                                  setStatusOpen(true)
                                }}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {animaisFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                          Nenhum animal identificado com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4 mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Cabeças por pasto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasto</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead className="text-right">UA/ha</TableHead>
                      <TableHead className="text-right">Capacidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consistencia.porPasto.map((p) => (
                      <TableRow key={p.pastoId}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-right font-mono">{p.cabecasAtivas}</TableCell>
                        <TableCell className="text-right font-mono">
                          {p.lotacaoUaHa.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {p.capacidadeUaTotal.toFixed(0)} UA
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total da fazenda</TableCell>
                      <TableCell className="text-right font-mono">{totalCabeças}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cabeças por categoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(resumo.porCategoria).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum registro ativo ainda.</p>
                  )}
                  {Object.entries(resumo.porCategoria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, qtd]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{cat}</span>
                          <span className="font-mono font-medium">{qtd}</span>
                        </div>
                        <Progress
                          value={totalCabeças > 0 ? (qtd / totalCabeças) * 100 : 0}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Comparado ao rebanho informado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rebanho informado</span>
                    <span className="font-mono font-medium">
                      {consistencia.totalEsperado || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registrado no sistema</span>
                    <span className="font-mono font-medium">{consistencia.totalFazenda}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Divergência</span>
                    <Badge
                      variant={
                        consistencia.totalEsperado > 0 && consistencia.faltam > 0
                          ? 'destructive'
                          : consistencia.totalEsperado > 0 && consistencia.excedem > 0
                            ? 'destructive'
                            : 'default'
                      }
                    >
                      {consistencia.totalEsperado > 0
                        ? consistencia.faltam > 0
                          ? `Faltam ${consistencia.faltam}`
                          : consistencia.excedem > 0
                            ? `Excedem ${consistencia.excedem}`
                            : 'Conferido'
                        : 'Informe o rebanho'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peso total (vivo)</span>
                    <span className="font-mono font-medium">
                      {Math.round(pesoTotalKg / KG_POR_ARROBA_VIVA)} @ ({KG_POR_ARROBA_VIVA} kg/@)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico de transferências entre pastos</CardTitle>
              <CardDescription>
                Cada movimentação registra data, origem, destino e responsável (append-only).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead className="text-right">Cabeças</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          {m.data ? format(new Date(m.data), 'dd MMM yyyy', { locale: ptBR }) : '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.lote_nome || m.animal_id || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">{m.qtd_cabecas}</TableCell>
                        <TableCell>{m.pasto_origem_nome || '—'}</TableCell>
                        <TableCell>{m.pasto_destino_nome || '—'}</TableCell>
                        <TableCell>{m.responsavel_nome || '—'}</TableCell>
                        <TableCell className="max-w-40 truncate">{m.motivo || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {movimentacoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhuma transferência registrada ainda.
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

      {/* Modal de cadastro em 3 passos */}
      <ModalCadastroRebanho
        open={modalCadastroOpen}
        onOpenChange={setModalCadastroOpen}
        pastos={pastos}
        lotes={lotes}
        animais={animais}
        consistencia={consistencia}
        onDataChanged={loadData}
        pastoInicial={pastoCadastro}
      />

      {/* Dialog de transferência */}
      <Dialog open={transfOpen} onOpenChange={setTransfOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir de pasto</DialogTitle>
            <DialogDescription>
              {transfNome ? `"${transfNome}"` : 'Registro'} — a transferência é o único caminho para
              mudar a localização e fica registrada no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Pasto de destino *</Label>
              <Select value={transfDestino} onValueChange={setTransfDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {pastos
                    .filter(
                      (p) =>
                        p.id !==
                        (transfTipo === 'lote'
                          ? lotes.find((l) => l.id === transfId)?.pasto_atual_id
                          : animais.find((a) => a.id === transfId)?.pasto_atual_id),
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {transfTipo === 'lote' && (
              <div className="space-y-1.5">
                <Label>Cabeças transferidas</Label>
                <Input
                  type="number"
                  min="1"
                  value={transfQtd}
                  onChange={(e) => setTransfQtd(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input
                value={transfMotivo}
                onChange={(e) => setTransfMotivo(e.target.value)}
                placeholder="Ex.: rotação de pastagem, pasto raspado..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransfOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarTransferencia} disabled={!transfDestino}>
              Confirmar transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Corrigir registro</DialogTitle>
            <DialogDescription>
              A correção gera um NOVO evento na trilha de auditoria — o registro original nunca é
              apagado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {editTipo === 'lote' && (
              <>
                <div className="space-y-1.5">
                  <Label>Código do lote</Label>
                  <Input
                    value={editCampos.nome || ''}
                    onChange={(e) => setEditCampos({ ...editCampos, nome: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Quantidade de cabeças</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editCampos.qtd || ''}
                      onChange={(e) => setEditCampos({ ...editCampos, qtd: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Peso médio (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCampos.peso || ''}
                      onChange={(e) => setEditCampos({ ...editCampos, peso: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            {editTipo === 'animal' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Peso (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCampos.peso || ''}
                      onChange={(e) => setEditCampos({ ...editCampos, peso: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ECC (1–5)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="5"
                      value={editCampos.ecc || ''}
                      onChange={(e) => setEditCampos({ ...editCampos, ecc: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Input
                    value={editCampos.obs || ''}
                    onChange={(e) => setEditCampos({ ...editCampos, obs: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Pasto atual</Label>
              <Select
                value={editCampos.pasto || ''}
                onValueChange={(v) => setEditCampos({ ...editCampos, pasto: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pasto..." />
                </SelectTrigger>
                <SelectContent>
                  {pastos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarEdicao}>Salvar correção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de status */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
            <DialogDescription>
              {statusNome ? `"${statusNome}"` : 'Registro'} — registros vendidos/mortos/inativos
              saem da contagem atual do pasto, mas permanecem no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label>Novo status</Label>
            <Select value={statusNovo} onValueChange={(v) => setStatusNovo(v as StatusRebanho)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="transferido">Transferido</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
                <SelectItem value="morto">Morto</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>{' '}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarMudancaStatus}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
