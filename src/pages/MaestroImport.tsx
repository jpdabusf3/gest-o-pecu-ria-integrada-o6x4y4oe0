import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Scale,
  Layers,
  HelpCircle,
  FileDown,
  Info,
  Camera,
  History,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  extrairDocumentoMaestro,
  consultarAgenteMaestro,
  parseMarkdownTable,
  parseCSVClientSide,
  inferColumnMappings,
  compilarRegistrosNormalizados,
  aplicarDadosConfirmados,
  gerarRelatorioImportacaoPDF,
  buscarMapeamentoReconhecido,
  salvarMapeamentoConfirmado,
  baixarPlanilhaModeloOficial,
  ColumnMapping,
  RegistroNormalizado,
  CAMPOS_SISTEMA_DISPONIVEIS,
  AplicacaoResult,
  MapeamentoSalvoRecord,
} from '@/services/maestro'
import { downloadCSV } from '@/lib/exportUtils'

export default function MaestroImport() {
  const { user, isGestor, isProprietario } = useAuth()

  // Etapa atual (1 a 5)
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4 | 5>(1)

  // Etapa 1: Arquivo e Leitura
  const [file, setFile] = useState<File | null>(null)
  const [objetivo, setObjetivo] = useState(
    'Importar lote e pesagens da fazenda, atualizar contagens e calcular GMD.',
  )
  const [lendoArquivo, setLendoArquivo] = useState(false)
  const [markdownExtraido, setMarkdownExtraido] = useState('')
  const [avisoExtracao, setAvisoExtracao] = useState('')
  const [requiresOCR, setRequiresOCR] = useState(false)
  const [ocrUsado, setOcrUsado] = useState(false)
  const [origemLeitura, setOrigemLeitura] = useState<'texto' | 'visao' | 'nenhuma'>('texto')
  const [headersIdentificados, setHeadersIdentificados] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Etapa 2: Mapeamento de Colunas & Reconhecimento
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [mapeamentoReconhecido, setMapeamentoReconhecido] = useState<MapeamentoSalvoRecord | null>(
    null,
  )
  const [tipoDocumento, setTipoDocumento] = useState<
    'pesagens' | 'lotes_animais' | 'estoque' | 'financeiro' | 'atividades' | 'generico'
  >('lotes_animais')

  // Etapa 3: Conferência e Normalização
  const [registros, setRegistros] = useState<RegistroNormalizado[]>([])
  const [compilando, setCompilando] = useState(false)
  const [filtroConferencia, setFiltroConferencia] = useState<
    'todos' | 'alertas' | 'criar' | 'atualizar'
  >('todos')

  // Etapa 4: Aplicação
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [resultadoAplicacao, setResultadoAplicacao] = useState<AplicacaoResult | null>(null)

  // Permissão estrita: Gestor ou Proprietário
  const podeImportar = isGestor || isProprietario

  if (!podeImportar) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              Acesso Restrito ao Robô Maestro
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              A ingestão automatizada e aplicação de dados em lote afeta o rebanho, pesagens,
              estoque e financeiro da fazenda. Apenas o <strong>Gestor Técnico</strong> e o{' '}
              <strong>Proprietário</strong> possuem autorização para aprovar e aplicar dados.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle Drag & Drop / Seleção de Arquivo
  const handleFileChange = (selected: File) => {
    setFile(selected)
    setAvisoExtracao('')
    setRequiresOCR(false)
    setOcrUsado(false)
    setOrigemLeitura('texto')
    setMapeamentoReconhecido(null)
  }

  // Exemplos rápidos do usuário
  const carregarExemploPlanilha = () => {
    const csvExemplo = `Lote;Pasto;Quantidade;Peso Vivo;Categoria;Genero;Suplemento
Lote Recria 01;Pasto 04 (Braquiarão);85;11 @;Novilho;Macho;Proteinado Seca
Lote Recria 02;Pasto 07 (Mombaça);60;340 kg;Garrote;Macho;Mineral Adensado
Lote Matrizes;Pasto 11 (Piatã);110;450 kg;Vaca Adulta;Fêmea;Sal Ureia`
    const blob = new Blob([csvExemplo], { type: 'text/csv' })
    const fileExemplo = new File([blob], 'rebanho_e_suplementacao_safra.csv', { type: 'text/csv' })
    setFile(fileExemplo)
    setObjetivo(
      'Importar novos lotes com categoria, pasto, peso médio em @ e vincular suplementação no estoque.',
    )
    toast.info('Exemplo de planilha carregado!')
  }

  const carregarExemploPesagem = () => {
    const csvExemplo = `Brinco;Data Pesagem;Peso (kg);Lote;Observacao
BR-1002;2025-05-10;415.5;Lote Recria 01;Pesagem rotina
BR-1003;2025-05-10;398.0;Lote Recria 01;Ótimo desenvolvimento
BR-1004;2025-05-10;430.0;Lote Recria 01;Recalcular GMD
BR-1005;2025-05-10;385.2;Lote Recria 01;Normal`
    const blob = new Blob([csvExemplo], { type: 'text/csv' })
    const fileExemplo = new File([blob], 'relatorio_pesagem_balanca.csv', { type: 'text/csv' })
    setFile(fileExemplo)
    setObjetivo(
      'Importar relatório de pesagens individuais para atualizar histórico e recalcular GMD.',
    )
    toast.info('Exemplo de pesagens externas carregado!')
  }

  // ETAPA 1 -> ETAPA 2: Ler arquivo e disparar Maestro
  const processarLeitura = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para leitura.')
      return
    }

    try {
      setLendoArquivo(true)
      toast.loading('Robô Maestro inspecionando documento...', { id: 'leitura-toast' })

      // 1. Extração bruta de markdown/tabelas
      const extracao = await extrairDocumentoMaestro(file)
      setMarkdownExtraido(extracao.markdown)
      setAvisoExtracao(extracao.aviso)
      setRequiresOCR(extracao.requiresOCR)
      setOcrUsado(Boolean(extracao.ocrUsado))
      setOrigemLeitura(extracao.origem_leitura || 'texto')

      // Se falhou leitura visual e documento precisa de OCR sem nenhum texto legível
      if (!extracao.markdown.trim() && extracao.requiresOCR) {
        toast.dismiss('leitura-toast')
        toast.warning('Documento sem camada de texto legível. Verifique as orientações exibidas.')
        return
      }

      // 2. Parser tabular
      let parsed = parseMarkdownTable(extracao.markdown)
      if (parsed.headers.length === 0 && file.name.endsWith('.csv')) {
        const text = await file.text()
        parsed = parseCSVClientSide(text)
      }

      setHeadersIdentificados(parsed.headers)
      setRawRows(parsed.rows)

      // Determinar tipo preliminar de documento
      let docTipo:
        | 'pesagens'
        | 'lotes_animais'
        | 'estoque'
        | 'financeiro'
        | 'atividades'
        | 'generico' = file.name.toLowerCase().includes('pesagem') ? 'pesagens' : 'lotes_animais'

      // 3. Reconhecimento automático de importação anterior (mesmas colunas)
      const mapeamentoSalvo = await buscarMapeamentoReconhecido(docTipo, parsed.headers)
      if (!mapeamentoSalvo && docTipo !== 'pesagens') {
        // Tentar também como pesagens se houver brinco nas colunas
        const salvoComoPesagens = await buscarMapeamentoReconhecido('pesagens', parsed.headers)
        if (salvoComoPesagens) {
          docTipo = 'pesagens'
        }
      }

      setTipoDocumento(docTipo)

      if (mapeamentoSalvo) {
        setMapeamentoReconhecido(mapeamentoSalvo)
        setMappings(mapeamentoSalvo.colunas)

        // Pular direto para a Etapa 3 (Conferência), avisando a reaproveitação
        toast.dismiss('leitura-toast')
        const dataFmt = new Date(mapeamentoSalvo.ultima_utilizacao).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
        toast.success(`Mapeamento reaproveitado da importação de ${dataFmt}!`, {
          description:
            'Avançando direto para a conferência. Você pode revisar o mapeamento se desejar.',
        })

        // Já compila registros para etapa 3
        const normalizados = await compilarRegistrosNormalizados(
          parsed.rows,
          mapeamentoSalvo.colunas,
          docTipo,
        )
        setRegistros(normalizados)
        setEtapa(3)
        return
      }

      // 4. Se não há mapeamento anterior idêntico, consultar agente nativo Maestro no Skip Cloud
      const analiseAgente = await consultarAgenteMaestro(
        extracao.markdown || (await file.text()).slice(0, 5000),
        file.name,
        objetivo,
        extracao.origem_leitura === 'visao' ? 'visao' : 'texto',
      )

      if (analiseAgente && analiseAgente.tipo_documento) {
        setTipoDocumento(analiseAgente.tipo_documento)
      }

      // 5. Mapear colunas sugeridas pelo agente ou inferência pecuária
      let mappingsIniciais: ColumnMapping[] = []
      if (analiseAgente?.mapeamentos_sugeridos?.length) {
        mappingsIniciais = analiseAgente.mapeamentos_sugeridos.map((m: any) => ({
          colunaOrigem: m.coluna_origem,
          campoDestino: m.campo_destino,
          confianca: m.confianca || 90,
          unidadeDetectada: m.unidade_detectada,
        }))
      } else {
        mappingsIniciais = inferColumnMappings(parsed.headers)
      }

      setMappings(mappingsIniciais)
      toast.dismiss('leitura-toast')
      const msgOcr = extracao.ocrUsado ? ' (leitura visual por IA de foto/escaneado)' : ''
      toast.success(
        `Leitura concluída: ${parsed.headers.length} colunas e ${parsed.rows.length} linhas detectadas${msgOcr}!`,
      )
      setEtapa(2)
    } catch (err: any) {
      toast.dismiss('leitura-toast')
      toast.error('Erro na leitura do arquivo: ' + (err.message || 'Falha'))
    } finally {
      setLendoArquivo(false)
    }
  }

  // Alterar mapeamento manual de uma coluna
  const atualizarMapeamento = (colunaOrigem: string, novoCampo: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.colunaOrigem === colunaOrigem ? { ...m, campoDestino: novoCampo, customizado: true } : m,
      ),
    )
  }

  // ETAPA 2 -> ETAPA 3: Compilar conferência obrigatória
  const compilarConferencia = async () => {
    try {
      setCompilando(true)
      toast.loading('Compilando registros e calculando conversões pecuárias...', {
        id: 'compilando-toast',
      })

      const normalizados = await compilarRegistrosNormalizados(rawRows, mappings, tipoDocumento)
      setRegistros(normalizados)

      toast.dismiss('compilando-toast')
      toast.success(`${normalizados.length} registros preparados para conferência!`)
      setEtapa(3)
    } catch (err: any) {
      toast.dismiss('compilando-toast')
      toast.error('Erro ao compilar registros: ' + (err.message || 'Falha'))
    } finally {
      setCompilando(false)
    }
  }

  // Alternar ignorar registro na conferência
  const toggleIgnorarRegistro = (idTemp: string) => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.idTemp === idTemp ? { ...r, ignoradoPeloUsuario: !r.ignoradoPeloUsuario } : r,
      ),
    )
  }

  // ETAPA 4: Aplicação integrada
  const executarAplicacao = async () => {
    try {
      setAplicando(true)
      setConfirmModalOpen(false)
      toast.loading('Aplicando dados no rebanho, pesagens e estoque...', { id: 'aplicando-toast' })

      const resultado = await aplicarDadosConfirmados(
        registros,
        { nome: file?.name || 'documento', tipo: tipoDocumento },
        {
          id: user.id,
          nome: user.name || 'Gestor',
          perfil: user.role,
        },
      )

      // Salvar mapeamento confirmado na coleção maestro_mapeamentos para auto-reconhecimento futuro
      if (headersIdentificados.length > 0 && mappings.length > 0) {
        await salvarMapeamentoConfirmado(
          tipoDocumento,
          headersIdentificados,
          mappings,
          file?.name,
          { id: user.id, nome: user.name },
        )
      }

      setResultadoAplicacao(resultado)
      toast.dismiss('aplicando-toast')
      toast.success('Importação aplicada com sucesso e registrada na auditoria!')
      setEtapa(5)
    } catch (err: any) {
      toast.dismiss('aplicando-toast')
      toast.error('Erro ao aplicar dados: ' + (err.message || 'Falha'))
    } finally {
      setAplicando(false)
    }
  }

  // Exportar dados compilados para CSV
  const exportarPlanilhaConferencia = () => {
    const dados = registros.map((r) => ({
      Linha: r.linhaOrigem,
      Acao: r.acaoSugerida,
      Ignorado: r.ignoradoPeloUsuario ? 'SIM' : 'NÃO',
      ...r.dadosMapeados,
      Conversoes: r.conversoesExplicitas.join(' | '),
      Alertas: r.alertas.join(' | '),
    }))
    downloadCSV(dados, `conferencia_maestro_${file?.name || 'dados'}`)
  }

  // Reiniciar processo
  const reiniciarFluxo = () => {
    setEtapa(1)
    setFile(null)
    setMarkdownExtraido('')
    setAvisoExtracao('')
    setHeadersIdentificados([])
    setRawRows([])
    setMappings([])
    setRegistros([])
    setResultadoAplicacao(null)
    setMapeamentoReconhecido(null)
    setOcrUsado(false)
    setOrigemLeitura('texto')
  }

  // Registros filtrados na tela de conferência
  const registrosFiltrados = registros.filter((r) => {
    if (filtroConferencia === 'alertas') return r.alertas.length > 0
    if (filtroConferencia === 'criar') return r.acaoSugerida === 'criar'
    if (filtroConferencia === 'atualizar') return r.acaoSugerida === 'atualizar'
    return true
  })

  const totalCriar = registros.filter(
    (r) => r.acaoSugerida === 'criar' && !r.ignoradoPeloUsuario,
  ).length
  const totalAtualizar = registros.filter(
    (r) => r.acaoSugerida === 'atualizar' && !r.ignoradoPeloUsuario,
  ).length
  const totalIgnorar = registros.filter(
    (r) => r.ignoradoPeloUsuario || r.acaoSugerida === 'ignorar',
  ).length
  const totalAlertas = registros.filter((r) => r.alertas.length > 0).length

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho do Maestro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Robô de Ingestão e Gestão "Maestro"
                <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                  Agente Nativo Skip Cloud
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Importação universal de planilhas, pesagens e relatórios com conferência mandatória,
                conversão automática de arrobas/GMD e trilha de auditoria.
              </p>
            </div>
          </div>
        </div>

        {etapa > 1 && (
          <Button variant="outline" size="sm" onClick={reiniciarFluxo} className="gap-2 self-start">
            <RotateCcw className="h-4 w-4" /> Nova Importação
          </Button>
        )}
      </div>

      {/* Barra de Progresso das 5 Etapas */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
        {[
          { num: 1, label: '1. Leitura' },
          { num: 2, label: '2. Mapeamento' },
          { num: 3, label: '3. Conferência' },
          { num: 4, label: '4. Aplicação' },
          { num: 5, label: '5. Relatório' },
        ].map((step) => {
          const ativo = etapa === step.num
          const concluido = etapa > step.num
          return (
            <div
              key={step.num}
              className={`p-2.5 rounded-lg border transition-all ${
                ativo
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                  : concluido
                    ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                    : 'border-border text-muted-foreground opacity-60'
              }`}
            >
              {step.label}
            </div>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: LEITURA E CARREGAMENTO DE ARQUIVOS */}
      {/* ========================================================================= */}
      {etapa === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Ingestão Multiformato
              </CardTitle>
              <CardDescription>
                Envie documentos em PDF, DOCX/Word, XLSX/XLS/CSV, PPTX ou texto. O Maestro
                identifica automaticamente cabeçalhos e colunas em qualquer linha ou layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Card de Modelos Oficiais de Planilha XLSX */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-semibold text-sm text-emerald-950 dark:text-emerald-100">
                      Modelos Oficiais de Planilha XLSX (para campo)
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300">
                    Gere templates padrão para a equipe preencher no curral/pasto e importar com
                    confiança 100% no Maestro sem ajustes manuais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      baixarPlanilhaModeloOficial('lotes_animais')
                      toast.success('Modelo de Animais/Lotes (.xlsx) baixado!')
                    }}
                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-700" />
                    Modelo Animais / Lotes (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      baixarPlanilhaModeloOficial('pesagens')
                      toast.success('Modelo de Pesagens/GMD (.xlsx) baixado!')
                    }}
                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-700" />
                    Modelo Pesagens (.xlsx)
                  </Button>
                </div>
              </div>

              {/* Área de Upload (Arquivos + Fotos de Tabelas no Celular) */}
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40 space-y-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0])
                      }
                    }}
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0])
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    {file ? (
                      <FileSpreadsheet className="h-6 w-6" />
                    ) : (
                      <UploadCloud className="h-6 w-6" />
                    )}
                  </div>

                  {file ? (
                    <div>
                      <p className="font-semibold text-base text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB — Clique para substituir o arquivo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Suporta: Excel (XLSX, XLS), CSV, PDF (digitalizados ou texto), Word (DOCX),
                        TXT e <strong>Fotos de Tabelas (JPG, PNG, HEIC)</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Ações de Upload Alternativas (Foto Celular) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-xs gap-1.5"
                    >
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      Tirar foto de tabela com o celular
                    </Button>
                    <span className="text-muted-foreground hidden sm:inline">
                      ou selecione PDF escaneado / planilha
                    </span>
                  </div>

                  {/* Exemplos Rápidos */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Exemplos:</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={carregarExemploPlanilha}
                      className="text-xs h-7 px-2 text-emerald-700"
                    >
                      Rebanho (@)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={carregarExemploPesagem}
                      className="text-xs h-7 px-2 text-blue-700"
                    >
                      Pesagens (GMD)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Aviso Honesto se o arquivo anterior não continha texto legível */}
              {requiresOCR && !markdownExtraido && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Aviso Honesto do Robô Maestro — Nenhum dado é inventado
                  </div>
                  <p className="leading-relaxed">{avisoExtracao}</p>
                </div>
              )}

              {/* Descrição do Objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objetivo" className="text-sm font-semibold">
                  Objetivo ou Instruções para o Maestro (opcional)
                </Label>
                <Textarea
                  id="objetivo"
                  rows={2}
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Ex: Atualizar contagem dos lotes no Braquiarão, converter arrobas para kg e vincular suplemento."
                />
                <p className="text-xs text-muted-foreground">
                  O agente utiliza essa descrição para refinar a interpretação dos sinônimos
                  pecuários e correspondência de nomes.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={processarLeitura}
                  disabled={!file || lendoArquivo}
                  className="gap-2 font-semibold"
                >
                  {lendoArquivo ? (
                    <>Robô Maestro Lendo Documento...</>
                  ) : (
                    <>
                      Iniciar Leitura com Maestro <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de Regras Pecuárias Integradas */}
          <Card className="border-border/60 bg-muted/10">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Regras Técnicas Garantidas pelo Maestro
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong className="text-foreground block mb-0.5">Conversão de Arrobas:</strong>1 @
                de peso vivo = 30 kg; 1 @ de carcaça = 15 kg. O Maestro detecta a unidade e converte
                explicitamente.
              </div>
              <div>
                <strong className="text-foreground block mb-0.5">GMD Padronizado:</strong>
                Calculado em kg/dia entre pesagens consecutivas com checagem de intervalo (21 a 120
                dias).
              </div>
              <div>
                <strong className="text-foreground block mb-0.5">Estoque & Nutrição:</strong>
                Dedução via fluxo integrado de consumo, sem duplicar estruturas nem caminhos
                paralelos.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
      {/* ========================================================================= */}
      {etapa === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Mapeamento Inteligente: Colunas → Campos do Sistema
                  </CardTitle>
                  <CardDescription>
                    O Robô Maestro identificou as colunas e sugeriu a correspondência zootécnica.
                    Ajuste manualmente caso deseje alterar algum campo.
                  </CardDescription>
                </div>

                <Badge variant="secondary" className="self-start text-xs font-mono">
                  {headersIdentificados.length} colunas / {rawRows.length} linhas
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Banner de Reconhecimento Automático de Importação Anterior se existir */}
              {mapeamentoReconhecido && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-400 rounded-lg flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong>Relatório mensal reconhecido:</strong> Mapeamento reaproveitado da
                      importação de{' '}
                      {new Date(mapeamentoReconhecido.ultima_utilizacao).toLocaleDateString(
                        'pt-BR',
                        { day: '2-digit', month: '2-digit' },
                      )}
                      . As colunas foram pré-preenchidas automaticamente.
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-600/40 text-emerald-700 bg-background shrink-0"
                  >
                    Reconhecido
                  </Badge>
                </div>
              )}

              {/* Informação sobre OCR / Leitura Visual se ativada */}
              {ocrUsado && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 rounded-lg flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <Camera className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Leitura Visual (OCR por IA) Ativada:</strong> Os dados foram lidos
                    diretamente da imagem/foto da tabela. A confiança do mapeamento está indicada
                    para cada coluna e a conferência registro a registro é obrigatória antes de
                    qualquer gravação.
                  </div>
                </div>
              )}

              {/* Seletor do Módulo / Tipo de Documento */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-foreground">
                  Tipo de Dado Principal:
                </span>
                <Tabs
                  value={tipoDocumento}
                  onValueChange={(v: any) => setTipoDocumento(v)}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="lotes_animais" className="text-xs">
                      Lotes & Rebanho
                    </TabsTrigger>
                    <TabsTrigger value="pesagens" className="text-xs">
                      Pesagens & GMD
                    </TabsTrigger>
                    <TabsTrigger value="estoque" className="text-xs">
                      Estoque & Insumos
                    </TabsTrigger>
                    <TabsTrigger value="financeiro" className="text-xs">
                      Financeiro
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tabela de Mapeamento Coluna -> Campo */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 text-left">Coluna no Documento</th>
                      <th className="p-3 text-left">Amostra (1ª Linha)</th>
                      <th className="p-3 text-left">Campo de Destino na Pecuária F3</th>
                      <th className="p-3 text-center w-24">Confiança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mappings.map((m) => {
                      const sampleVal = rawRows[0]?.[m.colunaOrigem] || '-'
                      return (
                        <tr key={m.colunaOrigem} className="hover:bg-muted/20">
                          <td className="p-3 font-semibold text-foreground">
                            {m.colunaOrigem}
                            {m.unidadeDetectada && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                {m.unidadeDetectada}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono truncate max-w-[200px]">
                            {String(sampleVal)}
                          </td>
                          <td className="p-3">
                            <Select
                              value={m.campoDestino}
                              onValueChange={(val) => atualizarMapeamento(m.colunaOrigem, val)}
                            >
                              <SelectTrigger className="h-8 text-xs w-full max-w-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CAMPOS_SISTEMA_DISPONIVEIS.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    {c.label} ({c.modulo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                m.campoDestino === 'ignorar'
                                  ? 'secondary'
                                  : m.confianca >= 80
                                    ? 'outline'
                                    : 'destructive'
                              }
                              className="text-[10px]"
                            >
                              {m.campoDestino === 'ignorar' ? 'Ignorado' : `${m.confianca}%`}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setEtapa(1)}>
                  Voltar
                </Button>
                <Button
                  onClick={compilarConferencia}
                  disabled={compilando}
                  className="gap-2 font-semibold"
                >
                  {compilando ? (
                    'Compilando...'
                  ) : (
                    <>
                      Prosseguir para Conferência Obrigatória <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: CONFERÊNCIA OBRIGATÓRIA (PAINEL CENTRAL) */}
      {/* ========================================================================= */}
      {etapa === 3 && (
        <div className="space-y-6">
          {/* Banner de Auto-Reconhecimento quando saltou da leitura direto para conferência */}
          {mapeamentoReconhecido && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-400 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-100">
              <div className="flex items-center gap-2.5">
                <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    Mapeamento reaproveitado da importação de{' '}
                    {new Date(mapeamentoReconhecido.ultima_utilizacao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </p>
                  <p className="text-emerald-800/80 dark:text-emerald-300">
                    As colunas correspondem exatamente ao padrão da fazenda. Você pulou direto para
                    a conferência obrigatória, mas pode voltar e ajustar manualmente se houver
                    alguma alteração.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEtapa(2)}
                className="self-start md:self-auto text-xs border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background"
              >
                Ajustar Mapeamento Manual
              </Button>
            </div>
          )}

          {/* Painel com Métricas de Compilação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">Total Lido</span>
                <span className="text-2xl font-bold">{registros.length}</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  linhas identificadas
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                  A Criar (Novos)
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {totalCriar}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  sem duplicidade
                </span>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-blue-700 dark:text-blue-300 block">
                  A Atualizar (Correspondência)
                </span>
                <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {totalAtualizar}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                  lotes/pastos existentes
                </span>
              </CardContent>
            </Card>

            <Card
              className={
                totalAlertas > 0
                  ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                  : 'border-border'
              }
            >
              <CardContent className="p-4">
                <span className="text-xs text-amber-700 dark:text-amber-300 block">
                  Alertas / Ignorados
                </span>
                <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {totalAlertas} / {totalIgnorar}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
                  requerem atenção
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Conferência Registro a Registro */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Painel de Conferência Obrigatória Pré-Aplicação
                  </CardTitle>
                  <CardDescription>
                    Nenhum dado é aplicado sem a confirmação explícita. Verifique as conversões de
                    unidades e correspondências calculadas pelo Maestro.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarPlanilhaConferencia}
                    className="gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar Planilha de Conferência
                  </Button>
                </div>
              </div>

              {/* Filtros da Tabela */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant={filtroConferencia === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConferencia('todos')}
                  className="text-xs h-7"
                >
                  Todos ({registros.length})
                </Button>
                <Button
                  variant={filtroConferencia === 'criar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConferencia('criar')}
                  className="text-xs h-7"
                >
                  Apenas Novos ({totalCriar})
                </Button>
                <Button
                  variant={filtroConferencia === 'atualizar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConferencia('atualizar')}
                  className="text-xs h-7"
                >
                  Apenas Atualizações ({totalAtualizar})
                </Button>
                {totalAlertas > 0 && (
                  <Button
                    variant={filtroConferencia === 'alertas' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroConferencia('alertas')}
                    className="text-xs h-7 gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" /> Com Alertas ({totalAlertas})
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5 text-center w-16">Linha</th>
                      <th className="p-2.5 text-center w-28">Ação Prevista</th>
                      <th className="p-2.5 text-left">Dados Mapeados & Normalizados</th>
                      <th className="p-2.5 text-left">Conversões Explícitas</th>
                      <th className="p-2.5 text-left">Alertas / Validações</th>
                      <th className="p-2.5 text-center w-24">Aplicar?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {registrosFiltrados.map((reg) => {
                      const isIgnorado = reg.ignoradoPeloUsuario || reg.acaoSugerida === 'ignorar'
                      return (
                        <tr
                          key={reg.idTemp}
                          className={`hover:bg-muted/30 transition-colors ${
                            isIgnorado ? 'opacity-50 bg-muted/10' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center font-mono font-medium">
                            #{reg.linhaOrigem}
                          </td>
                          <td className="p-2.5 text-center">
                            {reg.acaoSugerida === 'criar' ? (
                              <Badge className="bg-emerald-600 text-[10px]">CRIAR NOVO</Badge>
                            ) : reg.acaoSugerida === 'atualizar' ? (
                              <Badge className="bg-blue-600 text-[10px]">ATUALIZAR</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                IGNORAR
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="space-y-0.5">
                              {Object.entries(reg.dadosMapeados).map(([k, v]) => (
                                <span key={k} className="inline-block mr-2 text-[11px]">
                                  <strong className="text-muted-foreground">{k}:</strong>{' '}
                                  {String(v)}
                                </span>
                              ))}
                              {reg.motivoAcao && (
                                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                  {reg.motivoAcao}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5">
                            {reg.conversoesExplicitas.length > 0 ? (
                              <div className="space-y-0.5">
                                {reg.conversoesExplicitas.map((c, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-[10px] bg-primary/5 text-primary border-primary/20 block w-fit"
                                  >
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {reg.alertas.length > 0 ? (
                              <div className="space-y-0.5">
                                {reg.alertas.map((a, i) => (
                                  <span
                                    key={i}
                                    className="text-amber-600 dark:text-amber-400 font-medium text-[11px] block flex items-center gap-1"
                                  >
                                    <AlertTriangle className="h-3 w-3 shrink-0" /> {a}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 text-[11px]">Válido</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <Button
                              type="button"
                              variant={isIgnorado ? 'outline' : 'secondary'}
                              size="sm"
                              onClick={() => toggleIgnorarRegistro(reg.idTemp)}
                              className="text-[10px] h-6 px-2"
                            >
                              {isIgnorado ? 'Restaurar' : 'Ignorar'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botões de Decisão */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEtapa(2)}>
                  Voltar ao Mapeamento
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Serão aplicados <strong>{totalCriar + totalAtualizar}</strong> registros
                    validados.
                  </span>
                  <Button
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={totalCriar + totalAtualizar === 0}
                    className="gap-2 bg-emerald-700 hover:bg-emerald-800 font-semibold"
                  >
                    Confirmar e Aplicar no Sistema <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modal de Confirmação Obrigatória */}
          <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Confirmar Aplicação em Lote
                </DialogTitle>
                <DialogDescription>
                  Esta ação aplicará as alterações de forma definitiva nas áreas selecionadas
                  (Lotes, Pesagens, Estoque e Fechamento).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p>
                    <strong>Responsável:</strong> {user.name} ({user.role})
                  </p>
                  <p>
                    <strong>Arquivo:</strong> {file?.name}
                  </p>
                  <p>
                    <strong>Novos a Criar:</strong> {totalCriar}
                  </p>
                  <p>
                    <strong>Existentes a Atualizar:</strong> {totalAtualizar}
                  </p>
                  <p>
                    <strong>Ignorados:</strong> {totalIgnorar}
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Um protocolo permanente será registrado na <strong>Trilha de Auditoria</strong>{' '}
                  (append-only), garantindo conformidade e governança.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={executarAplicacao}
                  disabled={aplicando}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {aplicando ? 'Aplicando...' : 'Sim, Aplicar com Trilha de Auditoria'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 5: RELATÓRIO OFICIAL E CONFIRMAÇÃO */}
      {/* ========================================================================= */}
      {etapa === 5 && resultadoAplicacao && (
        <div className="space-y-6">
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                Importação Concluída com Sucesso!
              </CardTitle>
              <CardDescription>
                O Robô Maestro atualizou as bases de dados e gerou o comprovante oficial com
                protocolo de auditoria.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Resumo dos Resultados */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Total Processado</span>
                  <span className="text-2xl font-bold">{resultadoAplicacao.totalLidos}</span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-emerald-600 block">Criados</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {resultadoAplicacao.criados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-blue-600 block">Atualizados</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {resultadoAplicacao.atualizados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Ignorados</span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {resultadoAplicacao.ignorados}
                  </span>
                </div>
              </div>

              {/* Protocolo de Auditoria */}
              <div className="p-4 bg-muted/40 border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" /> Protocolo de Auditoria (Append-Only):
                  </span>
                  <code className="bg-background px-2 py-0.5 rounded border font-mono">
                    {resultadoAplicacao.protocoloAuditId || 'REGISTRADO_NA_TRILHA'}
                  </code>
                </div>
                <p className="text-muted-foreground">
                  Módulos afetados:{' '}
                  <strong>
                    {resultadoAplicacao.entidadesAfetadas.join(', ') || 'Lotes & Pesagens'}
                  </strong>
                  . O registro completo de quem importou, o que foi alterado e o arquivo original
                  está gravado na coleção de auditoria e não pode ser apagado.
                </p>
              </div>

              {/* Ações de Download e Encerramento */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() =>
                    gerarRelatorioImportacaoPDF(
                      resultadoAplicacao,
                      { nome: file?.name || 'documento', tipo: tipoDocumento },
                      registros,
                      user.name || 'Gestor',
                    )
                  }
                  className="gap-2 bg-emerald-700 hover:bg-emerald-800 font-semibold"
                >
                  <FileDown className="h-4 w-4" /> Baixar Relatório de Importação (PDF)
                </Button>

                <Button variant="outline" onClick={exportarPlanilhaConferencia} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Exportar Planilha de
                  Resultado
                </Button>

                <Button variant="secondary" onClick={reiniciarFluxo} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Importar Outro Documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
