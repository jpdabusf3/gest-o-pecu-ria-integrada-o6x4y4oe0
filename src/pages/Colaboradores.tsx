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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus, Edit2, Trash2, ShieldCheck, Smartphone, CheckSquare } from 'lucide-react'
import { teamMembers } from '@/data/mock'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import useAuditStore from '@/stores/useAuditStore'

export default function Colaboradores() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const { logs, addLog } = useAuditStore()

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
      addLog({
        userId: user.id,
        userName: user.name,
        entityType: 'Colaborador',
        entityId: editingId,
        action: 'Update',
        details: `Atualizou os dados e permissões do colaborador ${formData.name}.`,
      })
    } else {
      const newId = Date.now().toString()
      setMembers([
        ...members,
        {
          id: newId,
          status: 'Ativo',
          lastActive: 'Nunca',
          ...formData,
        },
      ])
      toast({ title: 'Novo colaborador cadastrado.' })
      addLog({
        userId: user.id,
        userName: user.name,
        entityType: 'Colaborador',
        entityId: newId,
        action: 'Create',
        details: `Cadastrou o novo colaborador ${formData.name}.`,
      })
    }
    setIsModalOpen(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      const member = members.find((m) => m.id === deleteId)
      setMembers(members.filter((m) => m.id !== deleteId))
      toast({ title: 'Colaborador removido.', variant: 'destructive' })
      addLog({
        userId: user.id,
        userName: user.name,
        entityType: 'Colaborador',
        entityId: deleteId,
        action: 'Delete',
        details: `Removeu o colaborador ${member?.name}.`,
      })
    }
    setIsDeleteOpen(false)
  }

  const memberLogs = logs.filter((l) => l.entityType === 'Colaborador' && l.entityId === editingId)

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
        {isAdmin && (
          <Button className="gap-2" onClick={() => handleOpenModal()}>
            <UserPlus className="h-4 w-4" /> Adicionar Colaborador
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Gerencie os acessos e informações dos colaboradores da fazenda.'
              : 'Visualização da equipe da fazenda e seus papéis.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
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
                        variant={
                          m.role === 'Admin'
                            ? 'default'
                            : m.role === 'Gerente'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="gap-1 font-normal"
                      >
                        {m.role === 'Admin' ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : m.role === 'Gerente' ? (
                          <CheckSquare className="h-3 w-3" />
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
                    {isAdmin && (
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
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Ficha do Colaborador' : 'Novo Colaborador'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Edite as informações ou visualize o histórico de auditoria.'
                : 'Preencha os dados e defina o nível de acesso (RBAC).'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados" className="mt-2">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="dados">Dados de Acesso</TabsTrigger>
              <TabsTrigger value="historico" disabled={!editingId}>
                Log de Auditoria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 py-2 outline-none">
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
                <Label>Nível de Acesso (RBAC)</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Administrador (Acesso Total)</SelectItem>
                    <SelectItem value="Gerente">Gerente (Relatórios e Operacional)</SelectItem>
                    <SelectItem value="Operador">Operador de Campo (Dados e Tarefas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="py-2 outline-none">
              <div className="rounded-md border h-[250px] overflow-y-auto p-4 space-y-4 bg-muted/20">
                {memberLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-8">
                    Nenhum registro de auditoria encontrado.
                  </p>
                ) : (
                  memberLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 text-sm border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-foreground">
                          {log.action === 'Create'
                            ? 'Criação'
                            : log.action === 'Update'
                              ? 'Atualização'
                              : 'Remoção'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <span className="text-muted-foreground">{log.details}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Por: {log.userName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
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
