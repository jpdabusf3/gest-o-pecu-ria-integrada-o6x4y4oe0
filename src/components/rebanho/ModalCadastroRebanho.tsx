import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { ScannerModal } from '@/components/ScannerModal'
import {
  criarLoteRebanho,
  criarAnimalIndividual,
  criarPastoRebanho,
  auditarRebanho,
  FAIXA_PESO_CATEGORIA,
  CATEGORIAS_LABEL,
  FASE_LABEL,
  isBrincoDuplicado,
  PastoRebanhoRecord,
  LoteRebanhoRecord,
  AnimalIndividualRecord,
  CategoriaRebanho,
  SexoRebanho,
  FaseRebanho,
  ConsistenciaRebanho,
} from '@/services/rebanho'
import {
  MapPin,
  Layers,
  Beef,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  QrCode,
  TriangleAlert,
  Plus,
} from 'lucide-react'

interface ModalCadastroRebanhoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pastos: PastoRebanhoRecord[]
  lotes: LoteRebanhoRecord[]
  animais: AnimalIndividualRecord[]
  consistencia: ConsistenciaRebanho | null
  onDataChanged: () => void
  pastoInicial?: string
}

const CATEGORIAS_MACHO: CategoriaRebanho[] = ['bezerro', 'garrote', 'novilho', 'boi', 'touro']
const CATEGORIAS_FEMEA: CategoriaRebanho[] = ['bezerro', 'novilha', 'vaca']

