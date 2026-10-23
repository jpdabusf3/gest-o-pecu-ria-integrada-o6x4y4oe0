import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge'
import { Award, Loader2, Sparkles, Baby, Plus, Trash2, Calendar, Layers, Tag } from 'lucide-react'
import {
  EstacaoMontaRecord,
  cadastrarResultadoFinalEstacao,
  getNascimentosEstacao,
  ItemNascimentoInput,
  SexoNascimento,
  CategoriaMatrizNascimento,
  ClasseMatrizNascimento,
} from '@/services/reproducao'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ModalCadastroResultadoFinalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estacoes: EstacaoMontaRecord[]
  estacaoPadraoId?: string
  onSucesso?: () => void
}

export function ModalCadastroResultadoFinal({
  open,
  onOpenChange,
  estacoes,
  estacaoPadraoId,
  onSucesso,
}: ModalCadastroResultadoFinalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const estacaoInicial = estacoes.find((e) => e.id === estacaoPadraoId) || estacoes[0]

  const [salvando, setSalvando] = useState(false)
  const [estacaoId, setEstacaoId] = useState<string>(estacaoInicial?.id || 'nova')
  const [anoSafra, setAnoSafra] = useState<string>(estacaoInicial?.ano_safra || '2025/2026')
  const [nomeEstacao, setNomeEstacao] = useState<string>(
    estacaoInicial?.nome || 'Estação de Monta 2025/2026',
  )
  const [totalExpostas, setTotalExpostas] = useState<number>(estacaoInicial?.total_expostas || 883)
  const [totalPrenhes, setTotalPrenhes] = useState<number>(estacaoInicial?.total_prenhes || 756)
  const [totalVazias, setTotalVazias] = useState<number>(estacaoInicial?.total_vazias || 127)
  const [taxaPrenhez, setTaxaPrenhez] = useState<number>(estacaoInicial?.taxa_prenhez_pct || 85.6)
  const [gestantesIatf, setGestantesIatf] = useState<number>(estacaoInicial?.gestantes_iatf || 653)
  const [gestantesTouro, setGestantesTouro] = useState<number>(
    estacaoInicial?.gestantes_touro || 103,
  )
  const [taxaParicao, setTaxaParicao] = useState<number>(estacaoInicial?.taxa_paricao_pct || 88.0)
  const [taxaDesmame, setTaxaDesmame] = useState<number>(estacaoInicial?.taxa_desmame_pct || 82.5)
  const [kgDesmamado, setKgDesmamado] = useState<number>(
    estacaoInicial?.kg_desmamado_matriz || 198.5,
  )
  const [iepMedio, setIepMedio] = useState<number>(estacaoInicial?.iep_medio_meses || 12.6)
  const [perdaGestacional, setPerdaGestacional] = useState<number>(
    estacaoInicial?.perda_gestacional_pct || 4.5,
  )
  const [status, setStatus] = useState<'planejada' | 'em_andamento' | 'encerrada'>('encerrada')
  const [observacoes, setObservacoes] = useState<string>(estacaoInicial?.observacoes || '')

  // Seção de Nascimentos Realizados (Pedido do Usuário)
  const [linhasNascimento, setLinhasNascimento] = useState<ItemNascimentoInput[]>([])
  const [carregandoNascimentos, setCarregandoNascimentos] = useState(false)

  // Carrega nascimentos existentes ao abrir ou alterar estação
  useEffect(() => {
    if (!open) return
    const carregarNascimentos = async () => {
      if (estacaoId && estacaoId !== 'nova') {
        setCarregandoNascimentos(true)
        try {
          const list = await getNascimentosEstacao(estacaoId)
          if (list.length > 0) {
            setLinhasNascimento(
              list.map((item) => ({
                mes_referencia: item.mes_referencia,
                data_referencia: item.data_referencia,
                sexo: item.sexo,
                raca: item.raca || '',
                categoria_matriz: item.categoria_matriz || 'indefinida',
                classe_matriz: item.classe_matriz || 'indefinida',
                quantidade: item.quantidade,
                peso_medio_nasc_kg: item.peso_medio_nasc_kg,
                observacoes: item.observacoes,
              })),
            )
          } else {
            // Sugere estrutura vazia inicial por padrão
            setLinhasNascimento([])
          }
        } catch {
          setLinhasNascimento([])
        } finally {
          setCarregandoNascimentos(false)
        }
      } else {
        setLinhasNascimento([])
      }
    }
    carregarNascimentos()
  }, [open, estacaoId])

  const handleAdicionarLinhaNascimento = () => {
    setLinhasNascimento((prev) => [
      ...prev,
      {
        mes_referencia: 'JUL',
        sexo: 'macho',
        raca: 'Nelore',
        categoria_matriz: 'multipara',
        classe_matriz: 'comercial',
        quantidade: 10,
      },
    ])
  }

  const handleRemoverLinhaNascimento = (index: number) => {
    setLinhasNascimento((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAtualizarLinhaNascimento = (
    index: number,
    campo: keyof ItemNascimentoInput,
    valor: any,
  ) => {
    setLinhasNascimento((prev) => {
      const clone = [...prev]
      clone[index] = { ...clone[index], [campo]: valor }
      return clone
    })
  }

  const totalNascidosMachos = linhasNascimento
    .filter((l) => l.sexo === 'macho')
    .reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0)

  const totalNascidosFemeas = linhasNascimento
    .filter((l) => l.sexo === 'femea')
    .reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0)

  const totalGeralNascidos = linhasNascimento.reduce(
    (acc, l) => acc + (Number(l.quantidade) || 0),
    0,
  )

  const handleEstacaoChange = (id: string) => {
    setEstacaoId(id)
    const selecionada = estacoes.find((e) => e.id === id)
    if (selecionada) {
      setAnoSafra(selecionada.ano_safra)
      setNomeEstacao(selecionada.nome)
      setTotalExpostas(selecionada.total_expostas || 0)
      setTotalPrenhes(selecionada.total_prenhes || 0)
      setTotalVazias(selecionada.total_vazias || 0)
      setTaxaPrenhez(selecionada.taxa_prenhez_pct || 0)
      setGestantesIatf(
        selecionada.gestantes_iatf || Math.round((selecionada.total_prenhes || 0) * 0.85),
      )
      setGestantesTouro(
        selecionada.gestantes_touro || Math.round((selecionada.total_prenhes || 0) * 0.15),
      )
      setTaxaParicao(selecionada.taxa_paricao_pct || 88.0)
      setTaxaDesmame(selecionada.taxa_desmame_pct || 82.5)
      setKgDesmamado(selecionada.kg_desmamado_matriz || 195.0)
      setIepMedio(selecionada.iep_medio_meses || 12.6)
      setPerdaGestacional(selecionada.perda_gestacional_pct || 4.5)
      setStatus(selecionada.status || 'encerrada')
      setObservacoes(selecionada.observacoes || '')
    }
  }

  // Recalcula taxa de prenhez ao alterar expostas ou prenhes
  const handleExpostasChange = (val: number) => {
    setTotalExpostas(val)
    if (val > 0) {
      const p = Math.min(totalPrenhes, val)
      setTotalPrenhes(p)
      setTotalVazias(Math.max(0, val - p))
      setTaxaPrenhez(Number(((p / val) * 100).toFixed(1)))
    }
  }

  const handlePrenhesChange = (val: number) => {
    setTotalPrenhes(val)
    if (totalExpostas > 0) {
      setTotalVazias(Math.max(0, totalExpostas - val))
      setTaxaPrenhez(Number(((val / totalExpostas) * 100).toFixed(1)))
    }
    // sugere quebra IATF x Touro se não preenchido
    if (gestantesIatf + gestantesTouro !== val) {
      const iatf = Math.round(val * 0.85)
      setGestantesIatf(iatf)
      setGestantesTouro(val - iatf)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (totalExpostas <= 0) {
      toast({
        title: 'Total de expostas inválido',
        description: 'Informe o número total de matrizes expostas na estação de monta.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const res = await cadastrarResultadoFinalEstacao(
        {
          estacao_id: estacaoId === 'nova' ? undefined : estacaoId,
          ano_safra: anoSafra,
          nome_estacao: nomeEstacao.trim(),
          total_expostas: totalExpostas,
          total_prenhes: totalPrenhes,
          total_vazias: totalVazias,
          taxa_prenhez_pct: taxaPrenhez,
          gestantes_iatf: gestantesIatf,
          gestantes_touro: gestantesTouro,
          taxa_paricao_pct: taxaParicao,
          taxa_desmame_pct: taxaDesmame,
          kg_desmamado_matriz: kgDesmamado,
          perda_gestacional_pct: perdaGestacional,
          iep_medio_meses: iepMedio,
          status,
          observacoes: observacoes.trim() || undefined,
          nascimentos: linhasNascimento.filter((l) => (Number(l.quantidade) || 0) > 0),
        },
        user ? { id: user.id, nome: user.name || 'Gestor', perfil: user.role } : undefined,
      )

      toast({
        title: 'Fechamento da Estação Gravado!',
        description: res.mensagem,
      })

      onOpenChange(false)
      onSucesso?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao gravar fechamento',
        description: err.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg text-foreground">
                Fechamento Reprodutivo & Resultado Final da Estação
              </DialogTitle>
              <DialogDescription className="text-xs">
                Consolidação dos indicadores zootécnicos oficiais da estação de monta (expostas,
                prenhez, quebra IATF × touro, nascimentos realizados por sexo, raça e categoria).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {/* Identificação da Estação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Estação de Monta</Label>
              <Select value={estacaoId} onValueChange={handleEstacaoChange}>
                <SelectTrigger className="h-8 text-xs font-semibold">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {estacoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.ano_safra})
                    </SelectItem>
                  ))}
                  <SelectItem value="nova">+ Criar Nova Safra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ano Safra</Label>
              <Input
                value={anoSafra}
                onChange={(e) => setAnoSafra(e.target.value)}
                placeholder="2025/2026"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status da Estação</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="encerrada">Encerrada (Fechada)</SelectItem>
                  <SelectItem value="planejada">Planejada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nome / Título da Estação</Label>
            <Input
              value={nomeEstacao}
              onChange={(e) => setNomeEstacao(e.target.value)}
              placeholder="Ex: Fazenda Sto Antonio - Estação de Monta 2025-2026"
              className="h-8 text-xs font-medium"
              required
            />
          </div>

          {/* Bloco Central: Expostas, Prenhes e Vazias */}
          <div className="p-4 bg-muted/40 border rounded-xl space-y-3">
            <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">
              Contagem Geral & Taxa de Prenhez Oficial
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Total Expostas *</Label>
                <Input
                  type="number"
                  min={1}
                  value={totalExpostas}
                  onChange={(e) => handleExpostasChange(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Total Prenhes *
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={totalExpostas}
                  value={totalPrenhes}
                  onChange={(e) => handlePrenhesChange(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-rose-700">Total Vazias</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalVazias}
                  onChange={(e) => setTotalVazias(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-emerald-700 font-bold">Taxa Prenhez (%)</Label>
                <div className="h-8 px-3 rounded-md bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between text-emerald-900 dark:text-emerald-100 font-mono font-bold text-sm">
                  <span>{taxaPrenhez}%</span>
                  <span className="text-[10px] font-sans text-emerald-700">calculada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quebra: IATF vs Repasse Touro */}
          <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-300/60 rounded-xl space-y-3">
            <span className="font-semibold text-emerald-950 dark:text-emerald-100 text-xs uppercase tracking-wider block">
              Quebra por Origem da Concepção (IATF × Touro / Repasse)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Gestantes por IATF (Inseminação)</Label>
                <Input
                  type="number"
                  min={0}
                  value={gestantesIatf}
                  onChange={(e) => setGestantesIatf(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">
                  {totalPrenhes > 0
                    ? `${((gestantesIatf / totalPrenhes) * 100).toFixed(1)}% das prenhes`
                    : ''}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Gestantes por Repasse / Monta Natural</Label>
                <Input
                  type="number"
                  min={0}
                  value={gestantesTouro}
                  onChange={(e) => setGestantesTouro(parseInt(e.target.value, 10) || 0)}
                  className="h-8 text-xs font-mono font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">
                  {totalPrenhes > 0
                    ? `${((gestantesTouro / totalPrenhes) * 100).toFixed(1)}% das prenhes`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores Zootécnicos Complementares */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Taxa Parição (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={taxaParicao}
                onChange={(e) => setTaxaParicao(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Taxa Desmame (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={taxaDesmame}
                onChange={(e) => setTaxaDesmame(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kg Desm./Matriz (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={kgDesmamado}
                onChange={(e) => setKgDesmamado(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">IEP Médio (meses)</Label>
              <Input
                type="number"
                step="0.1"
                value={iepMedio}
                onChange={(e) => setIepMedio(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* SEÇÃO PEDIDO DO USUÁRIO: Nascimentos Realizados por Sexo e Raça */}
          <div className="p-4 bg-card border rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  <Baby className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">
                    Nascimentos Realizados da Estação
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Registro de nascidos por sexo (machos/fêmeas), raça adicional (ex: Nelore, PO),
                    categoria e mês.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  Total: {totalGeralNascidos} ({totalNascidosMachos}M / {totalNascidosFemeas}F)
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAdicionarLinhaNascimento}
                  className="h-7 text-xs gap-1 border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Nascimentos
                </Button>
              </div>
            </div>

            {carregandoNascimentos ? (
              <div className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                Carregando registros de nascimentos da estação...
              </div>
            ) : linhasNascimento.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center text-xs text-muted-foreground space-y-2">
                <p>Nenhum lote de nascimentos registrado para esta estação de monta ainda.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAdicionarLinhaNascimento}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" /> Inserir primeiro registro de nascimentos
                </Button>
              </div>
            ) : (
              <div className="space-y-2 overflow-x-auto">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                  <div className="col-span-2">Mês Ref.</div>
                  <div className="col-span-2">Sexo *</div>
                  <div className="col-span-2">Raça (opcional)</div>
                  <div className="col-span-2">Categoria Matriz</div>
                  <div className="col-span-2">Classe</div>
                  <div className="col-span-1 text-right">Qtd *</div>
                  <div className="col-span-1 text-center">Ação</div>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {linhasNascimento.map((linha, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md border"
                    >
                      {/* Mês de Referência */}
                      <div className="col-span-2">
                        <Select
                          value={linha.mes_referencia}
                          onValueChange={(v) =>
                            handleAtualizarLinhaNascimento(idx, 'mes_referencia', v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              'JUL',
                              'AGO',
                              'SET',
                              'OUT',
                              'NOV',
                              'DEZ',
                              'JAN',
                              'FEV',
                              'MAR',
                              'ABR',
                              'MAI',
                              'JUN',
                            ].map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sexo */}
                      <div className="col-span-2">
                        <Select
                          value={linha.sexo}
                          onValueChange={(v: SexoNascimento) =>
                            handleAtualizarLinhaNascimento(idx, 'sexo', v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="macho">Macho</SelectItem>
                            <SelectItem value="femea">Fêmea</SelectItem>
                            <SelectItem value="indefinido">Indefinido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Raça (característica adicional, ex: Nelore, Cruzamento, etc.) */}
                      <div className="col-span-2">
                        <Input
                          placeholder="Ex: Nelore"
                          value={linha.raca || ''}
                          onChange={(e) =>
                            handleAtualizarLinhaNascimento(idx, 'raca', e.target.value)
                          }
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Categoria Matriz */}
                      <div className="col-span-2">
                        <Select
                          value={linha.categoria_matriz || 'indefinida'}
                          onValueChange={(v: CategoriaMatrizNascimento) =>
                            handleAtualizarLinhaNascimento(idx, 'categoria_matriz', v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nulipara">Nulípara</SelectItem>
                            <SelectItem value="primipara">Primípara</SelectItem>
                            <SelectItem value="multipara">Multípara</SelectItem>
                            <SelectItem value="indefinida">Não informada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Classe Matriz */}
                      <div className="col-span-2">
                        <Select
                          value={linha.classe_matriz || 'indefinida'}
                          onValueChange={(v: ClasseMatrizNascimento) =>
                            handleAtualizarLinhaNascimento(idx, 'classe_matriz', v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PO">PO</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="indefinida">Não informada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantidade */}
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min={1}
                          value={linha.quantidade}
                          onChange={(e) =>
                            handleAtualizarLinhaNascimento(
                              idx,
                              'quantidade',
                              parseInt(e.target.value, 10) || 0,
                            )
                          }
                          className="h-7 text-xs font-mono font-bold text-right"
                        />
                      </div>

                      {/* Botão Remover */}
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverLinhaNascimento(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações e Parecer Final da Estação</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Estação com excelente resposta ao protocolo primíparas; repasse de 60 dias com touros Nelore PO..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold gap-1.5"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Consolidando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Salvar Fechamento da Estação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
