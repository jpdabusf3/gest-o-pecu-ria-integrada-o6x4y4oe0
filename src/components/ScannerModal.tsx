import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { QrCode, ScanLine, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ScannerModal() {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [tag, setTag] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSimulateScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      toast({ title: 'Leitura concluída', description: 'Brinco TAG-1234 detectado com sucesso.' })
      setOpen(false)
      navigate('/animal/TAG-1234')
    }, 1500)
  }

  const handleManualSearch = () => {
    if (!tag) return
    setOpen(false)
    navigate(`/animal/${tag}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escanear Brinco / RFID</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o código ou insira o número identificador do animal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 gap-6">
          <div className="relative w-48 h-48 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center bg-muted/20 overflow-hidden">
            {scanning ? (
              <>
                <div className="absolute inset-0 bg-primary/5"></div>
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-primary/80 shadow-[0_0_8px_2px_hsl(var(--primary))] animate-pulse"></div>
                <ScanLine className="h-12 w-12 text-primary animate-bounce" />
              </>
            ) : (
              <QrCode className="h-16 w-16 text-muted-foreground/50" />
            )}
          </div>
          <Button onClick={handleSimulateScan} disabled={scanning} className="w-48 gap-2">
            <ScanLine className="h-4 w-4" />
            {scanning ? 'Lendo dados...' : 'Simular Leitura'}
          </Button>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase font-medium">
            Busca Manual
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ex: TAG-1234"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
          />
          <Button variant="secondary" onClick={handleManualSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
