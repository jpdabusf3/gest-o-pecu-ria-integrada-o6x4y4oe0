import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { PROMPTS_DATA, TEMAS_ORDENADOS, CONTEXTO_COMUM, PromptItem } from '@/data/promptsBiblioteca'
import {
  Search,
  Copy,
  Check,
  Sparkles,
  Info,
  Files,
  SlidersHorizontal,
  FileCode,
  LayoutDashboard,
  Calculator,
  Tractor,
  Cpu,
} from 'lucide-react'

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getTemaIcon(tema: string) {
  switch (tema) {
    case 'Painéis de decisão':
      return <LayoutDashboard className="h-4 w-4 text-primary" />
    case 'Simuladores e calculadoras':
      return <Calculator className="h-4 w-4 text-secondary" />
    case 'Operação e nutrição':
      return <Tractor className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
    case 'Ingestão de dados e inteligência':
      return <Cpu className="h-4 w-4 text-amber-700 dark:text-amber-400" />
    default:
      return <FileCode className="h-4 w-4 text-muted-foreground" />
  }
}

export function BibliotecaPromptsTab() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null)
  const [copiedContext, setCopiedContext] = useState(false)

  // Filtragem que ignora maiúsculas/minúsculas e acentos
  const promptsFiltrados = useMemo(() => {
    const termo = normalizarTexto(searchTerm.trim())
    if (!termo) return PROMPTS_DATA

    return PROMPTS_DATA.filter((prompt) => {
      const matchTitulo = normalizarTexto(prompt.titulo).includes(termo)
      const matchTema = normalizarTexto(prompt.tema).includes(termo)
      const matchFinalidade = normalizarTexto(prompt.finalidade).includes(termo)
      const matchTexto = normalizarTexto(prompt.texto).includes(termo)
      const matchNumero = prompt.numero.toString() === termo

      return matchTitulo || matchTema || matchFinalidade || matchTexto || matchNumero
    })
  }, [searchTerm])

  // Agrupamento na ordem especificada
  const grupos = useMemo(() => {
    return TEMAS_ORDENADOS.map((temaCfg) => {
      const itens = promptsFiltrados.filter((p) => p.tema === temaCfg.nome)
      return {
        tema: temaCfg.nome,
        quantidadeEsperada: temaCfg.quantidadeEsperada,
        itens,
      }
    }).filter((g) => g.itens.length > 0)
  }, [promptsFiltrados])

  const copiarTexto = async (texto: string, feedbackId?: number, feedbackTema?: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      if (feedbackId !== undefined) {
        setCopiedId(feedbackId)
        setTimeout(() => setCopiedId(null), 2500)
        toast({
          title: 'Prompt copiado!',
          description: `O prompt #${feedbackId} foi copiado para a área de transferência.`,
        })
      } else if (feedbackTema) {
        setCopiedGroup(feedbackTema)
        setTimeout(() => setCopiedGroup(null), 2500)
        toast({
          title: 'Prompts copiados!',
          description: `Todos os prompts do tema "${feedbackTema}" foram copiados com sucesso.`,
        })
      }
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar automaticamente para a área de transferência.',
        variant: 'destructive',
      })
    }
  }

  const copiarTodosDoTema = (tema: string, prompts: PromptItem[]) => {
    const textoCompilado = prompts
      .map(
        (p) =>
          `=== ${p.numero}. ${p.titulo.toUpperCase()} ===\nFinalidade: ${p.finalidade}\nTema: ${p.tema}\n\n${p.texto}\n`,
      )
      .join('\n----------------------------------------\n\n')

    copiarTexto(textoCompilado, undefined, tema)
  }

  const copiarContextoComum = async () => {
    try {
      await navigator.clipboard.writeText(CONTEXTO_COMUM)
      setCopiedContext(true)
      setTimeout(() => setCopiedContext(false), 2500)
      toast({
        title: 'Contexto Comum copiado!',
        description: 'O bloco de contexto de referência da fazenda foi copiado.',
      })
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o contexto comum.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner / Card de Introdução com Contexto Comum */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Biblioteca de Prompts da Plataforma
              </CardTitle>
              <CardDescription className="text-sm">
                13 especificações e prompts estruturados para geração de painéis, simuladores,
                planejadores e centrais de inteligência pecuária.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copiarContextoComum}
              className="min-h-[40px] gap-2 border-primary/30 hover:bg-primary/5 text-primary"
            >
              {copiedContext ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Contexto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Contexto Comum</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted/50 border p-3.5 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Info className="h-3.5 w-3.5 text-primary" />
              Contexto Operacional de Referência (comum a todos os prompts):
            </div>
            <p className="leading-relaxed font-sans">{CONTEXTO_COMUM}</p>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtro e Contador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, tema, palavra-chave ou texto do prompt..."
            className="pl-9 pr-8 h-10 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/60 text-muted-foreground font-medium">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              Visíveis:{' '}
              <strong className="text-foreground tabular-nums">{promptsFiltrados.length}</strong> de{' '}
              <span className="tabular-nums">13</span> prompts
            </span>
          </div>
        </div>
      </div>

      {/* Listagem agrupada por tema */}
      {grupos.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="max-w-md mx-auto space-y-2">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-base font-semibold">Nenhum prompt encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Nenhum dos 13 prompts corresponde ao filtro "{searchTerm}". Tente buscar por outros
              termos como "reprodutivo", "simulador", "confinamento", "GMD" ou "custo".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="mt-3 min-h-[40px]"
            >
              Limpar busca
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {grupos.map((grupo) => {
            const isGroupCopied = copiedGroup === grupo.tema
            return (
              <section key={grupo.tema} className="space-y-4">
                {/* Cabeçalho do Grupo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {getTemaIcon(grupo.tema)}
                    <h3 className="text-lg font-bold tracking-tight text-foreground">
                      {grupo.tema}
                    </h3>
                    <Badge variant="secondary" className="font-normal tabular-nums ml-1">
                      {grupo.itens.length} {grupo.itens.length === 1 ? 'prompt' : 'prompts'}
                      {grupo.itens.length !== grupo.quantidadeEsperada &&
                        ` de ${grupo.quantidadeEsperada}`}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copiarTodosDoTema(grupo.tema, grupo.itens)}
                    className="min-h-[38px] gap-1.5 text-xs font-medium self-start sm:self-auto"
                    title={`Copiar todos os ${grupo.itens.length} prompts deste tema`}
                  >
                    {isGroupCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copiados!</span>
                      </>
                    ) : (
                      <>
                        <Files className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copiar todos ({grupo.itens.length})</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Grid responsivo: coluna única no celular, mantendo leitura confortável */}
                <div className="grid grid-cols-1 gap-4">
                  {grupo.itens.map((prompt) => {
                    const isCopied = copiedId === prompt.id
                    return (
                      <Card
                        key={prompt.id}
                        className="overflow-hidden border-border bg-card shadow-sm hover:border-primary/40 transition-colors"
                      >
                        <CardHeader className="p-4 sm:p-5 pb-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs tabular-nums">
                                  {prompt.numero}
                                </span>
                                <CardTitle className="text-base sm:text-lg font-semibold leading-snug">
                                  {prompt.titulo}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-normal text-muted-foreground border-border"
                                >
                                  {prompt.tema}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 pt-0.5">
                                <span className="font-medium text-foreground">Finalidade:</span>
                                <span>{prompt.finalidade}</span>
                              </p>
                            </div>

                            <Button
                              variant={isCopied ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() => copiarTexto(prompt.texto, prompt.id)}
                              className="min-h-[40px] sm:min-h-[36px] gap-1.5 shrink-0 self-stretch sm:self-start font-medium text-xs sm:text-sm"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span>Copiar prompt</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 pt-0">
                          {/* Bloco monoespaçado com o texto integral do prompt */}
                          <div className="relative group">
                            <pre className="font-mono text-xs sm:text-[13px] leading-relaxed p-3.5 sm:p-4 rounded-md bg-muted/60 border text-foreground/90 whitespace-pre-wrap break-words max-h-72 overflow-y-auto selection:bg-primary/20">
                              {prompt.texto}
                            </pre>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Texto completo e integral para área de transferência</span>
                              <span className="tabular-nums">{prompt.texto.length} caracteres</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
