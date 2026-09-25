import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  MapPin,
  Beef,
  Plus,
  Search,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  ListTodo,
  Scale,
  Wifi,
  Radio,
  AlertTriangle,
  Calendar,
  Layers,
  Package,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useFarm } from '@/contexts/FarmContext'
import { getLots, LotRecord } from '@/services/lots'
import { createPesagem, PesagemInput } from '@/services/pesagens'
import {
  AtividadeRecord,
  getAtividades,
  updateAtividade,
  expandAtividades,
  isAtividadeVencida,
  tipoCores,
  tipoLabel,
} from '@/services/atividades'
import { useRealtime } from '@/hooks/use-realtime'
import { ScaleIntegrationModal } from '@/components/ScaleIntegrationModal'

export default function Campo() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { isOnline, queue, addAction, isSyncing, toggleSimulatedOffline, simulatedOffline } =
    useOffline()
  const { registerConsumption } = useFarm()

  const [realLots, setRealLots] = useState<LotRecord[]>([])
  const [selectedLote, setSelectedLote] = useState<LotRecord | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionType, setActionType] = useState('pesagem')
  const [searchTerm, setSearchTerm] = useState('')

  // Atividades reais do banco
  const [atividadesReais, setAtividadesReais] = useState<AtividadeRecord[]>([])
  const [loadingAtividades, setLoadingAtividades] = useState(true)

  // Campos de pesagem rápida
  const [pesoMedioInput, setPesoMedioInput] = useState('')
  const [qtdAnimaisInput, setQtdAnimaisInput] = useState('')
  const [isAbateSaida, setIsAbateSaida] = useState(false)
  const [rendimentoInput, setRendimentoInput] = useState('53.5')
  const [origemPesagem, setOrigemPesagem] = useState<'manual' | 'balanca'>('manual')

  const loadRealLots = useCallback(async () => {
    try {
      const data = await getLots()
      if (data && data.length > 0) {
        setRealLots(data)
      }
    } catch (err) {
      console.warn('Erro ao carregar lotes online para o Campo:', err)
    }
  }, [])

  const loadAtividadesHoje = useCallback(async () => {
    try {
      setLoadingAtividades(true)
      const data = await getAtividades()
      setAtividadesReais(data)
    } catch (err) {
      console.warn('Erro ao carregar atividades reais para o Campo:', err)
    } finally {
      setLoadingAtividades(false)
    }
  }, [])

  useEffect(() => {
    loadRealLots()
    loadAtividadesHoje()
  }, [loadRealLots, loadAtividadesHoje])

  useRealtime('lots', () => loadRealLots())
  useRealtime('atividades', () => loadAtividadesHoje())

  // -------------------------------------------------------------
  // TAREFAS DO DIA DO RESPONSÁVEL (Alimentadas pela coleção "atividades" real)
  // Regra:
  // - Cada atividade do dia do responsável aparece automaticamente na lista dele
  // - Vencida e não concluída sobe para o topo e fica destacada em vermelho
  // - Sem dados mock
  // -------------------------------------------------------------
  const tarefasDoDia = useMemo(() => {
    const today = new Date()
    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    // Expande ocorrências do dia atual considerando recorrências
    const occurrences = expandAtividades(atividadesReais, startOfToday, endOfToday)

    // Também inclui atividades vencidas pendentes
    const vencidasPendentes = atividadesReais.filter((a) => isAtividadeVencida(a, today))
    for (const v of vencidasPendentes) {
      if (!occurrences.some((occ) => occ.record.id === v.id)) {
        occurrences.unshift({
          record: v,
          occurrenceDate: new Date(v.data),
          virtualId: `vencida#${v.id}`,
        })
      }
    }

    // Filtrar pelo responsável (se o usuário for admin ou gerente, pode ver todas ou filtrar; operador vê as dele)
    const normalizedUserName = (user.name || '').toLowerCase()
    const filteredForUser = occurrences.filter((occ) => {
      // Se for operador de campo, mostra as atribuídas a ele ou equipe geral
      if (user.role === 'operador') {
        const resp = (occ.record.responsavel_id || '').toLowerCase()
        return (
          resp.includes(normalizedUserName) ||
          resp.includes('joão') ||
          resp.includes('equipe') ||
          resp.includes('campo')
        )
      }
      // Administrador / Gerente vê tudo
      return true
    })

    // Ordenação estrita: Vencidas e pendentes primeiro, depois horário
    filteredForUser.sort((a, b) => {
      const aVencida = isAtividadeVencida(a.record, today)
      const bVencida = isAtividadeVencida(b.record, today)

      if (aVencida && !bVencida) return -1
      if (!aVencida && bVencida) return 1

      if (a.record.status === 'concluida' && b.record.status !== 'concluida') return 1
      if (a.record.status !== 'concluida' && b.record.status === 'concluida') return -1

      return a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
    })

    return filteredForUser
  }, [atividadesReais, user])

  const filteredLotes = realLots.filter(
    (l) =>
      (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.pasto_atual || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.category || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAction = async () => {
    if (!selectedLote) return

    if (actionType === 'pesagem') {
      const pesoNum = parseFloat(pesoMedioInput)
      if (!pesoNum || pesoNum <= 0) {
        toast({
          title: 'Peso Inválido',
          description: 'Informe um peso médio válido para a pesagem rápida.',
          variant: 'destructive',
        })
        return
      }

      const qtd = parseInt(qtdAnimaisInput, 10) || selectedLote.headcount || 1
      const rendimento = isAbateSaida ? parseFloat(rendimentoInput) || 53.5 : undefined

      const pesagemPayload: PesagemInput = {
        data_pesagem: new Date().toISOString(),
        lote_id: selectedLote.id,
        tipo: 'lote',
        qtd_animais: qtd,
        peso_medio_kg: pesoNum,
        peso_total_kg: Number((pesoNum * qtd).toFixed(2)),
        responsavel_id: user.name,
        origem: origemPesagem,
        observacoes: isAbateSaida
          ? `Pesagem de saída para abate/venda registrada no modo Campo por ${user.name}. Rendimento: ${rendimento}%.`
          : `Registro Rápido de Pesagem via Campo Mobile por ${user.name}.`,
        is_saida_abate: isAbateSaida,
        rendimento_carcaca_pct: rendimento,
      }

      if (isOnline) {
        try {
          await createPesagem(pesagemPayload)
          toast({
            title: 'Pesagem Salva no Banco Real',
            description: `Peso de ${pesoNum} kg gravado para o lote ${selectedLote.name}. GMD e indicadores Exagro calculados.`,
          })
          loadRealLots()
        } catch (err: any) {
          console.error('Falha ao salvar pesagem online, enfileirando offline:', err)
          await addAction({
            type: 'REGISTER_PESAGEM',
            payload: pesagemPayload,
          })
          toast({
            title: 'Salvo na Fila Offline',
            description:
              'Não foi possível conectar imediatamente. Gravado localmente para sincronização.',
          })
        }
      } else {
        await addAction({
          type: 'REGISTER_PESAGEM',
          payload: pesagemPayload,
        })
        toast({
          title: 'Pesagem Salva Offline',
          description: `Pesagem de ${pesoNum} kg armazenada localmente. Será enviada assim que a conexão retornar.`,
        })
      }
    } else {
      // Outras ações de campo
      addAction({
        type: 'FIELD_OPERATION',
        payload: { operationType: actionType, lote: selectedLote?.name, operator: user.name },
      })

      if (isOnline) {
        toast({
          title: 'Operação Registrada',
          description: `Ação de "${actionType}" registrada para o lote ${selectedLote?.name}.`,
        })
      } else {
        toast({
          title: 'Salvo Offline',
          description: `Ação salva localmente. Sincronização pendente.`,
        })
      }
    }

    setDrawerOpen(false)
  }

  const openDrawer = (lote: LotRecord, defaultOperacao = 'pesagem') => {
    setSelectedLote(lote)
    setPesoMedioInput(
      lote.peso_medio_atual ? String(lote.peso_medio_atual) : String(lote.final_weight || ''),
    )
    setQtdAnimaisInput(String(lote.headcount || ''))
    setIsAbateSaida(false)
    setActionType(defaultOperacao)
    setOrigemPesagem('manual')
    setDrawerOpen(true)
  }

  // Concluir tarefa do dia / Deduzir estoque
  const handleToggleAtividadeReal = async (record: AtividadeRecord, currentConcluida: boolean) => {
    const newStatus = currentConcluida ? 'planejada' : 'concluida'

    // Otimista
    setAtividadesReais((prev) =>
      prev.map((a) =>
        a.id === record.id
          ? {
              ...a,
              status: newStatus,
              concluido_em: newStatus === 'concluida' ? new Date().toISOString() : undefined,
              concluido_por: newStatus === 'concluida' ? user.name : undefined,
            }
          : a,
      ),
    )

    if (!currentConcluida) {
      // Deduz estoque para os insumos vinculados
      if (record.insumos && record.insumos.length > 0) {
        const targetLote = (record.lote_ids && record.lote_ids[0]) || record.setor || 'GERAL'
        record.insumos.forEach((ins) => {
          if (ins.inventoryId && ins.quantidade > 0) {
            registerConsumption(targetLote, ins.inventoryId, ins.quantidade)
          }
        })
        toast({
          title: 'Estoque Deduzido!',
          description: `${record.insumos.map((i) => `${i.quantidade} ${i.unidade || 'un'} de ${i.item}`).join(', ')}`,
        })
      }

      if (isOnline) {
        try {
          await updateAtividade(record.id, {
            status: 'concluida',
            concluido_em: new Date().toISOString(),
            concluido_por: user.name,
          } as any)
          toast({
            title: 'Tarefa Realizada no Banco Real',
            description: `"${record.titulo}" marcada como concluída.`,
          })
        } catch (err) {
          console.warn('Erro ao atualizar online, enviando para fila:', err)
          await addAction({
            type: 'COMPLETE_TASK',
            payload: { atividadeId: record.id, taskId: record.id, operator: user.name },
          })
        }
      } else {
        await addAction({
          type: 'COMPLETE_TASK',
          payload: { atividadeId: record.id, taskId: record.id, operator: user.name },
        })
        toast({
          title: 'Conclusão Salva Offline',
          description: 'Será sincronizada com o banco assim que a conexão retornar.',
        })
      }
    } else {
      // Reabrir tarefa
      if (isOnline) {
        try {
          await updateAtividade(record.id, {
            status: 'planejada',
            concluido_em: undefined,
            concluido_por: undefined,
          } as any)
        } catch (e) {
          console.warn(e)
        }
      }
    }
  }

  // Ao clicar em uma tarefa com lote vinculado, pode abrir a gaveta de operação correspondente
  const handleOpenTaskOperation = (rec: AtividadeRecord) => {
    let targetLote: LotRecord | undefined
    if (rec.lote_ids && rec.lote_ids.length > 0) {
      targetLote = realLots.find((l) => l.id === rec.lote_ids[0])
    }
    if (!targetLote && realLots.length > 0) {
      targetLote = realLots[0]
    }

    if (targetLote) {
      let defaultOp = 'servico'
      if (rec.tipo === 'pesagem') defaultOp = 'pesagem'
      else if (rec.tipo === 'comercial') defaultOp = 'abate'
      else if (rec.tipo === 'manejo') defaultOp = 'movimentar'
      openDrawer(targetLote, defaultOp)
    }
  }

  return (
    <div className="space-y-4 pb-20 sm:pb-6 max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground p-6 -mx-4 -mt-4 sm:rounded-b-2xl shadow-md mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operações Mobile</h2>
          <p className="text-primary-foreground/80 mt-1 text-sm">
            Operador: <span className="font-semibold">{user.name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs px-2 bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={toggleSimulatedOffline}
              title="Alternar simulação de conectividade offline"
            >
              {simulatedOffline ? (
                <Radio className="h-3 w-3 mr-1 text-amber-300" />
              ) : (
                <Wifi className="h-3 w-3 mr-1" />
              )}
              {simulatedOffline ? 'Simular Online' : 'Simular Offline'}
            </Button>
          </div>
          {!isOnline && (
            <Badge
              variant="destructive"
              className="bg-amber-600 text-white border-0 opacity-95 gap-1.5 py-1 text-xs"
            >
              <CloudOff className="h-3 w-3" /> Fila Offline Ativa
            </Badge>
          )}
          {isSyncing && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" /> Sincronizando
            </Badge>
          )}
          {queue.length > 0 && (
            <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full text-white font-medium">
              {queue.length} ação(ões) na fila
            </span>
          )}
        </div>
      </div>

      {/* Seção de Tarefas do Dia: Banco Real */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> Tarefas do Dia (Calendário Real)
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono">
            {tarefasDoDia.length} tarefa(s)
          </Badge>
        </div>

        <div className="grid gap-3">
          {loadingAtividades ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
              Carregando tarefas do banco...
            </div>
          ) : tarefasDoDia.length === 0 ? (
            <Card className="p-4 text-center border-dashed">
              <p className="text-xs text-muted-foreground">
                Nenhuma tarefa pendente agendada para hoje no calendário.
              </p>
            </Card>
          ) : (
            tarefasDoDia.map((occ) => {
              const rec = occ.record
              const isVencida = isAtividadeVencida(rec)
              const isDone = rec.status === 'concluida'
              const lote = realLots.find((l) => rec.lote_ids && rec.lote_ids.includes(l.id))

              return (
                <Card
                  key={occ.virtualId}
                  className={`transition-all border-l-4 ${
                    isVencida
                      ? 'border-l-destructive bg-red-500/10 border-red-500/40'
                      : isDone
                        ? 'border-l-emerald-600 bg-muted/40 opacity-80'
                        : 'border-l-primary border-border'
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge
                          style={{
                            backgroundColor: tipoCores[rec.tipo],
                            color: '#fff',
                          }}
                          className="text-[9px] px-1.5 py-0 h-4 font-normal"
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

                        {isVencida && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0 h-4 animate-pulse gap-1"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" /> VENCIDA
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-semibold text-sm cursor-pointer hover:underline ${
                            isDone ? 'text-muted-foreground line-through' : ''
                          } ${isVencida ? 'text-destructive font-bold' : ''}`}
                          onClick={() => handleOpenTaskOperation(rec)}
                        >
                          {rec.titulo}
                        </span>
                        {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                        {lote ? (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {lote.name}
                          </Badge>
                        ) : rec.setor ? (
                          <span className="text-[11px] font-medium">{rec.setor}</span>
                        ) : null}

                        {rec.insumos && rec.insumos.length > 0 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {rec.insumos
                              .map((i) => `${i.quantidade} ${i.unidade || ''} ${i.item}`)
                              .join(', ')}
                          </span>
                        )}
                      </div>

                      {lote && !isDone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-1.5 mt-2 text-primary hover:bg-primary/10 -ml-1.5"
                          onClick={() => handleOpenTaskOperation(rec)}
                        >
                          Abrir Lote ({lote.name}) no Manejo →
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <Switch
                        checked={isDone}
                        onCheckedChange={() => handleToggleAtividadeReal(rec, isDone)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">
                        {isDone ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        Lotes & Manejo Livre
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lote ou pasto..."
          className="pl-9 bg-background shadow-sm h-12 text-base rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3 mt-4">
        {filteredLotes.map((lote) => (
          <Card
            key={lote.id}
            className="cursor-pointer hover:border-primary transition-colors active:scale-[0.98] rounded-xl shadow-sm border-muted"
            onClick={() => openDrawer(lote)}
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{lote.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 uppercase">
                    {lote.sector || 'Geral'}
                  </Badge>
                  {lote.status === 'abated' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 border-amber-300"
                    >
                      Abatido
                    </Badge>
                  )}
                  {lote.is_arrendamento && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-700 border-amber-400 bg-amber-500/10"
                    >
                      Arrendamento
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Beef className="h-3.5 w-3.5" /> {lote.headcount || 0} cab
                  <span className="mx-1">•</span>
                  <Scale className="h-3.5 w-3.5" />{' '}
                  {lote.peso_medio_atual || lote.final_weight || lote.initial_weight || 0} kg méd.
                  <span className="mx-1">•</span>
                  <MapPin className="h-3.5 w-3.5" /> {lote.pasto_atual || 'Pasto 01'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="flex justify-between items-center text-xl">
              {selectedLote?.name}
              <Badge className="text-sm px-2 py-1">{selectedLote?.headcount || 0} cab</Badge>
            </DrawerTitle>
            <DrawerDescription className="text-sm mt-1">
              Local atual:{' '}
              <span className="font-medium text-foreground">
                {selectedLote?.pasto_atual || 'Pasto 01 - Sede'}
              </span>{' '}
              ({selectedLote?.sector || 'Geral'}) • Peso anterior:{' '}
              <span className="font-semibold text-foreground">
                {selectedLote?.peso_medio_atual ||
                  selectedLote?.final_weight ||
                  selectedLote?.initial_weight ||
                  0}{' '}
                kg
              </span>
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2 space-y-4 overflow-y-auto max-h-[65vh]">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tipo de Operação</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pesagem">Registro Rápido de Pesagem (Banco Real)</SelectItem>
                  <SelectItem value="movimentar">Troca de Pasto / Retiro</SelectItem>
                  <SelectItem value="contagem">Atualizar Contagem (Mortalidade)</SelectItem>
                  <SelectItem value="abate">Saída para Abate / Venda</SelectItem>
                  <SelectItem value="servico">Lançar Manejo Sanitário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'pesagem' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Peso Médio Aferido (kg)</Label>
                  <ScaleIntegrationModal
                    animalId={selectedLote?.name || 'Lote'}
                    onSaveWeight={(val) => {
                      setPesoMedioInput(val)
                      setOrigemPesagem('balanca')
                      toast({
                        title: 'Capturado da Balança Eletrônica',
                        description: `Peso de ${val} kg preenchido automaticamente via Bluetooth.`,
                      })
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 485"
                    className="h-16 text-3xl font-bold text-center font-mono"
                    value={pesoMedioInput}
                    onChange={(e) => setPesoMedioInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Animais Pesados</Label>
                    <Input
                      type="number"
                      value={qtdAnimaisInput}
                      onChange={(e) => setQtdAnimaisInput(e.target.value)}
                      placeholder="Qtd cabeças"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Origem do Dado</Label>
                    <Select
                      value={origemPesagem}
                      onValueChange={(val: any) => setOrigemPesagem(val)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="balanca">Balança Eletrônica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Opção de saída para abate/venda */}
                <div className="pt-2 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold cursor-pointer">
                        Saída para Abate / Venda
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Fecha o lote, calcula @ produzidas e ganho de carcaça (GDC)
                      </p>
                    </div>
                    <Switch
                      checked={isAbateSaida}
                      onCheckedChange={setIsAbateSaida}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  {isAbateSaida && (
                    <div className="grid grid-cols-2 gap-3 bg-background p-3 rounded-lg border">
                      <div className="space-y-1">
                        <Label className="text-xs">Rendimento Carcaça (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={rendimentoInput}
                          onChange={(e) => setRendimentoInput(e.target.value)}
                          placeholder="Ex: 54.0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Peso Carcaça Estimado</Label>
                        <div className="h-9 px-3 flex items-center bg-muted/50 rounded-md font-mono text-sm font-semibold text-emerald-600">
                          {pesoMedioInput
                            ? `${((parseFloat(pesoMedioInput) * (parseFloat(rendimentoInput) || 53.5)) / 100).toFixed(1)} kg`
                            : '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Grava diretamente na coleção real de pesagens, atualiza o lote e recalibra GMD e
                  diárias Exagro.
                </p>
              </div>
            )}

            {actionType === 'movimentar' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Select defaultValue="pasto-2">
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pasto-1">Pasto 01 - Sede</SelectItem>
                      <SelectItem value="pasto-2">Pasto 02 - Fundo</SelectItem>
                      <SelectItem value="pasto-3">Pasto 03 - Represa</SelectItem>
                      <SelectItem value="conf-1">Confinamento A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {actionType === 'contagem' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nova Contagem</Label>
                    <Input
                      type="number"
                      defaultValue={selectedLote?.headcount}
                      className="h-12 text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select defaultValue="morte">
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ajuste">Ajuste / Erro</SelectItem>
                        <SelectItem value="morte">Mortalidade</SelectItem>
                        <SelectItem value="nascimento">Nascimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {actionType === 'abate' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Qtd de Cabeças Desembarcadas</Label>
                  <Input type="number" placeholder="Ex: 40" className="h-12 text-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Comprador / Frigorífico</Label>
                  <Input placeholder="Nome do destino..." className="h-12" />
                </div>
              </div>
            )}

            {actionType === 'servico' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label>Descrição do Serviço / Manejo</Label>
                  <Input placeholder="Ex: Aplicação de vermífugo..." className="h-12" />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="pt-4 pb-8">
            <Button onClick={handleAction} size="lg" className="w-full text-base h-12 shadow-md">
              Confirmar Operação {isOnline ? '' : '(Offline)'}
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="lg" className="w-full h-12">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
