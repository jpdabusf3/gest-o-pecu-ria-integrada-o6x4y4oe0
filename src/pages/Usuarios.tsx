import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Shield,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { UserRecord, listUsers, createUser, updateUser, deleteUser } from '@/services/usuarios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

const ROLES_CONFIG: Record<string, { label: string; cor: string; desc: string }> = {
  proprietario: {
    label: 'Proprietário',
    cor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
    desc: 'Acesso pleno a toda a gestão, relatórios financeiros e configurações',
  },
  socio: {
    label: 'Sócio',
    cor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
    desc: 'Visão executiva, relatórios e fechamentos da fazenda',
  },
  gestor: {
    label: 'Gestor Geral',
    cor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
    desc: 'Coordenação operacional, zootécnica, compras, vendas e rebanho',
  },
  gerente: {
    label: 'Gerente Operacional',
    cor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300',
    desc: 'Supervisão de manejos, estoque e atividades de campo',
  },
  capataz: {
    label: 'Capataz',
    cor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
    desc: 'Liderança de equipe de campo, registro de manejos e ocorrências',
  },
  vaqueiro: {
    label: 'Vaqueiro',
    cor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300',
    desc: 'Trabalho direto com o rebanho, pesagens e ocorrências no pasto',
  },
  servente: {
    label: 'Servente',
    cor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    desc: 'Manejo de trato, manutenção e apoio geral',
  },
  operador: {
    label: 'Operador',
    cor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
    desc: 'Operação de máquinas e trato',
  },
  funcionario: {
    label: 'Funcionário / Colaborador',
    cor: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
    desc: 'Colaborador com acesso às rotinas designadas',
  },
  admin: {
    label: 'Administrador',
    cor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300',
    desc: 'Administração técnica do sistema',
  },
}

