import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Shield,
  Briefcase,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Camera,
} from 'lucide-react'
import {
  PerfilEquipe,
  PERFIS_LABELS,
  MembroEquipeRecord,
  MembroEquipeInput,
  formatarCPF,
  validarCPF,
  formatarTelefone,
  validarTelefone,
  validarEmail,
  gerarSenhaTemporaria,
  criarMembroEquipe,
  atualizarMembroEquipe,
} from '@/services/equipe'
import { LotRecord, getLots } from '@/services/lots'
import { useToast } from '@/hooks/use-toast'

interface ModalCadastroEquipeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  membroEditar?: MembroEquipeRecord | null
  onSuccess: () => void
}

const FRENTES_DISPONIVEIS = [
  { id: 'cria', label: 'Cria (Matrizes / Desmame)' },
  { id: 'recria', label: 'Recria (Pasto Rotacionado)' },
  { id: 'engorda', label: 'Engorda / TIP' },
  { id: 'confinamento', label: 'Confinamento' },
  { id: 'arrendamento', label: 'Arrendamento' },
]

const SETORES_PADRAO = [
  'Recria Rotacionada',
  'Pasto Sede',
  'Pasto Fundo',
  'Pasto Represa',
  'Confinamento A',
  'Fábrica de Ração',
  'Maternidade Cria',
]

