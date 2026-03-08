import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, UserPlus, Edit2, Trash2, ShieldCheck, Smartphone } from 'lucide-react'
import { teamMembers } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'

export default function Colaboradores() {
  const [members, setMembers] = useState(teamMembers)
  const { toast } = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({ name: '', email: '', role: 'Operador' })

  const handleOpenModal = (member?: (typeof teamMembers)[0]) => {
    if (member) {
      setEditingId(member.id)
      setFormData({ name: member.name, email: member.email, role: member.role })
    } else {
      setEditingId(null)
      setFormData({ name: '', email: '', role: 'Operador' })
    }
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (editingId) {
      setMembers(members.map((m) => (m.id === editingId ? { ...m, ...formData } : m)))
      toast({ title: 'Colaborador atualizado com sucesso.' })
    } else {
      setMembers([
        ...members,
        {
          id: Date.now().toString(),
          status: 'Ativo',
          lastActive: 'Nunca',
          ...formData,
        },
      ])
      toast({ title: 'Novo colaborador cadastrado.' })
    }
    setIsModalOpen(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      setMembers(members.filter((m) => m.id !== deleteId))
      toast({ title: 'Colaborador removido.', variant: 'destructive' })
    }
    setIsDeleteOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Colaboradores
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão de equipe, controle de acessos e cadastro de pessoal.
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenModal()}>
          <UserPlus className="h-4 w-4" /> Adicionar Colaborador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            Gerencie os acessos e informações dos colaboradores da fazenda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'Admin' ? 'default' : 'secondary'}
                        className="gap-1 font-normal"
                      >
                        {m.role === 'Admin' ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <Smartphone className="h-3 w-3" />
                        )}
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <div
                          className={`h-2 w-2 rounded-full ${m.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                        />
                        {m.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(m)}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteId(m.id)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
            <DialogDescription>Preencha os dados do membro da equipe abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Acesso</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel e Permissões</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="Operador">Operador de Campo (Módulo Restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Colaborador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remover Colaborador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este colaborador? Todo o acesso dele ao sistema será
              revogado imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
