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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle } from 'lucide-react'
import useFrotaStore from '@/stores/useFrotaStore'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function IncidentModal() {
  const [open, setOpen] = useState(false)
  const { machines, addIncident } = useFrotaStore()
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    machineId: '',
    type: 'Pneu Estragado',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleSave = () => {
    if (!formData.machineId || !formData.description) return
    const machine = machines.find((m) => m.id === formData.machineId)
    if (!machine) return

    addIncident({
      machineId: formData.machineId,
      machineName: machine.name,
      type: formData.type,
      description: formData.description,
      date: formData.date,
      operator: user.name,
    })

    toast({
      title: 'Intercorrência Registrada',
      variant: 'destructive',
      description: 'O alerta foi salvo no histórico operacional.',
    })
    setOpen(false)
    setFormData({
      machineId: '',
      type: 'Pneu Estragado',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5"
        >
          <AlertTriangle className="h-4 w-4" /> Intercorrência
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Intercorrência</DialogTitle>
          <DialogDescription>
            Relate quebras, atolamentos ou danos aos equipamentos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Máquina Envolvida</Label>
            <Select
              value={formData.machineId}
              onValueChange={(v) => setFormData({ ...formData, machineId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Ocorrência</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pneu Estragado">Pneu Estragado</SelectItem>
                <SelectItem value="Quebra Mecânica">Quebra Mecânica</SelectItem>
                <SelectItem value="Atolamento">Atolamento</SelectItem>
                <SelectItem value="Acidente Leve">Acidente Leve</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição Detalhada</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explique o que aconteceu..."
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <Button variant="destructive" onClick={handleSave} className="w-full mt-2">
            Registrar Alerta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