export function ModalCadastroEquipe({
  open,
  onOpenChange,
  membroEditar,
  onSuccess,
}: ModalCadastroEquipeProps) {
  const { toast } = useToast()
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<LotRecord[]>([])

  // Etapa 1: Dados Pessoais
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string>('')

  // Etapa 2: Perfil e Permissões
  const [perfil, setPerfil] = useState<PerfilEquipe>('vaqueiro')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Etapa 3: Responsabilidades e Campos Específicos
  const [funcaoEspecifica, setFuncaoEspecifica] = useState('')
  const [lotesSelecionados, setLotesSelecionados] = useState<string[]>([])
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([])
  const [frentesSupervisao, setFrentesSupervisao] = useState<string[]>([])
  const [dataAdmissao, setDataAdmissao] = useState('')
  const [registroProfissional, setRegistroProfissional] = useState('')
  const [percentualParticipacao, setPercentualParticipacao] = useState('0')
  const [socioAdministrador, setSocioAdministrador] = useState(false)
  const [observacoes, setObservacoes] = useState('')

  // Etapa 4: Credenciais de Acesso
  const [senhaTemporaria, setSenhaTemporaria] = useState('')
  const [credencialCriada, setCredencialCriada] = useState<{
    email: string
    senha: string
    nome: string
  } | null>(null)

  // Carregar lotes para seleção múltipla
  useEffect(() => {
    getLots().then((lots) => {
      if (lots) setLotesDisponiveis(lots)
    })
  }, [])

  // Inicializar formulário para edição ou criação
  useEffect(() => {
    if (membroEditar) {
      setNome(membroEditar.nome)
      setCpf(membroEditar.cpf)
      setTelefone(membroEditar.telefone)
      setEmail(membroEditar.email || '')
      setDataNascimento(
        membroEditar.data_nascimento ? membroEditar.data_nascimento.slice(0, 10) : '',
      )
      setPerfil(membroEditar.perfil)
      setStatus(membroEditar.status)
      setFuncaoEspecifica(membroEditar.funcao_especifica || '')
      setLotesSelecionados(membroEditar.lotes_responsabilidade || [])
      setSetoresSelecionados(membroEditar.setores_responsabilidade || [])
      setFrentesSupervisao(membroEditar.frentes_supervisao || [])
      setDataAdmissao(membroEditar.data_admissao ? membroEditar.data_admissao.slice(0, 10) : '')
      setRegistroProfissional(membroEditar.registro_profissional || '')
      setPercentualParticipacao(String(membroEditar.percentual_participacao || '0'))
      setSocioAdministrador(Boolean(membroEditar.socio_administrador))
      setObservacoes(membroEditar.observacoes || '')
      setFotoPreview(
        membroEditar.foto
          ? `https://gestao-pecuaria-integrada-96d74.shrd00.internal.goskip.dev/api/files/equipe/${membroEditar.id}/${membroEditar.foto}`
          : '',
      )
      setSenhaTemporaria('')
    } else {
      setNome('')
      setCpf('')
      setTelefone('')
      setEmail('')
      setDataNascimento('')
      setPerfil('vaqueiro')
      setStatus('ativo')
      setFuncaoEspecifica('')
      setLotesSelecionados([])
      setSetoresSelecionados([])
      setFrentesSupervisao(['recria', 'engorda'])
      setDataAdmissao(new Date().toISOString().slice(0, 10))
      setRegistroProfissional('')
      setPercentualParticipacao('0')
      setSocioAdministrador(false)
      setObservacoes('')
      setFotoFile(null)
      setFotoPreview('')
      setSenhaTemporaria(gerarSenhaTemporaria())
    }
    setCredencialCriada(null)
    setEtapa(1)
  }, [membroEditar, open])

  // Foto handler
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Validação da etapa 1
  const validarEtapa1 = () => {
    if (!nome.trim() || nome.trim().length < 3) {
      toast({
        title: 'Nome obrigatório',
        description: 'O nome completo deve conter pelo menos 3 caracteres.',
        variant: 'destructive',
      })
      return false
    }
    if (!validarCPF(cpf)) {
      toast({
        title: 'CPF inválido',
        description: 'Informe um número de CPF válido com 11 dígitos.',
        variant: 'destructive',
      })
      return false
    }
    if (!validarTelefone(telefone)) {
      toast({
        title: 'Telefone inválido',
        description: 'Informe o DDD e telefone celular/WhatsApp no formato (XX) XXXXX-XXXX.',
        variant: 'destructive',
      })
      return false
    }
    const perfisObrigamEmail: PerfilEquipe[] = ['proprietario', 'socio', 'gestor']
    if (perfisObrigamEmail.includes(perfil) && (!email || !validarEmail(email))) {
      toast({
        title: 'E-mail obrigatório',
        description: `E-mail válido é obrigatório para o perfil de ${PERFIS_LABELS[perfil].label}.`,
        variant: 'destructive',
      })
      return false
    }
    if (email && !validarEmail(email)) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, informe um endereço de e-mail válido.',
        variant: 'destructive',
      })
      return false
    }
    return true
  }

  // Validação da etapa 2
  const validarEtapa2 = () => {
    const perfisObrigamEmail: PerfilEquipe[] = ['proprietario', 'socio', 'gestor']
    if (perfisObrigamEmail.includes(perfil) && (!email || !validarEmail(email))) {
      toast({
        title: 'E-mail obrigatório',
        description: `Para cadastrar como ${PERFIS_LABELS[perfil].label}, informe o e-mail na etapa anterior.`,
        variant: 'destructive',
      })
      setEtapa(1)
      return false
    }
    return true
  }

  const handleNext = () => {
    if (etapa === 1) {
      if (validarEtapa1()) setEtapa(2)
    } else if (etapa === 2) {
      if (validarEtapa2()) setEtapa(3)
    } else if (etapa === 3) {
      setEtapa(4)
    }
  }

  const handlePrev = () => {
    if (etapa > 1) {
      setEtapa((prev) => (prev - 1) as any)
    }
  }

  // Salvar cadastro final
  const handleSalvar = async () => {
    if (!validarEtapa1() || !validarEtapa2()) return

    try {
      setSubmitting(true)
      const input: MembroEquipeInput = {
        nome: nome.trim(),
        cpf: formatarCPF(cpf),
        telefone: formatarTelefone(telefone),
        email: email ? email.trim() : undefined,
        data_nascimento: dataNascimento || undefined,
        perfil,
        status,
        funcao_especifica: funcaoEspecifica || undefined,
        lotes_responsabilidade: lotesSelecionados,
        setores_responsabilidade: setoresSelecionados,
        data_admissao: dataAdmissao || undefined,
        registro_profissional: registroProfissional || undefined,
        frentes_supervisao: frentesSupervisao,
        percentual_participacao: parseFloat(percentualParticipacao) || 0,
        socio_administrador: socioAdministrador,
        observacoes,
        senha_temporaria: senhaTemporaria || gerarSenhaTemporaria(),
      }

      if (membroEditar) {
        await atualizarMembroEquipe(membroEditar.id, input, fotoFile)
        toast({
          title: 'Cadastro Atualizado com Sucesso!',
          description: `Os dados de ${nome} foram atualizados no sistema.`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const resultado = await criarMembroEquipe(input, fotoFile)
        const emailGerado = input.email || `${input.cpf.replace(/\D/g, '')}@pecuariaf3.com.br`

        setCredencialCriada({
          email: emailGerado,
          senha: resultado.senhaTemporaria || senhaTemporaria,
          nome: input.nome,
        })

        toast({
          title: 'Colaborador Cadastrado!',
          description: `${nome} foi integrado com o perfil ${PERFIS_LABELS[perfil].label}.`,
        })
        onSuccess()
      }
    } catch (err: any) {
      toast({
        title: 'Erro no Cadastro',
        description: err?.message || 'Falha ao salvar membro da equipe.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const copiarCredenciais = () => {
    if (!credencialCriada) return
    const texto = `Olá ${credencialCriada.nome}, seu acesso ao sistema Pecuária F3 foi criado!\nNome do usuário: ${credencialCriada.nome}\nSenha Provisória: ${credencialCriada.senha}\n(Você também pode entrar com o e-mail: ${credencialCriada.email}).\nTroca obrigatória no primeiro acesso.`
    navigator.clipboard.writeText(texto)
    toast({
      title: 'Credenciais Copiadas!',
      description: 'Texto pronto para envio via WhatsApp ou SMS ao colaborador.',
    })
  }

  const toggleLote = (loteName: string) => {
    setLotesSelecionados((prev) =>
      prev.includes(loteName) ? prev.filter((l) => l !== loteName) : [...prev, loteName],
    )
  }

  const toggleSetor = (setor: string) => {
    setSetoresSelecionados((prev) =>
      prev.includes(setor) ? prev.filter((s) => s !== setor) : [...prev, setor],
    )
  }

  const toggleFrente = (frenteId: string) => {
    setFrentesSupervisao((prev) =>
      prev.includes(frenteId) ? prev.filter((f) => f !== frenteId) : [...prev, frenteId],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {membroEditar ? 'Editar Membro da Equipe' : 'Cadastrar Membro da Equipe'}
              </DialogTitle>
              <DialogDescription>
                Cadastro com controle hierárquico de acesso e dados da operação pecuária.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Indicador de Etapas */}
        {!credencialCriada && (
          <div className="grid grid-cols-4 gap-2 border-b pb-4 mt-2">
            {[
              { num: 1, label: 'Pessoais', icon: User },
              { num: 2, label: 'Perfil', icon: Shield },
              { num: 3, label: 'Atribuições', icon: Briefcase },
              { num: 4, label: 'Acesso', icon: KeyRound },
            ].map((step) => {
              const Icon = step.icon
              const isCurrent = etapa === step.num
              const isCompleted = etapa > step.num
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < etapa) setEtapa(step.num as any)
                    else if (step.num === 2 && validarEtapa1()) setEtapa(2)
                    else if (step.num === 3 && validarEtapa1() && validarEtapa2()) setEtapa(3)
                    else if (step.num === 4 && validarEtapa1() && validarEtapa2()) setEtapa(4)
                  }}
                  className={`flex flex-col items-center gap-1 text-xs font-semibold p-2 rounded-lg transition-all text-center ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    <span>{step.num}</span>
                  </div>
                  <span className="truncate max-w-full text-[11px]">{step.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* SE CRIAÇÃO CONCLUÍDA: EXIBE TELA DE CREDENCIAIS TEMPORÁRIAS PARA REPASSE MANUAL */}
        {credencialCriada ? (
          <div className="space-y-5 py-4 animate-in fade-in">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-lg text-emerald-950 dark:text-emerald-200">
                Colaborador Cadastrado com Sucesso!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                O acesso foi gerado. Como o envio automático via SMS/WhatsApp requer integração
                externa, repasses as credenciais temporárias abaixo para o colaborador.
              </p>
            </div>

            <div className="p-5 bg-card border rounded-xl space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Credenciais de Primeiro Acesso
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  Troca obrigatória no 1º login
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <span className="text-[11px] text-muted-foreground block">Nome do usuário:</span>
                  <span className="font-mono text-sm font-bold text-foreground block">
                    {credencialCriada.nome}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    E-mail: {credencialCriada.email}
                  </span>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg">
                  <span className="text-[11px] text-muted-foreground block">Senha Temporária:</span>
                  <span className="font-mono text-base font-bold text-primary">
                    {credencialCriada.senha}
                  </span>
                  <span className="text-[10px] text-muted-foreground block pt-1">
                    Login geral: Nome do usuário + Senha
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Regra de Segurança do Sistema:</p>
                <p>
                  No primeiro acesso com esta senha, o colaborador será solicitado a definir uma
                  nova senha pessoal e intransferível antes de iniciar qualquer lançamento de campo.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                onClick={copiarCredenciais}
              >
                <Copy className="h-4 w-4" /> Copiar Mensagem de Acesso (WhatsApp)
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCredencialCriada(null)
                  onOpenChange(false)
                }}
              >
                Concluir e Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (etapa === 4) handleSalvar()
              else handleNext()
            }}
            className="space-y-4 py-2"
          >
            {/* ETAPA 1: DADOS PESSOAIS */}
            {etapa === 1 && (
              <div className="space-y-4 animate-in fade-in">
                {/* Upload / Foto */}
                <div className="flex items-center gap-4 p-3 bg-muted/20 border rounded-xl">
                  <div className="relative">
                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Foto do colaborador"
                        className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground border">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                    <label
                      htmlFor="foto-input"
                      className="absolute -bottom-1 -right-1 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 shadow-xs"
                      title="Alterar foto"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </label>
                    <input
                      id="foto-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-semibold">Foto de Reconhecimento</Label>
                    <p className="text-xs text-muted-foreground">
                      Opcional. Auxilia no reconhecimento visual rápido no modo Campo e nas
                      pesagens.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">
                      Nome Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      CPF (único no sistema) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatarCPF(e.target.value))}
                      maxLength={14}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Telefone / WhatsApp <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="(67) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                      maxLength={15}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      E-mail{' '}
                      {['proprietario', 'socio', 'gestor'].includes(perfil) ? (
                        <span className="text-destructive">* (obrigatório)</span>
                      ) : (
                        <span className="text-muted-foreground">(opcional)</span>
                      )}
                    </Label>
                    <Input
                      type="email"
                      placeholder="email@pecuariaf3.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Data de Nascimento (opcional)
                    </Label>
                    <Input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: PERFIL E PERMISSÕES (RBAC) */}
            {etapa === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Selecione o Perfil de Acesso <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Define o nível hierárquico, visibilidade de telas (Fechamento/DRE vs. Campo) e
                    permissões operacionais.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {(
                      [
                        'proprietario',
                        'socio',
                        'gestor',
                        'capataz',
                        'vaqueiro',
                        'servente',
                      ] as PerfilEquipe[]
                    ).map((pKey) => {
                      const item = PERFIS_LABELS[pKey]
                      const isSelected = perfil === pKey
                      return (
                        <div
                          key={pKey}
                          onClick={() => setPerfil(pKey)}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-xs'
                              : 'border-border/70 hover:border-primary/40 bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-foreground">{item.label}</span>
                            <Badge className={`text-[10px] px-2 py-0.5 ${item.cor}`}>{pKey}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {item.descricao}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Status do Cadastro */}
                <div className="p-3.5 bg-muted/30 border rounded-xl flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider">
                      Status da Conta
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inativo bloqueia o login imediatamente, mantendo o histórico de pesagens e
                      tarefas intacto.
                    </p>
                  </div>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="w-32 h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">🟢 Ativo</SelectItem>
                      <SelectItem value="inativo">⚪ Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ETAPA 3: ATRIBUIÇÕES & CAMPOS ADICIONAIS POR PERFIL */}
            {etapa === 3 && (
              <div className="space-y-4 animate-in fade-in">
                {/* 3.1 Vaqueiro e Servente */}
                {(perfil === 'vaqueiro' || perfil === 'servente') && (
                  <div className="space-y-3.5">
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-900 dark:text-sky-200">
                      <strong>Perfil Operacional:</strong> Este colaborador fará login caindo direto
                      no Modo Campo, visualizando as tarefas dos seus lotes e setores de
                      responsabilidade.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Função Específica</Label>
                        <Input
                          placeholder={
                            perfil === 'servente'
                              ? 'Ex: Trato, suplementação e cercas'
                              : 'Ex: Manejo de lote, pesagens, IATF'
                          }
                          value={funcaoEspecifica}
                          onChange={(e) => setFuncaoEspecifica(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Data de Admissão</Label>
                        <Input
                          type="date"
                          value={dataAdmissao}
                          onChange={(e) => setDataAdmissao(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Seleção Múltipla de Lotes de Responsabilidade */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Lote(s) de Responsabilidade (Seleção Múltipla)
                      </Label>
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/30 border rounded-xl max-h-32 overflow-y-auto">
                        {lotesDisponiveis.map((lote) => {
                          const active = lotesSelecionados.includes(lote.name)
                          return (
                            <Badge
                              key={lote.id}
                              variant={active ? 'default' : 'outline'}
                              className={`cursor-pointer text-xs ${
                                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleLote(lote.name)}
                            >
                              {active && '✓ '}
                              {lote.name} ({lote.headcount || 0} cab)
                            </Badge>
                          )
                        })}
                      </div>
                    </div>

                    {/* Setores de responsabilidade */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Setor(es) da Fazenda Atribuídos
                      </Label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border rounded-xl">
                        {SETORES_PADRAO.map((setor) => {
                          const active = setoresSelecionados.includes(setor)
                          return (
                            <Badge
                              key={setor}
                              variant={active ? 'secondary' : 'outline'}
                              className={`cursor-pointer text-xs ${
                                active ? 'bg-sky-600 text-white' : 'hover:bg-muted'
                              }`}
                              onClick={() => toggleSetor(setor)}
                            >
                              {active && '✓ '}
                              {setor}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3.2 Capataz */}
                {perfil === 'capataz' && (
                  <div className="space-y-3.5">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200">
                      <strong>Liderança de Campo:</strong> O Capataz supervisiona vaqueiros e
                      serventes, aprova lançamentos de pesagem/morte e acompanha o cumprimento
                      diário das tarefas.
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Data de Admissão</Label>
                      <Input
                        type="date"
                        value={dataAdmissao}
                        onChange={(e) => setDataAdmissao(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Frentes sob Supervisão (Cria, Recria, Engorda...)
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {FRENTES_DISPONIVEIS.map((f) => {
                          const active = frentesSupervisao.includes(f.id)
                          return (
                            <div
                              key={f.id}
                              onClick={() => toggleFrente(f.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                                active
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-semibold'
                                  : 'border-border/70 hover:bg-muted/40'
                              }`}
                            >
                              <span>{f.label}</span>
                              {active && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3.3 Gestor */}
                {perfil === 'gestor' && (
                  <div className="space-y-3.5">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                      <strong>Responsável Técnico:</strong> Acesso pleno às projeções de safra,
                      Fechamento, DRE, recalibração de benchmarking e aprovação de lançamentos
                      sensíveis.
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Formação / Registro Profissional (Ex: CRMV-MS, Zootecnista)
                      </Label>
                      <Input
                        placeholder="Ex: CRMV-MS 14820 - Zootecnista Responsável"
                        value={registroProfissional}
                        onChange={(e) => setRegistroProfissional(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Frentes de Responsabilidade Técnica
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {FRENTES_DISPONIVEIS.map((f) => {
                          const active = frentesSupervisao.includes(f.id)
                          return (
                            <div
                              key={f.id}
                              onClick={() => toggleFrente(f.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                                active
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold'
                                  : 'border-border/70 hover:bg-muted/40'
                              }`}
                            >
                              <span>{f.label}</span>
                              {active && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3.4 Sócio */}
                {perfil === 'socio' && (
                  <div className="space-y-3.5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                      <strong>Acesso Executivo de Leitura:</strong> Acompanha dashboard consolidado,
                      Fechamento, DRE, indicadores e rentabilidade. Não altera dados operacionais a
                      menos que seja Sócio Administrador.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Percentual de Participação (%) - Informativo
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Ex: 25.0"
                          value={percentualParticipacao}
                          onChange={(e) => setPercentualParticipacao(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-card">
                          <div>
                            <Label className="text-xs font-semibold">Sócio Administrador</Label>
                            <p className="text-[10px] text-muted-foreground">
                              Garante permissão de edição e aprovação
                            </p>
                          </div>
                          <Switch
                            checked={socioAdministrador}
                            onCheckedChange={setSocioAdministrador}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3.5 Proprietário */}
                {perfil === 'proprietario' && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold">Acesso Total Irrestrito:</p>
                    <p>
                      O proprietário tem permissão máxima sobre todos os módulos do sistema
                      (Fechamento, DRE, Financeiro, Campo, Equipe, Configurações de Fazenda e
                      Arquivamento).
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Observações / Notas Internas
                  </Label>
                  <Textarea
                    placeholder="Anotações internas sobre o contrato ou atribuições..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* ETAPA 4: CREDENCIAIS DE ACESSO */}
            {etapa === 4 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-bold text-sm">Geração de Credencial PocketBase</h4>
                      <p className="text-xs text-muted-foreground">
                        Usuário receberá acesso individual com vínculo aos registros que lançar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-semibold">Nome do usuário de Acesso</Label>
                    <div className="p-2.5 bg-muted/40 rounded-lg text-sm font-mono flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {nome.trim() || 'Nome do Colaborador'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {email.trim() || `${cpf.replace(/\D/g, '')}@pecuariaf3.com.br`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      O login geral da ferramenta é realizado com o <strong>Nome do usuário</strong>{' '}
                      e a senha.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Senha Temporária Gerada</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={() => setSenhaTemporaria(gerarSenhaTemporaria())}
                      >
                        Gerar Outra Senha
                      </Button>
                    </div>
                    <Input
                      value={senhaTemporaria}
                      onChange={(e) => setSenhaTemporaria(e.target.value)}
                      className="font-mono text-base font-bold text-primary bg-primary/5"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      A senha será exibida após o salvamento para repasse manual ao colaborador.
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2 border text-xs">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Política de Primeiro Acesso:</span>
                      <span>
                        O colaborador será orientado a trocar essa senha temporária no primeiro
                        acesso para garantir a individualidade da auditoria.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumo do Perfil e Rota de Entrada */}
                <div className="p-3.5 bg-muted/20 border rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block">Destino após o Login:</span>
                    <span className="font-bold text-foreground">
                      {perfil === 'vaqueiro' || perfil === 'servente'
                        ? 'Modo Campo Mobile (/campo)'
                        : perfil === 'capataz'
                          ? 'Visão de Equipe & Aprovações (/minha-equipe)'
                          : 'Dashboard Consolidado da Fazenda (/)'}
                    </span>
                  </div>
                  <Badge className={PERFIS_LABELS[perfil].cor}>{PERFIS_LABELS[perfil].label}</Badge>
                </div>
              </div>
            )}

            {/* BOTÕES DE NAVEGAÇÃO ENTRE ETAPAS */}
            <DialogFooter className="pt-4 flex flex-row justify-between items-center border-t mt-4">
              {etapa > 1 ? (
                <Button type="button" variant="outline" onClick={handlePrev} disabled={submitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              )}

              {etapa < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary gap-1.5 font-bold"
                >
                  {submitting
                    ? 'Salvando...'
                    : membroEditar
                      ? 'Salvar Alterações'
                      : 'Finalizar Cadastro'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
