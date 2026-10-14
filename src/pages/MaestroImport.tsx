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
  reconhecerColunasCompraGado,
  isDocumentoCompraGado,
  compilarLinhasCompraGado,
  aplicarCompraGadoConfirmada,
  gerarRelatorioCompraGadoPDF,
  exportarCompraGadoExcel,
  baixarModeloCompraGadoXlsx,
  gerarExemploRapidoCompraGado,
  classificarAgioCompra,
  ResultadoConferenciaCompra,
  LinhaCompraNormalizada,
  ResultadoAplicacaoCompra,
  CotacaoReferencia,
  FrenteCompra,
  ColunaCompraMapping,
} from '@/services/maestroCompraGado'
import {
  processarDocumentosFiscais,
  aplicarDocumentosFiscaisConfirmados,
  gerarRelatorioFiscalPDF,
  formatarCNPJouCPF,
  DocumentoFiscalExtraido,
  ResultadoProcessamentoFiscal,
  ResultadoAplicacaoFiscal,
  TipoDocumentoFiscal,
  DestinoSistemaFiscal,
} from '@/services/maestroDocumentosFiscais'
import { Receipt, FileCheck, Split, Link2, ShieldCheck, HelpCircle as HelpIcon } from 'lucide-react'
import {
  reconhecerColunasVendaGado,
  isDocumentoVendaGado,
  compilarLinhasVendaGado,
  aplicarVendaGadoConfirmada,
  gerarRelatorioVendaGadoPDF,
  exportarVendaGadoExcel,
  baixarModeloVendaGadoXlsx,
  gerarExemploRapidoVendaGado,
  ResultadoConferenciaVenda,
  LinhaVendaNormalizada,
  ResultadoAplicacaoVenda,
  FrenteVenda as FrenteVendaTipo,
} from '@/services/maestroVendaGado'
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
type ColunaCompraMappingTipo = ColunaCompraMapping

function filenameVendaGadoSignal(nome: string): boolean {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    n.includes('venda') &&
    (n.includes('gado') || n.includes('boi') || n.includes('boiada') || n.includes('ganado'))
  )
}

function filenameCompraGadoSignal(nome: string): boolean {
  const n = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    n.includes('compra') &&
    (n.includes('gado') || n.includes('boi') || n.includes('boiada') || n.includes('ganado'))
  )
}