export function ModalCadastroRebanho({
  open,
  onOpenChange,
  pastos,
  lotes,
  animais,
  consistencia,
  onDataChanged,
  pastoInicial,
}: ModalCadastroRebanhoProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  // Passo 1: pasto
  const [passo, setPasso] = useState(1)
  const [pastoSelecionado, setPastoSelecionado] = useState<string>(pastoInicial || '')

  // Passo 2: modo e formulários
  const [modo, setModo] = useState<'lote' | 'individual'>('lote')
  const [codigo, setCodigo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaRebanho>('boi')
  const [sexo, setSexo] = useState<SexoRebanho>('macho')
  const [quantidade, setQuantidade] = useState('1')
  const [pesoMedio, setPesoMedio] = useState('')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])
  const [fase, setFase] = useState<FaseRebanho>('engorda')
  const [brinco, setBrinco] = useState('')
  const [pesoIndividual, setPesoIndividual] = useState('')
  const [ecc, setEcc] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Passo 3: revisão
  const [salvando, setSalvando] = useState(false)

  const pasto = pastos.find((p) => p.id === pastoSelecionado)

  // Lotação pré-computada do pasto + cabeças do formulário atual
  const contagemPasto = consistencia?.porPasto.find((p) => p.pastoId === pastoSelecionado)
  const cabecasFormulario =
    modo === 'lote' ? Math.max(0, parseInt(quantidade, 10) || 0) : brinco.trim() ? 1 : 0

  const alertaLotacao = useMemo(() => {
    if (!pasto || !contagemPasto) return null
    const lotacaoDepois =
      pasto.area_ha > 0 ? (contagemPasto.cabecasAtivas + cabecasFormulario) / pasto.area_ha : 0
    if (lotacaoDepois > pasto.capacidade_ua_ha) {
      return `Lotação do pasto ${pasto.nome} ficará em ${lotacaoDepois.toFixed(2)} UA/ha — acima da capacidade estimada de ${pasto.capacidade_ua_ha.toFixed(2)} UA/ha (${pasto.area_ha} ha × capacidade).`
    }
    return null
  }, [pasto, contagemPasto, cabecasFormulario])

  const alertaPeso = useMemo(() => {
    const peso = parseFloat(modo === 'lote' ? pesoMedio : pesoIndividual)
    if (!peso || peso <= 0) return null
    const [min, max] = FAIXA_PESO_CATEGORIA[categoria]
    if (peso < min || peso > max) {
      return `Peso informado (${peso} kg) fora da faixa plausível para ${CATEGORIAS_LABEL[categoria]}: ${min}–${max} kg. Confirme antes de registrar.`
    }
    return null
  }, [modo, pesoMedio, pesoIndividual, categoria])

  const brincoDuplicado = useMemo(
    () => (modo === 'individual' && brinco.trim() ? isBrincoDuplicado(brinco, animais) : false),
    [modo, brinco, animais],
  )

  const podeAvancar =
    passo === 1
      ? Boolean(pastoSelecionado)
      : modo === 'lote'
        ? Boolean(codigo.trim()) &&
          (parseInt(quantidade, 10) || 0) > 0 &&
          (parseFloat(pesoMedio) || 0) > 0
        : Boolean(brinco.trim()) && !brincoDuplicado && (parseFloat(pesoIndividual) || 0) > 0

  const resetForm = () => {
    setPasso(1)
    setPastoSelecionado(pastoInicial || '')
    setModo('lote')
    setCodigo('')
    setCategoria('boi')
    setSexo('macho')
    setQuantidade('1')
    setPesoMedio('')
    setDataEntrada(new Date().toISOString().split('T')[0])
    setFase('engorda')
    setBrinco('')
    setPesoIndividual('')
    setEcc('')
    setObservacoes('')
  }

  const handleConfirmar = async () => {
    if (!pasto) return
    setSalvando(true)
    try {
      const agora = new Date().toISOString()
      if (modo === 'lote') {
        const qtd = parseInt(quantidade, 10) || 0
        const peso = parseFloat(pesoMedio) || 0
        const lote = await criarLoteRebanho({
          name: codigo.trim(),
          categoria,
          sexo,
          qtd_cabecas: qtd,
          peso_medio_kg: peso,
          pasto_atual_id: pasto.id,
          pasto_atual: pasto.nome,
          data_entrada: dataEntrada,
          fase,
          registrado_por: user.name,
          registrado_por_id: user.id,
        })
        await auditarRebanho({
          tipo_evento: 'criacao',
          payload_depois: {
            tipo: 'lote',
            codigo: lote.name,
            categoria,
            sexo,
            qtd_cabecas: qtd,
            peso_medio_kg: peso,
            pasto: pasto.nome,
            data_entrada: dataEntrada,
            fase,
          },
          referencia_tipo: 'lote',
          referencia_id: lote.id,
          pasto_id: pasto.id,
          motivo: 'Atualização manual do rebanho (lote)',
        })
        toast({
          title: 'Lote registrado',
          description: `${lote.name}: ${qtd} cabeça(s) de ${CATEGORIAS_LABEL[categoria].toLowerCase()} no ${pasto.nome}.`,
        })
      } else {
        const peso = parseFloat(pesoIndividual) || 0
        const animal = await criarAnimalIndividual({
          brinco: brinco.trim(),
          categoria,
          sexo,
          peso_kg: peso,
          ecc: ecc ? parseFloat(ecc) : undefined,
          data_entrada: dataEntrada,
          observacoes,
          pasto_atual_id: pasto.id,
          registrado_por: user.name,
          registrado_por_id: user.id,
        })
        await auditarRebanho({
          tipo_evento: 'criacao',
          payload_depois: {
            tipo: 'individual',
            brinco: animal.brinco,
            categoria,
            sexo,
            peso_kg: peso,
            ecc: ecc ? parseFloat(ecc) : null,
            pasto: pasto.nome,
            registrado_em: agora,
          },
          referencia_tipo: 'animal',
          referencia_id: animal.id,
          pasto_id: pasto.id,
          motivo: 'Atualização manual do rebanho (individual)',
        })
        toast({
          title: 'Animal registrado',
          description: `Brinco ${animal.brinco} vinculado ao ${pasto.nome}.`,
        })
      }
      onDataChanged()
      resetForm()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { message?: string } }).response?.message ?? '')
          : ''
      if (msg.toLowerCase().includes('brinco')) {
        toast({
          title: 'Brinco já cadastrado',
          description: `O brinco "${brinco.trim()}" já existe no sistema. Cada brinco é único.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro ao salvar',
          description: msg || 'Verifique os dados e tente novamente.',
          variant: 'destructive',
        })
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleCriarPastoRapido = async (data: { nome: string; area: string; cap: string }) => {
    try {
      const novo = await criarPastoRebanho({
        nome: data.nome.trim(),
        area_ha: parseFloat(data.area) || 0,
        capacidade_ua_ha: parseFloat(data.cap) || 1,
        criado_por: user.name,
      })
      toast({ title: 'Pasto criado', description: `${novo.nome} disponível para seleção.` })
      onDataChanged()
      setPastoSelecionado(novo.id)
    } catch {
      toast({
        title: 'Erro ao criar pasto',
        description: 'Verifique o nome (já existente?) e os valores.',
        variant: 'destructive',
      })
    }
  }

  const resumoConfirmacao =
    modo === 'lote'
      ? [
          { label: 'Pasto', valor: pasto?.nome || '—' },
          { label: 'Lote', valor: codigo.trim() || '—' },
          { label: 'Categoria', valor: CATEGORIAS_LABEL[categoria] },
          { label: 'Sexo', valor: sexo === 'macho' ? 'Macho' : 'Fêmea' },
          { label: 'Quantidade', valor: `${quantidade} cabeça(s)` },
          { label: 'Peso médio', valor: `${pesoMedio} kg` },
          { label: 'Fase', valor: FASE_LABEL[fase] },
          { label: 'Data de entrada', valor: dataEntrada },
        ]
      : [
          { label: 'Pasto', valor: pasto?.nome || '—' },
          { label: 'Brinco', valor: brinco.trim() || '—' },
          { label: 'Categoria', valor: CATEGORIAS_LABEL[categoria] },
          { label: 'Sexo', valor: sexo === 'macho' ? 'Macho' : 'Fêmea' },
          { label: 'Peso', valor: `${pesoIndividual} kg` },
          { label: 'ECC', valor: ecc ? ecc : '— (opcional)' },
          { label: 'Data de entrada', valor: dataEntrada },
        ]

  return (
    <>
      <ScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onBrincoLido={(b) => setBrinco(b)}
      />
      <Dialog
        open={open}
        onOpenChange={(val) => {
          onOpenChange(val)
          if (!val) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Rebanho Atual</DialogTitle>
            <DialogDescription>
              Passo {passo} de 3 —{' '}
              {passo === 1
                ? 'selecione o pasto'
                : passo === 2
                  ? 'preencha o registro'
                  : 'revise e confirme'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3].map((p) => (
              <div
                key={p}
                className={`h-1.5 flex-1 rounded-full ${p <= passo ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>

          {/* PROGRESSO DO REGISTRO (3.850 / 4.000) */}
          {consistencia && consistencia.totalEsperado > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Progresso do registro do rebanho</span>
                <span className="font-mono">
                  {consistencia.totalFazenda} / {consistencia.totalEsperado} cabeças registradas
                </span>
              </div>
              <Progress value={Math.min(100, consistencia.pctProgresso)} className="h-2" />
              <p className="text-[11px] text-muted-foreground">
                {consistencia.faltam > 0
                  ? `Faltam ${consistencia.faltam} cabeça(s) para atingir o rebanho informado.`
                  : consistencia.excedem > 0
                    ? `Rebanho registrado excede o informado em ${consistencia.excedem} cabeça(s).`
                    : 'Rebanho completo — todas as cabeças informadas foram registradas.'}
              </p>
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {pastos.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum pasto cadastrado ainda. Cadastre o primeiro abaixo.
                  </p>
                )}
                {pastos.map((p) => {
                  const cont = consistencia?.porPasto.find((x) => x.pastoId === p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPastoSelecionado(p.id)}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                        pastoSelecionado === p.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.area_ha} ha • capacidade {p.capacidade_ua_ha} UA/ha
                            {cont ? ` • lotação atual ${cont.lotacaoUaHa.toFixed(2)} UA/ha` : ''}
                            {p.fazenda ? ` • ${p.fazenda}` : ''}
                          </p>{' '}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold">
                          {cont?.cabecasAtivas ?? 0}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          cabeças
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <NovoPastoRapido onCreate={handleCriarPastoRapido} />
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={modo === 'lote' ? 'default' : 'outline'}
                  onClick={() => setModo('lote')}
                  className="gap-2 justify-start"
                >
                  <Layers className="h-4 w-4" /> Por lote
                </Button>
                <Button
                  type="button"
                  variant={modo === 'individual' ? 'default' : 'outline'}
                  onClick={() => setModo('individual')}
                  className="gap-2 justify-start"
                >
                  <Beef className="h-4 w-4" /> Individual (brinco)
                </Button>
              </div>

              {modo === 'lote' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Código / nome do lote *</Label>
                    <Input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ex.: LT-2026-BEZ-01"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria *</Label>
                    <Select
                      value={categoria}
                      onValueChange={(v) => {
                        const cat = v as CategoriaRebanho
                        setCategoria(cat)
                        if (CATEGORIAS_MACHO.includes(cat)) setSexo('macho')
                        else setSexo('femea')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['bezerro', 'garrote', 'novilho', 'boi', 'novilha', 'vaca', 'touro'].map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {CATEGORIAS_LABEL[c as CategoriaRebanho]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sexo *</Label>
                    <Select value={sexo} onValueChange={(v) => setSexo(v as SexoRebanho)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantidade de cabeças *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Peso médio (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pesoMedio}
                      onChange={(e) => setPesoMedio(e.target.value)}
                      placeholder="Ex.: 180"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de entrada</Label>
                    <Input
                      type="date"
                      value={dataEntrada}
                      onChange={(e) => setDataEntrada(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fase</Label>
                    <Select value={fase} onValueChange={(v) => setFase(v as FaseRebanho)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['cria', 'recria', 'engorda', 'confinamento'] as FaseRebanho[]).map(
                          (f) => (
                            <SelectItem key={f} value={f}>
                              {FASE_LABEL[f]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Brinco do animal *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={brinco}
                        onChange={(e) => setBrinco(e.target.value)}
                        placeholder="Ex.: 1234"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setScannerOpen(true)}
                        className="gap-1.5 shrink-0"
                      >
                        <QrCode className="h-4 w-4" /> Ler
                      </Button>
                    </div>
                    {brincoDuplicado && (
                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                        <TriangleAlert className="h-3.5 w-3.5" /> Este brinco já está cadastrado no
                        sistema — cada brinco é único.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria *</Label>
                    <Select
                      value={categoria}
                      onValueChange={(v) => {
                        const cat = v as CategoriaRebanho
                        setCategoria(cat)
                        if (CATEGORIAS_MACHO.includes(cat)) setSexo('macho')
                        else setSexo('femea')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['bezerro', 'garrote', 'novilho', 'boi', 'novilha', 'vaca', 'touro'].map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {CATEGORIAS_LABEL[c as CategoriaRebanho]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sexo *</Label>
                    <Select value={sexo} onValueChange={(v) => setSexo(v as SexoRebanho)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Peso (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pesoIndividual}
                      onChange={(e) => setPesoIndividual(e.target.value)}
                      placeholder="Ex.: 420"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ECC (1–5, opcional)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="5"
                      value={ecc}
                      onChange={(e) => setEcc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Data de entrada</Label>
                    <Input
                      type="date"
                      value={dataEntrada}
                      onChange={(e) => setDataEntrada(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Ex.: matriz de primeira cria, brinco amarelo na orelha esquerda..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {alertaPeso && (
                <Alert className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/30">
                  <TriangleAlert className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs">{alertaPeso}</AlertDescription>
                </Alert>
              )}
              {alertaLotacao && (
                <Alert className="border-orange-300 bg-orange-50/60 dark:bg-orange-950/30">
                  <TriangleAlert className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs">{alertaLotacao}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {passo === 3 && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                Revise os dados antes de confirmar
              </div>
              <Card>
                <CardContent className="grid grid-cols-2 gap-2 p-4 text-sm">
                  {resumoConfirmacao.map((r) => (
                    <div key={r.label}>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {r.label}
                      </p>
                      <p className="font-medium">{r.valor}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {alertaLotacao && (
                <Alert className="border-orange-300 bg-orange-50/60 dark:bg-orange-950/30">
                  <TriangleAlert className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs">
                    {alertaLotacao} Você pode confirmar assim mesmo, mas o pasto ficará acima da
                    capacidade estimada.
                  </AlertDescription>
                </Alert>
              )}
              {alertaPeso && (
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                  Peso fora da faixa plausível — revisado manualmente
                </Badge>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => (passo === 1 ? onOpenChange(false) : setPasso(passo - 1))}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> {passo === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {passo < 3 ? (
              <Button
                type="button"
                onClick={() => setPasso(passo + 1)}
                disabled={!podeAvancar}
                className="gap-1.5"
              >
                Avançar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleConfirmar} disabled={salvando || !podeAvancar}>
                {salvando ? 'Salvando...' : 'Confirmar registro'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Cadastro rápido de pasto dentro do passo 1 (a lista de pastos é o ponto de partida) */
function NovoPastoRapido({
  onCreate,
}: {
  onCreate: (data: { nome: string; area: string; cap: string }) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [area, setArea] = useState('')
  const [cap, setCap] = useState('1.5')

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> Cadastrar novo pasto
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-4 gap-2 items-end">
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Nome do pasto</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Pasto 01" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Área (ha)</Label>
        <Input type="number" step="0.1" value={area} onChange={(e) => setArea(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Cap. (UA/ha)</Label>
        <Input type="number" step="0.1" value={cap} onChange={(e) => setCap(e.target.value)} />
      </div>
      <div className="col-span-4 flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!nome.trim() || !(parseFloat(area) > 0)}
          onClick={() => {
            onCreate({ nome, area, cap })
            setAberto(false)
            setNome('')
            setArea('')
            setCap('1.5')
          }}
        >
          Criar pasto
        </Button>
      </div>
    </div>
  )
}
