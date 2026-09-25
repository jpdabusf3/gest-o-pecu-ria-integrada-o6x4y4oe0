import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Wheat,
  Eye,
  Skull,
  MapPin,
  ArrowRightLeft,
  Baby,
  CloudRain,
  Flame,
  Wrench,
  Droplets,
  MoreHorizontal,
  Camera,
  QrCode,
  ScanLine,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { useFarm } from '@/contexts/FarmContext'
import {
  TipoOcorrenciaRecord,
  getTiposOcorrencia,
  criarOcorrencia,
  UrgenciaOcorrencia,
} from '@/services/ocorrencias'
import { LotRecord } from '@/services/lots'

interface ModalRegistrarOcorrenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lotes: LotRecord[]
  lotePreSelecionado?: LotRecord | null
  onSuccess?: () => void
}

const ICONES_MAP: Record<string, any> = {
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Wheat,
  Eye,
  Skull,
  MapPin,
  ArrowRightLeft,
  Baby,
  CloudRain,
  Flame,
  Wrench,
  Droplets,
  MoreHorizontal,
  Tag,
}

export function ModalRegistrarOcorrencia({
  open,
  onOpenChange,
  lotes,
  lotePreSelecionado,
  onSuccess,
}: ModalRegistrarOcorrenciaProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { isOnline, addAction, queue } = useOffline()
  const { registerConsumption } = useFarm()

  const [tipos, setTipos] = useState<TipoOcorrenciaRecord[]>([])
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoOcorrenciaRecord | null>(null)
  const [loteId, setLoteId] = useState<string>('')
  const [urgencia, setUrgencia] = useState<UrgenciaOcorrencia>('informativo')
  const [camposValores, setCamposValores] = useState<Record<string, any>>({})
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [geolocalizacao, setGeolocalizacao] = useState<{
    latitude?: number
    longitude?: number
    precisao?: number
  } | null>(null)
  const [obtendoGeo, setObtendoGeo] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Scanner modal interno
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerSimulando, setScannerSimulando] = useState(false)

  useEffect(() => {
    if (open) {
      getTiposOcorrencia().then((res) => {
        setTipos(res)
      })
      if (lotePreSelecionado) {
        setLoteId(lotePreSelecionado.id)
      } else {
        setLoteId('')
      }
      setTipoSelecionado(null)
      setCamposValores({})
      setFotoFile(null)
      setFotoPreview(null)
      setGeolocalizacao(null)
      setUrgencia('informativo')
    }
  }, [open, lotePreSelecionado])

  // Geolocalização automática para fogo, morte ou manutenção
  useEffect(() => {
    if (!tipoSelecionado) return
    const sensiveis = ['fogo', 'morte_animal', 'necessidade_manutencao']
    if (sensiveis.includes(tipoSelecionado.codigo) && navigator.geolocation) {
      setObtendoGeo(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeolocalizacao({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao: pos.coords.accuracy,
          })
          setObtendoGeo(false)
        },
        () => {
          setObtendoGeo(false)
        },
        { timeout: 7000, enableHighAccuracy: false },
      )
    }

    if (tipoSelecionado.codigo === 'fogo') {
      setUrgencia('requer_acao_hoje')
    }
  }, [tipoSelecionado])

  const handleSelectTipo = (tipo: TipoOcorrenciaRecord) => {
    setTipoSelecionado(tipo)
    setCamposValores({})
    if (tipo.codigo === 'fogo') {
      setUrgencia('requer_acao_hoje')
    }
  }

  const handleFotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSimularScanner = () => {
    setScannerSimulando(true)
    setTimeout(() => {
      setScannerSimulando(false)
      const brincoSimulado = `BR-${Math.floor(1000 + Math.random() * 9000)}`
      setCamposValores((prev) => ({
        ...prev,
        brinco: brincoSimulado,
        matriz_identificacao: brincoSimulado,
      }))
      setScannerOpen(false)
      toast({
        title: 'Brinco Lido pelo Scanner',
        description: `Código detectado: ${brincoSimulado}`,
      })
    }, 1200)
  }

  const handleSalvar = async () => {
    if (!tipoSelecionado) return

    // Validação de no máximo 3 campos obrigatórios definidos pelo tipo
    const camposObrigatorios = (tipoSelecionado.campos || [])
      .filter((c) => c.obrigatorio)
      .slice(0, 3)
    for (const c of camposObrigatorios) {
      const val = camposValores[c.nome]
      if (val === undefined || val === null || String(val).trim() === '') {
        toast({
          title: 'Campo Obrigatório',
          description: `Por favor preencha: ${c.label}`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setSubmitting(true)
      const loteObj = lotes.find((l) => l.id === loteId)
      const uuid = crypto.randomUUID()
      const dataHoraDispositivo = new Date().toISOString()

      // Se for suplemento no cocho, deduz estoque via registerConsumption (ÚNICO CAMINHO DE BAIXA)
      if (tipoSelecionado.codigo === 'suplemento_cocho') {
        const qtdKg = Number(camposValores.quantidade_kg) || 0
        const produto = camposValores.produto || 'Suplemento Mineral'
        if (qtdKg > 0) {
          const alvoLote = loteObj ? loteObj.name : 'PASTO_GERAL'
          await registerConsumption(alvoLote, 'SUP-01', qtdKg)
          if (!isOnline) {
            await addAction({
              type: 'DEDUCT_INVENTORY',
              payload: {
                inventoryId: 'SUP-01',
                amount: qtdKg,
                item: produto,
              },
            })
          }
        }
      }

      const payloadInput = {
        uuid_dispositivo: uuid,
        tipo: tipoSelecionado.codigo,
        data_hora_dispositivo: dataHoraDispositivo,
        usuario_id: user.id || 'usr_campo',
        usuario_nome: user.name || 'Operador de Campo',
        perfil: user.role || 'vaqueiro',
        lote_id: loteId || undefined,
        lote_nome: loteObj ? loteObj.name : undefined,
        pasto_id: loteObj
          ? loteObj.pasto_atual
          : camposValores.pasto_nome || camposValores.local || undefined,
        animal_id: camposValores.brinco || undefined,
        campos_especificos: camposValores,
        fotoFile: fotoFile || null,
        geolocalizacao: geolocalizacao || undefined,
        urgencia: tipoSelecionado.codigo === 'fogo' ? 'requer_acao_hoje' : urgencia,
      }

      if (isOnline) {
        try {
          await criarOcorrencia({
            ...payloadInput,
            origemOffline: false,
          })
          toast({
            title: 'Ocorrência Registrada!',
            description: `${tipoSelecionado.nome} gravada com carimbo de auditoria.`,
          })
        } catch (errOnline) {
          console.warn('Falha online, enfileirando offline:', errOnline)
          await addAction({
            type: 'REGISTRAR_OCORRENCIA',
            payload: payloadInput,
          })
          toast({
            title: 'Salva Offline na Fila',
            description:
              'Gravada no armazenamento local (IndexedDB) para sincronização automática.',
          })
        }
      } else {
        await addAction({
          type: 'REGISTRAR_OCORRENCIA',
          payload: payloadInput,
        })
        toast({
          title: 'Salva Offline na Fila',
          description: `Ocorrência gravada localmente. (${queue.length + 1} pendência(s) de sincronização).`,
        })
      }

      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar ocorrência',
        description: err?.message || 'Falha ao salvar dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">
                {tipoSelecionado ? tipoSelecionado.nome : 'Registrar Ocorrência de Campo'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {tipoSelecionado
                  ? 'Preencha os dados da ocorrência com no máximo 3 campos obrigatórios.'
                  : 'Selecione o tipo de ocorrência na grade de ícones (máximo 2 toques).'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ETAPA 1: GRADE DE ÍCONES GRANDES (ÁREA DE TOQUE >= 48PX) */}
        {!tipoSelecionado ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {tipos.map((t) => {
                const IconComponent = ICONES_MAP[t.icone] || Tag
                const isFogo = t.codigo === 'fogo'
                const isMorte = t.codigo === 'morte_animal'

                return (
                  <button
                    key={t.codigo}
                    type="button"
                    onClick={() => handleSelectTipo(t)}
                    className={`min-h-[76px] p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                      isFogo
                        ? 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200'
                        : isMorte
                          ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <IconComponent
                        className={`h-6 w-6 ${
                          isFogo ? 'text-rose-600' : isMorte ? 'text-amber-600' : 'text-primary'
                        }`}
                      />
                      {isFogo && (
                        <Badge
                          variant="destructive"
                          className="text-[9px] px-1 py-0 h-4 bg-rose-600 font-bold"
                        >
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold text-xs leading-tight line-clamp-2 mt-1">
                      {t.nome}
                    </span>
                  </button>
                )
              })}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ETAPA 2: FORMULÁRIO CURTO POR TIPO */
          <div className="space-y-4 py-2 animate-in fade-in">
            {/* Botão de voltar ao catálogo */}
            <div className="flex justify-between items-center border-b pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground gap-1"
                onClick={() => setTipoSelecionado(null)}
              >
                ← Trocar Tipo de Ocorrência
              </Button>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {tipoSelecionado.categoria || 'Geral'}
              </Badge>
            </div>

            {/* Seleção do Lote (opcional ou contextual) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lote Relacionado (opcional)</Label>
              <Select value={loteId} onValueChange={setLoteId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Selecione o lote (se aplicável)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum lote específico / Geral da Fazenda</SelectItem>
                  {lotes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {l.headcount || 0} cab • Pasto: {l.pasto_atual || 'S/P'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos Dinâmicos do Tipo */}
            {(tipoSelecionado.campos || []).map((campo) => {
              const valor = camposValores[campo.nome] ?? ''
              const ehBrinco = campo.nome === 'brinco' || campo.nome === 'matriz_identificacao'

              return (
                <div key={campo.nome} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">
                      {campo.label}{' '}
                      {campo.obrigatorio && <span className="text-destructive">*</span>}
                    </Label>
                    {ehBrinco && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 text-primary border-primary/30"
                        onClick={() => setScannerOpen(true)}
                      >
                        <QrCode className="h-3.5 w-3.5" /> Scanner / RFID
                      </Button>
                    )}
                  </div>

                  {campo.tipo === 'textarea' ? (
                    <Textarea
                      rows={2}
                      placeholder={`Informe ${campo.label.toLowerCase()}...`}
                      value={valor}
                      onChange={(e) =>
                        setCamposValores((prev) => ({ ...prev, [campo.nome]: e.target.value }))
                      }
                      className="text-xs"
                    />
                  ) : campo.tipo === 'select' && campo.opcoes ? (
                    <Select
                      value={valor}
                      onValueChange={(val) =>
                        setCamposValores((prev) => ({ ...prev, [campo.nome]: val }))
                      }
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder={`Selecione ${campo.label}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {campo.opcoes.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={campo.tipo === 'number' ? 'number' : 'text'}
                      placeholder={`Informe ${campo.label.toLowerCase()}...`}
                      value={valor}
                      onChange={(e) =>
                        setCamposValores((prev) => ({ ...prev, [campo.nome]: e.target.value }))
                      }
                      className="h-10 text-xs"
                    />
                  )}
                </div>
              )
            })}

            {/* Urgência (Informativo vs Requer Ação Hoje) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nível de Urgência</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={urgencia === 'informativo' ? 'default' : 'outline'}
                  className={`h-11 text-xs font-semibold ${
                    urgencia === 'informativo'
                      ? 'bg-slate-700 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setUrgencia('informativo')}
                  disabled={tipoSelecionado.codigo === 'fogo'}
                >
                  ℹ️ Informativo
                </Button>
                <Button
                  type="button"
                  variant={urgencia === 'requer_acao_hoje' ? 'default' : 'outline'}
                  className={`h-11 text-xs font-bold ${
                    urgencia === 'requer_acao_hoje'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'border-rose-400 text-rose-700 hover:bg-rose-50'
                  }`}
                  onClick={() => setUrgencia('requer_acao_hoje')}
                >
                  ⚠️ Requer Ação Hoje
                </Button>
              </div>
            </div>

            {/* Foto Direta da Câmera (input capture) */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-primary" /> Foto de Evidência (Câmera)
                </Label>
                {fotoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-destructive p-0"
                    onClick={() => {
                      setFotoFile(null)
                      setFotoPreview(null)
                    }}
                  >
                    Remover
                  </Button>
                )}
              </div>

              {fotoPreview ? (
                <div className="mt-2 relative rounded-lg overflow-hidden border max-h-40 flex justify-center bg-black">
                  <img
                    src={fotoPreview}
                    alt="Evidência"
                    className="object-contain max-h-40 w-auto"
                  />
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">
                    Toque para tirar foto com a câmera
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFotoCapture}
                  />
                </label>
              )}
            </div>

            {/* Indicador de Geolocalização */}
            {geolocalizacao && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Coordenadas GPS capturadas: {geolocalizacao.latitude?.toFixed(5)},{' '}
                  {geolocalizacao.longitude?.toFixed(5)} (±
                  {Math.round(geolocalizacao.precisao || 0)}m)
                </span>
              </div>
            )}
            {obtendoGeo && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 animate-pulse">
                <Navigation className="h-3.5 w-3.5 text-primary" /> Obtendo geolocalização do
                dispositivo...
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTipoSelecionado(null)}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleSalvar}
                disabled={submitting}
                className="gap-2 bg-primary font-bold min-h-[48px] h-12 flex-1 text-sm shadow-md"
              >
                <CheckCircle2 className="h-5 w-5" />
                {submitting ? 'Gravando...' : 'Confirmar Ocorrência'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      {/* MODAL SIMULADOR SCANNER DE BRINCO */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Leitor de Brinco / RFID
            </DialogTitle>
            <DialogDescription className="text-xs">
              Aproxime o leitor do brinco do animal ou simule a detecção no dispositivo de campo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="relative w-40 h-40 border-2 border-dashed border-primary/50 rounded-2xl flex items-center justify-center bg-muted/20 overflow-hidden">
              {scannerSimulando ? (
                <>
                  <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                  <ScanLine className="h-10 w-10 text-primary animate-bounce" />
                </>
              ) : (
                <QrCode className="h-16 w-16 text-muted-foreground/40" />
              )}
            </div>

            <Button
              onClick={handleSimularScanner}
              disabled={scannerSimulando}
              className="w-48 gap-2 bg-primary font-bold h-11"
            >
              <ScanLine className="h-4 w-4" />
              {scannerSimulando ? 'Lendo RFID...' : 'Escanear Brinco'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
