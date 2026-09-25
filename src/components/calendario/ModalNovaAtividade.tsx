import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Sparkles, Calendar as CalendarIcon } from 'lucide-react'
import {
  AtividadeInput,
  TipoAtividade,
  Recorrencia,
  InsumoAtividade,
  createAtividade,
  gerarGatilhosIatf,
  tipoLabel,
} from '@/services/atividades'
import { LotRecord } from '@/services/lots'
import { useAuth } from '@/contexts/AuthContext'
import { useFarm } from '@/contexts/FarmContext'
import { useToast } from '@/hooks/use-toast'

interface ModalNovaAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lots: LotRecord[]
  onSuccess: () => void
  defaultDate?: string
}

export function ModalNovaAtividade({
  open,
  onOpenChange,
  lots,
  onSuccess,
  defaultDate,
}: ModalNovaAtividadeProps) {
  const { user } = useAuth()
  const { inventory } = useFarm()
  const { toast } = useToast()

  const todayStr = defaultDate || new Date().toISOString().split('T')[0]

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoAtividade>('sanidade')
  const [data, setData] = useState(todayStr)
  const [hora, setHora] = useState('08:00')
  const [frente, setFrente] = useState<
    'cria' | 'recria' | 'engorda' | 'confinamento' | 'arrendamento'
  >('recria')
  const [selectedLots, setSelectedLots] = useState<string[]>([])
  const [setor, setSetor] = useState('Curral Principal')
  const [responsavel, setResponsavel] = useState(user.name || 'Administrador (Sede)')
  const [recorrencia, setRecorrencia] = useState<Recorrencia>('unica')
  const [descricao, setDescricao] = useState('')
  const [isArrendamento, setIsArrendamento] = useState(false)
  const [custoPrevisto, setCustoPrevisto] = useState<string>('0')
  const [alertaDiasAntes, setAlertaDiasAntes] = useState<number>(tipo === 'sanidade' ? 7 : 0)

  // Insumos vinculados
  const [insumos, setInsumos] = useState<InsumoAtividade[]>([])
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [qtdInsumo, setQtdInsumo] = useState('')

  // Gatilhos de reprodução
  const [gerarGatilhosRepro, setGerarGatilhosRepro] = useState(true)
  const [diasDg, setDiasDg] = useState('35') // Diagnóstico de gestação (+30 a +60 dias)

  const [isSaving, setIsSaving] = useState(false)

  const handleAddInsumo = () => {
    if (!selectedInventoryId || !qtdInsumo) return
    const item = inventory.find((i) => i.id === selectedInventoryId)
    if (!item) return

    const qtd = parseFloat(qtdInsumo)
    if (isNaN(qtd) || qtd <= 0) return

    // Requisito B: Aviso de insumo insuficiente no agendamento/edição
    const estoqueDisponivel = item.qtd ?? 0
    if (qtd > estoqueDisponivel) {
      toast({
        title: '⚠️ Aviso: Insumo Insuficiente no Estoque!',
        description: `A quantidade solicitada (${qtd} ${item.unidade}) excede o saldo disponível em estoque (${estoqueDisponivel} ${item.unidade} de ${item.item}). O agendamento foi incluído, mas providencie reposição com urgência.`,
        variant: 'destructive',
      })
    }

    setInsumos((prev) => [
      ...prev,
      {
        inventoryId: item.id,
        item: item.item,
        quantidade: qtd,
        unidade: item.unidade,
        custoUnitario: item.custoUnitario || 0,
      },
    ])

    // Atualiza custo previsto automaticamente se aplicável
    const custoAdd = (item.custoUnitario || 0) * qtd
    setCustoPrevisto((prev) => String((parseFloat(prev || '0') + custoAdd).toFixed(2)))

    setSelectedInventoryId('')
    setQtdInsumo('')
  }

  const handleRemoveInsumo = (index: number) => {
    setInsumos((prev) => {
      const removed = prev[index]
      if (removed && removed.custoUnitario) {
        const custoSub = removed.custoUnitario * removed.quantidade
        setCustoPrevisto((c) => String(Math.max(0, parseFloat(c || '0') - custoSub).toFixed(2)))
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleFrenteChange = (val: any) => {
    setFrente(val)
    if (val === 'arrendamento') {
      setIsArrendamento(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) {
      toast({
        title: 'Título Obrigatório',
        description: 'Informe o título da atividade.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSaving(true)
      const dataIso = new Date(`${data}T${hora}:00`).toISOString()

      const baseInput: AtividadeInput = {
        titulo: titulo.trim(),
        tipo,
        data: dataIso,
        frente,
        lote_ids: selectedLots,
        setor,
        responsavel_id: responsavel,
        recorrencia,
        insumos,
        status: 'planejada',
        descricao: descricao.trim(),
        is_arrendamento: isArrendamento || frente === 'arrendamento',
        custo_previsto: parseFloat(custoPrevisto) || 0,
        alerta_dias_antes: alertaDiasAntes,
        created_by: user.name,
      }

      // Cria a atividade principal
      const created = await createAtividade(baseInput)

      // Se for do tipo 'reproducao' (ex.: IATF/Monta) e a opção estiver ativa, gera gatilhos automáticos
      if (tipo === 'reproducao' && gerarGatilhosRepro) {
        const diasDgNum = parseInt(diasDg, 10) || 35
        const gatilhos = gerarGatilhosIatf(baseInput)
        // Ajusta especificamente os dias de DG se customizado
        gatilhos[0].diasDepois = diasDgNum
        gatilhos[0].titulo = `DG - Diagnóstico de Gestação (+${diasDgNum}d) pós-${titulo.trim()}`

        for (const g of gatilhos) {
          const gDate = new Date(new Date(`${data}T${hora}:00`).getTime() + g.diasDepois * 86400000)
          await createAtividade({
            titulo: g.titulo,
            tipo: g.tipo,
            data: gDate.toISOString(),
            frente,
            lote_ids: selectedLots,
            setor,
            responsavel_id: responsavel,
            recorrencia: 'unica',
            insumos: [],
            status: 'planejada',
            descricao: g.descricao,
            is_arrendamento: isArrendamento || frente === 'arrendamento',
            custo_previsto: 0,
            parent_event_id: created.id,
            created_by: user.name,
          })
        }

        toast({
          title: 'Atividade e Gatilhos Criados!',
          description: `IATF gravada + DG (+${diasDgNum}d), Parto (+9 meses) e Desmama (+8 meses) projetados no calendário.`,
        })
      } else {
        toast({
          title: 'Atividade Salva',
          description: `Atividade "${titulo}" gravada no banco real com sucesso.`,
        })
      }

      onSuccess()
      onOpenChange(false)
      // Reset
      setTitulo('')
      setDescricao('')
      setInsumos([])
      setSelectedLots([])
    } catch (err: any) {
      console.error('Erro ao salvar atividade:', err)
      toast({
        title: 'Erro ao Salvar',
        description: err.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Cadastrar Nova Atividade / Manejo
          </DialogTitle>
          <DialogDescription>
            Gera o evento no calendário com previsão de custos, vínculo de insumos ao estoque e
            envio automático para o modo Campo do responsável.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Título & Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Título da Atividade *</Label>
              <Input
                placeholder="Ex: IATF Matrizes Lote 01, Vacinação Aftosa, Sal Mineral..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(val: TipoAtividade) => {
                  setTipo(val)
                  if (val === 'sanidade') setAlertaDiasAntes(7)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sanidade">Sanidade</SelectItem>
                  <SelectItem value="reproducao">Reprodução</SelectItem>
                  <SelectItem value="manejo">Manejo</SelectItem>
                  <SelectItem value="pesagem">Pesagem</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="nutricao">Nutrição / Trato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data & Hora & Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Horário Previsto</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Recorrência</Label>
              <Select value={recorrencia} onValueChange={(val: Recorrencia) => setRecorrencia(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="diaria">Diária (ex.: Sal, Trato)</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="anual">Anual (ex.: Vacina)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frente & Lote(s) & Setor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Frente de Produção</Label>
              <Select value={frente} onValueChange={handleFrenteChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cria">Cria</SelectItem>
                  <SelectItem value="recria">Recria</SelectItem>
                  <SelectItem value="engorda">Engorda</SelectItem>
                  <SelectItem value="confinamento">Confinamento</SelectItem>
                  <SelectItem value="arrendamento">Arrendamento de Fêmeas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lote Vinculado</Label>
              <Select
                value={selectedLots[0] || 'nenhum'}
                onValueChange={(val) => setSelectedLots(val === 'nenhum' ? [] : [val])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Lote..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum (Geral da Fazenda)</SelectItem>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.sector || l.frente || 'Geral'} - {l.headcount || 0} cab)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Setor / Local</Label>
              <Input
                placeholder="Curral, Pasto 02, Tronco..."
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
              />
            </div>
          </div>

          {/* Responsável & Custos & Arrendamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Responsável (Modo Campo) *</Label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador (Sede)">Administrador (Sede)</SelectItem>
                  <SelectItem value="Carlos (Gerente)">Carlos (Gerente)</SelectItem>
                  <SelectItem value="João (Operador Campo)">João (Operador Campo)</SelectItem>
                  <SelectItem value="Equipe Geral">Equipe Geral / Volante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Custo Previsto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={custoPrevisto}
                onChange={(e) => setCustoPrevisto(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-end pb-1.5">
              <div className="flex items-center justify-between border rounded-md p-2 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Arrendamento?</Label>
                  <p className="text-[10px] text-muted-foreground">Custos segregados</p>
                </div>
                <Switch checked={isArrendamento} onCheckedChange={setIsArrendamento} />
              </div>
            </div>
          </div>

          {/* Gatilho Reprodutivo Especial (IATF) */}
          {tipo === 'reproducao' && (
            <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-semibold text-pink-700 dark:text-pink-300">
                    Gatilhos Automáticos do Calendário Reprodutivo
                  </span>
                </div>
                <Switch
                  checked={gerarGatilhosRepro}
                  onCheckedChange={setGerarGatilhosRepro}
                  className="data-[state=checked]:bg-pink-600"
                />
              </div>

              {gerarGatilhosRepro && (
                <div className="text-xs space-y-2 text-muted-foreground pt-1">
                  <p>Ao salvar este evento, o sistema irá criar automaticamente no calendário:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-background/80 p-2 rounded border">
                      <span className="font-semibold text-foreground">
                        1. Diagnóstico de Gestação (DG)
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <Label className="text-[11px]">Dias após:</Label>
                        <Input
                          type="number"
                          className="h-7 w-16 text-center text-xs"
                          value={diasDg}
                          min={30}
                          max={60}
                          onChange={(e) => setDiasDg(e.target.value)}
                        />
                        <span className="text-[10px] text-muted-foreground">(+30 a +60d)</span>
                      </div>
                    </div>

                    <div className="bg-background/80 p-2 rounded border">
                      <span className="font-semibold text-foreground">2. Previsão de Parto</span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        +9 meses (~270 dias da IATF)
                      </p>
                    </div>

                    <div className="bg-background/80 p-2 rounded border">
                      <span className="font-semibold text-foreground">3. Desmama</span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Previsão de Parto + 8 meses
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gatilho Sanitário Especial */}
          {tipo === 'sanidade' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Gatilho Sanitário Obrigatório
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Gera notificação e destaque visual com antecedência na lista do dia.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Alerta dias antes:</Label>
                <Input
                  type="number"
                  className="h-8 w-16 text-center text-xs"
                  value={alertaDiasAntes}
                  onChange={(e) => setAlertaDiasAntes(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          )}

          {/* Insumos Vinculados (Estoque) */}
          <div className="border rounded-xl p-3 space-y-3 bg-muted/20">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">
                Insumos Necessários (Deduzidos do Estoque ao Concluir)
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {insumos.length} selecionado(s)
              </Badge>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione item do estoque..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.item} (Saldo: {inv.qtd} {inv.unidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Input
                type="number"
                step="0.1"
                placeholder="Qtd"
                className="w-24 h-9 text-xs"
                value={qtdInsumo}
                onChange={(e) => setQtdInsumo(e.target.value)}
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 px-3 gap-1"
                onClick={handleAddInsumo}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {insumos.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {insumos.map((ins, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-background p-2 rounded border text-xs"
                  >
                    <div>
                      <span className="font-semibold">{ins.item}</span> —{' '}
                      <span className="text-muted-foreground font-mono">
                        {ins.quantidade} {ins.unidade}
                      </span>
                      {ins.custoUnitario ? (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                          (R$ {(ins.custoUnitario * ins.quantidade).toFixed(2)})
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveInsumo(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição / Instruções para o Vaqueiro</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Utilizar pistola calibrada em 2ml por animal, checar cocho de água..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-32">
              {isSaving ? 'Gravando...' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