function detectarFrenteSugerida(pastoTexto: string): FrenteCompra {
  const t = String(pastoTexto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (t.includes('confin') || t.includes('curral')) return 'confinamento'
  if (t.includes('arrend')) return 'arrendamento'
  if (t.includes('engorda')) return 'engorda'
  if (t.includes('recria') || t.includes('garrote') || t.includes('novilho')) return 'recria'
  if (t.includes('cria') || t.includes('bezerro') || t.includes('matriz')) return 'cria'
  return 'recria'
}

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

  // --- NOTAS FISCAIS E RECIBOS (ROBÔ CHICÃO FISCAL) ---
  const [isDocumentoFiscal, setIsDocumentoFiscal] = useState(false)
  const [processamentoFiscal, setProcessamentoFiscal] =
    useState<ResultadoProcessamentoFiscal | null>(null)
  const [docsFiscaisConferencia, setDocsFiscaisConferencia] = useState<DocumentoFiscalExtraido[]>(
    [],
  )
  const [filtroFiscalAba, setFiltroFiscalAba] = useState<
    'todos' | 'notas' | 'recibos' | 'desconhecidos' | 'alertas'
  >('todos')
  const [resultadoAplicacaoFiscal, setResultadoAplicacaoFiscal] =
    useState<ResultadoAplicacaoFiscal | null>(null)

  // --- COMPRA DE GADO (nova capacidade do Maestro) ---
  const [isCompraGado, setIsCompraGado] = useState(false)
  const [conferenciaCompra, setConferenciaCompra] = useState<ResultadoConferenciaCompra | null>(
    null,
  )
  const [cotacaoManualAtiva, setCotacaoManualAtiva] = useState('')
  const [usarCotacaoManual, setUsarCotacaoManual] = useState(false)
  const [frenteEscolhas, setFrenteEscolhas] = useState<Record<string, FrenteCompra>>({})
  const [resultadoCompra, setResultadoCompra] = useState<ResultadoAplicacaoCompra | null>(null)
  // Venda de Gado (Robô Chicão)
  const [isVendaGado, setIsVendaGado] = useState(false)
  const [conferenciaVenda, setConferenciaVenda] = useState<ResultadoConferenciaVenda | null>(null)
  const [frenteVendaEscolhas, setFrenteVendaEscolhas] = useState<Record<string, FrenteVendaTipo>>(
    {},
  )
  const [resultVenda, setResultVenda] = useState<ResultadoAplicacaoVenda | null>(null)
  const [filtroVenda, setFiltroVenda] = useState<'todos' | 'bloqueadas' | 'alertas' | 'ok'>('todos')
  const [margemLoteFiltro, setMargemLoteFiltro] = useState<'todas' | 'positiva' | 'negativa'>(
    'todas',
  )
  const [loteFiltroVenda, setLoteFiltroVenda] = useState<string>('todos')
  const [cotacaoManualVenda, setCotacaoManualVenda] = useState('')
  const [usarCotacaoManualVenda, setUsarCotacaoManualVenda] = useState(false)
  const [filtroCompra, setFiltroCompra] = useState<'todos' | 'alertas' | 'criar' | 'atualizar'>(
    'todos',
  )

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
              Acesso Restrito ao Robô Chicão
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
    setIsCompraGado(false)
    setIsVendaGado(false)
    setConferenciaVenda(null)
    setResultVenda(null)
    setConferenciaCompra(null)
    setResultadoCompra(null)
    setUsarCotacaoManual(false)
    setCotacaoManualAtiva('')
    setFrenteEscolhas({})
    setFrenteVendaEscolhas({})
    setFiltroVenda('todos')
    setMargemLoteFiltro('todas')
    setLoteFiltroVenda('todos')
    setCotacaoManualVenda('')
    setUsarCotacaoManualVenda(false)
    setIsDocumentoFiscal(false)
    setProcessamentoFiscal(null)
    setDocsFiscaisConferencia([])
    setFiltroFiscalAba('todos')
    setResultadoAplicacaoFiscal(null)
  }

  // Exemplos rápidos do usuário
  const carregarExemploFiscal = () => {
    // Simula PDF de pacote fiscal com NF de Compra de Insumos, NF de Venda de Gado e Recibo de Pagamento escaneado
    const exemploTexto = `
================= DOCUMENTO 1: DANFE NF-e (COMPRA DE INSUMOS) =================
CHAVE DE ACESSO: 3524 0512 3456 7800 0195 5500 1000 0128 4710 0345 6789
NÚMERO: 12847  SÉRIE: 1  DATA EMISSÃO: 2025-05-12  NATUREZA DA OPERAÇÃO: COMPRA PARA COMERCIALIZACAO OU INDUSTRIALIZACAO
CFOP: 1102 / 1101
EMITENTE: NUTRIPEC AGROPECUARIA LTDA - CNPJ: 12.345.678/0001-95
DESTINATÁRIO: FAZENDA MODELO PECUARIA F3 - CNPJ: 45.678.901/0001-22
ITENS DA NOTA FISCAL:
- PRODUTO: Milho em Grão Seco | QTD: 15.000 | UN: kg | VL UNIT: 0,85 | VL TOTAL: 12.750,00 | CFOP: 1102
- PRODUTO: Nucleo Mineral Reproducao | QTD: 40 | UN: saco | VL UNIT: 135,00 | VL TOTAL: 5.400,00 | CFOP: 1102
- PRODUTO: Ureia Pecuaria Protegida | QTD: 20 | UN: saco | VL UNIT: 98,00 | VL TOTAL: 1.960,00 | CFOP: 1102
IMPOSTOS: BASE ICMS: 20.110,00 | VALOR ICMS: 2.413,20
VALOR TOTAL DA NOTA: R$ 20.110,00 (Vinte mil cento e dez reais)
FORMA DE PAGAMENTO: Boleto Bancario 30 dias

--- DOCUMENTO_SEPARADOR ---
================= DOCUMENTO 2: DANFE NF-e (VENDA DE GADO) =================
CHAVE DE ACESSO: 3524 0598 7654 3200 0140 5500 2000 0084 1910 0987 6543
NÚMERO: 8419  SÉRIE: 2  DATA EMISSÃO: 2025-05-14  NATUREZA DA OPERAÇÃO: SAIDA DE GADO BOVINO PARA ABATE
CFOP: 5102 / 5152
EMITENTE: FAZENDA MODELO PECUARIA F3 - CNPJ: 45.678.901/0001-22
DESTINATÁRIO: FRIGORIFICO VALE DO BOI LTDA - CNPJ: 98.765.432/0001-40
ITENS DA NOTA FISCAL:
- PRODUTO: Bovinos Machos Adultos (Boi Gordo) | QTD: 45 | UN: cab | PESO: 24.300 kg (810 @ vivo) | VL UNIT: 5.400,00 | VL TOTAL: 243.000,00
IMPOSTOS: ISENTO / SUSPENSAO ICMS
VALOR TOTAL DA NOTA: R$ 243.000,00 (Duzentos e quarenta e tres mil reais)
FORMA DE PAGAMENTO: Deposito em conta 15 dias

--- DOCUMENTO_SEPARADOR ---
================= DOCUMENTO 3: RECIBO DE PAGAMENTO / COMPROVANTE PIX (ESCANEADO) =================
[COMPROVANTE DE TRANSFERENCIA PIX BANCO DO BRASIL]
DATA DO PAGAMENTO: 2025-05-15
VALOR PAGO: R$ 20.110,00 (Vinte mil cento e dez reais)
FORMA DE PAGAMENTO: PIX
BENEFICIÁRIO: NUTRIPEC AGROPECUARIA LTDA - CNPJ: 12.345.678/0001-95
PAGADOR: FAZENDA MODELO PECUARIA F3 - CPF/CNPJ: 45.678.901/0001-22
REFERÊNCIA: NF-e 12847 Fornecimento de insumos nutricao
AUTENTICAÇÃO BANCÁRIA: PIX-E2E-9948271649102847592
CONTA DE DESTINO: BANCO DO BRASIL - AG: 1234 - CC: 56789-0
`
    const blob = new Blob([exemploTexto], { type: 'application/pdf' })
    const fileExemplo = new File([blob], 'pacote_notas_fiscais_e_recibos_maio.pdf', {
      type: 'application/pdf',
    })
    setFile(fileExemplo)
    setObjetivo(
      'Processar pacote PDF contendo Nota Fiscal de Insumos, NF de Venda de Gado e Recibo de Pagamento escaneado, alimentando estoque, fluxo de caixa e rebanho com conciliação automática.',
    )
    setIsDocumentoFiscal(true)
    setIsCompraGado(false)
    setIsVendaGado(false)
    toast.info('Pacote exemplo de Notas Fiscais e Recibos carregado!')
  }
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

  const carregarExemploCompraGado = () => {
    const fileExemplo = gerarExemploRapidoCompraGado()
    setFile(fileExemplo)
    setObjetivo(
      'Importar nota de COMPRA DE GADO: quantidade, peso médio (@ ou kg), preço por cabeça ou por @, fornecedor e data — aplicando rebanho, financeiro e ágio vs cotação.',
    )
    setIsCompraGado(true)
    toast.info('Exemplo rápido de COMPRA DE GADO carregado!')
  }

  const carregarExemploVendaGado = () => {
    const fileExemplo = gerarExemploRapidoVendaGado()
    setFile(fileExemplo)
    setObjetivo(
      'Importar nota de VENDA DE GADO: quantidade, peso médio (@ vivo ou carcaça), preço por cabeça ou por @, comprador e data — com margem real por lote e ágio vs cotação.',
    )
    setIsVendaGado(true)
    setIsCompraGado(false)
    toast.info('Exemplo rápido de VENDA DE GADO carregado!')
  }
  const carregarExemploEstoque = () => {
    const csvExemplo = `Produto;Unidade;Estoque Inicial;Entradas;Saídas;Estoque Final;Preço Unitário
Milho em Grão;kg;50000;15000;12500;52500;0.85
Farelo de Soja 46%;kg;12000;8000;6200;13800;2.15
Sal Mineral Reprodução;saco;120;50;45;125;105.00
Núcleo Mineral Confinamento;saco;80;40;30;90;135.00
Ureia Pecuária;saco;60;20;15;65;98.00`
    const blob = new Blob([csvExemplo], { type: 'text/csv' })
    const fileExemplo = new File([blob], 'planilha_estoque_insumos_safra.csv', { type: 'text/csv' })
    setFile(fileExemplo)
    setObjetivo(
      'Importar planilha de estoque de insumos com cálculo automático de custo do período e alimentação da fábrica de suplemento.',
    )
    toast.info('Exemplo de planilha de estoque de insumos carregado!')
  }

  // ETAPA 1 -> ETAPA 2: Ler arquivo e disparar Chicão
  const processarLeitura = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para leitura.')
      return
    }

    try {
      setLendoArquivo(true)
      toast.loading('Robô Chicão inspecionando documento...', { id: 'leitura-toast' })

      // 1. Extração bruta de markdown/tabelas
      const extracao = await extrairDocumentoMaestro(file)
      setMarkdownExtraido(extracao.markdown)
      setAvisoExtracao(extracao.aviso)
      setRequiresOCR(extracao.requiresOCR)
      setOcrUsado(Boolean(extracao.ocrUsado))
      setOrigemLeitura(extracao.origem_leitura || 'texto')

      // 1.b VERIFICAÇÃO AUTOMÁTICA OU EXPLÍCITA: NOTA FISCAL / RECIBO DE PAGAMENTO (PDF / OCR)
      const nomeLower = file.name.toLowerCase()
      const textoLower = (extracao.markdown || '').toLowerCase()
      const ehSinalFiscal =
        isDocumentoFiscal ||
        nomeLower.includes('danfe') ||
        nomeLower.includes('nf-e') ||
        nomeLower.includes('nfe') ||
        nomeLower.includes('recibo') ||
        nomeLower.includes('comprovante') ||
        nomeLower.includes('fiscal') ||
        textoLower.includes('danfe') ||
        textoLower.includes('chave de acesso') ||
        textoLower.includes('natureza da operação') ||
        textoLower.includes('comprovante de transferência') ||
        textoLower.includes('comprovante pix') ||
        textoLower.includes('recibo de pagamento')

      if (ehSinalFiscal && extracao.markdown.trim()) {
        setIsDocumentoFiscal(true)
        setIsCompraGado(false)
        setIsVendaGado(false)

        toast.loading('Separando e estruturando notas fiscais e recibos...', {
          id: 'leitura-toast',
        })
        const resultadoFiscal = await processarDocumentosFiscais(
          extracao.markdown,
          file.name,
          extracao.ocrUsado ? 'visao' : 'texto',
        )

        setProcessamentoFiscal(resultadoFiscal)
        setDocsFiscaisConferencia(resultadoFiscal.documentos)

        toast.dismiss('leitura-toast')
        toast.success(
          `Chicão identificou ${resultadoFiscal.total_documentos} documento(s) (${resultadoFiscal.notas_fiscais.length} NF-e e ${resultadoFiscal.recibos.length} recibo/comprovante)!`,
          {
            description:
              resultadoFiscal.sugestoes_conciliacao.length > 0
                ? `${resultadoFiscal.sugestoes_conciliacao.length} conciliação(ões) nota ↔ pagamento sugerida(s)! Avançando para a conferência.`
                : 'Avançando direto para a conferência obrigatória.',
          },
        )
        setEtapa(3)
        return
      }

      // Se falhou leitura visual e documento precisa de OCR sem nenhum texto legível
      if (!extracao.markdown.trim() && extracao.requiresOCR) {
        toast.dismiss('leitura-toast')
        toast.warning('Documento sem camada de texto legível. Verifique as orientações exibidas.')
        return
      }

      // 2. Parsing estruturado: deriva headers/rows do arquivo lido
      // CSV/TSV plano usa o parser de linhas; PDF/DOCX (tabela markdown) usa o parser de markdown
      const ehCSVTexto = /\.(csv|tsv|txt)$/i.test(file.name)
      const parsed = ehCSVTexto
        ? parseCSVClientSide(extracao.markdown)
        : parseMarkdownTable(extracao.markdown)
      setHeadersIdentificados(parsed.headers)
      setRawRows(parsed.rows as Record<string, any>[])

      // 2.b RECONHECIMENTO ESPECÍFICO: VENDA DE GADO (planilha/PDF/DOCX com tabela)
      const mapeamentoVenda = reconhecerColunasVendaGado(parsed.headers)
      const ehVendaGado =
        isDocumentoVendaGado(mapeamentoVenda) &&
        (filenameVendaGadoSignal(file.name) ||
          mapeamentoVenda.some((m) => m.campoDestino === 'comprador') ||
          parsed.headers.some((h) => {
            const n = h
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
            return n.includes('comprador')
          }))

      if (ehVendaGado && mapeamentoVenda.some((m) => m.campoDestino !== 'ignorar')) {
        setIsVendaGado(true)
        setIsCompraGado(false)
        setMappings(mapeamentoVenda as any)
        toast.dismiss('leitura-toast')
        toast.success('Documento reconhecido como VENDA DE GADO — fluxo dedicado ativado!', {
          description:
            'Mapeamento de quantidade, peso médio, preço por cabeça/@, comprador, documento e data realizado. Revise o mapeamento e avance para a conferência com margem real por lote.',
        })
        setEtapa(2)
        return
      }

      // 2.c RECONHECIMENTO ESPECÍFICO: COMPRA DE GADO (planilha/PDF/DOCX com tabela)
      const mapeamentoCompra = reconhecerColunasCompraGado(parsed.headers)
      const ehCompraGado =
        isDocumentoCompraGado(mapeamentoCompra) ||
        filenameCompraGadoSignal(file.name) ||
        Boolean(
          parsed.headers.some((h) => {
            const n = h
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
            return (
              (n.includes('cabeca') || n.includes('fornecedor')) &&
              (n.includes('preco') || n.includes('peso'))
            )
          }),
        )

      if (ehCompraGado && mapeamentoCompra.some((m) => m.campoDestino !== 'ignorar')) {
        setIsCompraGado(true)
        setMappings(mapeamentoCompra as any)
        toast.dismiss('leitura-toast')
        toast.success('Documento reconhecido como COMPRA DE GADO — fluxo dedicado ativado!', {
          description:
            'Mapeamento de quantidade, peso médio, preço por cabeça/@, fornecedor e data realizado. Revise o mapeamento e avance para a conferência com cálculo de ágio.',
        })
        setEtapa(2)
        return
      }
      setIsCompraGado(false)

      // Determinar tipo preliminar de documento por nome do arquivo ou cabeçalhos
      const filenameLower = file.name.toLowerCase()
      const headersJoined = parsed.headers.map((h) => h.toLowerCase()).join(' ')
      let docTipo:
        | 'pesagens'
        | 'lotes_animais'
        | 'estoque'
        | 'financeiro'
        | 'atividades'
        | 'generico' = 'lotes_animais'

      if (
        filenameLower.includes('estoque') ||
        filenameLower.includes('insumo') ||
        headersJoined.includes('estoque') ||
        headersJoined.includes('insumo') ||
        headersJoined.includes('entradas') ||
        headersJoined.includes('saídas') ||
        headersJoined.includes('saidas') ||
        headersJoined.includes('saldo final')
      ) {
        docTipo = 'estoque'
      } else if (
        filenameLower.includes('pesagem') ||
        headersJoined.includes('pesagem') ||
        headersJoined.includes('brinco')
      ) {
        docTipo = 'pesagens'
      }

      // 3. Reconhecimento automático de importação anterior (mesmas colunas)
      let mapeamentoSalvo = await buscarMapeamentoReconhecido(docTipo, parsed.headers)
      if (!mapeamentoSalvo && docTipo !== 'pesagens' && docTipo !== 'estoque') {
        // Tentar também como estoque se houver insumo/produto nas colunas
        const salvoComoEstoque = await buscarMapeamentoReconhecido('estoque', parsed.headers)
        if (salvoComoEstoque) {
          docTipo = 'estoque'
          mapeamentoSalvo = salvoComoEstoque
        } else {
          const salvoComoPesagens = await buscarMapeamentoReconhecido('pesagens', parsed.headers)
          if (salvoComoPesagens) {
            docTipo = 'pesagens'
            mapeamentoSalvo = salvoComoPesagens
          }
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

      if (isVendaGado) {
        await compilarConferenciaVenda()
        setEtapa(3)
        return
      }

      if (isCompraGado) {
        await compilarConferenciaCompra()
        setEtapa(3)
        return
      }

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
    if (isDocumentoFiscal) {
      try {
        setAplicando(true)
        setConfirmModalOpen(false)
        toast.loading('Robô Chicão aplicando notas fiscais e recibos...', { id: 'aplicando-toast' })

        const resFiscal = await aplicarDocumentosFiscaisConfirmados(
          docsFiscaisConferencia,
          file?.name || 'documento_fiscal.pdf',
          {
            id: user.id,
            nome: user.name || 'Gestor',
            perfil: user.role,
          },
        )

        setResultadoAplicacaoFiscal(resFiscal)
        toast.dismiss('aplicando-toast')
        toast.success(
          `${resFiscal.total_aplicados} documento(s) aplicados no estoque, rebanho e financeiro com sucesso!`,
        )
        setEtapa(5)
      } catch (err: any) {
        toast.dismiss('aplicando-toast')
        toast.error('Erro ao aplicar documentos fiscais: ' + (err.message || 'Falha'))
      } finally {
        setAplicando(false)
      }
      return
    }

    if (isVendaGado) {
      await executarAplicacaoVenda()
      return
    }
    if (isCompraGado) {
      await executarAplicacaoCompra()
      return
    }
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
    if (isVendaGado && conferenciaVenda) {
      exportarVendaGadoExcel(
        conferenciaVenda.linhas,
        `conferencia_venda_gado_${file?.name || 'dados'}`,
      )
      return
    }
    if (isCompraGado && conferenciaCompra) {
      exportarCompraGadoExcel(
        conferenciaCompra.linhas,
        `conferencia_compra_gado_${file?.name || 'dados'}`,
      )
      return
    }
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

  // Verificar se há produtos bloqueados para exibir aviso no modal
  const temProdutosBloqueados = registros.some(
    (r) =>
      !r.ignoradoPeloUsuario &&
      r.acaoSugerida !== 'ignorar' &&
      r.alertas.some((a) => a.includes('BLOQUEIO') || a.includes('negativo')),
  )

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
    setIsCompraGado(false)
    setIsVendaGado(false)
    setConferenciaCompra(null)
    setConferenciaVenda(null)
    setResultVenda(null)
    setCotacaoManualAtiva('')
    setUsarCotacaoManual(false)
    setFrenteEscolhas({})
    setResultadoCompra(null)
    setFiltroCompra('todos')
    setFrenteVendaEscolhas({})
    setFiltroVenda('todos')
    setMargemLoteFiltro('todas')
    setLoteFiltroVenda('todos')
    setCotacaoManualVenda('')
    setUsarCotacaoManualVenda(false)
  }

  // ------------------ VENDA DE GADO: pipeline ------------------
  const compilarConferenciaVenda = async (
    rowsOverride?: Record<string, any>[],
    mappingsOverride?: ColunaCompraMappingTipo[],
    manualOverride?: { preco: number } | null,
  ) => {
    try {
      setCompilando(true)
      const rows = rowsOverride || rawRows
      const maps: ColunaCompraMappingTipo[] =
        mappingsOverride || (mappings as ColunaCompraMappingTipo[])
      const manual =
        manualOverride !== undefined
          ? manualOverride
          : usarCotacaoManual && cotacaoManualAtiva
            ? { preco: Number(cotacaoManualAtiva) }
            : null
      const resultado = await compilarLinhasVendaGado(
        rows,
        maps,
        manual && manual.preco > 0 ? manual : null,
      )
      setConferenciaVenda(resultado)
      const escolhas: Record<string, FrenteVendaTipo> = {}
      resultado.linhas.forEach((l) => {
        escolhas[l.idTemp] = l.frenteEscolhida || 'engorda'
      })
      setFrenteVendaEscolhas(escolhas)
      toast.dismiss('compilando-toast')
      toast.success(
        `${resultado.linhas.length} linhas de VENDA DE GADO preparadas para conferência!`,
      )
    } catch (err: any) {
      toast.error('Erro ao compilar venda de gado: ' + (err.message || 'Falha'))
    } finally {
      setCompilando(false)
    }
  }

  const executarAplicacaoVenda = async () => {
    try {
      setAplicando(true)
      setConfirmModalOpen(false)
      toast.loading('Aplicando venda de gado no rebanho, financeiro e fechamento...', {
        id: 'aplicando-toast',
      })

      const linhasValidadas: LinhaVendaNormalizada[] = (conferenciaVenda?.linhas || []).map(
        (l) => ({
          ...l,
          frenteEscolhida: frenteVendaEscolhas[l.idTemp] || l.frenteEscolhida,
        }),
      )

      const resultado = await aplicarVendaGadoConfirmada(
        linhasValidadas,
        {
          nome: file?.name || 'documento',
          formato: 'venda de gado',
        },
        {
          id: user.id,
          nome: user.name || 'Gestor',
          perfil: user.role,
        },
        conferenciaVenda?.cotacao || null,
      )

      setResultVenda(resultado)
      toast.dismiss('aplicando-toast')
      toast.success('Venda de gado aplicada e registrada na auditoria (append-only)!')
      setEtapa(5)
    } catch (err: any) {
      toast.dismiss('aplicando-toast')
      toast.error('Erro ao aplicar venda de gado: ' + (err.message || 'Falha'))
    } finally {
      setAplicando(false)
    }
  }

  // ------------------ COMPRA DE GADO: pipeline ------------------
  const compilarConferenciaCompra = async (
    rowsOverride?: Record<string, any>[],
    mappingsOverride?: ColunaCompraMappingTipo[],
    manualOverride?: { preco: number } | null,
  ) => {
    try {
      setCompilando(true)
      const rows = rowsOverride || rawRows
      const maps: ColunaCompraMappingTipo[] =
        mappingsOverride || (mappings as ColunaCompraMappingTipo[])
      const manual =
        manualOverride !== undefined
          ? manualOverride
          : usarCotacaoManual && cotacaoManualAtiva
            ? { preco: Number(cotacaoManualAtiva) }
            : null
      const resultado = await compilarLinhasCompraGado(
        rows,
        maps,
        manual && manual.preco > 0 ? manual : null,
      )
      setConferenciaCompra(resultado)
      const escolhas: Record<string, FrenteCompra> = {}
      resultado.linhas.forEach((l) => {
        const sugerida = detectarFrenteSugerida(l.dados.pasto_destino)
        escolhas[l.idTemp] = sugerida
      })
      setFrenteEscolhas(escolhas)
      toast.dismiss('compilando-toast')
      toast.success(
        `${resultado.linhas.length} linhas de COMPRA DE GADO preparadas para conferência!`,
      )
    } catch (err: any) {
      toast.error('Erro ao compilar compra de gado: ' + (err.message || 'Falha'))
    } finally {
      setCompilando(false)
    }
  }

  const executarAplicacaoCompra = async () => {
    try {
      setAplicando(true)
      setConfirmModalOpen(false)
      toast.loading('Aplicando compra de gado no rebanho, financeiro e fechamento...', {
        id: 'aplicando-toast',
      })

      const linhasValidadas: LinhaCompraNormalizada[] = (conferenciaCompra?.linhas || []).map(
        (l) => ({
          ...l,
          frenteEscolhida: frenteEscolhas[l.idTemp] || l.frenteEscolhida,
        }),
      )

      const resultado = await aplicarCompraGadoConfirmada(
        linhasValidadas,
        {
          nome: file?.name || 'documento',
          formato: isCompraGado ? 'compra de gado' : 'planilha',
        },
        {
          id: user.id,
          nome: user.name || 'Gestor',
          perfil: user.role,
        },
        conferenciaCompra?.cotacao || null,
      )

      setResultadoCompra(resultado)
      toast.dismiss('aplicando-toast')
      toast.success('Compra de gado aplicada e registrada na auditoria (append-only)!')
      setEtapa(5)
    } catch (err: any) {
      toast.dismiss('aplicando-toast')
      toast.error('Erro ao aplicar compra de gado: ' + (err.message || 'Falha'))
    } finally {
      setAplicando(false)
    }
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

  // Métricas agregadas de Estoque de Insumos
  const isEstoqueDoc =
    tipoDocumento === 'estoque' || registros.some((r) => r.dadosMapeados['insumo_produto'])

  const custoTotalPeriodoEstoque = registros
    .filter((r) => !r.ignoradoPeloUsuario && r.acaoSugerida !== 'ignorar')
    .reduce((acc, r) => acc + (Number(r.dadosMapeados['insumo_custo_periodo_rs']) || 0), 0)

  const consumoTotalKgEstoque = registros
    .filter((r) => !r.ignoradoPeloUsuario && r.acaoSugerida !== 'ignorar')
    .reduce((acc, r) => {
      const dm = r.dadosMapeados
      const und = String(dm['insumo_unidade'] || '').toLowerCase()
      const saidas = Number(dm['insumo_saidas']) || 0
      if (und.includes('saco')) return acc + saidas * 30
      if (und.includes('ton')) return acc + saidas * 1000
      return acc + saidas
    }, 0)

  const consumoTotalSacosEstoque = registros
    .filter((r) => !r.ignoradoPeloUsuario && r.acaoSugerida !== 'ignorar')
    .reduce((acc, r) => {
      const dm = r.dadosMapeados
      const und = String(dm['insumo_unidade'] || '').toLowerCase()
      const saidas = Number(dm['insumo_saidas']) || 0
      if (und.includes('saco')) return acc + saidas
      return acc + saidas / 30
    }, 0)

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
                Robô de Ingestão e Gestão "Chicão"
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
                Envie documentos em PDF, DOCX/Word, XLSX/XLS/CSV, PPTX ou texto. O Chicão identifica
                automaticamente cabeçalhos e colunas em qualquer linha ou layout.
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
                    confiança 100% no Chicão sem ajustes manuais.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      baixarModeloVendaGadoXlsx()
                      toast.success('Modelo Venda de Gado (.xlsx) baixado!')
                    }}
                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-700" />
                    Modelo Venda de Gado (.xlsx)
                  </Button>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      baixarPlanilhaModeloOficial('estoque')
                      toast.success('Modelo Oficial de Estoque de Insumos (.xlsx) baixado!')
                    }}
                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-600" />
                    Modelo Estoque de Insumos (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      baixarModeloCompraGadoXlsx()
                      toast.success('Modelo Compra de Gado (.xlsx) baixado!')
                    }}
                    className="text-xs gap-1.5 border-emerald-600/40 text-emerald-900 dark:text-emerald-200 bg-background hover:bg-emerald-50"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-700" />
                    Modelo Compra de Gado (.xlsx)
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={carregarExemploEstoque}
                      className="text-xs h-7 px-2 text-amber-800 dark:text-amber-200 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      Estoque Insumos (Fábrica)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={carregarExemploCompraGado}
                      className="text-xs h-7 px-2 text-emerald-900 dark:text-emerald-200 border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-500/20 gap-1"
                    >
                      <Scale className="h-3 w-3 text-emerald-700" />
                      Compra de Gado
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={carregarExemploVendaGado}
                      className="text-xs h-7 px-2 text-rose-900 dark:text-rose-200 border-rose-600/40 bg-rose-500/10 hover:bg-rose-500/20 gap-1"
                    >
                      <Scale className="h-3 w-3 text-rose-700" />
                      Venda de Gado
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={carregarExemploFiscal}
                      className="text-xs h-7 px-2 text-blue-900 dark:text-blue-200 border-blue-600/40 bg-blue-500/10 hover:bg-blue-500/20 gap-1 font-semibold"
                    >
                      <Receipt className="h-3 w-3 text-blue-700" />
                      Nota Fiscal / Recibo (PDF)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Aviso Honesto se o arquivo anterior não continha texto legível */}
              {requiresOCR && !markdownExtraido && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Aviso Honesto do Robô Chicão — Nenhum dado é inventado
                  </div>
                  <p className="leading-relaxed">{avisoExtracao}</p>
                </div>
              )}

              {/* Descrição do Objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objetivo" className="text-sm font-semibold">
                  Objetivo ou Instruções para o Chicão (opcional)
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
                    <>Robô Chicão Lendo Documento...</>
                  ) : (
                    <>
                      Iniciar Leitura com Chicão <ArrowRight className="h-4 w-4" />
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
                <Info className="h-4 w-4 text-primary" /> Regras Técnicas Garantidas pelo Chicão
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong className="text-foreground block mb-0.5">Conversão de Arrobas:</strong>1 @
                de peso vivo = 30 kg; 1 @ de carcaça = 15 kg. O Chicão detecta a unidade e converte
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
                    O Robô Chicão identificou as colunas e sugeriu a correspondência zootécnica.
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
                      Lotes e Rebanho
                    </TabsTrigger>
                    <TabsTrigger value="pesagens" className="text-xs">
                      Pesagens e GMD
                    </TabsTrigger>
                    <TabsTrigger
                      value="estoque"
                      className="text-xs font-semibold text-amber-800 dark:text-amber-300"
                    >
                      Estoque Insumos & Fábrica
                    </TabsTrigger>
                    <TabsTrigger value="financeiro" className="text-xs">
                      Financeiro
                    </TabsTrigger>{' '}
                    <TabsTrigger
                      value="compra_gado"
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                    >
                      Compra de Gado
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {isCompraGado && (
                  <Badge className="bg-emerald-700 text-white text-[10px] shrink-0">
                    Documento Reconhecido: COMPRA DE GADO
                  </Badge>
                )}
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
                                {isCompraGado && (
                                  <>
                                    <SelectItem
                                      value="qtd_cabecas"
                                      className="text-xs text-emerald-800"
                                    >
                                      Quantidade de Cabeças da Compra (Compra de Gado)
                                    </SelectItem>
                                    <SelectItem
                                      value="peso_medio_at"
                                      className="text-xs text-emerald-800"
                                    >
                                      Peso Médio em @ — será × 30 kg (Compra de Gado)
                                    </SelectItem>
                                    <SelectItem
                                      value="preco_rs_cab"
                                      className="text-xs text-emerald-800"
                                    >
                                      Preço por Cabeça R$ (Compra de Gado)
                                    </SelectItem>
                                    <SelectItem
                                      value="preco_rs_at"
                                      className="text-xs text-emerald-800"
                                    >
                                      Preço por @ R$ (Compra de Gado)
                                    </SelectItem>
                                    <SelectItem
                                      value="fornecedor"
                                      className="text-xs text-emerald-800"
                                    >
                                      Fornecedor / Vendedor (Compra de Gado)
                                    </SelectItem>
                                    <SelectItem value="data" className="text-xs text-emerald-800">
                                      Data da Compra (Compra de Gado)
                                    </SelectItem>
                                  </>
                                )}{' '}
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
      {etapa === 3 && isDocumentoFiscal && (
        <div className="space-y-6">
          {/* Header e Métricas dos Documentos Fiscais Reconhecidos */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-400 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-blue-950 dark:text-blue-100">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  Conferência Obrigatória: Notas Fiscais e Recibos de Pagamento
                </p>
                <p className="text-blue-800/80 dark:text-blue-300">
                  O Chicão separou {docsFiscaisConferencia.length} documento(s) individualmente do
                  arquivo. Nenhum registro é lançado no estoque, rebanho ou financeiro sem a sua
                  revisão e aprovação campo a campo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="border-blue-500 text-blue-800 dark:text-blue-200 bg-background font-mono"
              >
                {docsFiscaisConferencia.filter((d) => d.tipo_documento === 'nota_fiscal').length}{' '}
                NF-e / DANFE
              </Badge>
              <Badge
                variant="outline"
                className="border-blue-500 text-blue-800 dark:text-blue-200 bg-background font-mono"
              >
                {docsFiscaisConferencia.filter((d) => d.tipo_documento === 'recibo').length}{' '}
                Recibo(s)
              </Badge>
            </div>
          </div>

          {/* Cards de Métricas e Totais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground block">Total de Documentos</span>
                <span className="text-2xl font-bold">{docsFiscaisConferencia.length}</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  extraídos e estruturados
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                  Total Aprovado
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  R${' '}
                  {docsFiscaisConferencia
                    .filter((d) => d.aprovado_para_aplicar)
                    .reduce((acc, d) => acc + d.valor_total, 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {docsFiscaisConferencia.filter((d) => d.aprovado_para_aplicar).length} docs
                  selecionados
                </span>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-blue-700 dark:text-blue-300 block">
                  Conciliações Sugeridas
                </span>
                <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {processamentoFiscal?.sugestoes_conciliacao.length || 0}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                  vínculo Nota ↔ Recibo
                </span>
              </CardContent>
            </Card>

            <Card
              className={
                docsFiscaisConferencia.some((d) => d.alertas.some((a) => a.tipo === 'critico'))
                  ? 'border-red-500/40 bg-red-50/40 dark:bg-red-950/20'
                  : 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20'
              }
            >
              <CardContent className="p-4">
                <span className="text-xs text-amber-700 dark:text-amber-300 block">
                  Alertas / Ambiguidade
                </span>
                <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {docsFiscaisConferencia.reduce((acc, d) => acc + d.alertas.length, 0)}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
                  requerem conferência atenta
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Banner de Conciliação Automática quando houver par NF ↔ Recibo */}
          {processamentoFiscal?.sugestoes_conciliacao &&
            processamentoFiscal.sugestoes_conciliacao.length > 0 && (
              <Card className="border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/15">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <Link2 className="h-4 w-4 text-emerald-600" />
                    Sugestão de Conciliação Automática: NF de Compra ↔ Recibo de Pagamento
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-800/80 dark:text-emerald-300">
                    O Chicão cruzou os documentos deste lote e identificou pagamentos
                    correspondentes às notas fiscais emitidas:
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2 text-xs">
                  {processamentoFiscal.sugestoes_conciliacao.map((c, i) => {
                    const nf = docsFiscaisConferencia.find((d) => d.id_temp === c.nf_id)
                    const rc = docsFiscaisConferencia.find((d) => d.id_temp === c.recibo_id)
                    return (
                      <div
                        key={i}
                        className="p-2.5 bg-background border border-emerald-400/40 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            PAR ENCONTRADO
                          </Badge>
                          <span className="font-semibold">
                            NF {nf?.numero_documento || 'S/N'} (R$ {nf?.valor_total.toFixed(2)}) ↔
                            Recibo ({rc?.forma_pagamento || 'PIX'} - R$ {rc?.valor_total.toFixed(2)}
                            )
                          </span>
                        </div>
                        <span className="text-muted-foreground italic text-[11px]">{c.motivo}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

          {/* Filtros de Visualização por Categoria */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtroFiscalAba === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFiscalAba('todos')}
                className="text-xs h-7"
              >
                Todos ({docsFiscaisConferencia.length})
              </Button>
              <Button
                variant={filtroFiscalAba === 'notas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFiscalAba('notas')}
                className="text-xs h-7 font-semibold text-blue-700 dark:text-blue-300"
              >
                Notas Fiscais (
                {docsFiscaisConferencia.filter((d) => d.tipo_documento === 'nota_fiscal').length})
              </Button>
              <Button
                variant={filtroFiscalAba === 'recibos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFiscalAba('recibos')}
                className="text-xs h-7 font-semibold text-emerald-700 dark:text-emerald-300"
              >
                Recibos de Pagamento (
                {docsFiscaisConferencia.filter((d) => d.tipo_documento === 'recibo').length})
              </Button>
              <Button
                variant={filtroFiscalAba === 'desconhecidos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFiscalAba('desconhecidos')}
                className="text-xs h-7 text-amber-700"
              >
                Desconhecidos (
                {docsFiscaisConferencia.filter((d) => d.tipo_documento === 'desconhecido').length})
              </Button>
              <Button
                variant={filtroFiscalAba === 'alertas' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltroFiscalAba('alertas')}
                className="text-xs h-7"
              >
                Com Alertas ({docsFiscaisConferencia.filter((d) => d.alertas.length > 0).length})
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {docsFiscaisConferencia.filter((d) => d.aprovado_para_aplicar).length} selecionado(s)
              para aplicação
            </div>
          </div>

          {/* LISTA DE DOCUMENTOS FISCAIS / RECIBOS COM CONFERÊNCIA DETALHADA */}
          <div className="space-y-4">
            {docsFiscaisConferencia
              .filter((d) => {
                if (filtroFiscalAba === 'notas') return d.tipo_documento === 'nota_fiscal'
                if (filtroFiscalAba === 'recibos') return d.tipo_documento === 'recibo'
                if (filtroFiscalAba === 'desconhecidos') return d.tipo_documento === 'desconhecido'
                if (filtroFiscalAba === 'alertas') return d.alertas.length > 0
                return true
              })
              .map((doc, idx) => {
                const isNota = doc.tipo_documento === 'nota_fiscal'
                const isRecibo = doc.tipo_documento === 'recibo'
                const hasCritico = doc.alertas.some((a) => a.tipo === 'critico')

                return (
                  <Card
                    key={doc.id_temp}
                    className={`transition-all border ${
                      !doc.aprovado_para_aplicar
                        ? 'opacity-60 bg-muted/10 border-border'
                        : hasCritico
                          ? 'border-red-500/60 bg-red-50/10'
                          : isNota
                            ? 'border-blue-500/30'
                            : 'border-emerald-500/30'
                    }`}
                  >
                    <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={doc.aprovado_para_aplicar}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setDocsFiscaisConferencia((prev) =>
                                prev.map((item) =>
                                  item.id_temp === doc.id_temp
                                    ? { ...item, aprovado_para_aplicar: checked }
                                    : item,
                                ),
                              )
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  isNota
                                    ? 'bg-blue-600 text-white text-[11px]'
                                    : isRecibo
                                      ? 'bg-emerald-600 text-white text-[11px]'
                                      : 'bg-amber-600 text-white text-[11px]'
                                }
                              >
                                {isNota
                                  ? `NOTA FISCAL (${doc.subtipo.toUpperCase()})`
                                  : isRecibo
                                    ? `RECIBO (${doc.subtipo.toUpperCase()})`
                                    : 'DOCUMENTO DESCONHECIDO'}
                              </Badge>
                              <span className="font-bold text-sm">
                                {doc.numero_documento
                                  ? `Nº ${doc.numero_documento}${doc.serie ? ` (Série ${doc.serie})` : ''}`
                                  : 'Documento Sem Número'}
                              </span>
                              {doc.ja_importado && (
                                <Badge variant="destructive" className="text-[10px]">
                                  JÁ IMPORTADO (BLOQUEADO)
                                </Badge>
                              )}
                              {doc.vinculo_sugerido_id && (
                                <Badge className="bg-emerald-700 text-white text-[10px]">
                                  CONCILIADO COM {isNota ? 'RECIBO' : 'NF'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {isNota
                                ? `Emitente: ${doc.emitente.razao_social || 'Não informado'} | CNPJ/CPF: ${formatarCNPJouCPF(doc.emitente.cnpj_cpf)}`
                                : `Favorecido: ${doc.beneficiario.nome || 'Não informado'} | CNPJ/CPF: ${formatarCNPJouCPF(doc.beneficiario.cnpj_cpf)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Valor Total</span>
                            <span className="text-lg font-bold font-mono text-foreground">
                              R${' '}
                              <Input
                                type="number"
                                step="0.01"
                                value={doc.valor_total}
                                onChange={(e) => {
                                  const novoVal = parseFloat(e.target.value) || 0
                                  setDocsFiscaisConferencia((prev) =>
                                    prev.map((item) =>
                                      item.id_temp === doc.id_temp
                                        ? { ...item, valor_total: novoVal }
                                        : item,
                                    ),
                                  )
                                }}
                                className="h-7 w-32 inline-block font-mono font-bold text-right ml-1"
                              />
                            </span>
                          </div>
                          <Badge
                            variant={
                              doc.confianca_geral === 'alta'
                                ? 'outline'
                                : doc.confianca_geral === 'media'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            Confiança {doc.confianca_geral}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                      {/* Alertas e Ambiguidades específicas deste documento */}
                      {doc.alertas.length > 0 && (
                        <div className="space-y-1.5">
                          {doc.alertas.map((alerta, aIdx) => (
                            <div
                              key={aIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                alerta.tipo === 'critico'
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-300 text-red-900 dark:text-red-200'
                                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-amber-900 dark:text-amber-200'
                              }`}
                            >
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                              <div className="flex-1">
                                <span className="font-semibold">{alerta.mensagem}</span>
                                {alerta.sugestao && (
                                  <p className="text-[11px] opacity-90 mt-0.5">
                                    Sugestão: {alerta.sugestao}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Grade de Campos e Metadados */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Campo Chave de Acesso (NF-e) */}
                        {isNota && (
                          <div className="p-2.5 bg-muted/20 border rounded-lg md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-muted-foreground">
                                Chave de Acesso (44 dígitos - Deduplicação):
                              </span>
                              <Badge
                                variant={
                                  doc.campos_status['chave_acesso']?.status === 'OK'
                                    ? 'outline'
                                    : 'destructive'
                                }
                                className="text-[9px]"
                              >
                                {doc.campos_status['chave_acesso']?.status || 'AMBÍGUO'}
                              </Badge>
                            </div>
                            <Input
                              value={doc.chave_acesso || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '')
                                setDocsFiscaisConferencia((prev) =>
                                  prev.map((item) =>
                                    item.id_temp === doc.id_temp
                                      ? {
                                          ...item,
                                          chave_acesso: val,
                                          campos_status: {
                                            ...item.campos_status,
                                            chave_acesso: {
                                              status: val.length === 44 ? 'OK' : 'ILEGIVEL',
                                              confianca: val.length === 44 ? 'alta' : 'baixa',
                                            },
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }}
                              placeholder="44 dígitos numéricos da DANFE"
                              className="font-mono text-xs h-7"
                              maxLength={44}
                            />
                          </div>
                        )}

                        {/* Campo Data */}
                        <div className="p-2.5 bg-muted/20 border rounded-lg">
                          <span className="font-semibold text-muted-foreground block mb-1">
                            {isNota ? 'Data de Emissão' : 'Data do Pagamento'}:
                          </span>
                          <Input
                            type="date"
                            value={isNota ? doc.data_emissao || '' : doc.data_pagamento || ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setDocsFiscaisConferencia((prev) =>
                                prev.map((item) =>
                                  item.id_temp === doc.id_temp
                                    ? isNota
                                      ? { ...item, data_emissao: v }
                                      : { ...item, data_pagamento: v }
                                    : item,
                                ),
                              )
                            }}
                            className="text-xs h-7"
                          />
                        </div>

                        {/* Natureza da Operação / CFOP para NF */}
                        {isNota && (
                          <div className="p-2.5 bg-muted/20 border rounded-lg">
                            <span className="font-semibold text-muted-foreground block mb-1">
                              CFOP / Natureza da Operação:
                            </span>
                            <div className="flex gap-2">
                              <Input
                                value={doc.cfop_principal || ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setDocsFiscaisConferencia((prev) =>
                                    prev.map((item) =>
                                      item.id_temp === doc.id_temp
                                        ? { ...item, cfop_principal: v }
                                        : item,
                                    ),
                                  )
                                }}
                                placeholder="ex: 1102"
                                className="text-xs h-7 w-20 font-mono"
                              />
                              <Input
                                value={doc.natureza_operacao || ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setDocsFiscaisConferencia((prev) =>
                                    prev.map((item) =>
                                      item.id_temp === doc.id_temp
                                        ? { ...item, natureza_operacao: v }
                                        : item,
                                    ),
                                  )
                                }}
                                placeholder="Natureza da operação"
                                className="text-xs h-7 flex-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* Forma de Pagamento e Dados Bancários */}
                        <div className="p-2.5 bg-muted/20 border rounded-lg">
                          <span className="font-semibold text-muted-foreground block mb-1">
                            Forma de Pagamento:
                          </span>
                          <Input
                            value={doc.forma_pagamento || ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setDocsFiscaisConferencia((prev) =>
                                prev.map((item) =>
                                  item.id_temp === doc.id_temp
                                    ? { ...item, forma_pagamento: v }
                                    : item,
                                ),
                              )
                            }}
                            placeholder="PIX, TED, Boleto, Dinheiro..."
                            className="text-xs h-7"
                          />
                        </div>

                        {/* Mapeamento Zootécnico / Contábil Sugerido */}
                        <div className="p-2.5 bg-muted/20 border rounded-lg md:col-span-1">
                          <span className="font-semibold text-muted-foreground block mb-1">
                            Destino no Sistema (Efeito Automático):
                          </span>
                          <Select
                            value={doc.destino_sistema}
                            onValueChange={(val: any) => {
                              setDocsFiscaisConferencia((prev) =>
                                prev.map((item) =>
                                  item.id_temp === doc.id_temp
                                    ? { ...item, destino_sistema: val }
                                    : item,
                                ),
                              )
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="estoque_insumos" className="text-xs">
                                Estoque de Insumos (Fábrica / Nutrição) + Financeiro
                              </SelectItem>
                              <SelectItem value="rebanho_venda" className="text-xs">
                                Venda de Gado (Saída Rebanho + Receita Caixa)
                              </SelectItem>
                              <SelectItem value="rebanho_compra" className="text-xs">
                                Compra de Gado (Entrada Rebanho + Desembolso)
                              </SelectItem>
                              <SelectItem value="financeiro_servico" className="text-xs">
                                Lançamento Financeiro / Serviço (Sem estoque)
                              </SelectItem>
                              <SelectItem value="baixa_desembolso" className="text-xs">
                                Baixa de Pagamento / Desembolso no Fluxo de Caixa
                              </SelectItem>
                              <SelectItem value="ignorar" className="text-xs text-muted-foreground">
                                Ignorar Documento (Não aplicar)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Tabela de Itens da Nota Fiscal */}
                      {isNota && doc.itens.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-muted-foreground">
                              Itens da Nota Fiscal ({doc.itens.length}):
                            </span>
                            <span className="font-mono text-[11px]">
                              Soma dos itens: R$ {doc.soma_itens.toFixed(2)}{' '}
                              {doc.divergencia_soma > 0.05 && (
                                <span className="text-red-600 font-bold">
                                  (Divergência: R$ {doc.divergencia_soma.toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-muted text-muted-foreground font-semibold">
                                <tr>
                                  <th className="p-2 text-left">Produto / Serviço</th>
                                  <th className="p-2 text-right">Qtd</th>
                                  <th className="p-2 text-center w-14">Un</th>
                                  <th className="p-2 text-right">Valor Unit. (R$)</th>
                                  <th className="p-2 text-right">Valor Total (R$)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {doc.itens.map((it, itIdx) => (
                                  <tr key={itIdx} className="hover:bg-muted/20">
                                    <td className="p-2 font-medium">{it.produto}</td>
                                    <td className="p-2 text-right font-mono">{it.quantidade}</td>
                                    <td className="p-2 text-center font-mono">{it.unidade}</td>
                                    <td className="p-2 text-right font-mono">
                                      {it.valor_unitario.toFixed(2)}
                                    </td>
                                    <td className="p-2 text-right font-mono font-semibold">
                                      {it.valor_total.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Detalhes de Gado quando destino for compra ou venda de bovinos */}
                      {(doc.destino_sistema === 'rebanho_compra' ||
                        doc.destino_sistema === 'rebanho_venda') && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs">
                          <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                            <span className="flex items-center gap-1.5">
                              <Scale className="h-4 w-4" /> Parâmetros Zootécnicos do Rebanho (@
                              viva = 30 kg):
                            </span>
                            <span>
                              {doc.gado_peso_arrobas
                                ? `${doc.gado_peso_arrobas.toFixed(1)} @ vivo total`
                                : '—'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <span className="text-[11px] text-muted-foreground block">
                                Cabeças:
                              </span>
                              <Input
                                type="number"
                                value={doc.gado_cabecas || 1}
                                onChange={(e) => {
                                  const c = parseInt(e.target.value) || 1
                                  setDocsFiscaisConferencia((prev) =>
                                    prev.map((item) =>
                                      item.id_temp === doc.id_temp
                                        ? { ...item, gado_cabecas: c }
                                        : item,
                                    ),
                                  )
                                }}
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block">
                                Peso Total (kg):
                              </span>
                              <Input
                                type="number"
                                value={doc.gado_peso_kg || ''}
                                onChange={(e) => {
                                  const p = parseFloat(e.target.value) || 0
                                  const arrobas = p / 30
                                  const prAt = arrobas > 0 ? doc.valor_total / arrobas : undefined
                                  setDocsFiscaisConferencia((prev) =>
                                    prev.map((item) =>
                                      item.id_temp === doc.id_temp
                                        ? {
                                            ...item,
                                            gado_peso_kg: p,
                                            gado_peso_arrobas: Number(arrobas.toFixed(2)),
                                            gado_preco_rs_at: prAt
                                              ? Number(prAt.toFixed(2))
                                              : undefined,
                                          }
                                        : item,
                                    ),
                                  )
                                }}
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block">
                                Preço por @ (R$):
                              </span>
                              <div className="font-mono font-semibold pt-1">
                                {doc.gado_preco_rs_at
                                  ? `R$ ${doc.gado_preco_rs_at.toFixed(2)}`
                                  : '—'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[11px] text-muted-foreground block">
                                Ágio vs B3:
                              </span>
                              <div className="pt-1">
                                {doc.gado_agio_pct !== null && doc.gado_agio_pct !== undefined ? (
                                  <Badge
                                    className={
                                      doc.gado_agio_pct >= 0 ? 'bg-emerald-600' : 'bg-amber-600'
                                    }
                                  >
                                    {doc.gado_agio_pct > 0 ? '+' : ''}
                                    {doc.gado_agio_pct}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic">s/ cotação</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Botões de Ação na Conferência */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setEtapa(1)}>
              Voltar para Upload
            </Button>
            <Button
              onClick={() => setConfirmModalOpen(true)}
              disabled={docsFiscaisConferencia.filter((d) => d.aprovado_para_aplicar).length === 0}
              className="gap-2 font-semibold bg-emerald-700 hover:bg-emerald-800"
            >
              <FileCheck className="h-4 w-4" />
              Confirmar e Aplicar Documentos Aprovados (
              {docsFiscaisConferencia.filter((d) => d.aprovado_para_aplicar).length})
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: CONFERÊNCIA OBRIGATÓRIA (PLANILHAS E DEMAIS DOCUMENTOS) */}
      {/* ========================================================================= */}
      {etapa === 3 && !isDocumentoFiscal && (
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
                <span className="text-xs text-muted-foreground block">
                  {isEstoqueDoc ? 'Produtos Identificados' : 'Total Lido'}
                </span>
                <span className="text-2xl font-bold">{registros.length}</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  {isEstoqueDoc ? 'itens na planilha' : 'linhas identificadas'}
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                  {isEstoqueDoc ? 'Novos Produtos (A Criar)' : 'A Criar (Novos)'}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {totalCriar}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  sem duplicidade por nome
                </span>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <span className="text-xs text-blue-700 dark:text-blue-300 block">
                  {isEstoqueDoc
                    ? 'Produtos Existentes (A Atualizar)'
                    : 'A Atualizar (Correspondência)'}
                </span>
                <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {totalAtualizar}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                  {isEstoqueDoc ? 'mesmo nome normalizado' : 'lotes/pastos existentes'}
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
                  {totalAlertas > 0 ? 'preço/saldo a conferir' : 'validados com sucesso'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* PAINEL ESPECIAL DE VENDA DE GADO (Robô Chicão) */}
          {isVendaGado && conferenciaVenda && (
            <div className="space-y-4">
              {conferenciaVenda.avisoCotacao && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Cotação B3 do Boi Gordo — Nenhum preço é inventado
                  </div>
                  <p className="leading-relaxed">{conferenciaVenda.avisoCotacao}</p>
                  <div className="flex flex-wrap items-end gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Informar preço de referência da @ manualmente (R$):
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cotacaoManualVenda}
                        onChange={(e) => setCotacaoManualVenda(e.target.value)}
                        placeholder="ex: 274.50"
                        className="h-8 w-44 bg-background"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/50 text-amber-900 dark:text-amber-200"
                      disabled={!cotacaoManualVenda || compilando}
                      onClick={() =>
                        compilarConferenciaVenda(rawRows, mappings as ColunaCompraMappingTipo[], {
                          preco: Number(cotacaoManualVenda),
                        })
                      }
                    >
                      {compilando ? 'Recalculando...' : 'Recalcular Ágio com Cotação Manual'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground block">
                      Total de Linhas Lidas
                    </span>
                    <span className="text-2xl font-bold">{conferenciaVenda.resumo.totalLidos}</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {conferenciaVenda.resumo.aAtualizar} saídas ·{' '}
                      {conferenciaVenda.resumo.bloqueadas} bloqueadas ·{' '}
                      {conferenciaVenda.resumo.aIgnorar} a ignorar
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20">
                  <CardContent className="p-4">
                    <span className="text-xs text-rose-700 dark:text-rose-300 block">
                      Cabeças Vendidas
                    </span>
                    <span className="text-2xl font-bold text-rose-800 dark:text-rose-200">
                      {conferenciaVenda.resumo.cabecasTotais}
                    </span>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 block mt-0.5">
                      {conferenciaVenda.resumo.arrobasTotais.toLocaleString('pt-BR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      @ vivo (
                      {conferenciaVenda.resumo.pesoTotalKg.toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      kg ÷ 30)
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <span className="text-xs text-blue-700 dark:text-blue-300 block">
                      Receita Total
                    </span>
                    <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      R${' '}
                      {conferenciaVenda.resumo.receitaTotalRs.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                      preço médio de venda: R$ {conferenciaVenda.resumo.precoMedioRsAt.toFixed(2)}/@
                    </span>
                  </CardContent>
                </Card>
                <Card
                  className={
                    conferenciaVenda.resumo.margemTotalRs === null
                      ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                      : conferenciaVenda.resumo.margemTotalRs >= 0
                        ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-red-500/40 bg-red-50/40 dark:bg-red-950/20'
                  }
                >
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground block">
                      Margem Real (Venda − Custo de Origem)
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        conferenciaVenda.resumo.margemTotalRs === null
                          ? 'text-amber-700'
                          : conferenciaVenda.resumo.margemTotalRs >= 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                      }`}
                    >
                      {conferenciaVenda.resumo.margemTotalRs === null
                        ? 's/ custo de origem'
                        : `R$ ${conferenciaVenda.resumo.margemTotalRs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {conferenciaVenda.resumo.margemPct === null
                        ? 'margem % indisponível (sem custo de compra registrado)'
                        : `${conferenciaVenda.resumo.margemPct > 0 ? '+' : ''}${conferenciaVenda.resumo.margemPct.toFixed(1)}% sobre o custo de origem`}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {conferenciaVenda.resumo.alertas.length > 0 && (
                <Card className="border-amber-500/30">
                  <CardContent className="p-3 space-y-1.5 text-xs">
                    {conferenciaVenda.resumo.alertas.map((a, i) => (
                      <p
                        key={i}
                        className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> {a}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-rose-700" />
                    Conferência da Venda de Gado — linha a linha (obrigatória)
                  </CardTitle>
                  <CardDescription>
                    Cada linha vira uma SAÍDA no rebanho + receita "Venda de Gado" no centro de
                    custo da frente. Lotes são DECREMENTADOS e nunca ficam negativos. A margem real
                    compara o preço de @ da venda contra o preço de @ PAGO na compra do lote (ou o
                    custo médio de reposição, sinalizado).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filtroVenda === 'todos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroVenda('todos')}
                      className="text-xs h-7"
                    >
                      Todos ({conferenciaVenda.linhas.length})
                    </Button>
                    <Button
                      variant={filtroVenda === 'bloqueadas' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroVenda('bloqueadas')}
                      className="text-xs h-7"
                    >
                      Bloqueadas ({conferenciaVenda.resumo.bloqueadas})
                    </Button>
                    <Button
                      variant={filtroVenda === 'alertas' ? 'outline' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroVenda('alertas')}
                      className="text-xs h-7"
                    >
                      Com Alertas (
                      {conferenciaVenda.linhas.filter((l) => l.alertas.length > 0).length})
                    </Button>
                    <Button
                      variant={filtroVenda === 'ok' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroVenda('ok')}
                      className="text-xs h-7"
                    >
                      Válidas ({conferenciaVenda.resumo.aAtualizar})
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-x-auto max-h-[520px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5 text-center w-14">Linha</th>
                          <th className="p-2.5 text-center w-28">Ação</th>
                          <th className="p-2.5 text-left">Lote de Origem / Categoria</th>
                          <th className="p-2.5 text-right">Cabeças</th>
                          <th className="p-2.5 text-right">Peso</th>
                          <th className="p-2.5 text-right">Preços</th>
                          <th className="p-2.5 text-right">Receita R$</th>
                          <th className="p-2.5 text-center w-24">Ágio</th>
                          <th className="p-2.5 text-right">Custo R$/@ (Origem)</th>
                          <th className="p-2.5 text-right">Margem</th>
                          <th className="p-2.5 text-left">Comprador / Doc / Data</th>
                          <th className="p-2.5 text-left">Frente (Centro de Custo)</th>
                          <th className="p-2.5 text-left">Status / Motivo</th>
                          <th className="p-2.5 text-center w-20">Aplicar?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {conferenciaVenda.linhas
                          .filter((l) => {
                            if (filtroVenda === 'bloqueadas') return l.bloqueada
                            if (filtroVenda === 'alertas') return l.alertas.length > 0
                            if (filtroVenda === 'ok')
                              return l.acao === 'atualizar' && !l.ignoradoPeloUsuario
                            return true
                          })
                          .map((l) => {
                            const isIgnorado = l.acao === 'ignorar' || l.ignoradoPeloUsuario
                            return (
                              <tr
                                key={l.idTemp}
                                className={`hover:bg-muted/30 transition-colors ${
                                  isIgnorado ? 'opacity-50 bg-muted/10' : ''
                                }`}
                              >
                                <td className="p-2.5 text-center font-mono font-medium">
                                  #{l.linhaOrigem}
                                </td>
                                <td className="p-2.5 text-center">
                                  {l.bloqueada && !isIgnorado ? (
                                    <Badge className="bg-red-600 text-[10px]">BLOQUEADA</Badge>
                                  ) : l.acao === 'atualizar' && !isIgnorado ? (
                                    <Badge className="bg-rose-600 text-[10px]">SAÍDA</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">
                                      IGNORAR
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-foreground">
                                    {l.dados.lote_nome || '(sem lote)'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {l.dados.categoria || 'categoria não informada'} ·{' '}
                                    {l.dados.sexo === 'femea' ? 'Fêmea' : 'Macho'}
                                    {l.loteCabecasExistentes !== undefined
                                      ? ` · ${l.loteCabecasExistentes} cab. disponíveis`
                                      : ''}
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold">
                                  {l.dados.qtd_cabecas}
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {l.dados.peso_medio_kg} kg
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.arrobas_totais} @ total
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {l.dados.preco_rs_at
                                    ? `R$ ${l.dados.preco_rs_at.toFixed(2)}/@`
                                    : '—'}
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.preco_rs_cab
                                      ? `R$ ${l.dados.preco_rs_cab.toFixed(2)}/cab`
                                      : '—'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-rose-800 dark:text-rose-300">
                                  R${' '}
                                  {l.dados.valor_total.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-2.5 text-center">
                                  {l.agioPct === null ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      s/ cotação
                                    </span>
                                  ) : (
                                    <Badge
                                      className={`text-[10px] ${
                                        l.agioPct >= 0 ? 'bg-emerald-600' : 'bg-amber-500'
                                      }`}
                                    >
                                      {l.agioPct > 0 ? '+' : ''}
                                      {l.agioPct.toFixed(1)}%
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {l.custoRsAt !== null ? `R$ ${l.custoRsAt.toFixed(2)}` : '—'}
                                  <span className="text-[10px] block text-muted-foreground">
                                    {l.origemCusto === 'compra_registrada'
                                      ? 'compra Chicão'
                                      : l.origemCusto === 'custo_medio'
                                        ? 'custo médio'
                                        : 's/ custo'}
                                  </span>
                                </td>
                                <td
                                  className={`p-2.5 text-right font-mono font-semibold ${
                                    l.margemRs === null
                                      ? 'text-muted-foreground'
                                      : l.margemRs >= 0
                                        ? 'text-emerald-700'
                                        : 'text-red-700'
                                  }`}
                                >
                                  {l.margemRs === null
                                    ? '—'
                                    : `R$ ${l.margemRs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  <span className="text-[10px] block">
                                    {l.margemPct === null
                                      ? ''
                                      : `${l.margemPct > 0 ? '+' : ''}${l.margemPct.toFixed(1)}%`}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[11px] font-medium">
                                    {l.dados.comprador || '—'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.documento || 's/ doc'} · {l.dados.data}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <Select
                                    value={frenteVendaEscolhas[l.idTemp] || 'engorda'}
                                    onValueChange={(v: FrenteVendaTipo) =>
                                      setFrenteVendaEscolhas((prev) => ({ ...prev, [l.idTemp]: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-[11px] w-full max-w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cria">Cria</SelectItem>
                                      <SelectItem value="recria">Recria</SelectItem>
                                      <SelectItem value="engorda">Engorda</SelectItem>
                                      <SelectItem value="confinamento">Confinamento</SelectItem>
                                      <SelectItem value="arrendamento">Arrendamento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2.5 max-w-[220px]">
                                  {l.alertas.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {l.alertas.map((a, i) => (
                                        <span
                                          key={i}
                                          className="text-[10px] block font-medium text-amber-700 dark:text-amber-300"
                                        >
                                          ⚠ {a}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <span className="text-[10px] text-muted-foreground italic block mt-0.5">
                                    {l.motivoAcao}
                                  </span>
                                  {l.conversoes.map((c, i) => (
                                    <span key={i} className="text-[9px] block text-primary mt-0.5">
                                      ⇄ {c}
                                    </span>
                                  ))}
                                </td>
                                <td className="p-2.5 text-center">
                                  <Button
                                    type="button"
                                    variant={isIgnorado ? 'outline' : 'secondary'}
                                    size="sm"
                                    onClick={() =>
                                      setConferenciaVenda((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              linhas: prev.linhas.map((x) =>
                                                x.idTemp === l.idTemp
                                                  ? {
                                                      ...x,
                                                      ignoradoPeloUsuario: !x.ignoradoPeloUsuario,
                                                    }
                                                  : x,
                                              ),
                                              resumo: {
                                                ...prev.resumo,
                                                aIgnorar:
                                                  prev.resumo.aIgnorar + (isIgnorado ? -1 : 1),
                                              },
                                            }
                                          : prev,
                                      )
                                    }
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* PAINEL ESPECIAL DE COMPRA DE GADO */}
          {isCompraGado && conferenciaCompra && (
            <div className="space-y-4">
              {/* Aviso da cotação (sempre visível quando há problema) */}
              {conferenciaCompra.avisoCotacao && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Cotação B3 do Boi Gordo — Nenhum preço é inventado
                  </div>
                  <p className="leading-relaxed">{conferenciaCompra.avisoCotacao}</p>
                  <div className="flex flex-wrap items-end gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        Informar preço de referência da @ manualmente (R$):
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cotacaoManualAtiva}
                        onChange={(e) => setCotacaoManualAtiva(e.target.value)}
                        placeholder="ex: 274.50"
                        className="h-8 w-44 bg-background"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/50 text-amber-900 dark:text-amber-200"
                      disabled={!cotacaoManualAtiva || compilando}
                      onClick={() =>
                        compilarConferenciaCompra(rawRows, mappings as ColunaCompraMappingTipo[], {
                          preco: Number(cotacaoManualAtiva),
                        })
                      }
                    >
                      {compilando ? 'Recalculando...' : 'Recalcular Ágio com Cotação Manual'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Painel de métricas da compra */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground block">
                      Total de Linhas Lidas
                    </span>
                    <span className="text-2xl font-bold">
                      {conferenciaCompra.resumo.totalLidos}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {conferenciaCompra.resumo.aCriar} a criar ·{' '}
                      {conferenciaCompra.resumo.aAtualizar} a atualizar ·{' '}
                      {conferenciaCompra.resumo.aIgnorar} a ignorar
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <CardContent className="p-4">
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 block">
                      Cabeças Compradas
                    </span>
                    <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                      {conferenciaCompra.resumo.cabecasTotais}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      {conferenciaCompra.resumo.arrobasTotais.toLocaleString('pt-BR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      @ vivo (
                      {conferenciaCompra.resumo.pesoTotalKg.toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      kg ÷ 30)
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <span className="text-xs text-blue-700 dark:text-blue-300 block">
                      Investimento Total
                    </span>
                    <span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      R${' '}
                      {conferenciaCompra.resumo.investimentoTotalRs.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                      preço médio pago: R$ {conferenciaCompra.resumo.precoMedioRsAt.toFixed(2)}/@
                    </span>
                  </CardContent>
                </Card>
                <Card
                  className={
                    conferenciaCompra.resumo.agioMedioPct === null
                      ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                      : conferenciaCompra.resumo.agioMedioPct <= 0
                        ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : conferenciaCompra.resumo.agioMedioPct <= 10
                          ? 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-red-500/40 bg-red-50/40 dark:bg-red-950/20'
                  }
                >
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground block">
                      Ágio Médio na Compra
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        conferenciaCompra.resumo.agioMedioPct === null
                          ? 'text-amber-700'
                          : conferenciaCompra.resumo.agioMedioPct <= 0
                            ? 'text-emerald-700'
                            : conferenciaCompra.resumo.agioMedioPct <= 10
                              ? 'text-amber-700'
                              : 'text-red-700'
                      }`}
                    >
                      {conferenciaCompra.resumo.agioMedioPct === null
                        ? 's/ cotação'
                        : `${conferenciaCompra.resumo.agioMedioPct > 0 ? '+' : ''}${conferenciaCompra.resumo.agioMedioPct.toFixed(1)}%`}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      (preço @ compra ÷ cotação @ venda − 1) × 100
                    </span>
                    {conferenciaCompra.cotacao && (
                      <span className="text-[10px] text-muted-foreground block">
                        ref.: R$ {conferenciaCompra.cotacao.preco.toFixed(2)}/@ (
                        {conferenciaCompra.cotacao.origem === 'b3_vigente'
                          ? 'B3 vigente'
                          : 'manual'}
                        {conferenciaCompra.cotacao.desatualizada
                          ? `, ${conferenciaCompra.cotacao.diasAtraso}d`
                          : ''}
                        )
                      </span>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Conversões de unidade + alertas globais */}
              {(conferenciaCompra.resumo.conversoes.length > 0 ||
                conferenciaCompra.resumo.alertas.length > 0 ||
                conferenciaCompra.linhas.some((l) => l.conversoes.length > 0)) && (
                <Card className="border-primary/20">
                  <CardContent className="p-4 space-y-2 text-xs">
                    {conferenciaCompra.linhas
                      .flatMap((l) => l.conversoes.map((c) => ({ linha: l.linhaOrigem, texto: c })))
                      .concat(
                        conferenciaCompra.resumo.conversoes.map((c) => ({ linha: 0, texto: c })),
                      )
                      .slice(0, 8)
                      .map((c, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] bg-primary/5 text-primary border-primary/20 mr-1"
                        >
                          {c.linha > 0 ? `L${c.linha}: ` : ''}
                          {c.texto}
                        </Badge>
                      ))}
                    {conferenciaCompra.resumo.alertas.map((a, i) => (
                      <p
                        key={`alerta-${i}`}
                        className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> {a}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tabela de conferência das linhas de compra */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-emerald-700" />
                    Conferência da Compra de Gado — linha a linha (obrigatória)
                  </CardTitle>
                  <CardDescription>
                    Cada linha vira uma ENTRADA no rebanho + lançamento financeiro no centro de
                    custo da frente. Nada é aplicado sem a sua validação. Lotes existentes são
                    INCREMENTADOS (nunca sobrescritos).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={filtroCompra === 'todos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroCompra('todos')}
                      className="text-xs h-7"
                    >
                      Todos ({conferenciaCompra.linhas.length})
                    </Button>
                    <Button
                      variant={filtroCompra === 'criar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroCompra('criar')}
                      className="text-xs h-7"
                    >
                      A Criar ({conferenciaCompra.resumo.aCriar})
                    </Button>
                    <Button
                      variant={filtroCompra === 'atualizar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroCompra('atualizar')}
                      className="text-xs h-7"
                    >
                      A Atualizar ({conferenciaCompra.resumo.aAtualizar})
                    </Button>
                    <Button
                      variant={filtroCompra === 'alertas' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setFiltroCompra('alertas')}
                      className="text-xs h-7 gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" /> Com Alertas
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-x-auto max-h-[520px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5 text-center w-14">Linha</th>
                          <th className="p-2.5 text-center w-28">Ação</th>
                          <th className="p-2.5 text-left">Lote / Categoria / Destino</th>
                          <th className="p-2.5 text-right">Cabeças</th>
                          <th className="p-2.5 text-right">Peso</th>
                          <th className="p-2.5 text-right">Preços</th>
                          <th className="p-2.5 text-right">Total R$</th>
                          <th className="p-2.5 text-center w-24">Ágio</th>
                          <th className="p-2.5 text-left">Fornecedor / Data</th>
                          <th className="p-2.5 text-left">Frente (Centro de Custo)</th>
                          <th className="p-2.5 text-left">Status / Motivo</th>
                          <th className="p-2.5 text-center w-20">Aplicar?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {conferenciaCompra.linhas
                          .filter((l) => {
                            if (filtroCompra === 'criar')
                              return l.acao === 'criar' && !l.ignoradoPeloUsuario
                            if (filtroCompra === 'atualizar')
                              return l.acao === 'atualizar' && !l.ignoradoPeloUsuario
                            if (filtroCompra === 'alertas') return l.alertas.length > 0
                            return true
                          })
                          .map((l) => {
                            const isIgnorado = l.acao === 'ignorar' || l.ignoradoPeloUsuario
                            const agioClass =
                              l.agioPct !== null
                                ? classificarAgioCompra(l.agioPct, conferenciaCompra.benchmark)
                                : null
                            return (
                              <tr
                                key={l.idTemp}
                                className={`hover:bg-muted/30 transition-colors ${
                                  isIgnorado ? 'opacity-50 bg-muted/10' : ''
                                }`}
                              >
                                <td className="p-2.5 text-center font-mono font-medium">
                                  #{l.linhaOrigem}
                                </td>
                                <td className="p-2.5 text-center">
                                  {l.acao === 'criar' && !isIgnorado ? (
                                    <Badge className="bg-emerald-600 text-[10px]">NOVO LOTE</Badge>
                                  ) : l.acao === 'atualizar' && !isIgnorado ? (
                                    <Badge className="bg-blue-600 text-[10px]">INCREMENTO</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">
                                      IGNORAR
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-foreground">
                                    {l.dados.lote_nome || '(nome gerado)'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {l.dados.categoria || 'categoria não informada'} ·{' '}
                                    {l.dados.sexo === 'femea' ? 'Fêmea' : 'Macho'}
                                    {l.dados.pasto_destino ? ` · ${l.dados.pasto_destino}` : ''}
                                  </div>
                                  {l.pesoMedioCombinado !== undefined && (
                                    <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                                      Novo peso médio combinado: {l.pesoMedioCombinado} kg (
                                      {l.loteExistenteCabecas || 0} cab. @{' '}
                                      {l.loteExistentePesoMedio || 0} kg + {l.dados.qtd_cabecas}{' '}
                                      cab. @ {l.dados.peso_medio_kg} kg)
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold">
                                  {l.dados.qtd_cabecas}
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {l.dados.peso_medio_kg} kg
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.arrobas_totais} @ total
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  {l.dados.preco_rs_at
                                    ? `R$ ${l.dados.preco_rs_at.toFixed(2)}/@`
                                    : '—'}
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.preco_rs_cab
                                      ? `R$ ${l.dados.preco_rs_cab.toFixed(2)}/cab`
                                      : '—'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-blue-800 dark:text-blue-300">
                                  R${' '}
                                  {l.dados.valor_total.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="p-2.5 text-center">
                                  {l.agioPct === null ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      s/ cotação
                                    </span>
                                  ) : (
                                    <Badge
                                      className={`text-[10px] ${
                                        agioClass?.cor === 'verde'
                                          ? 'bg-emerald-600'
                                          : agioClass?.cor === 'amarelo'
                                            ? 'bg-amber-500'
                                            : 'bg-red-600'
                                      }`}
                                    >
                                      {l.agioPct > 0 ? '+' : ''}
                                      {l.agioPct.toFixed(1)}%
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[11px] font-medium">
                                    {l.dados.fornecedor || '—'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {l.dados.data}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <Select
                                    value={frenteEscolhas[l.idTemp] || 'recria'}
                                    onValueChange={(v: FrenteCompra) =>
                                      setFrenteEscolhas((prev) => ({ ...prev, [l.idTemp]: v }))
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-[11px] w-full max-w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cria">Cria</SelectItem>
                                      <SelectItem value="recria">Recria</SelectItem>
                                      <SelectItem value="engorda">Engorda</SelectItem>
                                      <SelectItem value="confinamento">Confinamento</SelectItem>
                                      <SelectItem value="arrendamento">Arrendamento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2.5 max-w-[220px]">
                                  {l.alertas.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {l.alertas.map((a, i) => (
                                        <span
                                          key={i}
                                          className="text-[10px] block font-medium text-amber-700 dark:text-amber-300"
                                        >
                                          ⚠ {a}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <span className="text-[10px] text-muted-foreground italic block mt-0.5">
                                    {l.motivoAcao}
                                  </span>
                                  {l.conversoes.map((c, i) => (
                                    <span key={i} className="text-[9px] block text-primary mt-0.5">
                                      ⇄ {c}
                                    </span>
                                  ))}
                                </td>
                                <td className="p-2.5 text-center">
                                  <Button
                                    type="button"
                                    variant={isIgnorado ? 'outline' : 'secondary'}
                                    size="sm"
                                    onClick={() =>
                                      setConferenciaCompra((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              linhas: prev.linhas.map((x) =>
                                                x.idTemp === l.idTemp
                                                  ? {
                                                      ...x,
                                                      ignoradoPeloUsuario: !x.ignoradoPeloUsuario,
                                                    }
                                                  : x,
                                              ),
                                              resumo: {
                                                ...prev.resumo,
                                                aIgnorar:
                                                  prev.resumo.aIgnorar + (isIgnorado ? -1 : 1),
                                              },
                                            }
                                          : prev,
                                      )
                                    }
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* PAINEL ESPECIAL DE ESTOQUE DE INSUMOS & FÁBRICA DE SUPLEMENTO */}
          {isEstoqueDoc && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-700 text-white text-xs">
                        Fábrica de Suplemento
                      </Badge>
                      <h3 className="font-semibold text-sm text-foreground">
                        Custo do Período Calculado & Impacto no Fechamento Financeiro
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fórmula automática:{' '}
                      <em>Custo do período = Saldo Inicial + Entradas − Saldo Final</em>. Alimenta o
                      centro de custo "fábrica de suplemento" no fechamento e na DRE.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-background/80 border rounded-lg px-3 py-1.5 text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                        Consumo Total Equivalente
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {consumoTotalKgEstoque.toLocaleString('pt-BR', {
                          maximumFractionDigits: 1,
                        })}{' '}
                        kg
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          (~{consumoTotalSacosEstoque.toFixed(1)} sacos)
                        </span>
                      </span>
                    </div>

                    <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg px-4 py-1.5 text-right">
                      <span className="text-[10px] text-amber-900 dark:text-amber-300 block uppercase font-bold tracking-wider">
                        Custo Total do Período
                      </span>
                      <span className="text-lg font-extrabold text-amber-800 dark:text-amber-200">
                        R${' '}
                        {custoTotalPeriodoEstoque.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                    unidades e correspondências calculadas pelo Chicão.
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
                    {isEstoqueDoc ? (
                      <tr>
                        <th className="p-2.5 text-center w-12">Linha</th>
                        <th className="p-2.5 text-center w-24">Ação</th>
                        <th className="p-2.5 text-left">Produto / Insumo</th>
                        <th className="p-2.5 text-center w-16">UM</th>
                        <th className="p-2.5 text-right">Inicial</th>
                        <th className="p-2.5 text-right">Entradas</th>
                        <th className="p-2.5 text-right">Saídas</th>
                        <th className="p-2.5 text-right">Final</th>
                        <th className="p-2.5 text-right">Preço Unit.</th>
                        <th className="p-2.5 text-right">Custo Período</th>
                        <th className="p-2.5 text-left">Alertas / Status</th>
                        <th className="p-2.5 text-center w-20">Aplicar?</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2.5 text-center w-16">Linha</th>
                        <th className="p-2.5 text-center w-28">Ação Prevista</th>
                        <th className="p-2.5 text-left">Dados Mapeados & Normalizados</th>
                        <th className="p-2.5 text-left">Conversões Explícitas</th>
                        <th className="p-2.5 text-left">Alertas / Validações</th>
                        <th className="p-2.5 text-center w-24">Aplicar?</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y">
                    {registrosFiltrados.map((reg) => {
                      const isIgnorado = reg.ignoradoPeloUsuario || reg.acaoSugerida === 'ignorar'
                      const dm = reg.dadosMapeados
                      const hasBloqueio = reg.alertas.some(
                        (a) => a.includes('BLOQUEIO') || a.includes('negativo'),
                      )

                      if (isEstoqueDoc) {
                        const prod = dm['insumo_produto'] || 'Sem Nome'
                        const und = dm['insumo_unidade'] || 'kg'
                        const ini =
                          dm['insumo_estoque_inicial'] !== undefined
                            ? Number(dm['insumo_estoque_inicial'])
                            : '-'
                        const ent =
                          dm['insumo_entradas'] !== undefined ? Number(dm['insumo_entradas']) : '-'
                        const sai =
                          dm['insumo_saidas'] !== undefined ? Number(dm['insumo_saidas']) : '-'
                        const fim =
                          dm['insumo_estoque_final'] !== undefined
                            ? Number(dm['insumo_estoque_final'])
                            : '-'
                        const preco =
                          dm['insumo_preco_unitario'] !== undefined
                            ? Number(dm['insumo_preco_unitario'])
                            : 0
                        const custo =
                          dm['insumo_custo_periodo_rs'] !== undefined
                            ? Number(dm['insumo_custo_periodo_rs'])
                            : 0

                        return (
                          <tr
                            key={reg.idTemp}
                            className={`hover:bg-muted/30 transition-colors ${
                              isIgnorado
                                ? 'opacity-50 bg-muted/10'
                                : hasBloqueio
                                  ? 'bg-red-50/50 dark:bg-red-950/20'
                                  : ''
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono font-medium">
                              #{reg.linhaOrigem}
                            </td>
                            <td className="p-2.5 text-center">
                              {reg.acaoSugerida === 'criar' ? (
                                <Badge className="bg-emerald-600 text-[10px]">NOVO</Badge>
                              ) : reg.acaoSugerida === 'atualizar' ? (
                                <Badge className="bg-blue-600 text-[10px]">ATUALIZAR</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  IGNORAR
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-foreground">
                              <div>{String(prod)}</div>
                              {reg.motivoAcao && (
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  {reg.motivoAcao}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {String(und)}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              {typeof ini === 'number' ? ini.toLocaleString('pt-BR') : ini}
                            </td>
                            <td className="p-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                              {typeof ent === 'number' ? `+${ent.toLocaleString('pt-BR')}` : ent}
                            </td>
                            <td className="p-2.5 text-right font-mono text-amber-700 dark:text-amber-400">
                              {typeof sai === 'number' ? `-${sai.toLocaleString('pt-BR')}` : sai}
                            </td>
                            <td
                              className={`p-2.5 text-right font-mono font-bold ${typeof fim === 'number' && fim < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
                            >
                              {typeof fim === 'number' ? fim.toLocaleString('pt-BR') : fim}
                            </td>
                            <td className="p-2.5 text-right font-mono">R$ {preco.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-800 dark:text-amber-300">
                              R$ {custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5">
                              {reg.alertas.length > 0 ? (
                                <div className="space-y-0.5">
                                  {reg.alertas.map((a, i) => (
                                    <span
                                      key={i}
                                      className={`text-[10px] block font-medium flex items-center gap-1 ${
                                        a.includes('BLOQUEIO') || a.includes('negativo')
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      <AlertTriangle className="h-3 w-3 shrink-0" /> {a}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-600 text-[10px] flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Válido
                                </span>
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
                      }

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
                    Serão aplicados{' '}
                    <strong>
                      {isVendaGado && conferenciaVenda
                        ? conferenciaVenda.resumo.aAtualizar
                        : isCompraGado && conferenciaCompra
                          ? conferenciaCompra.resumo.aCriar + conferenciaCompra.resumo.aAtualizar
                          : totalCriar + totalAtualizar}
                    </strong>{' '}
                    registros validados.
                  </span>
                  <Button
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={
                      isVendaGado
                        ? !conferenciaVenda || conferenciaVenda.resumo.aAtualizar === 0
                        : isCompraGado
                          ? !conferenciaCompra ||
                            conferenciaCompra.resumo.aCriar +
                              conferenciaCompra.resumo.aAtualizar ===
                              0
                          : totalCriar + totalAtualizar === 0
                    }
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
                  {isVendaGado
                    ? 'Esta ação aplicará a venda no Rebanho (lotes decrementados), Movimentações, Financeiro (receita por centro de custo) e Fechamento — de forma definitiva.'
                    : isCompraGado
                      ? 'Esta ação aplicará a compra no Rebanho (lotes), Movimentações, Financeiro (centro de custo) e Fechamento — de forma definitiva.'
                      : 'Esta ação aplicará as alterações de forma definitiva nas áreas selecionadas (Lotes, Pesagens, Estoque e Fechamento).'}
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
                  {isVendaGado && conferenciaVenda ? (
                    <>
                      <p>
                        <strong>Linhas de Venda:</strong> {conferenciaVenda.resumo.totalLidos} lidas
                      </p>
                      <p>
                        <strong>Saídas a aplicar:</strong> {conferenciaVenda.resumo.aAtualizar} ·{' '}
                        <strong>Bloqueadas:</strong> {conferenciaVenda.resumo.bloqueadas} ·{' '}
                        <strong>Ignorados:</strong> {conferenciaVenda.resumo.aIgnorar}
                      </p>
                      <p>
                        <strong>Total:</strong> {conferenciaVenda.resumo.cabecasTotais} cabeças ·{' '}
                        {conferenciaVenda.resumo.arrobasTotais.toFixed(2)} @ · R${' '}
                        {conferenciaVenda.resumo.receitaTotalRs.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p>
                        <strong>Preço médio de venda:</strong> R${' '}
                        {conferenciaVenda.resumo.precoMedioRsAt.toFixed(2)}/@ ·{' '}
                        <strong>Ágio médio:</strong>{' '}
                        {conferenciaVenda.resumo.agioMedioPct === null
                          ? 's/ cotação'
                          : `${conferenciaVenda.resumo.agioMedioPct > 0 ? '+' : ''}${conferenciaVenda.resumo.agioMedioPct.toFixed(1)}%`}
                      </p>
                      <p>
                        <strong>Margem real (venda − custo de origem):</strong>{' '}
                        {conferenciaVenda.resumo.margemTotalRs === null
                          ? 's/ custo de origem registrado'
                          : `R$ ${conferenciaVenda.resumo.margemTotalRs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        {conferenciaVenda.resumo.margemPct !== null
                          ? ` (${conferenciaVenda.resumo.margemPct > 0 ? '+' : ''}${conferenciaVenda.resumo.margemPct.toFixed(1)}%)`
                          : ''}
                      </p>
                      {conferenciaVenda.cotacao && (
                        <p className="pt-1 border-t">
                          <strong>Cotação usada no ágio:</strong> R${' '}
                          {conferenciaVenda.cotacao.preco.toFixed(2)}/@ (
                          {conferenciaVenda.cotacao.origem === 'b3_vigente'
                            ? 'B3 vigente'
                            : 'informada manualmente'}
                          {conferenciaVenda.cotacao.desatualizada
                            ? ` — DESATUALIZADA (${conferenciaVenda.cotacao.diasAtraso} dias)`
                            : ''}
                          )
                        </p>
                      )}
                    </>
                  ) : isCompraGado && conferenciaCompra ? (
                    <>
                      <p>
                        <strong>Linhas de Compra:</strong> {conferenciaCompra.resumo.totalLidos}{' '}
                        lidas
                      </p>
                      <p>
                        <strong>Lotes a Criar:</strong> {conferenciaCompra.resumo.aCriar}
                      </p>
                      <p>
                        <strong>Lotes a Incrementar:</strong> {conferenciaCompra.resumo.aAtualizar}
                      </p>
                      <p>
                        <strong>Ignorados:</strong> {conferenciaCompra.resumo.aIgnorar}
                      </p>
                      <p>
                        <strong>Total:</strong> {conferenciaCompra.resumo.cabecasTotais} cabeças ·{' '}
                        {conferenciaCompra.resumo.arrobasTotais.toFixed(2)} @ · R${' '}
                        {conferenciaCompra.resumo.investimentoTotalRs.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p>
                        <strong>Preço médio pago:</strong> R${' '}
                        {conferenciaCompra.resumo.precoMedioRsAt.toFixed(2)}/@ ·{' '}
                        <strong>Ágio médio:</strong>{' '}
                        {conferenciaCompra.resumo.agioMedioPct === null
                          ? 's/ cotação'
                          : `${conferenciaCompra.resumo.agioMedioPct > 0 ? '+' : ''}${conferenciaCompra.resumo.agioMedioPct.toFixed(1)}%`}
                      </p>
                      {conferenciaCompra.cotacao && (
                        <p className="pt-1 border-t">
                          <strong>Cotação usada no ágio:</strong> R${' '}
                          {conferenciaCompra.cotacao.preco.toFixed(2)}/@ (
                          {conferenciaCompra.cotacao.origem === 'b3_vigente'
                            ? 'B3 vigente'
                            : 'informada manualmente'}
                          {conferenciaCompra.cotacao.desatualizada
                            ? ` — DESATUALIZADA (${conferenciaCompra.cotacao.diasAtraso} dias)`
                            : ''}
                          )
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>Novos a Criar:</strong> {totalCriar}
                      </p>
                      <p>
                        <strong>Existentes a Atualizar:</strong> {totalAtualizar}
                      </p>
                      <p>
                        <strong>Ignorados:</strong> {totalIgnorar}
                      </p>
                    </>
                  )}
                  {isEstoqueDoc && custoTotalPeriodoEstoque > 0 && (
                    <p className="pt-1 border-t text-amber-800 dark:text-amber-300 font-semibold">
                      <strong>Custo Fábrica de Suplemento:</strong> R${' '}
                      {custoTotalPeriodoEstoque.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>

                {isVendaGado && conferenciaVenda && conferenciaVenda.resumo.bloqueadas > 0 && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-800 dark:text-red-300 font-medium">
                    ⚠️ {conferenciaVenda.resumo.bloqueadas} linha(s) bloqueada(s): a quantidade
                    vendida supera o lote de origem. Corrija a planilha ou ignore as linhas
                    bloqueadas — lotes nunca ficam negativos.
                  </div>
                )}

                {temProdutosBloqueados && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-800 dark:text-red-300 font-medium">
                    ⚠️ Atenção: Itens com estoque final negativo estão marcados como{' '}
                    <strong>BLOQUEIO</strong> e serão automaticamente ignorados para evitar
                    distorções no estoque e fechamento.
                  </div>
                )}

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
      {etapa === 5 && resultVenda && (
        <div className="space-y-6">
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                Venda de Gado Aplicada com Sucesso!
              </CardTitle>
              <CardDescription>
                O Robô Chicão atualizou Rebanho (saídas), Movimentações de Rebanho, Financeiro
                (receita por centro de custo), Vendas de Gado do Fechamento e gerou o comprovante
                oficial com protocolo de auditoria. Margem real por lote calculada contra o custo de
                @ da compra de origem.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Linhas Processadas</span>
                  <span className="text-2xl font-bold">{resultVenda.totalLidos}</span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-rose-600 block">Saídas Aplicadas</span>
                  <span className="text-2xl font-bold text-rose-700">
                    {resultVenda.atualizados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Ignorados</span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {resultVenda.ignorados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-blue-600 block">Receita Total</span>
                  <span className="text-2xl font-bold text-blue-700">
                    R${' '}
                    {conferenciaVenda?.resumo.receitaTotalRs.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    }) ?? '—'}
                  </span>
                </div>
              </div>

              {conferenciaVenda && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-500/30 rounded-lg space-y-1.5 text-xs">
                  <span className="font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Scale className="h-4 w-4" /> Estoque de Gado em R$ após a venda
                  </span>
                  <p className="text-muted-foreground">
                    Arrobas vendidas:{' '}
                    <strong>{conferenciaVenda.resumo.arrobasTotais.toFixed(2)} @</strong> × preço de
                    venda <strong>R$ {conferenciaVenda.resumo.precoMedioRsAt.toFixed(2)}/@</strong>{' '}
                    ={' '}
                    <strong className="text-rose-800 dark:text-rose-300">
                      R${' '}
                      {(
                        conferenciaVenda.resumo.arrobasTotais *
                        conferenciaVenda.resumo.precoMedioRsAt
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>{' '}
                    saíram do valuation do estoque de gado usado no fechamento. Margem real:{' '}
                    <strong
                      className={
                        conferenciaVenda.resumo.margemTotalRs === null
                          ? ''
                          : conferenciaVenda.resumo.margemTotalRs >= 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                      }
                    >
                      {conferenciaVenda.resumo.margemTotalRs === null
                        ? 's/ custo de origem'
                        : `R$ ${conferenciaVenda.resumo.margemTotalRs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${conferenciaVenda.resumo.margemPct !== null ? `${conferenciaVenda.resumo.margemPct > 0 ? '+' : ''}${conferenciaVenda.resumo.margemPct.toFixed(1)}%` : 's/ %'})`}
                    </strong>
                    .
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted/40 border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" /> Protocolo de Auditoria (Append-Only):
                  </span>
                  <code className="bg-background px-2 py-0.5 rounded border font-mono">
                    {resultVenda.protocoloAuditId || 'REGISTRADO_NA_TRILHA'}
                  </code>
                </div>
                <p className="text-muted-foreground">
                  Módulos afetados:{' '}
                  <strong>
                    {resultVenda.entidadesAfetadas.join(', ') || 'Rebanho & Financeiro'}
                  </strong>
                  .{' '}
                  {resultVenda.detalhesIgnorados.length > 0 && (
                    <>
                      Motivos das linhas ignoradas:{' '}
                      {resultVenda.detalhesIgnorados
                        .map((d) => `L${d.linha}: ${d.motivo}`)
                        .join('; ')}
                      .
                    </>
                  )}{' '}
                  Comprador, documento de origem, responsável e timestamps (dispositivo + servidor)
                  gravados na trilha e não podem ser apagados.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() =>
                    gerarRelatorioVendaGadoPDF(
                      resultVenda,
                      { nome: file?.name || 'documento', formato: 'venda de gado' },
                      conferenciaVenda?.linhas || [],
                      user.name || 'Gestor',
                      conferenciaVenda?.cotacao || null,
                    )
                  }
                  className="gap-2 bg-emerald-700 hover:bg-emerald-800 font-semibold"
                >
                  <FileDown className="h-4 w-4" /> Baixar Relatório de Venda (PDF)
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

      {etapa === 5 && resultadoCompra && (
        <div className="space-y-6">
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                Compra de Gado Aplicada com Sucesso!
              </CardTitle>
              <CardDescription>
                O Robô Chicão atualizou Rebanho, Movimentações de Rebanho, Financeiro (centro de
                custo da frente), Compras de Gado do Fechamento e gerou o comprovante oficial com
                protocolo de auditoria.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Linhas Processadas</span>
                  <span className="text-2xl font-bold">{resultadoCompra.totalLidos}</span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-emerald-600 block">Lotes Criados</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {resultadoCompra.criados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-blue-600 block">Lotes Incrementados</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {resultadoCompra.atualizados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Ignorados</span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {resultadoCompra.ignorados}
                  </span>
                </div>
              </div>

              {/* Estoque de gado em R$ (peso @ × valor @) */}
              {conferenciaCompra && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-500/30 rounded-lg space-y-1.5 text-xs">
                  <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Scale className="h-4 w-4" /> Estoque de Gado em R$ (peso em @ × valor da @)
                  </span>
                  <p className="text-muted-foreground">
                    Arrobas adquiridas nesta compra:{' '}
                    <strong>{conferenciaCompra.resumo.arrobasTotais.toFixed(2)} @</strong> × preço
                    pago <strong>R$ {conferenciaCompra.resumo.precoMedioRsAt.toFixed(2)}/@</strong>{' '}
                    ={' '}
                    <strong className="text-blue-800 dark:text-blue-300">
                      R${' '}
                      {(
                        conferenciaCompra.resumo.arrobasTotais *
                        conferenciaCompra.resumo.precoMedioRsAt
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>{' '}
                    incorporados ao valuation do estoque de gado usado no fechamento.
                  </p>
                </div>
              )}

              {/* Protocolo de Auditoria */}
              <div className="p-4 bg-muted/40 border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" /> Protocolo de Auditoria (Append-Only):
                  </span>
                  <code className="bg-background px-2 py-0.5 rounded border font-mono">
                    {resultadoCompra.protocoloAuditId || 'REGISTRADO_NA_TRILHA'}
                  </code>
                </div>
                <p className="text-muted-foreground">
                  Módulos afetados:{' '}
                  <strong>
                    {resultadoCompra.entidadesAfetadas.join(', ') || 'Rebanho & Financeiro'}
                  </strong>
                  .{' '}
                  {resultadoCompra.detalhesIgnorados.length > 0 && (
                    <>
                      Motivos das linhas ignoradas:{' '}
                      {resultadoCompra.detalhesIgnorados
                        .map((d) => `L${d.linha}: ${d.motivo}`)
                        .join('; ')}
                      .
                    </>
                  )}{' '}
                  Fornecedor, documento de origem, responsável e timestamps (dispositivo + servidor)
                  gravados na trilha e não podem ser apagados.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() =>
                    gerarRelatorioCompraGadoPDF(
                      resultadoCompra,
                      { nome: file?.name || 'documento', formato: 'compra de gado' },
                      conferenciaCompra?.linhas || [],
                      user.name || 'Gestor',
                      conferenciaCompra?.cotacao || null,
                    )
                  }
                  className="gap-2 bg-emerald-700 hover:bg-emerald-800 font-semibold"
                >
                  <FileDown className="h-4 w-4" /> Baixar Relatório de Compra (PDF)
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

      {/* ========================================================================= */}
      {/* ETAPA 5: RELATÓRIO OFICIAL DE NOTAS FISCAIS E RECIBOS */}
      {/* ========================================================================= */}
      {etapa === 5 && isDocumentoFiscal && resultadoAplicacaoFiscal && (
        <div className="space-y-6">
          <Card className="border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10">
            <CardHeader className="text-center pb-2">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-blue-900 dark:text-blue-100">
                Notas Fiscais e Recibos Aplicados com Sucesso!
              </CardTitle>
              <CardDescription>
                O Robô Chicão atualizou o Estoque de Insumos, Rebanho, Vendas, Compras e Fluxo de
                Caixa conforme o tipo de cada documento fiscal, com protocolo de auditoria e
                conciliação automática.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Resumo de Aplicação */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">Total Analisado</span>
                  <span className="text-2xl font-bold">
                    {resultadoAplicacaoFiscal.total_processados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-emerald-600 block">Lançamentos Aplicados</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {resultadoAplicacaoFiscal.total_aplicados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-muted-foreground block">
                    Ignorados / Bloqueados
                  </span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {resultadoAplicacaoFiscal.total_ignorados}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <span className="text-xs text-blue-600 block">Conciliações Efetivadas</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {processamentoFiscal?.sugestoes_conciliacao.length || 0}
                  </span>
                </div>
              </div>

              {/* Detalhamento dos Módulos Afetados */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Documentos Gravados na Trilha Contábil e Zootécnica:
                </span>
                <div className="border rounded-lg divide-y bg-background text-xs">
                  {resultadoAplicacaoFiscal.detalhes_aplicados.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold">{item.descricao}</span>
                        <p className="text-[11px] text-muted-foreground">
                          Módulos alimentados: {item.entidades_afetadas.join(', ')}
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">APLICADO</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Protocolo de Auditoria Append-Only */}
              <div className="p-4 bg-muted/40 border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" /> Protocolo de Auditoria (Append-Only):
                  </span>
                  <code className="bg-background px-2 py-0.5 rounded border font-mono">
                    {resultadoAplicacaoFiscal.protocolo_audit_id || 'REGISTRADO_NA_TRILHA_AUDIT'}
                  </code>
                </div>
                <p className="text-muted-foreground">
                  A imutabilidade contábil é garantida: chave de acesso de 44 dígitos para notas
                  fiscais e hash único para recibos impedem reimportações duplicadas. Todos os
                  eventos ficam encadeados na trilha de auditoria da fazenda.
                </p>
              </div>

              {/* Ações de Download e Encerramento */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() =>
                    gerarRelatorioFiscalPDF(
                      resultadoAplicacaoFiscal,
                      docsFiscaisConferencia,
                      file?.name || 'documento_fiscal.pdf',
                      user.name || 'Gestor',
                    )
                  }
                  className="gap-2 bg-blue-700 hover:bg-blue-800 font-semibold"
                >
                  <FileDown className="h-4 w-4" /> Baixar Relatório Fiscal Oficial (PDF)
                </Button>

                <Button variant="secondary" onClick={reiniciarFluxo} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Importar Outro Pacote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {etapa === 5 && !isCompraGado && !isVendaGado && !isDocumentoFiscal && resultadoAplicacao && (
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
                O Robô Chicão atualizou as bases de dados e gerou o comprovante oficial com
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
