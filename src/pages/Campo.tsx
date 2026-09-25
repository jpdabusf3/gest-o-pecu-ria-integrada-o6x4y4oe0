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
  RotateCw,
  Package,
  Hourglass,
  XCircle,
  Clock,
  History,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useFarm } from '@/contexts/FarmContext'
import { getLots, LotRecord, updateLot } from '@/services/lots'
import { createPesagem, PesagemInput } from '@/services/pesagens'
import {
  registrarMovimentacaoRebanho,
  registrarVendaGado,
  salvarItemEstoque,
} from '@/services/fechamento'
import {
  AtividadeRecord,
  getAtividades,
  expandAtividades,
  isAtividadeVencida,
  tipoCores,
  tipoLabel,
  getStatusLabel,
  transicionarStatusAtividade,
  updateAtividade,
  isAlertaEmAndamentoExcessivo,
} from '@/services/atividades'
import { getMotivoLabel } from '@/services/historicoStatus'
import { useRealtime } from '@/hooks/use-realtime'
import { ScaleIntegrationModal } from '@/components/ScaleIntegrationModal'
import { ModalJustificativaNaoRealizada } from '@/components/campo/ModalJustificativaNaoRealizada'
import { ModalEmAndamento } from '@/components/campo/ModalEmAndamento'
import { ModalReagendarAtividade } from '@/components/campo/ModalReagendarAtividade'

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

  // Modais de status
  const [modalNaoRealizadaOpen, setModalNaoRealizadaOpen] = useState(false)
  const [modalEmAndamentoOpen, setModalEmAndamentoOpen] = useState(false)
  const [modalReagendarOpen, setModalReagendarOpen] = useState(false)
  const [selectedAtividadeAction, setSelectedAtividadeAction] = useState<AtividadeRecord | null>(
    null,
  )

  // Campos de pesagem rápida
  const [pesoMedioInput, setPesoMedioInput] = useState('')
  const [qtdAnimaisInput, setQtdAnimaisInput] = useState('')
  const [novaContagemInput, setNovaContagemInput] = useState('')
  const [motivoContagem, setMotivoContagem] = useState<'ajuste' | 'morte' | 'nascimento'>('morte')
  const [abateQtdInput, setAbateQtdInput] = useState('')
  const [abateCompradorInput, setAbateCompradorInput] = useState('')
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
  useRealtime('historico_status', () => loadAtividadesHoje())

  // -------------------------------------------------------------
  // TAREFAS DO DIA DO RESPONSÁVEL (Alimentadas pela coleção "atividades" real)
  // Regras:
  // - Vencida e não concluída sobe para o topo e fica destacada em vermelho
  // - 3 estados diretos com botões grandes (área de toque >= 48px):
  //   ✅ Realizado | ⏳ Em andamento | ❌ Não realizado
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
      if (user.role === 'operador') {
        const resp = (occ.record.responsavel_id || '').toLowerCase()
        return (
          resp.includes(normalizedUserName) ||
          resp.includes('joão') ||
          resp.includes('equipe') ||
          resp.includes('campo')
        )
      }
      return true
    })

    // Ordenação estrita: Vencidas e pendentes primeiro, depois horário
    filteredForUser.sort((a, b) => {
      const aVencida = isAtividadeVencida(a.record, today)
      const bVencida = isAtividadeVencida(b.record, today)

      if (aVencida && !bVencida) return -1
      if (!aVencida && bVencida) return 1

      const isAFin = a.record.status === 'realizada' || a.record.status === 'concluida'
      const isBFin = b.record.status === 'realizada' || b.record.status === 'concluida'

      if (isAFin && !isBFin) return 1
      if (!isAFin && isBFin) return -1

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

  // -------------------------------------------------------------
  // TRANSIÇÕES DE STATUS COM SUPORTE OFFLINE & AUDITORIA
  // -------------------------------------------------------------

  // 1. Marcar como "REALIZADO"
  const handleMarcarRealizado = async (record: AtividadeRecord) => {
    const timestamp = new Date().toISOString()

    // Otimista
    setAtividadesReais((prev) =>
      prev.map((a) =>
        a.id === record.id
          ? {
              ...a,
              status: 'realizada',
              concluido_em: timestamp,
              concluido_por: user.name,
            }
          : a,
      ),
    )

    // Deduz estoque para os insumos vinculados via registerConsumption e alimenta coleção real estoque_insumos
    if (record.insumos && record.insumos.length > 0) {
      const targetLote = (record.lote_ids && record.lote_ids[0]) || record.setor || 'GERAL'
      for (const ins of record.insumos) {
        if (ins.inventoryId && ins.quantidade > 0) {
          await registerConsumption(targetLote, ins.inventoryId, ins.quantidade)
          if (!isOnline) {
            await addAction({
              type: 'DEDUCT_INVENTORY',
              payload: {
                inventoryId: ins.inventoryId,
                amount: ins.quantidade,
                item: ins.item,
              },
            })
          }
        }
      }
      toast({
        title: 'Estoque Deduzido & Sincronizado',
        description: `${record.insumos.map((i) => `${i.quantidade} ${i.unidade || 'un'} de ${i.item}`).join(', ')}`,
      })
    }

    if (isOnline) {
      try {
        await transicionarStatusAtividade({
          atividadeId: record.id,
          statusNovo: 'realizada',
          statusAnterior: record.status,
          usuarioNome: user.name,
          offline: false,
          timestamp,
        })
        toast({
          title: 'Atividade Realizada!',
          description: `"${record.titulo}" gravada no banco real com carimbo de auditoria.`,
        })
      } catch (err) {
        console.warn('Falha online, enfileirando offline:', err)
        await addAction({
          type: 'UPDATE_ATIVIDADE_STATUS',
          payload: {
            atividadeId: record.id,
            statusNovo: 'realizada',
            statusAnterior: record.status,
            usuarioNome: user.name,
            timestamp,
          },
        })
        toast({
          title: 'Salvo Offline',
          description: 'Ação salva na fila local. Será sincronizada com carimbo offline.',
        })
      }
    } else {
      await addAction({
        type: 'UPDATE_ATIVIDADE_STATUS',
        payload: {
          atividadeId: record.id,
          statusNovo: 'realizada',
          statusAnterior: record.status,
          usuarioNome: user.name,
          timestamp,
        },
      })
      toast({
        title: 'Conclusão Salva Offline',
        description: 'Gravado localmente com carimbo offline=true para sincronização.',
      })
    }
  }

  // 2. Abrir modal "EM ANDAMENTO"
  const handleAbrirEmAndamento = (record: AtividadeRecord) => {
    setSelectedAtividadeAction(record)
    setModalEmAndamentoOpen(true)
  }

  // Confirmar "EM ANDAMENTO"
  const handleConfirmarEmAndamento = async (progresso: string) => {
    if (!selectedAtividadeAction) return
    const rec = selectedAtividadeAction
    const timestamp = new Date().toISOString()

    // Otimista
    setAtividadesReais((prev) =>
      prev.map((a) =>
        a.id === rec.id
          ? {
              ...a,
              status: 'em_andamento',
              iniciado_em: timestamp,
              progresso_observacoes: progresso,
            }
          : a,
      ),
    )

    if (isOnline) {
      try {
        await transicionarStatusAtividade({
          atividadeId: rec.id,
          statusNovo: 'em_andamento',
          statusAnterior: rec.status,
          usuarioNome: user.name,
          progresso,
          offline: false,
          timestamp,
        })
        toast({
          title: 'Atividade Em Andamento',
          description: `"${rec.titulo}" atualizada para em andamento.`,
        })
      } catch (err) {
        console.warn('Falha online, enfileirando offline:', err)
        await addAction({
          type: 'UPDATE_ATIVIDADE_STATUS',
          payload: {
            atividadeId: rec.id,
            statusNovo: 'em_andamento',
            statusAnterior: rec.status,
            usuarioNome: user.name,
            progresso,
            timestamp,
          },
        })
      }
    } else {
      await addAction({
        type: 'UPDATE_ATIVIDADE_STATUS',
        payload: {
          atividadeId: rec.id,
          statusNovo: 'em_andamento',
          statusAnterior: rec.status,
          usuarioNome: user.name,
          progresso,
          timestamp,
        },
      })
      toast({
        title: 'Salvo Offline (Em Andamento)',
        description: 'Gravado na fila local para sincronização futura.',
      })
    }
  }

  // 3. Abrir modal "NÃO REALIZADO" (Justificativa obrigatória)
  const handleAbrirNaoRealizada = (record: AtividadeRecord) => {
    setSelectedAtividadeAction(record)
    setModalNaoRealizadaOpen(true)
  }

  // Confirmar "NÃO REALIZADO"
  const handleConfirmarNaoRealizada = async (motivo: string, detalhes: string) => {
    if (!selectedAtividadeAction) return
    const rec = selectedAtividadeAction
    const timestamp = new Date().toISOString()

    // Otimista
    setAtividadesReais((prev) =>
      prev.map((a) =>
        a.id === rec.id
          ? {
              ...a,
              status: 'nao_realizada',
              motivo_nao_realizada: motivo,
              detalhes_motivo: detalhes,
              revisado_gestor: false,
            }
          : a,
      ),
    )

    if (isOnline) {
      try {
        await transicionarStatusAtividade({
          atividadeId: rec.id,
          statusNovo: 'nao_realizada',
          statusAnterior: rec.status,
          usuarioNome: user.name,
          motivo,
          detalhes,
          offline: false,
          timestamp,
        })
        toast({
          title: 'Não Realizado Registrado',
          description: `Motivo: ${getMotivoLabel(motivo)}. Notificação de revisão gerada ao gestor.`,
        })
      } catch (err) {
        console.warn('Falha online, enfileirando offline:', err)
        await addAction({
          type: 'UPDATE_ATIVIDADE_STATUS',
          payload: {
            atividadeId: rec.id,
            statusNovo: 'nao_realizada',
            statusAnterior: rec.status,
            usuarioNome: user.name,
            motivo,
            detalhes,
            timestamp,
          },
        })
      }
    } else {
      await addAction({
        type: 'UPDATE_ATIVIDADE_STATUS',
        payload: {
          atividadeId: rec.id,
          statusNovo: 'nao_realizada',
          statusAnterior: rec.status,
          usuarioNome: user.name,
          motivo,
          detalhes,
          timestamp,
        },
      })
      toast({
        title: 'Registrado Offline (Não Realizado)',
        description: 'Gravado com carimbo offline=true com justificativa obrigatória salva.',
      })
    }
  }

  // 4. Abrir modal "REAGENDAR"
  const handleAbrirReagendar = (record: AtividadeRecord) => {
    setSelectedAtividadeAction(record)
    setModalReagendarOpen(true)
  }

  // Confirmar Reagendamento
  const handleConfirmarReagendar = async (novaData: string, observacao: string) => {
    if (!selectedAtividadeAction) return
    const rec = selectedAtividadeAction
    const timestamp = new Date().toISOString()

    const isoDate = `${novaData}T08:00:00.000Z`

    // Otimista
    setAtividadesReais((prev) =>
      prev.map((a) =>
        a.id === rec.id
          ? {
              ...a,
              status: 'reagendada',
              data: isoDate,
              revisado_gestor: true,
            }
          : a,
      ),
    )

    if (isOnline) {
      try {
        await updateAtividade(rec.id, {
          data: isoDate,
          status: 'reagendada',
          revisado_gestor: true,
        } as any)

        await transicionarStatusAtividade({
          atividadeId: rec.id,
          statusNovo: 'reagendada',
          statusAnterior: rec.status,
          usuarioNome: user.name,
          detalhes: `Reagendado para ${novaData}. ${observacao}`,
          offline: false,
          timestamp,
        })

        toast({
          title: 'Atividade Reagendada!',
          description: `Nova data: ${new Date(isoDate).toLocaleDateString('pt-BR')}. Histórico preservado.`,
        })
      } catch (err) {
        console.warn('Erro ao reagendar:', err)
      }
    }
  }

  // Pesagem e outras ações da gaveta
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
            description: `Peso de ${pesoNum} kg gravado para o lote ${selectedLote.name}. GMD e indicadores zootécnicos calculados.`,
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
    } else if (actionType === 'contagem') {
      const novaQtd = parseInt(novaContagemInput, 10)
      const anterior = selectedLote.headcount || 0
      const diff = anterior - novaQtd

      try {
        if (diff > 0 && motivoContagem === 'morte') {
          await registrarMovimentacaoRebanho({
            data: new Date().toISOString(),
            frente:
              (selectedLote.frente as any) ||
              (selectedLote.is_arrendamento ? 'arrendamento' : 'recria'),
            lote_id: selectedLote.id,
            tipo: 'morte',
            qtd_cabecas: diff,
            peso_total_kg:
              diff * (selectedLote.peso_medio_atual || selectedLote.final_weight || 350),
            valor_total_rs: diff * 3200,
            documento: `CAMPO-MORTE-${Date.now().toString().slice(-4)}`,
            sexo: selectedLote.sex as any,
            observacoes: `Mortalidade de ${diff} cab registradas no modo Campo por ${user.name}.`,
          })
        } else if (diff < 0 && motivoContagem === 'nascimento') {
          const nascidos = Math.abs(diff)
          await registrarMovimentacaoRebanho({
            data: new Date().toISOString(),
            frente: (selectedLote.frente as any) || 'cria',
            lote_id: selectedLote.id,
            tipo: 'nascimento',
            qtd_cabecas: nascidos,
            peso_total_kg: nascidos * 35,
            valor_total_rs: nascidos * 2000,
            documento: `CAMPO-NASC-${Date.now().toString().slice(-4)}`,
            sexo: selectedLote.sex as any,
            observacoes: `Nascimentos de ${nascidos} cab registradas no Campo por ${user.name}.`,
          })
        }
        await updateLot(selectedLote.id, { headcount: isNaN(novaQtd) ? anterior : novaQtd })
        toast({
          title: 'Contagem Atualizada!',
          description: `Lote ${selectedLote.name} atualizado para ${novaQtd} cab. Movimentação de rebanho registrada sem digitação dupla.`,
        })
        loadRealLots()
      } catch (err) {
        console.error('Erro ao atualizar contagem no banco:', err)
      }
    } else if (actionType === 'abate') {
      const qtdAbate = parseInt(abateQtdInput, 10) || selectedLote.headcount || 1
      const pesoMedio = selectedLote.peso_medio_atual || selectedLote.final_weight || 530
      const pesoVivoTotal = qtdAbate * pesoMedio
      const rendimento = 54.0
      const pesoCarcacaTotal = (pesoVivoTotal * rendimento) / 100
      const precoAt = 245.0
      const receitaTotal = (pesoCarcacaTotal / 15) * precoAt

      try {
        await registrarVendaGado({
          data: new Date().toISOString(),
          lote_id: selectedLote.id,
          frente:
            (selectedLote.frente as any) ||
            (selectedLote.is_arrendamento ? 'arrendamento' : 'engorda'),
          sexo: selectedLote.sex as any,
          qtd_cabecas: qtdAbate,
          peso_vivo_total: pesoVivoTotal,
          rendimento_carcaca_pct: rendimento,
          peso_carcaca_total: pesoCarcacaTotal,
          preco_rs_at: precoAt,
          receita_total: Number(receitaTotal.toFixed(2)),
          comprador: abateCompradorInput || 'Frigorífico Parceiro',
        })

        await registrarMovimentacaoRebanho({
          data: new Date().toISOString(),
          frente: (selectedLote.frente as any) || 'engorda',
          lote_id: selectedLote.id,
          tipo: 'venda',
          qtd_cabecas: qtdAbate,
          peso_total_kg: pesoVivoTotal,
          valor_total_rs: Number(receitaTotal.toFixed(2)),
          documento: `NF-CAMPO-${Date.now().toString().slice(-4)}`,
          sexo: selectedLote.sex as any,
          observacoes: `Saída para abate/venda via Campo (${abateCompradorInput || 'Frigorífico'}).`,
        })

        const restante = Math.max(0, (selectedLote.headcount || 0) - qtdAbate)
        await updateLot(selectedLote.id, {
          headcount: restante,
          status: restante === 0 ? 'sold' : selectedLote.status,
        })

        toast({
          title: 'Venda / Abate Registrado!',
          description: `${qtdAbate} animais enviados para abate. Receita e movimentação alimentadas automaticamente.`,
        })
        loadRealLots()
      } catch (err) {
        console.error('Erro ao registrar abate no banco:', err)
      }
    } else {
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
    setNovaContagemInput(String(lote.headcount || ''))
    setAbateQtdInput(String(lote.headcount || ''))
    setAbateCompradorInput('')
    setIsAbateSaida(false)
    setActionType(defaultOperacao)
    setOrigemPesagem('manual')
    setDrawerOpen(true)
  }

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
    <div className="space-y-4 pb-24 sm:pb-8 max-w-lg mx-auto">
      {/* Top Header Mobile com Conectividade */}
      <div className="bg-primary text-primary-foreground p-5 -mx-4 -mt-4 sm:rounded-b-2xl shadow-md mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modo Campo</h2>
          <p className="text-primary-foreground/80 mt-0.5 text-xs">
            Operador: <span className="font-semibold">{user.name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs px-2.5 bg-white/20 hover:bg-white/30 text-white border-0 font-medium"
              onClick={toggleSimulatedOffline}
              title="Alternar simulação de conectividade offline"
            >
              {simulatedOffline ? (
                <Radio className="h-3.5 w-3.5 mr-1 text-amber-300" />
              ) : (
                <Wifi className="h-3.5 w-3.5 mr-1" />
              )}
              {simulatedOffline ? 'Simular Online' : 'Simular Offline'}
            </Button>
          </div>
          {!isOnline && (
            <Badge
              variant="destructive"
              className="bg-amber-600 text-white border-0 opacity-95 gap-1.5 py-0.5 text-[11px]"
            >
              <CloudOff className="h-3 w-3" /> Fila Offline Ativa
            </Badge>
          )}
          {isSyncing && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 gap-1.5 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" /> Sincronizando
            </Badge>
          )}
          {queue.length > 0 && (
            <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded-full text-white font-medium">
              {queue.length} ação(ões) na fila
            </span>
          )}
        </div>
      </div>

      {/* Seção de Tarefas do Dia: Banco Real com os 3 Novos Estados */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" /> Tarefas de Hoje (Calendário Real)
          </h3>
          <Badge variant="outline" className="text-xs font-mono">
            {tarefasDoDia.length} tarefa(s)
          </Badge>
        </div>

        <div className="grid gap-3.5">
          {loadingAtividades ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Carregando tarefas do banco real...
            </div>
          ) : tarefasDoDia.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <p className="text-xs text-muted-foreground">
                Nenhuma tarefa pendente agendada para hoje no calendário.
              </p>
            </Card>
          ) : (
            tarefasDoDia.map((occ) => {
              const rec = occ.record
              const isVencida = isAtividadeVencida(rec)
              const isRealizada = rec.status === 'realizada' || rec.status === 'concluida'
              const isEmAndamento = rec.status === 'em_andamento'
              const isNaoRealizada = rec.status === 'nao_realizada'
              const isReagendada = rec.status === 'reagendada'
              const alerta3Dias = isAlertaEmAndamentoExcessivo(rec)
              const lote = realLots.find((l) => rec.lote_ids && rec.lote_ids.includes(l.id))

              return (
                <Card
                  key={occ.virtualId}
                  className={`transition-all border-l-4 shadow-sm ${
                    isVencida
                      ? 'border-l-destructive bg-red-500/10 border-red-500/40'
                      : isRealizada
                        ? 'border-l-emerald-600 bg-muted/30 opacity-90'
                        : isEmAndamento
                          ? 'border-l-amber-500 bg-amber-500/5'
                          : isNaoRealizada
                            ? 'border-l-rose-500 bg-rose-500/5'
                            : isReagendada
                              ? 'border-l-blue-500 bg-blue-500/5'
                              : 'border-l-primary border-border'
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Cabeçalho do Cartão da Tarefa */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Badge
                          style={{
                            backgroundColor: tipoCores[rec.tipo],
                            color: '#fff',
                          }}
                          className="text-[10px] px-2 py-0.5 font-medium"
                        >
                          {tipoLabel(rec.tipo)}
                        </Badge>

                        {rec.is_arrendamento && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.5 border-amber-500 text-amber-700 bg-amber-500/10"
                          >
                            Arrendamento
                          </Badge>
                        )}

                        {isVencida && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0.5 animate-pulse gap-1 font-bold"
                          >
                            <AlertTriangle className="h-3 w-3" /> VENCIDA
                          </Badge>
                        )}

                        {alerta3Dias && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0.5 bg-amber-600 text-white gap-1"
                          >
                            <Clock className="h-3 w-3" /> Em andamento &gt; 3 dias
                          </Badge>
                        )}

                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 font-semibold ml-auto ${
                            isRealizada
                              ? 'bg-emerald-600 text-white'
                              : isEmAndamento
                                ? 'bg-amber-500 text-white'
                                : isNaoRealizada
                                  ? 'bg-rose-600 text-white'
                                  : isReagendada
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-muted text-foreground'
                          }`}
                        >
                          {getStatusLabel(rec.status)}
                        </Badge>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`font-bold text-base cursor-pointer hover:underline leading-snug ${
                            isRealizada ? 'text-muted-foreground line-through' : 'text-foreground'
                          } ${isVencida ? 'text-destructive font-black' : ''}`}
                          onClick={() => handleOpenTaskOperation(rec)}
                        >
                          {rec.titulo}
                        </span>
                      </div>

                      {/* Informações de Local / Insumos / Lotes */}
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {lote ? (
                          <Badge variant="outline" className="text-[11px] font-mono">
                            {lote.name}
                          </Badge>
                        ) : rec.setor ? (
                          <span className="text-[11px] font-medium">📍 {rec.setor}</span>
                        ) : null}

                        {rec.insumos && rec.insumos.length > 0 && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {rec.insumos
                              .map((i) => `${i.quantidade} ${i.unidade || ''} ${i.item}`)
                              .join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Informações de progresso ou motivo registrado */}
                      {isEmAndamento && rec.progresso_observacoes && (
                        <div className="mt-2 text-xs bg-amber-500/15 border border-amber-500/30 p-2 rounded-lg text-amber-900 dark:text-amber-200">
                          <strong>Progresso salvo:</strong> {rec.progresso_observacoes}
                        </div>
                      )}

                      {isNaoRealizada && rec.motivo_nao_realizada && (
                        <div className="mt-2 text-xs bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg text-rose-900 dark:text-rose-200">
                          <strong>Justificativa:</strong> {getMotivoLabel(rec.motivo_nao_realizada)}
                          {rec.detalhes_motivo && ` - ${rec.detalhes_motivo}`}
                        </div>
                      )}
                    </div>

                    {/* BOTÕES GRANDES DE ESTADO (ÁREA DE TOQUE MÍNIMA 48PX) */}
                    <div className="pt-2 border-t border-border/60">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Botão 1: Realizado */}
                        <Button
                          type="button"
                          variant={isRealizada ? 'default' : 'outline'}
                          className={`min-h-[48px] h-12 text-xs font-bold transition-all flex flex-col justify-center items-center gap-1 active:scale-[0.98] ${
                            isRealizada
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-500'
                          }`}
                          onClick={() => handleMarcarRealizado(rec)}
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>✅ Realizado</span>
                        </Button>

                        {/* Botão 2: Em Andamento */}
                        <Button
                          type="button"
                          variant={isEmAndamento ? 'default' : 'outline'}
                          className={`min-h-[48px] h-12 text-xs font-bold transition-all flex flex-col justify-center items-center gap-1 active:scale-[0.98] ${
                            isEmAndamento
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                              : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-500'
                          }`}
                          onClick={() => handleAbrirEmAndamento(rec)}
                        >
                          <Hourglass className="h-4 w-4 shrink-0" />
                          <span>⏳ Andamento</span>
                        </Button>

                        {/* Botão 3: Não Realizado */}
                        <Button
                          type="button"
                          variant={isNaoRealizada ? 'default' : 'outline'}
                          className={`min-h-[48px] h-12 text-xs font-bold transition-all flex flex-col justify-center items-center gap-1 active:scale-[0.98] ${
                            isNaoRealizada
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                              : 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-500'
                          }`}
                          onClick={() => handleAbrirNaoRealizada(rec)}
                        >
                          <XCircle className="h-4 w-4 shrink-0" />
                          <span>❌ Não Feito</span>
                        </Button>
                      </div>

                      {/* Reabertura / Reagendamento com 1 Toque */}
                      {isNaoRealizada && (
                        <div className="mt-2.5 pt-2 border-t border-dashed flex justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-10 text-xs font-semibold gap-1.5 w-full bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => handleAbrirReagendar(rec)}
                          >
                            <RotateCw className="h-3.5 w-3.5" /> Reagendar com 1 Toque (+1 Dia Útil)
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2 px-1">
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

      {/* Gaveta de Operação de Manejo / Balança */}
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
                  diárias zootécnicas.
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
                      value={novaContagemInput}
                      onChange={(e) => setNovaContagemInput(e.target.value)}
                      className="h-12 text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Select
                      value={motivoContagem}
                      onValueChange={(val: any) => setMotivoContagem(val)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morte">Mortalidade (Registra Morte)</SelectItem>
                        <SelectItem value="nascimento">Nascimento (Registra Entrada)</SelectItem>
                        <SelectItem value="ajuste">Ajuste / Erro Inventário</SelectItem>
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
                  <Input
                    type="number"
                    placeholder="Ex: 40"
                    value={abateQtdInput}
                    onChange={(e) => setAbateQtdInput(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprador / Frigorífico</Label>
                  <Input
                    placeholder="Nome do destino..."
                    value={abateCompradorInput}
                    onChange={(e) => setAbateCompradorInput(e.target.value)}
                    className="h-12"
                  />
                </div>{' '}
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

      {/* Modais de Controle de Status */}
      <ModalJustificativaNaoRealizada
        open={modalNaoRealizadaOpen}
        onOpenChange={setModalNaoRealizadaOpen}
        atividade={selectedAtividadeAction}
        onConfirm={handleConfirmarNaoRealizada}
      />

      <ModalEmAndamento
        open={modalEmAndamentoOpen}
        onOpenChange={setModalEmAndamentoOpen}
        atividade={selectedAtividadeAction}
        onConfirm={handleConfirmarEmAndamento}
      />

      <ModalReagendarAtividade
        open={modalReagendarOpen}
        onOpenChange={setModalReagendarOpen}
        atividade={selectedAtividadeAction}
        onConfirm={handleConfirmarReagendar}
      />
    </div>
  )
}
