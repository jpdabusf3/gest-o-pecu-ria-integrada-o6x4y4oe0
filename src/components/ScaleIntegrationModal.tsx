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
import { useToast } from '@/hooks/use-toast'
import { Bluetooth, Scale, Loader2, CheckCircle2, Save, Wifi } from 'lucide-react'

interface ScaleIntegrationModalProps {
  animalId: string
  onSaveWeight?: (weight: string) => void
}

export function ScaleIntegrationModal({ animalId, onSaveWeight }: ScaleIntegrationModalProps) {
  const [open, setOpen] = useState(false)
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'wifi'>('bluetooth')
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'reading' | 'success'
  >('idle')
  const [reading, setReading] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    if (!open) {
      setTimeout(() => setConnectionState('idle'), 300)
      setReading('')
    }
  }, [open])

  const handleStartIntegration = () => {
    setConnectionState('connecting')

    // Simulate Bluetooth/Wi-fi handshake
    setTimeout(() => {
      setConnectionState('reading')

      // Simulate real-time scale reading stabilization
      let tempWeight = 240
      const interval = setInterval(() => {
        tempWeight = tempWeight + (Math.random() * 4 - 2)
        setReading(tempWeight.toFixed(1))
      }, 300)

      setTimeout(() => {
        clearInterval(interval)

        // Error handling notification: 20% chance of failure to meet criteria
        if (Math.random() < 0.2) {
          setConnectionState('idle')
          setReading('')
          toast({
            title: 'Falha na Conexão Bluetooth',
            description: 'A conexão foi interrompida ou os dados são inválidos. Tente reconectar.',
            variant: 'destructive',
          })
          return
        }

        // Final locked weight
        const finalWeight = (245.5 + Math.random() * 2).toFixed(1)
        setReading(finalWeight)
        setConnectionState('success')
        toast({
          title: 'Leitura Estabilizada',
          description: `Peso de ${finalWeight} kg capturado via ${connectionType.toUpperCase()} e associado ao animal ${animalId}.`,
        })
      }, 3000)
    }, 1500)
  }

  const handleSave = () => {
    if (onSaveWeight) onSaveWeight(reading)
    toast({
      title: 'Histórico Atualizado',
      description: `Sincronização concluída. O peso de ${reading} kg foi salvo para ${animalId}.`,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
        >
          <Bluetooth className="h-4 w-4" /> Conectar Balança
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> Integração de Balança Eletrônica
          </DialogTitle>
          <DialogDescription>
            Conecte ao equipamento via Bluetooth/Wi-Fi para captura automática do lote/animal atual,
            eliminando digitação manual.
          </DialogDescription>
        </DialogHeader>

        {connectionState === 'idle' && (
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
              <Wifi className="h-4 w-4" /> Wi-Fi (Rede)
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          <div className="relative w-40 h-40 rounded-full border-4 border-muted flex items-center justify-center bg-background shadow-inner">
            {connectionState === 'idle' &&
              (connectionType === 'bluetooth' ? (
                <Bluetooth className="h-12 w-12 text-muted-foreground opacity-50" />
              ) : (
                <Wifi className="h-12 w-12 text-muted-foreground opacity-50" />
              ))}

            {connectionState === 'connecting' && (
              <div className="flex flex-col items-center text-primary">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <span className="text-xs font-semibold animate-pulse">Pareando...</span>
              </div>
            )}

            {(connectionState === 'reading' || connectionState === 'success') && (
              <div className="flex flex-col items-center">
                <span
                  className={`text-4xl font-bold font-mono tracking-tighter ${connectionState === 'success' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {reading}
                </span>
                <span className="text-sm text-muted-foreground mt-1">KG</span>
              </div>
            )}

            {connectionState === 'success' && (
              <div className="absolute -bottom-2 -right-2 bg-background rounded-full">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            {connectionState === 'idle' && (
              <Button onClick={handleStartIntegration} className="w-full gap-2" size="lg">
                {connectionType === 'bluetooth' ? (
                  <Bluetooth className="h-4 w-4" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                Buscar Dispositivos Próximos
              </Button>
            )}

            {connectionState === 'connecting' && (
              <Button disabled className="w-full" size="lg">
                Aguarde...
              </Button>
            )}

            {connectionState === 'reading' && (
              <Button disabled className="w-full gap-2" size="lg">
                <Loader2 className="h-4 w-4 animate-spin" /> Estabilizando Peso
              </Button>
            )}

            {connectionState === 'success' && (
              <Button onClick={handleSave} className="w-full gap-2" size="lg">
                <Save className="h-4 w-4" /> Associar e Salvar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
