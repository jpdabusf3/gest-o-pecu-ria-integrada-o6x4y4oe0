import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  CalendarDays,
  ListTodo,
  Columns3,
  CalendarRange,
} from 'lucide-react'
import {
  AtividadeRecord,
  TipoAtividade,
  getAtividades,
  tipoLabel,
  tipoCores,
  expandAtividades,
  isAtividadeVencida,
  isAtividadeHoje,
  getFrenteLabel,
} from '@/services/atividades'
import { getLots, LotRecord } from '@/services/lots'
import { useRealtime } from '@/hooks/use-realtime'
import { ModalNovaAtividade } from '@/components/calendario/ModalNovaAtividade'
import { ModalDetalheAtividade } from '@/components/calendario/ModalDetalheAtividade'
import { VisaoTrimestral } from '@/components/calendario/VisaoTrimestral'

type ViewMode = 'mes' | 'semana' | 'dia' | 'trimestre'

export default function Calendario() {
  const [viewMode, setViewMode] = useState<ViewMode>('mes')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [atividades, setAtividades] = useState<AtividadeRecord[]>([])
  const [lots, setLots] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroFrente, setFiltroFrente] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalDetalheOpen, setModalDetalheOpen] = useState(false)
  const [selectedAtividade, setSelectedAtividade] = useState<AtividadeRecord | null>(null)
  const [dateForNewEvent, setDateForNewEvent] = useState<string>('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [atividadesData, lotsData] = await Promise.all([getAtividades(), getLots()])
      setAtividades(atividadesData)
      setLots(lotsData)
    } catch (err) {
      console.error('Erro ao carregar dados do calendário:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Assinatura realtime no PocketBase
  useRealtime('atividades', () => {
    loadData()
  })

  // -------------------------------------------------------------
  // Filtragem de atividades
  // -------------------------------------------------------------
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((a) => {
      // Filtro por frente (com destaque e separação para arrendamento)
      if (filtroFrente !== 'todas') {
        if (filtroFrente === 'arrendamento') {
          if (!a.is_arrendamento && a.frente !== 'arrendamento') return false
        } else {
          if (a.frente !== filtroFrente) return false
        }
      }

      // Filtro por tipo
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) {
        return false
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchTitle = (a.titulo || '').toLowerCase().includes(term)
        const matchSetor = (a.setor || '').toLowerCase().includes(term)
        const matchResp = (a.responsavel_id || '').toLowerCase().includes(term)
        const matchDesc = (a.descricao || '').toLowerCase().includes(term)
        if (!matchTitle && !matchSetor && !matchResp && !matchDesc) return false
      }

      return true
    })
  }, [atividades, filtroFrente, filtroTipo, searchTerm])

  // -------------------------------------------------------------
  // Navegação no tempo
  // -------------------------------------------------------------
  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === 'mes') {
      d.setMonth(d.getMonth() - 1)
    } else if (viewMode === 'semana') {
      d.setDate(d.getDate() - 7)
    } else if (viewMode === 'dia') {
      d.setDate(d.getDate() - 1)
    } else if (viewMode === 'trimestre') {
      d.setFullYear(d.getFullYear() - 1)
    }
    setCurrentDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === 'mes') {
      d.setMonth(d.getMonth() + 1)
    } else if (viewMode === 'semana') {
      d.setDate(d.getDate() + 7)
    } else if (viewMode === 'dia') {
      d.setDate(d.getDate() + 1)
    } else if (viewMode === 'trimestre') {
      d.setFullYear(d.getFullYear() + 1)
    }
    setCurrentDate(d)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // -------------------------------------------------------------
  // Cálculos de Mês (grade do calendário)
  // -------------------------------------------------------------
  const { monthDays, monthStart, monthEnd } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startOffset = firstDay.getDay() // 0 (Domingo) a 6
    const totalDays = lastDay.getDate()

    // Intervalo com margem para expansão de recorrências
    const rangeStart = new Date(year, month, 1 - startOffset)
    const endOffset = 6 - lastDay.getDay()
    const rangeEnd = new Date(year, month, totalDays + endOffset)

    const days: Date[] = []
    const cur = new Date(rangeStart)
    while (cur <= rangeEnd) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }

    return { monthDays: days, monthStart: rangeStart, monthEnd: rangeEnd }
  }, [currentDate])

  // Ocorrências expandidas para a grade mensal
  const expandedMonthOccurrences = useMemo(() => {
    return expandAtividades(atividadesFiltradas, monthStart, monthEnd)
  }, [atividadesFiltradas, monthStart, monthEnd])

  // -------------------------------------------------------------
  // Cálculos de Semana
  // -------------------------------------------------------------
  const weekDays = useMemo(() => {
    const cur = new Date(currentDate)
    const day = cur.getDay() // 0 Domingo
    const startOfWeek = new Date(cur)
    startOfWeek.setDate(cur.getDate() - day)
    startOfWeek.setHours(0, 0, 0, 0)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  const expandedWeekOccurrences = useMemo(() => {
    if (weekDays.length === 0) return []
    const start = weekDays[0]
    const end = weekDays[6]
    return expandAtividades(atividadesFiltradas, start, end)
  }, [atividadesFiltradas, weekDays])

  // -------------------------------------------------------------
  // Lista do Dia: Ordenação estrita
  // Regra: Vencida e não concluída sobe para o topo e fica destacada em vermelho
  // -------------------------------------------------------------
  const dayList = useMemo(() => {
    const now = new Date()
    const isTargetToday =
      currentDate.getFullYear() === now.getFullYear() &&
      currentDate.getMonth() === now.getMonth() &&
      currentDate.getDate() === now.getDate()

    // Pega as atividades de hoje ou da data selecionada
    const s = new Date(currentDate)
    s.setHours(0, 0, 0, 0)
    const e = new Date(currentDate)
    e.setHours(23, 59, 59, 999)

    const occurrences = expandAtividades(atividadesFiltradas, s, e)

    // Se a data for hoje, inclui também todas as atividades VENCIDAS e não concluídas
    let finalItems = [...occurrences]

    if (isTargetToday) {
      // Encontrar todas vencidas no banco
      const vencidas = atividadesFiltradas.filter((a) => isAtividadeVencida(a, now))
      for (const v of vencidas) {
        if (!finalItems.some((fi) => fi.record.id === v.id)) {
          finalItems.unshift({
            record: v,
            occurrenceDate: new Date(v.data),
            virtualId: `vencida#${v.id}`,
          })
        }
      }
    }

    // Ordenar: vencidas pendentes primeiro, depois horário
    finalItems.sort((a, b) => {
      const aVencida = isAtividadeVencida(a.record, now)
      const bVencida = isAtividadeVencida(b.record, now)

      if (aVencida && !bVencida) return -1
      if (!aVencida && bVencida) return 1

      // Concluídas/Realizadas vão para o final
      const isAFin = a.record.status === 'realizada' || a.record.status === 'concluida'
      const isBFin = b.record.status === 'realizada' || b.record.status === 'concluida'
      if (isAFin && !isBFin) return 1
      if (!isAFin && isBFin) return -1

      return a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
    })

    return finalItems
  }, [currentDate, atividadesFiltradas])

  // Contadores rápidos para resumo
  const totalPlanejadas = atividades.filter((a) => a.status !== 'cancelada').length
  const totalVencidas = atividades.filter((a) => isAtividadeVencida(a)).length
  const totalArrendamento = atividades.filter((a) => a.is_arrendamento).length

  const handleOpenDetail = (rec: AtividadeRecord) => {
    setSelectedAtividade(rec)
    setModalDetalheOpen(true)
  }

  const handleOpenNewOnDate = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    setDateForNewEvent(`${yyyy}-${mm}-${dd}`)
    setModalNovoOpen(true)
  }

  // Título do cabeçalho da visualização
  const headerTitle = useMemo(() => {
    if (viewMode === 'mes') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
    if (viewMode === 'semana') {
      const s = weekDays[0]
      const e = weekDays[6]
      return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
    if (viewMode === 'dia') {
      return currentDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    }
    return `Fechamento Anual Exagro — ${currentDate.getFullYear()}`
  }, [viewMode, currentDate, weekDays])

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Calendário de Atividades</h2>
            <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
              Banco Real Skip Cloud
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Planejamento e visualização integrada de manejos, sanidade, IATF e rotinas por frente da
            fazenda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => {
              setDateForNewEvent(new Date().toISOString().split('T')[0])
              setModalNovoOpen(true)
            }}
            className="gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" /> Nova Atividade / Manejo
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-muted/30">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> Atividades Ativas
          </div>
          <div className="text-xl font-bold mt-1">{totalPlanejadas}</div>
        </Card>

        <Card
          className={`p-3 ${totalVencidas > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/30'}`}
        >
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <AlertTriangle
              className={`h-3.5 w-3.5 ${totalVencidas > 0 ? 'text-destructive' : ''}`}
            />
            Atividades Vencidas
          </div>
          <div className={`text-xl font-bold mt-1 ${totalVencidas > 0 ? 'text-destructive' : ''}`}>
            {totalVencidas}
          </div>
        </Card>

        <Card className="p-3 bg-amber-500/10 border-amber-500/30">
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Arrendamento de Fêmeas
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {totalArrendamento} eventos
          </div>
        </Card>

        <Card className="p-3 bg-muted/30">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-pink-500" /> Gatilhos Reprodutivos
          </div>
          <div className="text-xl font-bold mt-1">IATF → DG → Parto</div>
        </Card>
      </div>

      {/* Barra de Controles: Filtros e Alternador de Visão */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        {/* Navegação de Tempo */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="font-bold text-base capitalize ml-2 truncate">{headerTitle}</span>
        </div>

        {/* Alternador de Visualização */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'mes' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => setViewMode('mes')}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" /> Mês
            </Button>
            <Button
              variant={viewMode === 'semana' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => setViewMode('semana')}
            >
              <Columns3 className="h-3.5 w-3.5 mr-1" /> Semana
            </Button>
            <Button
              variant={viewMode === 'dia' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => setViewMode('dia')}
            >
              <ListTodo className="h-3.5 w-3.5 mr-1" /> Lista do Dia
            </Button>
            <Button
              variant={viewMode === 'trimestre' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => setViewMode('trimestre')}
            >
              <CalendarRange className="h-3.5 w-3.5 mr-1" /> Trimestral (Exagro)
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros por Frente & Tipo */}
      <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-3 rounded-lg border text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <Filter className="h-3.5 w-3.5" /> Filtrar por:
        </div>

        {/* Filtro por Frente (Segregação de Arrendamento de Fêmeas) */}
        <Select value={filtroFrente} onValueChange={setFiltroFrente}>
          <SelectTrigger className="w-[190px] h-8 text-xs bg-background">
            <SelectValue placeholder="Frente de Produção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Frentes</SelectItem>
            <SelectItem value="cria">Fazenda Própria: Cria</SelectItem>
            <SelectItem value="recria">Fazenda Própria: Recria</SelectItem>
            <SelectItem value="engorda">Fazenda Própria: Engorda</SelectItem>
            <SelectItem value="confinamento">Fazenda Própria: Confinamento</SelectItem>
            <SelectItem value="arrendamento">Arrendamento de Fêmeas (Separado)</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Tipo */}
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
            <SelectValue placeholder="Tipo de Atividade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="sanidade">Sanidade</SelectItem>
            <SelectItem value="reproducao">Reprodução</SelectItem>
            <SelectItem value="manejo">Manejo</SelectItem>
            <SelectItem value="pesagem">Pesagem</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
            <SelectItem value="comercial">Comercial</SelectItem>
            <SelectItem value="nutricao">Nutrição / Trato</SelectItem>
          </SelectContent>
        </Select>

        {/* Busca por texto */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por título, lote, responsável ou setor..."
            className="h-8 text-xs bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {(filtroFrente !== 'todas' || filtroTipo !== 'todos' || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setFiltroFrente('todas')
              setFiltroTipo('todos')
              setSearchTerm('')
            }}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* -------------------------------------------------------------
          VISÃO 1: MENSAL
      ------------------------------------------------------------- */}
      {viewMode === 'mes' && (
        <Card className="overflow-hidden border shadow-sm">
          <CardContent className="p-0">
            {/* Dias da Semana (cabeçalho) */}
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center font-semibold text-xs py-2">
              <span className="text-red-500">Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span className="text-blue-500">Sáb</span>
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y border-b text-xs">
              {monthDays.map((d, index) => {
                const isCurrentMonth = d.getMonth() === currentDate.getMonth()
                const isToday = isAtividadeHoje({ data: d.toISOString() } as any)
                const dayOccurrences = expandedMonthOccurrences.filter((occ) => {
                  return (
                    occ.occurrenceDate.getFullYear() === d.getFullYear() &&
                    occ.occurrenceDate.getMonth() === d.getMonth() &&
                    occ.occurrenceDate.getDate() === d.getDate()
                  )
                })

                return (
                  <div
                    key={index}
                    onClick={() => handleOpenNewOnDate(d)}
                    className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer group ${
                      !isCurrentMonth
                        ? 'bg-muted/15 text-muted-foreground/60'
                        : 'bg-background hover:bg-muted/30'
                    } ${isToday ? 'ring-2 ring-primary ring-inset font-bold' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                          isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                        }`}
                      >
                        {d.getDate()}
                      </span>

                      {dayOccurrences.length > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {dayOccurrences.length} evt
                        </span>
                      )}
                    </div>

                    {/* Lista de eventos na célula do dia */}
                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                      {dayOccurrences.slice(0, 3).map((occ) => {
                        const rec = occ.record
                        const isVenc = isAtividadeVencida(rec)
                        return (
                          <div
                            key={occ.virtualId}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail(rec)
                            }}
                            className={`p-1 rounded text-[11px] truncate flex items-center justify-between border cursor-pointer hover:shadow-xs transition-transform active:scale-[0.98] ${
                              isVenc
                                ? 'bg-red-500/10 border-red-500/40 text-red-600 font-semibold'
                                : rec.status === 'realizada' || rec.status === 'concluida'
                                  ? 'bg-muted/70 line-through text-muted-foreground border-transparent'
                                  : rec.status === 'em_andamento'
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 font-semibold'
                                    : rec.status === 'nao_realizada'
                                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 font-semibold'
                                      : 'bg-muted/40 border-border/60 hover:bg-muted/80'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: tipoCores[rec.tipo] }}
                              />
                              {rec.titulo}
                            </span>
                            {rec.is_arrendamento && (
                              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded shrink-0">
                                Arr
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {dayOccurrences.length > 3 && (
                        <div className="text-[10px] text-primary font-medium text-center">
                          +{dayOccurrences.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------------------
          VISÃO 2: SEMANAL DO GESTOR (Colunas por dia com cartões coloridos)
      ------------------------------------------------------------- */}
      {viewMode === 'semana' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((d, index) => {
            const isToday = isAtividadeHoje({ data: d.toISOString() } as any)
            const dayEvents = expandedWeekOccurrences.filter((occ) => {
              return (
                occ.occurrenceDate.getFullYear() === d.getFullYear() &&
                occ.occurrenceDate.getMonth() === d.getMonth() &&
                occ.occurrenceDate.getDate() === d.getDate()
              )
            })

            return (
              <div
                key={index}
                className={`flex flex-col rounded-xl border bg-card p-3 shadow-xs ${
                  isToday ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                <div className="flex justify-between items-center pb-2 border-b mb-3">
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold leading-none mt-0.5">
                      {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {dayEvents.length}
                  </Badge>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <div
                      className="text-center py-6 text-muted-foreground/60 text-xs border border-dashed rounded-lg cursor-pointer hover:bg-muted/20"
                      onClick={() => handleOpenNewOnDate(d)}
                    >
                      <Plus className="h-4 w-4 mx-auto mb-1 text-muted-foreground/40" />
                      Agendar
                    </div>
                  ) : (
                    dayEvents.map((occ) => {
                      const rec = occ.record
                      const isVenc = isAtividadeVencida(rec)
                      return (
                        <div
                          key={occ.virtualId}
                          onClick={() => handleOpenDetail(rec)}
                          style={{ borderLeftColor: tipoCores[rec.tipo] }}
                          className={`p-2.5 rounded-lg border-l-4 border text-xs shadow-xs cursor-pointer hover:bg-muted/40 transition-colors ${
                            isVenc
                              ? 'bg-red-500/10 border-red-500/30'
                              : rec.status === 'realizada' || rec.status === 'concluida'
                                ? 'bg-muted/40 opacity-75'
                                : rec.status === 'em_andamento'
                                  ? 'bg-amber-500/5 border-amber-500/40'
                                  : rec.status === 'nao_realizada'
                                    ? 'bg-rose-500/5 border-rose-500/40'
                                    : 'bg-background'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <Badge
                              style={{
                                backgroundColor: tipoCores[rec.tipo],
                                color: '#fff',
                              }}
                              className="text-[9px] px-1 py-0 h-4 font-normal"
                            >
                              {tipoLabel(rec.tipo)}
                            </Badge>
                            {rec.is_arrendamento && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 border-amber-500 text-amber-600 bg-amber-500/10"
                              >
                                Arrendamento
                              </Badge>
                            )}
                          </div>

                          <div
                            className={`font-semibold line-clamp-2 ${isVenc ? 'text-destructive' : ''}`}
                          >
                            {rec.titulo}
                          </div>

                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                            {rec.setor && <span>📍 {rec.setor}</span>}
                            <span>👤 {rec.responsavel_id}</span>
                            {rec.insumos && rec.insumos.length > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                📦 {rec.insumos.length} insumo(s)
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-[11px] h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenNewOnDate(d)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* -------------------------------------------------------------
          VISÃO 3: LISTA DO DIA
          Regra: Atividade vencida e não concluída fica destacada em vermelho e sobe para o topo.
      ------------------------------------------------------------- */}
      {viewMode === 'dia' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
            <div>
              <h3 className="text-lg font-bold">Manejador Diário</h3>
              <p className="text-xs text-muted-foreground">
                Atividades programadas para{' '}
                {currentDate.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
              </p>
            </div>
            <Button size="sm" onClick={() => handleOpenNewOnDate(currentDate)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Atividade no Dia
            </Button>
          </div>

          <div className="space-y-3">
            {dayList.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-medium text-sm">Nenhuma atividade agendada para este dia.</p>
                <p className="text-xs mt-1">
                  Clique em "Nova Atividade no Dia" para criar tarefas de campo.
                </p>
              </Card>
            ) : (
              dayList.map((occ) => {
                const rec = occ.record
                const isVenc = isAtividadeVencida(rec)
                const isRealiz = rec.status === 'realizada' || rec.status === 'concluida'
                const isAndam = rec.status === 'em_andamento'
                const isNaoReal = rec.status === 'nao_realizada'
                const isReag = rec.status === 'reagendada'

                return (
                  <Card
                    key={occ.virtualId}
                    onClick={() => handleOpenDetail(rec)}
                    className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                      isVenc
                        ? 'border-l-destructive bg-red-500/10 border-red-500/40'
                        : isRealiz
                          ? 'border-l-emerald-600 bg-muted/30 opacity-80'
                          : isAndam
                            ? 'border-l-amber-500 bg-amber-500/5'
                            : isNaoReal
                              ? 'border-l-rose-500 bg-rose-500/5'
                              : isReag
                                ? 'border-l-blue-500 bg-blue-500/5'
                                : 'border-l-primary'
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            style={{ backgroundColor: tipoCores[rec.tipo], color: '#fff' }}
                            className="text-xs"
                          >
                            {tipoLabel(rec.tipo)}
                          </Badge>

                          {rec.is_arrendamento && (
                            <Badge
                              variant="outline"
                              className="border-amber-500 text-amber-700 bg-amber-500/10 text-xs font-semibold"
                            >
                              Arrendamento de Fêmeas
                            </Badge>
                          )}

                          {isVenc && (
                            <Badge variant="destructive" className="gap-1 animate-pulse text-xs">
                              <AlertTriangle className="h-3 w-3" /> VENCIDA (Requer Ação Imediata)
                            </Badge>
                          )}

                          {isRealiz && (
                            <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Realizada
                            </Badge>
                          )}
                          {isAndam && (
                            <Badge className="bg-amber-500 text-white gap-1 text-xs">
                              ⏳ Em Andamento
                            </Badge>
                          )}
                          {isNaoReal && (
                            <Badge className="bg-rose-600 text-white gap-1 text-xs">
                              ❌ Não Realizada
                            </Badge>
                          )}
                          {isReag && (
                            <Badge className="bg-blue-600 text-white gap-1 text-xs">
                              🔄 Reagendada
                            </Badge>
                          )}
                        </div>

                        <div className="text-base font-bold text-foreground">{rec.titulo}</div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            🕒{' '}
                            {new Date(rec.data).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {rec.setor && <span>📍 {rec.setor}</span>}
                          <span>
                            👤 Responsável: <strong>{rec.responsavel_id}</strong>
                          </span>
                          <span>Frente: {getFrenteLabel(rec.frente)}</span>
                        </div>

                        {rec.descricao && (
                          <p className="text-xs text-muted-foreground/90 line-clamp-2 pt-1">
                            {rec.descricao}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0">
                        {rec.custo_previsto ? (
                          <div className="text-xs text-muted-foreground">
                            Custo:{' '}
                            <strong className="text-foreground font-mono">
                              R${' '}
                              {rec.custo_previsto.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        ) : null}

                        {rec.insumos && rec.insumos.length > 0 && (
                          <Badge variant="secondary" className="text-[11px] font-mono">
                            📦 {rec.insumos.length} insumo(s) vinculado(s)
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          VISÃO 4: TRIMESTRAL (Alinhada ao fechamento Exagro)
      ------------------------------------------------------------- */}
      {viewMode === 'trimestre' && (
        <VisaoTrimestral atividades={atividadesFiltradas} ano={currentDate.getFullYear()} />
      )}

      {/* Modal Nova Atividade */}
      <ModalNovaAtividade
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        lots={lots}
        defaultDate={dateForNewEvent}
        onSuccess={() => {
          loadData()
        }}
      />

      {/* Modal Detalhe Atividade */}
      <ModalDetalheAtividade
        open={modalDetalheOpen}
        onOpenChange={setModalDetalheOpen}
        atividade={selectedAtividade}
        lots={lots}
        onUpdated={() => {
          loadData()
        }}
      />
    </div>
  )
}
