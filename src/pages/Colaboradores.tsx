import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import {
  Users,
  UserPlus,
  Edit2,
  UserX,
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  Smartphone,
  Eye,
  KeyRound,
  RefreshCw,
  Copy,
} from 'lucide-react'
import {
  MembroEquipeRecord,
  PerfilEquipe,
  PERFIS_LABELS,
  getEquipe,
  inativarMembroEquipe,
  reativarMembroEquipe,
} from '@/services/equipe'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { ModalCadastroEquipe } from '@/components/equipe/ModalCadastroEquipe'

export default function Colaboradores() {
  const { user, canManageEquipe, isProprietario, isGestor } = useAuth()
  const { toast } = useToast()

  const [membros, setMembros] = useState<MembroEquipeRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos')
  const [filtroFrente, setFiltroFrente] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalCadastroOpen, setModalCadastroOpen] = useState(false)
  const [membroSelecionado, setMembroSelecionado] = useState<MembroEquipeRecord | null>(null)
  const [modalInativarOpen, setModalInativarOpen] = useState(false)
  const [membroParaInativar, setMembroParaInativar] = useState<MembroEquipeRecord | null>(null)
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false)
  const [membroVisualizar, setMembroVisualizar] = useState<MembroEquipeRecord | null>(null)

  const carregarEquipe = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getEquipe()
      setMembros(data)
    } catch (err) {
      console.warn('Erro ao carregar equipe:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarEquipe()
  }, [carregarEquipe])

  useRealtime('equipe', () => carregarEquipe())

  // Filtragem dos membros
  const membrosFiltrados = useMemo(() => {
    return membros.filter((m) => {
      // Busca por nome, CPF ou função
      const termo = busca.toLowerCase().trim()
      const matchBusca =
        !termo ||
        m.nome.toLowerCase().includes(termo) ||
        m.cpf.toLowerCase().includes(termo) ||
        (m.funcao_especifica && m.funcao_especifica.toLowerCase().includes(termo)) ||
        (m.email && m.email.toLowerCase().includes(termo))

      // Filtro perfil
      const matchPerfil = filtroPerfil === 'todos' || m.perfil === filtroPerfil

      // Filtro status
      const matchStatus = filtroStatus === 'todos' || m.status === filtroStatus

      // Filtro frente (para quem tem frentes ou lotes)
      let matchFrente = true
      if (filtroFrente !== 'todas') {
        const frentes = m.frentes_supervisao || []
        matchFrente = frentes.includes(filtroFrente)
      }

      return matchBusca && matchPerfil && matchStatus && matchFrente
    })
  }, [membros, busca, filtroPerfil, filtroFrente, filtroStatus])

  // Contadores
  const contadores = useMemo(() => {
    const total = membros.length
    const ativos = membros.filter((m) => m.status === 'ativo').length
    const campo = membros.filter(
      (m) => (m.perfil === 'vaqueiro' || m.perfil === 'servente') && m.status === 'ativo',
    ).length
    const gestao = membros.filter(
      (m) =>
        (m.perfil === 'proprietario' || m.perfil === 'gestor' || m.perfil === 'socio') &&
        m.status === 'ativo',
    ).length
    return { total, ativos, campo, gestao }
  }, [membros])

  const handleAbrirNovo = () => {
    if (!canManageEquipe) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas Proprietário e Gestor podem criar novos cadastros de equipe.',
        variant: 'destructive',
      })
      return
    }
    setMembroSelecionado(null)
    setModalCadastroOpen(true)
  }

  const handleAbrirEditar = (membro: MembroEquipeRecord) => {
    if (!canManageEquipe) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas Proprietário e Gestor podem editar cadastros da equipe.',
        variant: 'destructive',
      })
      return
    }
    setMembroSelecionado(membro)
    setModalCadastroOpen(true)
  }

  const handleConfirmarInativacao = async () => {
    if (!membroParaInativar) return
    try {
      if (membroParaInativar.status === 'ativo') {
        await inativarMembroEquipe(membroParaInativar.id)
        toast({
          title: 'Colaborador Inativado',
          description: `${membroParaInativar.nome} agora está inativo. O acesso foi suspenso, mas seu histórico foi mantido.`,
        })
      } else {
        await reativarMembroEquipe(membroParaInativar.id)
        toast({
          title: 'Colaborador Reativado',
          description: `${membroParaInativar.nome} foi reativado com sucesso.`,
        })
      }
      carregarEquipe()
    } catch (err: any) {
      toast({
        title: 'Erro na alteração',
        description: err?.message || 'Falha ao alterar status.',
        variant: 'destructive',
      })
    } finally {
      setModalInativarOpen(false)
      setMembroParaInativar(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" /> Equipe & Controle de Acesso
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              RBAC Pecuária
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre todas as pessoas da operação, configure os 6 perfis de acesso e gerencie
            responsabilidades por lote e frente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarEquipe}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          {canManageEquipe && (
            <Button onClick={handleAbrirNovo} className="gap-2 bg-primary font-bold shadow-sm h-9">
              <UserPlus className="h-4 w-4" /> Novo Cadastro
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Total Equipe
          </span>
          <div className="text-2xl font-bold font-mono mt-1">{contadores.total}</div>
          <span className="text-[11px] text-muted-foreground">Cadastros registrados</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold uppercase">Ativos Hoje</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {contadores.ativos}
          </div>
          <span className="text-[11px] text-muted-foreground">Com acesso liberado</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-sky-700 font-semibold uppercase">Operação de Campo</span>
          <div className="text-2xl font-bold font-mono text-sky-600 mt-1">{contadores.campo}</div>
          <span className="text-[11px] text-muted-foreground">Vaqueiros e Serventes</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-amber-700 font-semibold uppercase">Gestão & Sócios</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {contadores.gestao}
          </div>
          <span className="text-[11px] text-muted-foreground">Proprietário / Gestor / Sócio</span>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-border/70 bg-card p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca textual */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou função..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filtro Perfil */}
          <div>
            <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Perfil de Acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Perfis</SelectItem>
                <SelectItem value="proprietario">Proprietário</SelectItem>
                <SelectItem value="socio">Sócio</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="capataz">Capataz</SelectItem>
                <SelectItem value="vaqueiro">Vaqueiro</SelectItem>
                <SelectItem value="servente">Servente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Frente */}
          <div>
            <Select value={filtroFrente} onValueChange={setFiltroFrente}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Frente de Atuação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Frentes</SelectItem>
                <SelectItem value="cria">Cria</SelectItem>
                <SelectItem value="recria">Recria</SelectItem>
                <SelectItem value="engorda">Engorda</SelectItem>
                <SelectItem value="confinamento">Confinamento</SelectItem>
                <SelectItem value="arrendamento">Arrendamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Status */}
          <div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="ativo">🟢 Apenas Ativos</SelectItem>
                <SelectItem value="inativo">⚪ Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de Colaboradores */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Colaboradores Cadastrados</CardTitle>
              <CardDescription className="text-xs">
                {membrosFiltrados.length} colaboradores encontrados com os filtros selecionados.
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
                  <TableHead>Colaborador</TableHead>
                  <TableHead>CPF / Contato</TableHead>
                  <TableHead>Perfil (RBAC)</TableHead>
                  <TableHead>Atribuições / Frentes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Carregando equipe do banco real...
                    </TableCell>
                  </TableRow>
                ) : membrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground text-sm"
                    >
                      Nenhum membro encontrado com os critérios de filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  membrosFiltrados.map((m) => {
                    const perfilInfo = PERFIS_LABELS[m.perfil] || {
                      label: m.perfil,
                      cor: 'bg-muted text-foreground',
                    }
                    const isAtivo = m.status === 'ativo'

                    return (
                      <TableRow
                        key={m.id}
                        className={`transition-colors ${!isAtivo ? 'opacity-60 bg-muted/10' : ''}`}
                      >
                        {/* Foto / Avatar */}
                        <TableCell className="pl-4 pr-0">
                          {m.foto ? (
                            <img
                              src={`https://gestao-pecuaria-integrada-96d74.shrd00.internal.goskip.dev/api/files/equipe/${m.id}/${m.foto}`}
                              alt={m.nome}
                              className="h-9 w-9 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                              {m.nome.charAt(0)}
                            </div>
                          )}
                        </TableCell>

                        {/* Nome & Email */}
                        <TableCell>
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {m.nome}
                            {m.socio_administrador && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 border-blue-500 text-blue-700 bg-blue-50"
                              >
                                Sócio Adm
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {m.email || 'Sem e-mail cadastrado'}
                          </div>
                        </TableCell>

                        {/* CPF e Telefone */}
                        <TableCell>
                          <div className="text-xs font-mono font-medium">{m.cpf}</div>
                          <div className="text-xs text-muted-foreground">{m.telefone}</div>
                        </TableCell>

                        {/* Perfil (RBAC) */}
                        <TableCell>
                          <Badge className={`text-xs px-2 py-0.5 font-semibold ${perfilInfo.cor}`}>
                            {perfilInfo.label}
                          </Badge>
                          {m.funcao_especifica && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {m.funcao_especifica}
                            </div>
                          )}
                        </TableCell>

                        {/* Atribuições / Lotes / Frentes */}
                        <TableCell>
                          {m.perfil === 'vaqueiro' || m.perfil === 'servente' ? (
                            <div className="space-y-1">
                              {m.lotes_responsabilidade && m.lotes_responsabilidade.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {m.lotes_responsabilidade.slice(0, 2).map((lote) => (
                                    <Badge
                                      key={lote}
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {lote}
                                    </Badge>
                                  ))}
                                  {m.lotes_responsabilidade.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{m.lotes_responsabilidade.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Todos os lotes
                                </span>
                              )}
                            </div>
                          ) : m.frentes_supervisao && m.frentes_supervisao.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.frentes_supervisao.map((frente) => (
                                <Badge
                                  key={frente}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 capitalize"
                                >
                                  {frente}
                                </Badge>
                              ))}
                            </div>
                          ) : m.perfil === 'proprietario' ? (
                            <span className="text-xs text-amber-700 font-medium">
                              Todas as frentes e setores
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isAtivo ? 'bg-emerald-500' : 'bg-muted-foreground'
                              }`}
                            />
                            <span
                              className={isAtivo ? 'text-emerald-700' : 'text-muted-foreground'}
                            >
                              {isAtivo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right space-x-1 pr-4">
                          {/* Visualizar detalhes */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setMembroVisualizar(m)
                              setModalVisualizarOpen(true)
                            }}
                            title="Ver detalhes da ficha"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          {/* Editar (Apenas Proprietário e Gestor) */}
                          {canManageEquipe && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAbrirEditar(m)}
                              title="Editar colaborador"
                            >
                              <Edit2 className="h-4 w-4 text-primary" />
                            </Button>
                          )}

                          {/* Inativar / Reativar (Nunca excluir para manter auditoria) */}
                          {canManageEquipe && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setMembroParaInativar(m)
                                setModalInativarOpen(true)
                              }}
                              title={isAtivo ? 'Inativar acesso' : 'Reativar colaborador'}
                            >
                              {isAtivo ? (
                                <UserX className="h-4 w-4 text-destructive" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                          )}
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

      {/* Modal de Cadastro e Edição em 4 Etapas */}
      <ModalCadastroEquipe
        open={modalCadastroOpen}
        onOpenChange={setModalCadastroOpen}
        membroEditar={membroSelecionado}
        onSuccess={carregarEquipe}
      />

      {/* Modal de Confirmação de Inativação / Reativação */}
      <Dialog open={modalInativarOpen} onOpenChange={setModalInativarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {membroParaInativar?.status === 'ativo'
                ? 'Inativar Colaborador'
                : 'Reativar Colaborador'}
            </DialogTitle>
            <DialogDescription>
              {membroParaInativar?.status === 'ativo'
                ? `Deseja realmente inativar o acesso de ${membroParaInativar?.nome}? A conta ficará bloqueada para login, mas todas as pesagens e tarefas registradas por ele continuarão mantidas no histórico de auditoria.`
                : `Deseja reativar o acesso de ${membroParaInativar?.nome}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setModalInativarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={membroParaInativar?.status === 'ativo' ? 'destructive' : 'default'}
              onClick={handleConfirmarInativacao}
            >
              {membroParaInativar?.status === 'ativo'
                ? 'Confirmar Inativação'
                : 'Confirmar Reativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização da Ficha */}
      {membroVisualizar && (
        <Dialog open={modalVisualizarOpen} onOpenChange={setModalVisualizarOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {membroVisualizar.foto ? (
                  <img
                    src={`https://gestao-pecuaria-integrada-96d74.shrd00.internal.goskip.dev/api/files/equipe/${membroVisualizar.id}/${membroVisualizar.foto}`}
                    alt={membroVisualizar.nome}
                    className="h-12 w-12 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-base border">
                    {membroVisualizar.nome.charAt(0)}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg">{membroVisualizar.nome}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {PERFIS_LABELS[membroVisualizar.perfil]?.label} •{' '}
                    {membroVisualizar.status === 'ativo' ? '🟢 Ativo' : '⚪ Inativo'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl">
                <div>
                  <span className="text-muted-foreground block">CPF:</span>
                  <span className="font-mono font-semibold">{membroVisualizar.cpf}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Telefone/WhatsApp:</span>
                  <span className="font-semibold">{membroVisualizar.telefone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">E-mail:</span>
                  <span className="font-mono break-all">{membroVisualizar.email || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Data de Admissão:</span>
                  <span>
                    {membroVisualizar.data_admissao
                      ? new Date(membroVisualizar.data_admissao).toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>
              </div>

              {membroVisualizar.registro_profissional && (
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">Registro Profissional:</span>
                  <span className="font-semibold">{membroVisualizar.registro_profissional}</span>
                </div>
              )}

              {membroVisualizar.lotes_responsabilidade &&
                membroVisualizar.lotes_responsabilidade.length > 0 && (
                  <div className="p-3 bg-card border rounded-xl">
                    <span className="text-muted-foreground block mb-1">
                      Lotes de Responsabilidade:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {membroVisualizar.lotes_responsabilidade.map((lote) => (
                        <Badge key={lote} variant="secondary">
                          {lote}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {membroVisualizar.frentes_supervisao &&
                membroVisualizar.frentes_supervisao.length > 0 && (
                  <div className="p-3 bg-card border rounded-xl">
                    <span className="text-muted-foreground block mb-1">
                      Frentes Supervisionadas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {membroVisualizar.frentes_supervisao.map((frente) => (
                        <Badge key={frente} variant="outline" className="capitalize">
                          {frente}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {membroVisualizar.observacoes && (
                <div className="p-3 bg-muted/20 border rounded-xl">
                  <span className="text-muted-foreground block">Observações Internas:</span>
                  <p className="mt-0.5 text-foreground">{membroVisualizar.observacoes}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setModalVisualizarOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
