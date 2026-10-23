import React, { useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Stethoscope, Plus, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import {
  EstacaoMontaRecord,
  ResultadoGestacao,
  TipoManejoReprodutivo,
  TercoGestacao,
  cadastrarDiagnosticosGestacao,
} from '@/services/reproducao'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ModalCadastroDgProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estacoes: EstacaoMontaRecord[]
  estacaoPadraoId?: string
  lotesSugeridos?: string[]
  onSucesso?: () => void
}

interface LinhaItemDg {
  id: string
  brinco: string
  resultado: ResultadoGestacao
  diasGestacao: number
  terco: TercoGestacao
  touro: string
  lote: string
  tipoManejo: TipoManejoReprodutivo
}

export function ModalCadastroDg({
  open,
  onOpenChange,
  estacoes,
  estacaoPadraoId,
  lotesSugeridos = [],
  onSucesso,
}: ModalCadastroDgProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [modo, setModo] = useState<'individual' | 'lote_rapido' | 'lote_tabela'>('individual')
  const [salvando, setSalvando] = useState(false)

  // Campos Globais
  const [estacaoId, setEstacaoId] = useState<string>(estacaoPadraoId || (estacoes[0]?.id ?? ''))
  const [anoSafra, setAnoSafra] = useState<string>(estacoes[0]?.ano_safra || '2025/2026')
  const [dataExame, setDataExame] = useState<string>(new Date().toISOString().slice(0, 10))
  const [veterinario, setVeterinario] = useState<string>('')
  const [touroPadrao, setTouroPadrao] = useState<string>('Rifle PHOC')
  const [tipoManejoPadrao, setTipoManejoPadrao] = useState<TipoManejoReprodutivo>('iatf')
  const [lotePadrao, setLotePadrao] = useState<string>(lotesSugeridos[0] || 'Lote Primíparas')

  // MODO 1: Individual
  const [indBrinco, setIndBrinco] = useState('')
  const [indResultado, setIndResultado] = useState<ResultadoGestacao>('prenhe')
  const [indDiasGestacao, setIndDiasGestacao] = useState<number>(45)
  const [indTerco, setIndTerco] = useState<TercoGestacao>('primeiro')
  const [indTouro, setIndTouro] = useState('')
  const [indTipoManejo, setIndTipoManejo] = useState<TipoManejoReprodutivo>('iatf')
  const [indLote, setIndLote] = useState('')
  const [indDataCobertura, setIndDataCobertura] = useState('')
  const [indDataPrevistaParto, setIndDataPrevistaParto] = useState('')
  const [indObs, setIndObs] = useState('')

  // MODO 2: Em Lote Rápido (colar lista de brincos)
  const [loteResultadoPadrao, setLoteResultadoPadrao] = useState<ResultadoGestacao>('prenhe')
  const [loteTextoBrincos, setLoteTextoBrincos] = useState('')
  const [loteDiasPadrao, setLoteDiasPadrao] = useState<number>(45)

  // MODO 3: Tabela Multi-linhas
  const [linhasTabela, setLinhasTabela] = useState<LinhaItemDg[]>([
    {
      id: '1',
      brinco: '',
      resultado: 'prenhe',
      diasGestacao: 45,
      terco: 'primeiro',
      touro: 'Rifle PHOC',
      lote: lotesSugeridos[0] || 'Lote 01',
      tipoManejo: 'iatf',
    },
    {
      id: '2',
      brinco: '',
      resultado: 'prenhe',
      diasGestacao: 45,
      terco: 'primeiro',
      touro: 'Rifle PHOC',
      lote: lotesSugeridos[0] || 'Lote 01',
      tipoManejo: 'iatf',
    },
  ])

  const handleEstacaoChange = (id: string) => {
    setEstacaoId(id)
    const selecionada = estacoes.find((e) => e.id === id)
    if (selecionada) {
      setAnoSafra(selecionada.ano_safra)
    }
  }

  // Previsão de parto automática ao mudar data de cobertura (+290 dias)
  const handleCoberturaChange = (val: string) => {
    setIndDataCobertura(val)
    if (val) {
      try {
        const d = new Date(val)
        d.setDate(d.getDate() + 290)
        setIndDataPrevistaParto(d.toISOString().slice(0, 10))
      } catch {
        /* ok */
      }
    }
  }

  const adicionarLinhaTabela = () => {
    setLinhasTabela((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        brinco: '',
        resultado: 'prenhe',
        diasGestacao: 45,
        terco: 'primeiro',
        touro: touroPadrao,
        lote: lotePadrao,
        tipoManejo: tipoManejoPadrao,
      },
    ])
  }

  const removerLinhaTabela = (id: string) => {
    setLinhasTabela((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  const atualizarLinhaTabela = (id: string, campo: keyof LinhaItemDg, valor: any) => {
    setLinhasTabela((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const updated = { ...l, [campo]: valor }
          if (campo === 'diasGestacao') {
            const dias = parseInt(valor, 10) || 0
            if (dias > 180) updated.terco = 'terceiro'
            else if (dias > 90) updated.terco = 'segundo'
            else updated.terco = 'primeiro'
          }
          return updated
        }
        return l
      }),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let itensParaGravar: any[] = []

    if (modo === 'individual') {
      if (!indBrinco.trim()) {
        toast({
          title: 'Brinco obrigatório',
          description: 'Informe o número do brinco do animal.',
          variant: 'destructive',
        })
        return
      }

      itensParaGravar.push({
        brinco: indBrinco.trim(),
        resultado: indResultado,
        dias_gestacao: indResultado === 'prenhe' ? indDiasGestacao : 0,
        terco_gestacao: indResultado === 'prenhe' ? indTerco : undefined,
        touro_ou_lote_iatf: indTouro.trim() || touroPadrao,
        tipo_manejo: indTipoManejo,
        lote_origem: indLote.trim() || lotePadrao,
        data_cobertura: indDataCobertura || undefined,
        data_prevista_parto: indDataPrevistaParto || undefined,
        observacoes: indObs.trim() || undefined,
        veterinario: veterinario.trim() || undefined,
      })
    } else if (modo === 'lote_rapido') {
      const brincos = loteTextoBrincos
        .split(/[\n,;]+/)
        .map((b) => b.trim())
        .filter((b) => b.length > 0)

      if (brincos.length === 0) {
        toast({
          title: 'Nenhum brinco informado',
          description: 'Cole ou digite ao menos um brinco separado por linha ou vírgula.',
          variant: 'destructive',
        })
        return
      }

      itensParaGravar = brincos.map((brinco) => ({
        brinco,
        resultado: loteResultadoPadrao,
        dias_gestacao: loteResultadoPadrao === 'prenhe' ? loteDiasPadrao : 0,
        terco_gestacao:
          loteResultadoPadrao === 'prenhe'
            ? loteDiasPadrao > 180
              ? 'terceiro'
              : loteDiasPadrao > 90
                ? 'segundo'
                : 'primeiro'
            : undefined,
        touro_ou_lote_iatf: touroPadrao,
        tipo_manejo: tipoManejoPadrao,
        lote_origem: lotePadrao,
        veterinario: veterinario.trim() || undefined,
      }))
    } else {
      // Tabela
      const preenchidas = linhasTabela.filter((l) => l.brinco.trim().length > 0)
      if (preenchidas.length === 0) {
        toast({
          title: 'Nenhuma matriz preenchida',
          description: 'Preencha o brinco de pelo menos uma matriz na tabela.',
          variant: 'destructive',
        })
        return
      }

      itensParaGravar = preenchidas.map((l) => ({
        brinco: l.brinco.trim(),
        resultado: l.resultado,
        dias_gestacao: l.resultado === 'prenhe' ? l.diasGestacao : 0,
        terco_gestacao: l.resultado === 'prenhe' ? l.terco : undefined,
        touro_ou_lote_iatf: l.touro || touroPadrao,
        tipo_manejo: l.tipoManejo,
        lote_origem: l.lote || lotePadrao,
        veterinario: veterinario.trim() || undefined,
      }))
    }

    setSalvando(true)
    try {
      const res = await cadastrarDiagnosticosGestacao(
        {
          estacao_id: estacaoId || undefined,
          ano_safra: anoSafra,
          data_exame: dataExame,
          lote_origem: lotePadrao,
          veterinario: veterinario.trim() || undefined,
          touro_padrao: touroPadrao,
          tipo_manejo_padrao: tipoManejoPadrao,
          itens: itensParaGravar,
        },
        user ? { id: user.id, nome: user.name || 'Gestor', perfil: user.role } : undefined,
      )

      if (res.sucesso) {
        let msg = `${res.totalGravados} diagnóstico(s) de gestação gravado(s) com sucesso!`
        if (res.duplicados.length > 0) {
          msg += ` (${res.duplicados.length} já cadastrado(s) na mesma data e deduplicado(s))`
        }

        toast({
          title: 'Diagnóstico(s) Gravado(s)',
          description: msg,
        })

        // Limpar
        setIndBrinco('')
        setIndObs('')
        setLoteTextoBrincos('')
        onOpenChange(false)
        onSucesso?.()
      } else {
        toast({
          title: 'Nenhum registro gravado',
          description:
            res.duplicados.length > 0
              ? `Os brincos (${res.duplicados.join(', ')}) já possuem diagnóstico nesta data.`
              : 'Verifique os dados informados.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao gravar diagnóstico',
        description: err.message || 'Ocorreu uma falha ao persistir no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg text-foreground">
                Cadastrar Diagnóstico de Gestação (DG)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registre os exames reprodutivos por matriz individual ou em lote (com deduplicação
                automática por brinco + data).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {/* Cabeçalho Geral do Exame */}
          <div className="p-3 bg-muted/40 border rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Estação / Safra</Label>
              <Select value={estacaoId} onValueChange={handleEstacaoChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {estacoes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.ano_safra})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Data do Exame (DG) *</Label>
              <Input
                type="date"
                value={dataExame}
                onChange={(e) => setDataExame(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Veterinário Responsável</Label>
              <Input
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
                placeholder="Dr(a). Veterinário(a)"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Abas de Modo de Preenchimento */}
          <Tabs value={modo} onValueChange={(v: any) => setModo(v)} className="space-y-3">
            <TabsList className="grid grid-cols-3 h-8 bg-muted/60">
              <TabsTrigger value="individual" className="text-xs">
                Matriz Individual
              </TabsTrigger>
              <TabsTrigger value="lote_rapido" className="text-xs">
                Lote Rápido (Colar Lista)
              </TabsTrigger>
              <TabsTrigger value="lote_tabela" className="text-xs">
                Planilha / Grade
              </TabsTrigger>
            </TabsList>

            {/* MODO 1: INDIVIDUAL */}
            <TabsContent value="individual" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Número do Brinco *</Label>
                  <Input
                    value={indBrinco}
                    onChange={(e) => setIndBrinco(e.target.value)}
                    placeholder="Ex: NEL 4168, 0452..."
                    className="h-8 text-xs font-mono font-bold uppercase"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Resultado Diagnóstico *</Label>
                  <Select value={indResultado} onValueChange={(v: any) => setIndResultado(v)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prenhe" className="text-emerald-700 font-semibold">
                        PRENHE (POSITIVO)
                      </SelectItem>
                      <SelectItem value="vazia" className="text-rose-700 font-semibold">
                        VAZIA (NEGATIVO)
                      </SelectItem>
                      <SelectItem value="perda_embrionaria" className="text-amber-700">
                        PERDA EMBRIONÁRIA
                      </SelectItem>
                      <SelectItem value="perda_fetal" className="text-amber-700">
                        PERDA FETAL
                      </SelectItem>
                      <SelectItem value="duvidoso" className="text-muted-foreground">
                        DUVIDOSO / REVISITAR
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Manejo Reprodutivo</Label>
                  <Select value={indTipoManejo} onValueChange={(v: any) => setIndTipoManejo(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iatf">IATF</SelectItem>
                      <SelectItem value="monta_natural">Monta Natural</SelectItem>
                      <SelectItem value="repasses">Repasse com Touro</SelectItem>
                      <SelectItem value="revisite">Revisite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {indResultado === 'prenhe' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs text-emerald-900 dark:text-emerald-200">
                      Dias de Gestação
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={310}
                      value={indDiasGestacao}
                      onChange={(e) => {
                        const d = parseInt(e.target.value, 10) || 0
                        setIndDiasGestacao(d)
                        if (d > 180) setIndTerco('terceiro')
                        else if (d > 90) setIndTerco('segundo')
                        else setIndTerco('primeiro')
                      }}
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-emerald-900 dark:text-emerald-200">
                      Terço Gestacional
                    </Label>
                    <Select value={indTerco} onValueChange={(v: any) => setIndTerco(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primeiro">1º Terço (&lt; 90 dias)</SelectItem>
                        <SelectItem value="segundo">2º Terço (91 a 180 dias)</SelectItem>
                        <SelectItem value="terceiro">3º Terço (&gt; 180 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-emerald-900 dark:text-emerald-200">
                      Data da Cobertura / IATF
                    </Label>
                    <Input
                      type="date"
                      value={indDataCobertura}
                      onChange={(e) => handleCoberturaChange(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Touro / Lote de IATF Responsável</Label>
                  <Input
                    value={indTouro}
                    onChange={(e) => setIndTouro(e.target.value)}
                    placeholder="Ex: Rifle PHOC, Rem USP..."
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Lote / Piquete da Matriz</Label>
                  <Input
                    value={indLote}
                    onChange={(e) => setIndLote(e.target.value)}
                    placeholder="Ex: Lote 02 Primíparas"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações do Exame</Label>
                <Input
                  value={indObs}
                  onChange={(e) => setIndObs(e.target.value)}
                  placeholder="Ex: Feto viável, corpo lúteo direito, bom tônus uterino..."
                  className="h-8 text-xs"
                />
              </div>
            </TabsContent>

            {/* MODO 2: LOTE RÁPIDO */}
            <TabsContent value="lote_rapido" className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Resultado para todo o grupo</Label>
                  <Select
                    value={loteResultadoPadrao}
                    onValueChange={(v: any) => setLoteResultadoPadrao(v)}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prenhe" className="text-emerald-700 font-semibold">
                        PRENHES (POSITIVAS)
                      </SelectItem>
                      <SelectItem value="vazia" className="text-rose-700 font-semibold">
                        VAZIAS (NEGATIVAS)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Lote / Origem</Label>
                  <Input
                    value={lotePadrao}
                    onChange={(e) => setLotePadrao(e.target.value)}
                    placeholder="Ex: Lote Primíparas"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Touro / Lote IATF</Label>
                  <Input
                    value={touroPadrao}
                    onChange={(e) => setTouroPadrao(e.target.value)}
                    placeholder="Ex: Rifle PHOC"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {loteResultadoPadrao === 'prenhe' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Dias de Gestação Médio</Label>
                    <Input
                      type="number"
                      value={loteDiasPadrao}
                      onChange={(e) => setLoteDiasPadrao(parseInt(e.target.value, 10) || 0)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Manejo</Label>
                    <Select
                      value={tipoManejoPadrao}
                      onValueChange={(v: any) => setTipoManejoPadrao(v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iatf">IATF</SelectItem>
                        <SelectItem value="repasses">Repasse com Touro</SelectItem>
                        <SelectItem value="monta_natural">Monta Natural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Lista de Brincos das Matrizes *</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Cole uma lista por linha ou separados por vírgula
                  </span>
                </div>
                <Textarea
                  value={loteTextoBrincos}
                  onChange={(e) => setLoteTextoBrincos(e.target.value)}
                  placeholder="Exemplo:&#10;NEL 4168&#10;NEL 4172&#10;NEL 4195&#10;0452&#10;0458"
                  rows={6}
                  className="font-mono text-xs uppercase resize-none"
                />
              </div>
            </TabsContent>

            {/* MODO 3: TABELA / GRADE */}
            <TabsContent value="lote_tabela" className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Preencha os dados linha a linha no curral:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarLinhaTabela}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Linha
                </Button>
              </div>

              <div className="border rounded-lg max-h-[260px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2 text-left">Brinco *</th>
                      <th className="p-2 text-left">Resultado</th>
                      <th className="p-2 text-left">Dias Gest.</th>
                      <th className="p-2 text-left">Touro</th>
                      <th className="p-2 text-left">Lote</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {linhasTabela.map((l) => (
                      <tr key={l.id}>
                        <td className="p-1.5">
                          <Input
                            value={l.brinco}
                            onChange={(e) => atualizarLinhaTabela(l.id, 'brinco', e.target.value)}
                            placeholder="Brinco"
                            className="h-7 text-xs font-mono font-bold uppercase"
                          />
                        </td>
                        <td className="p-1.5">
                          <Select
                            value={l.resultado}
                            onValueChange={(v) => atualizarLinhaTabela(l.id, 'resultado', v)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prenhe">Prenhe</SelectItem>
                              <SelectItem value="vazia">Vazia</SelectItem>
                              <SelectItem value="perda_embrionaria">Perda Embr.</SelectItem>
                              <SelectItem value="duvidoso">Duvidoso</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5 w-20">
                          <Input
                            type="number"
                            min={0}
                            value={l.diasGestacao}
                            onChange={(e) =>
                              atualizarLinhaTabela(l.id, 'diasGestacao', e.target.value)
                            }
                            disabled={l.resultado !== 'prenhe'}
                            className="h-7 text-xs font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={l.touro}
                            onChange={(e) => atualizarLinhaTabela(l.id, 'touro', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={l.lote}
                            onChange={(e) => atualizarLinhaTabela(l.id, 'lote', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removerLinhaTabela(l.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

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
                  <Loader2 className="h-4 w-4 animate-spin" /> Gravando Exames...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gravar Diagnóstico(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
