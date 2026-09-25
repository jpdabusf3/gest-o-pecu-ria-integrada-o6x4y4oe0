import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  MapPin,
  Camera,
  History,
  Edit3,
  Ban,
  Shield,
  Eye,
  Plus,
  Send,
  Sliders,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  OcorrenciaRecord,
  getOcorrencias,
  resolverOcorrencia,
  getTiposOcorrencia,
  TipoOcorrenciaRecord,
  criarTipoOcorrenciaCustom,
} from '@/services/ocorrencias'
import { getLots, LotRecord } from '@/services/lots'
import { getPermissoesOcorrencias } from '@/lib/permissoesOcorrencias'
import { ModalCorrigirOcorrencia } from '@/components/campo/ModalCorrigirOcorrencia'
import { ModalCancelarOcorrencia } from '@/components/campo/ModalCancelarOcorrencia'
import { ModalRegistrarOcorrencia } from '@/components/campo/ModalRegistrarOcorrencia'

export function PainelOcorrenciasGestor() {
  const { user } = useAuth()
  const { toast } = useToast()
  const permissoes = useMemo(() => getPermissoesOcorrencias(user.role), [user.role])

  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRecord[]>([])
  const [lotes, setLotes] = useState<LotRecord[]>([])
  const [tipos, setTipos] = useState<TipoOcorrenciaRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroLote, setFiltroLote] = useState<string>('todos')
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [buscaTermo, setBuscaTermo] = useState('')

  // Modais de ação
  const [modalRegistrarOpen, setModalRegistrarOpen] = useState(false)
  const [ocorrenciaParaCorrigir, setOcorrenciaParaCorrigir] = useState<OcorrenciaRecord | null>(
    null,
  )
  const [ocorrenciaParaCancelar, setOcorrenciaParaCancelar] = useState<OcorrenciaRecord | null>(
    null,
  )

  // Configuração de novos tipos (Catálogo configurável pelo gestor)
  const [novoTipoNome, setNovoTipoNome] = useState('')
  const [novoTipoIcone, setNovoTipoIcone] = useState('Tag')
  const [novoTipoCategoria, setNovoTipoCategoria] = useState('manejo')
  const [criandoTipo, setCriandoTipo] = useState(false)

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      const [listOcorr, listLots, listTipos] = await Promise.all([
        getOcorrencias(),
        getLots(),
        getTiposOcorrencia(),
      ])
      setOcorrencias(listOcorr)
      setLotes(listLots)
      setTipos(listTipos)
    } catch (err) {
      console.warn('Erro ao carregar dados do painel de ocorrências:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Lógica de Ordenação e Filtragem:
  // - Urgentes no topo (requer_acao_hoje e não resolvidas primeiro)
  // - Feed cronológico pelo timestamp do servidor
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias
      .filter((o) => {
        if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false
        if (filtroLote !== 'todos' && o.lote_id !== filtroLote) return false
        if (filtroUrgencia !== 'todos' && o.urgencia !== filtroUrgencia) return false
        if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false
        if (buscaTermo.trim()) {
          const t = buscaTermo.toLowerCase()
          const matchTipo = (o.tipo || '').toLowerCase().includes(t)
          const matchUsuario = (o.usuario_nome || '').toLowerCase().includes(t)
          const matchLote = (o.lote_nome || '').toLowerCase().includes(t)
          const matchCampos = JSON.stringify(o.campos_especificos || {})
            .toLowerCase()
            .includes(t)
          if (!matchTipo && !matchUsuario && !matchLote && !matchCampos) return false
        }
        return true
      })
      .sort((a, b) => {
        // Urgência Requer Ação Hoje e Pendente no Topo
        const aUrgentePendente =
          a.urgencia === 'requer_acao_hoje' && a.status !== 'resolvida' && a.status !== 'cancelada'
        const bUrgentePendente =
          b.urgencia === 'requer_acao_hoje' && b.status !== 'resolvida' && b.status !== 'cancelada'
        if (aUrgentePendente && !bUrgentePendente) return -1
        if (!aUrgentePendente && bUrgentePendente) return 1

        const dateA = new Date(a.data_hora_servidor || a.created).getTime()
        const dateB = new Date(b.data_hora_servidor || b.created).getTime()
        return dateB - dateA
      })
  }, [ocorrencias, filtroTipo, filtroLote, filtroUrgencia, filtroStatus, buscaTermo])

  // Contadores
  const totalUrgentes = useMemo(
    () =>
      ocorrencias.filter(
        (o) =>
          o.urgencia === 'requer_acao_hoje' && o.status !== 'resolvida' && o.status !== 'cancelada',
      ).length,
    [ocorrencias],
  )
  const totalConflitos = useMemo(
    () => ocorrencias.filter((o) => o.conflito_sinalizado && o.status !== 'resolvida').length,
    [ocorrencias],
  )

  const handleResolver = async (ocorr: OcorrenciaRecord) => {
    try {
      await resolverOcorrencia({
        id: ocorr.id,
        usuario_id: user.id,
        usuario_nome: user.name,
        perfil: user.role,
        observacao: 'Resolvido pelo painel de controle operacional',
      })
      toast({
        title: 'Ocorrência Resolvida',
        description: 'Status atualizado e registrado na trilha de auditoria.',
      })
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Não foi possível resolver',
        description: err?.message || 'Falha ao resolver ocorrência.',
        variant: 'destructive',
      })
    }
  }

  const handleCriarNovoTipo = async () => {
    if (!novoTipoNome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    try {
      setCriandoTipo(true)
      const cod = novoTipoNome.toLowerCase().replace(/\s+/g, '_')
      await criarTipoOcorrenciaCustom({
        codigo: cod,
        nome: novoTipoNome.trim(),
        icone: novoTipoIcone,
        categoria: novoTipoCategoria,
        campos: [
          {
            nome: 'descricao',
            label: 'Descrição da Ocorrência',
            tipo: 'textarea',
            obrigatorio: true,
          },
          { nome: 'local', label: 'Local / Pasto', tipo: 'text', obrigatorio: false },
          {
            nome: 'observacoes',
            label: 'Observações Complementares',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
        criado_por: user.name,
      })
      toast({
        title: 'Novo Tipo Adicionado ao Catálogo!',
        description: `O tipo "${novoTipoNome}" já está disponível para toda a equipe no modo Campo.`,
      })
      setNovoTipoNome('')
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar tipo',
        description: err?.message || 'Falha ao salvar no catálogo.',
        variant: 'destructive',
      })
    } finally {
      setCriandoTipo(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" /> Ocorrências de Campo & Auditoria
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/30"
            >
              Painel Integrado
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão cronológica de eventos de campo, resolução de pendências, trilha de auditoria e
            catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setModalRegistrarOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Plus className="h-4 w-4" /> Registrar Ocorrência
          </Button>
        </div>
      </div>

      {/* Alertas Críticos no Topo */}
      {totalUrgentes > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-950 dark:text-rose-200 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-sm">
                {totalUrgentes} OCORRÊNCIA(S) CRÍTICA(S) REQUEREM AÇÃO HOJE
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-300">
                Incêndios ou ocorrências operacionais marcadas para intervenção imediata da gestão.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="font-bold shrink-0 bg-rose-600 hover:bg-rose-700"
            onClick={() => {
              setFiltroUrgencia('requer_acao_hoje')
              setFiltroStatus('registrada')
            }}
          >
            Ver Urgentes
          </Button>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Total Ocorrências
          </span>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">{ocorrencias.length}</div>
          <span className="text-[11px] text-muted-foreground">Histórico acumulado</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-rose-700 font-semibold uppercase">
            Ação Hoje (Urgentes)
          </span>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">{totalUrgentes}</div>
          <span className="text-[11px] text-muted-foreground">Requerem atenção</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-amber-700 font-semibold uppercase">Fila de Conflitos</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">{totalConflitos}</div>
          <span className="text-[11px] text-muted-foreground">Decisão humana</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold uppercase">Resolvidas</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {ocorrencias.filter((o) => o.status === 'resolvida').length}
          </div>
          <span className="text-[11px] text-muted-foreground">Finalizadas com sucesso</span>
        </Card>
      </div>

      {/* Tabs Principais: Feed Cronológico vs Catálogo Configurável */}
      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="feed" className="font-bold text-xs gap-1.5">
            <History className="h-3.5 w-3.5" /> Feed Cronológico & Ações
          </TabsTrigger>
          {permissoes.pode_configurar && (
            <TabsTrigger value="catalogo" className="font-bold text-xs gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> Catálogo Configurável
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-3 bg-muted/40 rounded-xl border flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between text-xs">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, usuário, lote ou tipo..."
                className="pl-8 h-9 text-xs"
                value={buscaTermo}
                onChange={(e) => setBuscaTermo(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Urgências</SelectItem>
                  <SelectItem value="requer_acao_hoje">Requer Ação Hoje</SelectItem>
                  <SelectItem value="informativo">Informativo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 text-xs w-[125px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="registrada">Registrada</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroLote} onValueChange={setFiltroLote}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Lote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Lotes</SelectItem>
                  {lotes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filtroTipo !== 'todos' ||
                filtroLote !== 'todos' ||
                filtroUrgencia !== 'todos' ||
                filtroStatus !== 'todos' ||
                buscaTermo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => {
                    setFiltroTipo('todos')
                    setFiltroLote('todos')
                    setFiltroUrgencia('todos')
                    setFiltroStatus('todos')
                    setBuscaTermo('')
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Lista do Feed Cronológico */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Carregando feed de ocorrências...
            </div>
          ) : ocorrenciasFiltradas.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-xs text-muted-foreground">
                Nenhuma ocorrência encontrada para os filtros selecionados.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {ocorrenciasFiltradas.map((ocorr) => {
                const isUrgente = ocorr.urgencia === 'requer_acao_hoje'
                const isResolvida = ocorr.status === 'resolvida'
                const isCancelada = ocorr.status === 'cancelada'
                const isFogo = ocorr.tipo === 'fogo'

                return (
                  <Card
                    key={ocorr.id}
                    className={`border shadow-xs transition-all ${
                      isFogo
                        ? 'border-l-4 border-l-rose-600 bg-rose-500/[0.04]'
                        : isUrgente && !isResolvida && !isCancelada
                          ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.03]'
                          : isResolvida
                            ? 'border-l-4 border-l-emerald-600 bg-muted/20 opacity-90'
                            : isCancelada
                              ? 'border-l-4 border-l-muted bg-muted/40 opacity-70 line-through'
                              : 'border-border'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm uppercase text-foreground">
                            {ocorr.tipo.replace(/_/g, ' ')}
                          </span>

                          <Badge
                            className={`text-[10px] px-2 py-0.5 ${
                              isUrgente
                                ? 'bg-rose-600 text-white font-bold'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isUrgente ? '⚠️ Requer Ação Hoje' : 'ℹ️ Informativo'}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              isResolvida
                                ? 'text-emerald-600 border-emerald-300'
                                : isCancelada
                                  ? 'text-rose-600 border-rose-300'
                                  : 'text-amber-600 border-amber-300'
                            }`}
                          >
                            {ocorr.status.toUpperCase()}
                          </Badge>

                          {ocorr.lote_nome && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Lote: {ocorr.lote_nome}
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                          <span>
                            Srv:{' '}
                            {new Date(ocorr.data_hora_servidor || ocorr.created).toLocaleString(
                              'pt-BR',
                            )}
                          </span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>
                            Dispositivo:{' '}
                            {new Date(ocorr.data_hora_dispositivo).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo dos Campos Específicos */}
                      <div className="text-xs space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-muted/20 p-2.5 rounded-lg border">
                          {Object.entries(ocorr.campos_especificos || {}).map(([k, v]) => (
                            <div key={k} className="text-xs">
                              <span className="text-muted-foreground font-semibold capitalize block text-[10px]">
                                {k.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-foreground font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Informações de Registro e Geolocalização */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                          <span>
                            Registrado por:{' '}
                            <strong className="text-foreground">
                              {ocorr.usuario_nome || 'Operador'}
                            </strong>{' '}
                            ({ocorr.perfil})
                          </span>

                          {ocorr.geolocalizacao && (
                            <span className="flex items-center gap-1 text-emerald-600 font-mono">
                              <MapPin className="h-3 w-3" />
                              GPS: {ocorr.geolocalizacao.latitude?.toFixed(4)},{' '}
                              {ocorr.geolocalizacao.longitude?.toFixed(4)}
                            </span>
                          )}

                          {ocorr.evento_correcao_id && (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-primary border-primary/30"
                            >
                              Encadeado com Correção
                            </Badge>
                          )}
                        </div>

                        {/* Se foi cancelada, exibir motivo da auditoria */}
                        {isCancelada && (
                          <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-900 dark:text-rose-200 text-[11px]">
                            <strong>Cancelado por:</strong> {ocorr.cancelado_por || 'Gestor'} •{' '}
                            <strong>Motivo:</strong> {ocorr.motivo_cancelamento}
                          </div>
                        )}

                        {/* Se foi resolvida, exibir detalhes */}
                        {isResolvida && ocorr.resolvido_por && (
                          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-[11px]">
                            <strong>Resolvido por:</strong> {ocorr.resolvido_por} •{' '}
                            <strong>Obs:</strong> {ocorr.resolucao_observacao || 'Concluído'}
                          </div>
                        )}
                      </div>

                      {/* Barra de Ações com Matriz de Permissões */}
                      <div className="flex items-center justify-between pt-2 border-t text-xs">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          UUID: {ocorr.uuid_dispositivo?.slice(-8)}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Botão Resolver: apenas capataz e gestor. Autor de urgente não pode resolver a si próprio */}
                          {!isResolvida && !isCancelada && permissoes.pode_resolver && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1"
                              onClick={() => handleResolver(ocorr)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Resolvida
                            </Button>
                          )}

                          {/* Botão Corrigir (Correção nunca é edição: evento encadeado) */}
                          {!isCancelada && permissoes.pode_corrigir && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-primary gap-1"
                              onClick={() => setOcorrenciaParaCorrigir(ocorr)}
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Corrigir Valor
                            </Button>
                          )}

                          {/* Cancelamento Lógico com Motivo Obrigatório */}
                          {!isCancelada && permissoes.pode_cancelar && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                              onClick={() => setOcorrenciaParaCancelar(ocorr)}
                            >
                              <Ban className="h-3.5 w-3.5" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB CATÁLOGO CONFIGURÁVEL PELO GESTOR */}
        {permissoes.pode_configurar && (
          <TabsContent value="catalogo" className="space-y-4">
            <Card className="border shadow-xs">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" /> Adicionar Novo Tipo ao Catálogo da
                  Equipe
                </CardTitle>
                <CardDescription className="text-xs">
                  Tipos adicionados aqui entram imediatamente no catálogo de toda a equipe no modo
                  Campo, sem alterar código.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold">Nome do Tipo</span>
                    <Input
                      placeholder="Ex: Quebra de Cerca Elétrica"
                      value={novoTipoNome}
                      onChange={(e) => setNovoTipoNome(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold">Ícone Sugerido</span>
                    <Select value={novoTipoIcone} onValueChange={setNovoTipoIcone}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wrench">Ferramenta / Wrench</SelectItem>
                        <SelectItem value="AlertTriangle">Alerta / AlertTriangle</SelectItem>
                        <SelectItem value="Droplets">Água / Bebedouro</SelectItem>
                        <SelectItem value="CheckSquare">Geral / CheckSquare</SelectItem>
                        <SelectItem value="Wheat">Nutrição / Wheat</SelectItem>
                        <SelectItem value="Tag">Etiqueta / Tag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold">Categoria</span>
                    <Select value={novoTipoCategoria} onValueChange={setNovoTipoCategoria}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manejo">Manejo</SelectItem>
                        <SelectItem value="sanidade">Sanidade</SelectItem>
                        <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                        <SelectItem value="nutricao">Nutrição</SelectItem>
                        <SelectItem value="geral">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleCriarNovoTipo}
                    disabled={criandoTipo}
                    className="gap-2 bg-primary font-bold h-10 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    {criandoTipo ? 'Salvando...' : 'Adicionar ao Catálogo de Campo'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tipos Ativos Existentes */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">
                Tipos Ativos no Catálogo ({tipos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {tipos.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border bg-card flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-foreground block">{t.nome}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {t.codigo} • {t.categoria || 'Geral'}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-600 border-emerald-300"
                    >
                      Ativo
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal Corrigir */}
      <ModalCorrigirOcorrencia
        open={Boolean(ocorrenciaParaCorrigir)}
        onOpenChange={(op) => !op && setOcorrenciaParaCorrigir(null)}
        ocorrencia={ocorrenciaParaCorrigir}
        usuario={{ id: user.id, name: user.name, role: user.role }}
        onSuccess={carregarDados}
      />

      {/* Modal Cancelar */}
      <ModalCancelarOcorrencia
        open={Boolean(ocorrenciaParaCancelar)}
        onOpenChange={(op) => !op && setOcorrenciaParaCancelar(null)}
        ocorrencia={ocorrenciaParaCancelar}
        usuario={{ id: user.id, name: user.name, role: user.role }}
        onSuccess={carregarDados}
      />

      {/* Modal Registrar */}
      <ModalRegistrarOcorrencia
        open={modalRegistrarOpen}
        onOpenChange={setModalRegistrarOpen}
        lotes={lotes}
        onSuccess={carregarDados}
      />
    </div>
  )
}
