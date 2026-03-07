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
import { Bluetooth, Scale, Loader2, CheckCircle2, Save } from 'lucide-react'

interface ScaleIntegrationModalProps {
  animalId: string
  onSaveWeight?: (weight: string) => void
}

export function ScaleIntegrationModal({ animalId, onSaveWeight }: ScaleIntegrationModalProps) {
  const [open, setOpen] = useState(false)
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
        // Final locked weight
        const finalWeight = (245.5 + Math.random() * 2).toFixed(1)
        setReading(finalWeight)
        setConnectionState('success')
        toast({
          title: 'Leitura Estabilizada',
          description: 'O peso foi capturado com sucesso da balança eletrônica.',
        })
      }, 3000)
    }, 1500)
  }

  const handleSave = () => {
    if (onSaveWeight) onSaveWeight(reading)
    toast({
      title: 'Peso Registrado',
      description: `O peso de ${reading} kg foi salvo no histórico do animal ${animalId}.`,
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
          <Bluetooth className="h-4 w-4" /> Importar Balança
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" /> Integração com Balança
          </DialogTitle>
          <DialogDescription>
            Conecte ao sensor Bluetooth/Wi-Fi da balança para leitura automática.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative w-40 h-40 rounded-full border-4 border-muted flex items-center justify-center bg-background shadow-inner">
            {connectionState === 'idle' && (
              <Bluetooth className="h-12 w-12 text-muted-foreground opacity-50" />
            )}

            {connectionState === 'connecting' && (
              <div className="flex flex-col items-center text-primary">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <span className="text-xs font-semibold animate-pulse">Conectando...</span>
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
                <Bluetooth className="h-4 w-4" /> Buscar Dispositivos
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
                <Save className="h-4 w-4" /> Salvar {reading} kg
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