export default function Usuarios() {
  const { user: currentUser, isGestor, isProprietario } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroRole, setFiltroRole] = useState('todos')

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false)

  // Formulário Novo
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoRole, setNovoRole] = useState('funcionario')
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  // Formulário Edição
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UserRecord | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('funcionario')
  const [editSenha, setEditSenha] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UserRecord | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const canAccess = isGestor || isProprietario

  const carregarUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listUsers()
      setUsuarios(data)
    } catch (err: any) {
      console.warn('Erro ao carregar usuários:', err)
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar a lista de usuários do backend.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (canAccess) {
      carregarUsuarios()
    }
  }, [canAccess, carregarUsuarios])

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const termo = busca.toLowerCase().trim()
      const matchBusca =
        !termo || u.name.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
      const matchRole = filtroRole === 'todos' || u.role === filtroRole
      return matchBusca && matchRole
    })
  }, [usuarios, busca, filtroRole])

  // Abertura Modal Editar
  const handleAbrirEditar = (u: UserRecord) => {
    setUsuarioEmEdicao(u)
    setEditNome(u.name)
    setEditEmail(u.email)
    setEditRole(u.role || 'funcionario')
    setEditSenha('')
    setModalEditarOpen(true)
  }

  // Abertura Modal Excluir
  const handleAbrirExcluir = (u: UserRecord) => {
    if (u.id === currentUser.id) {
      toast({
        title: 'Ação Bloqueada',
        description: 'Você não pode excluir sua própria conta.',
        variant: 'destructive',
      })
      return
    }
    setUsuarioParaExcluir(u)
    setModalExcluirOpen(true)
  }

  // Submissão Criar
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSalvandoNovo(true)
      await createUser({
        name: novoNome,
        email: novoEmail,
        password: novaSenha,
        role: novoRole,
      })

      toast({
        title: 'Usuário Criado com Sucesso!',
        description: `${novoNome} foi adicionado como ${ROLES_CONFIG[novoRole]?.label || novoRole}.`,
      })

      setNovoNome('')
      setNovoEmail('')
      setNovaSenha('')
      setNovoRole('funcionario')
      setModalNovoOpen(false)
      carregarUsuarios()
    } catch (err: any) {
      toast({
        title: 'Falha ao Criar Usuário',
        description: err?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovo(false)
    }
  }

  // Submissão Editar
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioEmEdicao) return

    // Bloquear usuário de rebaixar a si mesmo se for o gestor/proprietario atual
    if (usuarioEmEdicao.id === currentUser.id && editRole !== currentUser.role) {
      if (editRole !== 'gestor' && editRole !== 'proprietario' && editRole !== 'admin') {
        toast({
          title: 'Ação Bloqueada',
          description: 'Você não pode rebaixar seu próprio papel no sistema.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setSalvandoEdicao(true)
      await updateUser(usuarioEmEdicao.id, {
        name: editNome,
        email: editEmail,
        role: editRole,
        password: editSenha || undefined,
      })

      toast({
        title: 'Usuário Atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })

      setModalEditarOpen(false)
      setUsuarioEmEdicao(null)
      carregarUsuarios()
    } catch (err: any) {
      toast({
        title: 'Falha na Atualização',
        description: err?.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Confirmar Excluir
  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return
    try {
      setExcluindo(true)
      await deleteUser(usuarioParaExcluir.id, currentUser.id)
      toast({
        title: 'Usuário Excluído',
        description: `O cadastro de ${usuarioParaExcluir.name} foi removido do sistema.`,
      })
      setModalExcluirOpen(false)
      setUsuarioParaExcluir(null)
      carregarUsuarios()
    } catch (err: any) {
      toast({
        title: 'Falha ao Excluir',
        description: err?.message || 'Não foi possível excluir este usuário.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <Shield className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Apenas usuários com papel de <strong>Gestor</strong> ou <strong>Proprietário</strong> têm
          permissão para gerenciar as contas de usuários e funcionários da plataforma.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" /> Gestão de Usuários e Funcionários
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              Acesso Gestor / Proprietário
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre novos funcionários, edite credenciais, atribua papéis e gerencie permissões de
            acesso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarUsuarios}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button
            onClick={() => setModalNovoOpen(true)}
            className="gap-2 bg-primary font-bold shadow-sm h-9"
          >
            <UserPlus className="h-4 w-4" /> Adicionar Usuário
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-border/70 bg-card p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div>
            <Select value={filtroRole} onValueChange={setFiltroRole}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filtrar por Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Papéis</SelectItem>
                <SelectItem value="proprietario">Proprietário</SelectItem>
                <SelectItem value="socio">Sócio</SelectItem>
                <SelectItem value="gestor">Gestor Geral</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="capataz">Capataz</SelectItem>
                <SelectItem value="vaqueiro">Vaqueiro</SelectItem>
                <SelectItem value="servente">Servente</SelectItem>
                <SelectItem value="funcionario">Funcionário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de Usuários */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
              <CardDescription className="text-xs">
                {usuariosFiltrados.length} contas encontradas na base de dados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail de Acesso</TableHead>
                  <TableHead>Papel / Função</TableHead>
                  <TableHead>Cadastrado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Carregando usuários do sistema...
                    </TableCell>
                  </TableRow>
                ) : usuariosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground text-sm"
                    >
                      Nenhum usuário encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const roleInfo = ROLES_CONFIG[u.role] || {
                      label: u.role,
                      cor: 'bg-muted text-foreground',
                      desc: '',
                    }
                    const isSelf = u.id === currentUser.id
                    const avatarUrl = u.avatar ? pb.files.getURL(u as any, u.avatar) : ''

                    return (
                      <TableRow key={u.id} className="transition-colors">
                        <TableCell className="pl-4 pr-0">
                          <Avatar className="h-9 w-9 border border-primary/20">
                            <AvatarImage src={avatarUrl} alt={u.name} />
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {u.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {u.name}
                            {isSelf && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-primary text-primary bg-primary/5"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">{u.email}</span>
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={`text-xs px-2 py-0.5 font-semibold border ${roleInfo.cor}`}
                          >
                            {roleInfo.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </TableCell>

                        <TableCell className="text-right space-x-1 pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleAbrirEditar(u)}
                            title="Editar usuário"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              isSelf
                                ? 'text-muted-foreground/40 cursor-not-allowed'
                                : 'text-destructive hover:text-destructive hover:bg-destructive/10'
                            }`}
                            onClick={() => handleAbrirExcluir(u)}
                            disabled={isSelf}
                            title={
                              isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Adicionar Usuário */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Novo Usuário / Funcionário
            </DialogTitle>
            <DialogDescription>
              Crie uma conta de acesso para um membro da equipe com papel e senha inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarUsuario} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-nome" className="text-xs font-semibold">
                Nome Completo *
              </Label>
              <Input
                id="novo-nome"
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novo-email" className="text-xs font-semibold">
                E-mail de Acesso *
              </Label>
              <Input
                id="novo-email"
                type="email"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="carlos@fazendaf3.com.br"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novo-role" className="text-xs font-semibold">
                Papel / Função *
              </Label>
              <Select value={novoRole} onValueChange={setNovoRole}>
                <SelectTrigger id="novo-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor Geral</SelectItem>
                  <SelectItem value="proprietario">Proprietário</SelectItem>
                  <SelectItem value="socio">Sócio</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="capataz">Capataz</SelectItem>
                  <SelectItem value="vaqueiro">Vaqueiro</SelectItem>
                  <SelectItem value="servente">Servente</SelectItem>
                  <SelectItem value="funcionario">Funcionário / Colaborador</SelectItem>
                </SelectContent>
              </Select>
              {ROLES_CONFIG[novoRole] && (
                <p className="text-[11px] text-muted-foreground">{ROLES_CONFIG[novoRole].desc}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nova-senha" className="text-xs font-semibold">
                Senha Inicial * (mínimo 8 caracteres)
              </Label>
              <Input
                id="nova-senha"
                type="password"
                required
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoOpen(false)}
                disabled={salvandoNovo}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoNovo} className="gap-2">
                {salvandoNovo ? 'Salvando...' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize nome, e-mail, papel de acesso ou redefina a senha do colaborador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome" className="text-xs font-semibold">
                Nome Completo *
              </Label>
              <Input
                id="edit-nome"
                required
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-semibold">
                E-mail de Acesso *
              </Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role" className="text-xs font-semibold">
                Papel / Função
              </Label>
              <Select
                value={editRole}
                onValueChange={setEditRole}
                disabled={usuarioEmEdicao?.id === currentUser.id}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor Geral</SelectItem>
                  <SelectItem value="proprietario">Proprietário</SelectItem>
                  <SelectItem value="socio">Sócio</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="capataz">Capataz</SelectItem>
                  <SelectItem value="vaqueiro">Vaqueiro</SelectItem>
                  <SelectItem value="servente">Servente</SelectItem>
                  <SelectItem value="funcionario">Funcionário / Colaborador</SelectItem>
                </SelectContent>
              </Select>
              {usuarioEmEdicao?.id === currentUser.id && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Você não pode alterar o seu próprio papel.
                </p>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <Label
                htmlFor="edit-senha"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                Redefinir Senha (opcional)
              </Label>
              <Input
                id="edit-senha"
                type="password"
                placeholder="Deixe em branco para manter a senha atual"
                value={editSenha}
                onChange={(e) => setEditSenha(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground">
                Se preenchida, deve conter no mínimo 8 caracteres.
              </span>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEditarOpen(false)}
                disabled={salvandoEdicao}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoEdicao} className="gap-2">
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Exclusão com Confirmação Explícita */}
      <Dialog open={modalExcluirOpen} onOpenChange={setModalExcluirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir Usuário
            </DialogTitle>
            <DialogDescription>
              Esta ação removerá permanentemente o acesso deste usuário ao sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-xs space-y-1 text-destructive">
            <p className="font-bold">Confirmação de segurança:</p>
            <p>
              Tem certeza de que deseja excluir o usuário{' '}
              <strong>{usuarioParaExcluir?.name}</strong> ({usuarioParaExcluir?.email})?
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalExcluirOpen(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="gap-2"
            >
              {excluindo ? 'Excluindo...' : 'Sim, Excluir Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
