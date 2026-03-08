import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, ShoppingCart, TrendingUp } from 'lucide-react'

export function GpbBalizadorButton() {
  const [open, setOpen] = useState(false)

  const handleRedirect = (type: 'venda' | 'compra') => {
    // In a real app this would securely redirect passing the context action parameter
    window.open(`https://app.balizadorgpb.com.br/report?action=${type}`, '_blank')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <ExternalLink className="h-4 w-4" /> Balizador GPB
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Informar Mercado no Balizador GPB</DialogTitle>
          <DialogDescription>
            Selecione o tipo de operação que deseja reportar no aplicativo do Balizador GPB.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-28 flex flex-col gap-3 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors"
            onClick={() => handleRedirect('venda')}
          >
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <span className="font-semibold text-sm">Venda de Gado</span>
          </Button>
          <Button
            variant="outline"
            className="h-28 flex flex-col gap-3 hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
            onClick={() => handleRedirect('compra')}
          >
            <ShoppingCart className="h-8 w-8 text-blue-500" />
            <span className="font-semibold text-sm">Compra (Reposição)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
