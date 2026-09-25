import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Bluetooth,
  Scale,
  Loader2,
  CheckCircle2,
  Save,
  Wifi,
  Upload,
  FileSpreadsheet,
  Layers,
} from 'lucide-react'

export interface BatchWeightItem {
  identificador: string
  peso: number
  ecc?: number
}

interface ScaleIntegrationModalProps {
  animalId?: string
  onSaveWeight?: (weight: string) => void
  onSaveBatchWeights?: (items: BatchWeightItem[]) => void
  triggerButton?: React.ReactNode
}

export function ScaleIntegrationModal({
  animalId = 'Animal/Lote',
  onSaveWeight,
  onSaveBatchWeights,
  triggerButton,
}: ScaleIntegrationModalProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'realtime' | 'batch'>('realtime')
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'wifi'>('bluetooth')
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'reading' | 'success'
  >('idle')
  const [reading, setReading] = useState<string>('')

  // Batch import state
  const [batchText, setBatchText] = useState<string>('')
  const [batchPreview, setBatchPreview] = useState<BatchWeightItem[]>([])

  const { toast } = useToast()

  useEffect(() => {
    if (!open) {
      setTimeout(() => setConnectionState('idle'), 300)
      setReading('')
    }
  }, [open])

  const handleStartIntegration = () => {
    setConnectionState('connecting')

    setTimeout(() => {
      setConnectionState('reading')

      let tempWeight = 380
      const interval = setInterval(() => {
        tempWeight = tempWeight + (Math.random() * 4 - 2)
        setReading(tempWeight.toFixed(1))
      }, 250)

      setTimeout(() => {
        clearInterval(interval)

        // Simular estabilização com sucesso
        const finalWeight = (465.0 + Math.random() * 15).toFixed(1)
        setReading(finalWeight)
        setConnectionState('success')
        toast({
          title: 'Leitura Estabilizada',
          description: `Peso de ${finalWeight} kg capturado via ${connectionType.toUpperCase()} da balança.`,
        })
      }, 2500)
    }, 1200)
  }

  const handleSave = () => {
    if (onSaveWeight) onSaveWeight(reading)
    toast({
      title: 'Peso Capturado',
      description: `O peso de ${reading} kg foi inserido a partir da balança.`,
    })
    setOpen(false)
  }

  const handleParseBatch = () => {
    if (!batchText.trim()) {
      toast({
        title: 'Texto Vazio',
        description: 'Cole as linhas no formato "BRINCO, PESO, ECC" ou "BRINCO;PESO".',
        variant: 'destructive',
      })
      return
    }

    const lines = batchText.trim().split('\n')
    const parsed: BatchWeightItem[] = []

    lines.forEach((line) => {
      const clean = line.replace('\r', '').trim()
      if (!clean) return

      // Suporta separador por vírgula, ponto e vírgula, tabulação ou espaço
      const parts = clean.split(/[,;\t\s]+/)
      if (parts.length >= 2) {
        const id = parts[0].trim()
        const peso = parseFloat(parts[1].replace(',', '.'))
        const ecc = parts[2] ? parseFloat(parts[2].replace(',', '.')) : undefined

        if (id && !isNaN(peso) && peso > 0) {
          parsed.push({ identificador: id, peso, ecc })
        }
      }
    })

    if (parsed.length === 0) {
      toast({
        title: 'Nenhum Registro Reconhecido',
        description: 'Verifique se os dados estão no formato "TAG-001 450" por linha.',
        variant: 'destructive',
      })
      return
    }

    setBatchPreview(parsed)
    toast({
      title: `${parsed.length} Registros Processados`,
      description: 'Revise os dados abaixo e clique em Confirmar Importação.',
    })
  }

  const handleConfirmBatch = () => {
    if (onSaveBatchWeights && batchPreview.length > 0) {
      onSaveBatchWeights(batchPreview)
    }
    toast({
      title: 'Importação Concluída',
      description: `${batchPreview.length} pesagens importadas da balança com sucesso.`,
    })
    setOpen(false)
    setBatchPreview([])
    setBatchText('')
  }

  const handleSampleBatch = () => {
    const sample = `TAG-101 420.5 3.5
TAG-102 435.0 4.0
TAG-103 415.2 3.0
TAG-104 460.8 4.5
TAG-105 448.0 4.0`
    setBatchText(sample)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
          >
            <Scale className="h-4 w-4" /> Conectar Balança
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scale className="h-5 w-5 text-primary" /> Integração de Balança Eletrônica
          </DialogTitle>
          <DialogDescription>
            Conecte ao indicador de pesagem via Bluetooth/Wi-Fi ou importe arquivo/lote de pesagens
            coletadas no curral.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full mt-2"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="realtime" className="gap-2">
              <Bluetooth className="h-4 w-4" /> Leitura Direta
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" /> Importação em Lote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-4 pt-2">
            <div className="flex justify-center gap-4 py-2 border-b">
              <Button
                variant={connectionType === 'bluetooth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConnectionType('bluetooth')}
                className="gap-2"
              >
                <Bluetooth className="h-4 w-4" /> Bluetooth
              </Button>
              <Button
                variant={connectionType === 'wifi' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConnectionType('wifi')}
                className="gap-2"
              >
                <Wifi className="h-4 w-4" /> Wi-Fi / Rede
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="relative w-36 h-36 rounded-full border-4 border-muted flex items-center justify-center bg-background shadow-inner">
                {connectionState === 'idle' &&
                  (connectionType === 'bluetooth' ? (
                    <Bluetooth className="h-10 w-10 text-muted-foreground opacity-50" />
                  ) : (
                    <Wifi className="h-10 w-10 text-muted-foreground opacity-50" />
                  ))}

                {connectionState === 'connecting' && (
                  <div className="flex flex-col items-center text-primary">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span className="text-xs font-semibold animate-pulse">Pareando...</span>
                  </div>
                )}

                {(connectionState === 'reading' || connectionState === 'success') && (
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-3xl font-bold font-mono tracking-tighter ${connectionState === 'success' ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {reading}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">KG</span>
                  </div>
                )}

                {connectionState === 'success' && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Alvo: <span className="font-semibold text-foreground">{animalId}</span>
              </div>

              <div className="w-full space-y-2">
                {connectionState === 'idle' && (
                  <Button onClick={handleStartIntegration} className="w-full gap-2" size="lg">
                    {connectionType === 'bluetooth' ? (
                      <Bluetooth className="h-4 w-4" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    Buscar Dispositivo Balança
                  </Button>
                )}

                {connectionState === 'connecting' && (
                  <Button disabled className="w-full" size="lg">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Conectando ao Indicador...
                  </Button>
                )}

                {connectionState === 'reading' && (
                  <Button disabled className="w-full gap-2" size="lg">
                    <Loader2 className="h-4 w-4 animate-spin" /> Estabilizando Peso
                  </Button>
                )}

                {connectionState === 'success' && (
                  <Button onClick={handleSave} className="w-full gap-2" size="lg">
                    <Save className="h-4 w-4" /> Inserir {reading} kg
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">
                  Dados Coletados da Balança (Tru-Test / Coimma / Beckhauser)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSampleBatch}
                  className="text-xs h-7 text-primary"
                >
                  Exemplo de Dados
                </Button>
              </div>
              <textarea
                rows={5}
                className="w-full p-2.5 text-xs font-mono rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="TAG-01 450.5 3.5&#10;TAG-02 462.0 4.0&#10;TAG-03 440.0"
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Formato aceito por linha:{' '}
                <code className="bg-muted px-1 rounded">BRINCO PESO [ECC]</code>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleParseBatch}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" /> Processar Dados do Curral
            </Button>

            {batchPreview.length > 0 && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-primary" /> {batchPreview.length}{' '}
                    pesagens prontas
                  </span>
                  <span>
                    Média:{' '}
                    {(
                      batchPreview.reduce((acc, curr) => acc + curr.peso, 0) / batchPreview.length
                    ).toFixed(1)}{' '}
                    kg
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto divide-y text-xs font-mono">
                  {batchPreview.map((item, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span className="font-semibold text-foreground">{item.identificador}</span>
                      <span>{item.peso} kg</span>
                      <span className="text-muted-foreground">ECC: {item.ecc ?? '-'}</span>
                    </div>
                  ))}
                </div>

                <Button type="button" onClick={handleConfirmBatch} className="w-full gap-2">
                  <Save className="h-4 w-4" /> Confirmar e Gravar {batchPreview.length} Pesagens
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
