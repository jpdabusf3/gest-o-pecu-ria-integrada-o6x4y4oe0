import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { useState } from 'react'

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState({
    sms: false,
    whatsapp: true,
    sanitary: true,
    inventory: true,
    pasture: true,
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" /> Notificações
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
          <DialogDescription>
            Configure como e quando você deseja receber alertas do sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium leading-none">Canais de Entrega</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsapp" className="flex flex-col gap-1 cursor-pointer">
                <span>WhatsApp</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Receba mensagens instantâneas
                </span>
              </Label>
              <Switch
                id="whatsapp"
                checked={prefs.whatsapp}
                onCheckedChange={(c) => setPrefs({ ...prefs, whatsapp: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms" className="flex flex-col gap-1 cursor-pointer">
                <span>SMS</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Alertas via mensagem de texto
                </span>
              </Label>
              <Switch
                id="sms"
                checked={prefs.sms}
                onCheckedChange={(c) => setPrefs({ ...prefs, sms: c })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium leading-none">Tipos de Alerta</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="sanitary" className="cursor-pointer">
                Prazos Sanitários
              </Label>
              <Switch
                id="sanitary"
                checked={prefs.sanitary}
                onCheckedChange={(c) => setPrefs({ ...prefs, sanitary: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="inventory" className="cursor-pointer">
                Níveis Críticos de Estoque
              </Label>
              <Switch
                id="inventory"
                checked={prefs.inventory}
                onCheckedChange={(c) => setPrefs({ ...prefs, inventory: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pasture" className="cursor-pointer">
                Desvios de Altura do Pasto
              </Label>
              <Switch
                id="pasture"
                checked={prefs.pasture}
                onCheckedChange={(c) => setPrefs({ ...prefs, pasture: c })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
