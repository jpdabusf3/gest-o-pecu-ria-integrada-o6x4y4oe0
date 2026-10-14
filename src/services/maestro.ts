/**
 * Serviço de Ingestão e Gestão de Dados "Maestro"
 *
 * Regras Pecuárias Integradas:
 * - 1 @ de peso vivo = 30 kg
 * - 1 @ de carcaça = 15 kg
 * - Rendimento de carcaça padrão = 53.5%
 * - GMD sempre em kg/dia
 * - Dedução de estoque via fluxo único
 * - Audit log append-only com rastreio de usuário, origem do arquivo e itens criados/atualizados
 */

import pb from '@/lib/pocketbase/client'
import { getLots, updateLot, createLot, LotRecord } from './lots'
import { createPesagem } from './pesagens'
import {
  getEstoqueInsumos,
  salvarItemEstoque,
  registrarLancamentoFinanceiro,
  EstoqueInsumoRecord,
} from './fechamento'
import { registrarAuditLog } from './auditoria'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ColumnMapping {
  colunaOrigem: string
  campoDestino: string
  confianca: number
  unidadeDetectada?: string
  customizado?: boolean
}

export interface RegistroNormalizado {
  idTemp: string
  linhaOrigem: number
  dadosOriginais: Record<string, any>
  dadosMapeados: Record<string, any>
  acaoSugerida: 'criar' | 'atualizar' | 'ignorar'
  motivoAcao?: string
  registroExistenteId?: string
  conversoesExplicitas: string[]
  alertas: string[]
  ignoradoPeloUsuario?: boolean
}

export interface AnaliseMaestroResult {
  tipoDocumento: 'pesagens' | 'lotes_animais' | 'estoque' | 'financeiro' | 'atividades' | 'generico'
  resumo: string
  colunasIdentificadas: string[]
  mapeamentosSugeridos: ColumnMapping[]
  registrosNormalizados: RegistroNormalizado[]
  ambiguidades: string[]
  formatoOriginal: string
  suporteLimitado?: boolean
  avisoFormato?: string
}

export interface AplicacaoResult {
  sucesso: boolean
  totalLidos: number
  criados: number
  atualizados: number
  ignorados: number
  detalhesIgnorados: { linha: number; motivo: string }[]
  entidadesAfetadas: string[]
  protocoloAuditId?: string
  timestamp: string
}

// Dicionário de Sinônimos Pecuários
export const SINONIMOS_PECUARIOS: Record<string, { campo: string; label: string; padrao: string }> =
  {
    // Animais / Identificação
    brinco: { campo: 'animal_id', label: 'Brinco do Animal', padrao: 'pesagens / animais' },
    identificacao: { campo: 'animal_id', label: 'Identificação', padrao: 'pesagens' },
    tag: { campo: 'animal_id', label: 'Tag / RFID', padrao: 'pesagens' },
    animal: { campo: 'animal_id', label: 'Animal / Brinco', padrao: 'pesagens' },

    // Peso
    peso: { campo: 'peso_kg', label: 'Peso Vivo (kg)', padrao: 'pesagens / lotes' },
    'peso vivo': { campo: 'peso_kg', label: 'Peso Vivo (kg)', padrao: 'pesagens' },
    pv: { campo: 'peso_kg', label: 'Peso Vivo (kg)', padrao: 'pesagens' },
    'peso (kg)': { campo: 'peso_kg', label: 'Peso (kg)', padrao: 'pesagens' },
    'peso atual': { campo: 'peso_kg', label: 'Peso Atual (kg)', padrao: 'pesagens' },
    pesagem: { campo: 'peso_kg', label: 'Pesagem (kg)', padrao: 'pesagens' },
    'peso medio': { campo: 'peso_medio_kg', label: 'Peso Médio (kg)', padrao: 'lotes' },
    'peso @': { campo: 'peso_arroba', label: 'Peso em Arrobas (@)', padrao: 'conversao' },
    arroba: { campo: 'peso_arroba', label: 'Arrobas (@)', padrao: 'conversao' },

    // Lotes & Pastos
    lote: { campo: 'lote_nome', label: 'Nome do Lote', padrao: 'lotes' },
    'nome do lote': { campo: 'lote_nome', label: 'Nome do Lote', padrao: 'lotes' },
    pasto: { campo: 'pasto_nome', label: 'Nome do Pasto', padrao: 'lotes / pastos' },
    piquete: { campo: 'pasto_nome', label: 'Piquete / Pasto', padrao: 'lotes' },
    invernada: { campo: 'pasto_nome', label: 'Invernada / Retiro', padrao: 'lotes' },
    retiro: { campo: 'pasto_nome', label: 'Retiro', padrao: 'lotes' },

    // Quantidade
    quantidade: { campo: 'headcount', label: 'Quantidade (Cabeças)', padrao: 'lotes' },
    cabecas: { campo: 'headcount', label: 'Nº Cabeças', padrao: 'lotes' },
    qtd: { campo: 'headcount', label: 'Quantidade', padrao: 'lotes' },
    'n cabecas': { campo: 'headcount', label: 'Nº Cabeças', padrao: 'lotes' },

    // Categoria / Sexo
    categoria: { campo: 'categoria', label: 'Categoria Zootécnica', padrao: 'lotes' },
    'faixa etaria': { campo: 'categoria', label: 'Faixa Etária / Era', padrao: 'lotes' },
    era: { campo: 'categoria', label: 'Era / Categoria', padrao: 'lotes' },
    sexo: { campo: 'sexo', label: 'Sexo / Gênero', padrao: 'lotes' },
    genero: { campo: 'sexo', label: 'Gênero', padrao: 'lotes' },

    // Nutrição / Suplementação
    nutricao: { campo: 'suplemento', label: 'Plano Nutricional', padrao: 'nutricao' },
    suplemento: { campo: 'suplemento', label: 'Suplemento / Sal', padrao: 'nutricao' },
    racao: { campo: 'suplemento', label: 'Ração / Trato', padrao: 'nutricao' },

    // Estoque de Insumos (Sinônimos Oficiais)
    // "Produto/Insumo/Item", "Unidade/UM", "Estoque Inicial/Saldo Inicial",
    // "Entradas/Compras", "Saídas/Consumo", "Estoque Final/Saldo Final",
    // "Preço Unitário/Valor Unit./R$/un"
    produto: { campo: 'insumo_produto', label: 'Nome do Produto / Insumo', padrao: 'estoque' },
    insumo: { campo: 'insumo_produto', label: 'Insumo', padrao: 'estoque' },
    item: { campo: 'insumo_produto', label: 'Item de Estoque', padrao: 'estoque' },
    'nome do produto': { campo: 'insumo_produto', label: 'Nome do Produto', padrao: 'estoque' },
    'nome do insumo': { campo: 'insumo_produto', label: 'Nome do Insumo', padrao: 'estoque' },
    descricao: { campo: 'insumo_produto', label: 'Descrição / Insumo', padrao: 'estoque' },

    unidade: { campo: 'insumo_unidade', label: 'Unidade (kg / saco)', padrao: 'estoque' },
    um: { campo: 'insumo_unidade', label: 'Unidade de Medida (UM)', padrao: 'estoque' },
    und: { campo: 'insumo_unidade', label: 'Unidade', padrao: 'estoque' },
    un: { campo: 'insumo_unidade', label: 'Unidade', padrao: 'estoque' },

    'estoque inicial': {
      campo: 'insumo_estoque_inicial',
      label: 'Estoque Inicial',
      padrao: 'estoque',
    },
    'saldo inicial': { campo: 'insumo_estoque_inicial', label: 'Saldo Inicial', padrao: 'estoque' },
    'est. inicial': { campo: 'insumo_estoque_inicial', label: 'Est. Inicial', padrao: 'estoque' },
    'saldo ant': { campo: 'insumo_estoque_inicial', label: 'Saldo Anterior', padrao: 'estoque' },
    'saldo anterior': {
      campo: 'insumo_estoque_inicial',
      label: 'Saldo Anterior',
      padrao: 'estoque',
    },

    entradas: { campo: 'insumo_entradas', label: 'Entradas / Compras', padrao: 'estoque' },
    compras: { campo: 'insumo_entradas', label: 'Compras / Entradas', padrao: 'estoque' },
    entrada: { campo: 'insumo_entradas', label: 'Entrada', padrao: 'estoque' },
    compra: { campo: 'insumo_entradas', label: 'Compra', padrao: 'estoque' },
    aquisicoes: { campo: 'insumo_entradas', label: 'Aquisições', padrao: 'estoque' },

    saidas: { campo: 'insumo_saidas', label: 'Saídas / Consumo', padrao: 'estoque' },
    consumo: { campo: 'insumo_saidas', label: 'Consumo / Saídas', padrao: 'estoque' },
    saida: { campo: 'insumo_saidas', label: 'Saída', padrao: 'estoque' },
    baixas: { campo: 'insumo_saidas', label: 'Baixas', padrao: 'estoque' },
    baixa: { campo: 'insumo_saidas', label: 'Baixa de Estoque', padrao: 'estoque' },

    'estoque final': { campo: 'insumo_estoque_final', label: 'Estoque Final', padrao: 'estoque' },
    'saldo final': { campo: 'insumo_estoque_final', label: 'Saldo Final', padrao: 'estoque' },
    'est. final': { campo: 'insumo_estoque_final', label: 'Est. Final', padrao: 'estoque' },
    'saldo atual': { campo: 'insumo_estoque_final', label: 'Saldo Atual', padrao: 'estoque' },
    'estoque atual': { campo: 'insumo_estoque_final', label: 'Estoque Atual', padrao: 'estoque' },

    'preco unitario': {
      campo: 'insumo_preco_unitario',
      label: 'Preço Unitário (R$)',
      padrao: 'estoque',
    },
    'valor unitario': {
      campo: 'insumo_preco_unitario',
      label: 'Valor Unitário (R$)',
      padrao: 'estoque',
    },
    'valor unit.': { campo: 'insumo_preco_unitario', label: 'Valor Unit.', padrao: 'estoque' },
    'preco unit.': { campo: 'insumo_preco_unitario', label: 'Preço Unit.', padrao: 'estoque' },
    'r$/un': { campo: 'insumo_preco_unitario', label: 'R$/un', padrao: 'estoque' },
    'r$/kg': { campo: 'insumo_preco_unitario', label: 'R$/kg', padrao: 'estoque' },
    'r$/saco': { campo: 'insumo_preco_unitario', label: 'R$/saco', padrao: 'estoque' },
    'custo unitario': {
      campo: 'insumo_preco_unitario',
      label: 'Custo Unitário',
      padrao: 'estoque',
    },
    'custo unit': { campo: 'insumo_preco_unitario', label: 'Custo Unit.', padrao: 'estoque' },

    // Data
    data: { campo: 'data', label: 'Data do Registro', padrao: 'geral' },
    'data pesagem': { campo: 'data', label: 'Data da Pesagem', padrao: 'pesagens' },
    dia: { campo: 'data', label: 'Dia', padrao: 'geral' },
  }

export const CAMPOS_SISTEMA_DISPONIVEIS = [
  { id: 'ignorar', label: '(Ignorar esta coluna)', modulo: 'Geral' },
  { id: 'animal_id', label: 'Brinco / Identificação Animal', modulo: 'Animais / Pesagens' },
  { id: 'peso_kg', label: 'Peso Vivo (kg)', modulo: 'Pesagens' },
  { id: 'peso_arroba', label: 'Peso Vivo em @ (será x30 kg)', modulo: 'Conversões' },
  { id: 'peso_medio_kg', label: 'Peso Médio do Lote (kg)', modulo: 'Lotes' },
  { id: 'data', label: 'Data do Evento / Pesagem', modulo: 'Geral' },
  { id: 'lote_nome', label: 'Nome / Código do Lote', modulo: 'Lotes' },
  { id: 'pasto_nome', label: 'Pasto / Piquete Atual', modulo: 'Pastos / Lotes' },
  { id: 'headcount', label: 'Nº de Cabeças (Quantidade)', modulo: 'Lotes' },
  { id: 'categoria', label: 'Categoria (Bezerro, Garrote, Novilho, Boi, etc)', modulo: 'Lotes' },
  { id: 'sexo', label: 'Sexo (Macho / Fêmea)', modulo: 'Lotes' },
  { id: 'fase', label: 'Fase (Cria, Recria, Engorda, Confinamento)', modulo: 'Lotes' },
  { id: 'suplemento', label: 'Suplemento / Nutrição', modulo: 'Estoque / Nutrição' },
  { id: 'gmd_kg_dia', label: 'GMD Meta/Real (kg/dia)', modulo: 'GMD' },
  { id: 'insumo_produto', label: 'Nome do Produto / Insumo', modulo: 'Estoque' },
  { id: 'insumo_unidade', label: 'Unidade (kg / saco / ton)', modulo: 'Estoque' },
  { id: 'insumo_estoque_inicial', label: 'Estoque Inicial', modulo: 'Estoque' },
  { id: 'insumo_entradas', label: 'Entradas / Compras', modulo: 'Estoque' },
  { id: 'insumo_saidas', label: 'Saídas / Consumo', modulo: 'Estoque' },
  { id: 'insumo_estoque_final', label: 'Estoque Final / Saldo Final', modulo: 'Estoque' },
  { id: 'insumo_preco_unitario', label: 'Preço Unitário (R$)', modulo: 'Estoque' },
  { id: 'insumo_qtd', label: 'Quantidade de Insumo (Genérico)', modulo: 'Estoque' },
  { id: 'valor_rs', label: 'Valor / Custo (R$)', modulo: 'Financeiro' },
  { id: 'observacoes', label: 'Observações / Notas', modulo: 'Geral' },
]

export interface MapeamentoSalvoRecord {
  id: string
  tipo_documento:
    | 'pesagens'
    | 'lotes_animais'
    | 'estoque'
    | 'financeiro'
    | 'atividades'
    | 'generico'
  assinatura: string
  colunas: ColumnMapping[]
  nome_arquivo?: string
  usuario_id?: string
  usuario_nome?: string
  utilizacoes: number
  ultima_utilizacao: string
  created: string
  updated: string
}

/**
 * Gera uma assinatura canônica para o conjunto de cabeçalhos
 * Ordena alfabeticamente os cabeçalhos normalizados
 */
export function gerarAssinaturaColunas(headers: string[]): string {
  return headers
    .map((h) => normalizeHeader(h))
    .filter(Boolean)
    .sort()
    .join('||')
}

/**
 * Normaliza string para busca de sinônimos
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Parser client-side para CSV / TSV de múltiplos layouts (cabeçalho linha 1, 2 ou delimitadores variados)
 */
export function parseCSVClientSide(text: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [], rows: [] }

  // Detectar delimitador: vírgula, ponto-e-vírgula ou tab
  const sampleLine = lines[0]
  const countComma = (sampleLine.match(/,/g) || []).length
  const countSemi = (sampleLine.match(/;/g) || []).length
  const countTab = (sampleLine.match(/\t/g) || []).length

  let delim = ','
  if (countSemi > countComma && countSemi > countTab) delim = ';'
  else if (countTab > countComma && countTab > countSemi) delim = '\t'

  const splitLine = (l: string) => {
    // Regex simples para campos com aspas
    const pattern = new RegExp(
      '(?:' + delim + '|^)(?:"([^"]*(?:""[^"]*)*)"|([^"' + delim + ']*))',
      'gi',
    )
    const row: string[] = []
    let match
    while ((match = pattern.exec(l)) !== null) {
      let val = match[1] ? match[1].replace(/""/g, '"') : match[2]
      if (val === undefined) val = ''
      row.push(val.trim())
    }
    return row
  }

  // Detectar se a linha 1 é título e a linha 2 é o cabeçalho real
  let headerRowIndex = 0
  const firstRowCols = splitLine(lines[0])
  if (lines.length > 1) {
    const secondRowCols = splitLine(lines[1])
    if (firstRowCols.length <= 2 && secondRowCols.length > firstRowCols.length) {
      headerRowIndex = 1
    }
  }

  const rawHeaders = splitLine(lines[headerRowIndex]).filter(Boolean)
  const headers = rawHeaders.length > 0 ? rawHeaders : firstRowCols

  const rows: Record<string, string>[] = []
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const vals = splitLine(lines[i])
    if (vals.length === 0 || vals.every((v) => !v)) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = vals[idx] !== undefined ? vals[idx] : ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Parser de tabelas Markdown geradas pelo $documents.toMarkdown
 */
export function parseMarkdownTable(markdown: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim())
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'))

  if (tableLines.length < 2) {
    // Tenta fallback com CSV se o markdown for texto corrido / separado por vírgula
    return parseCSVClientSide(markdown)
  }

  const parseCells = (line: string) =>
    line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim())

  const rawHeaders = parseCells(tableLines[0])
  const rows: Record<string, string>[] = []

  // Pula linha separadora com dashes: | --- | --- |
  const startIndex = tableLines[1].includes('---') ? 2 : 1

  for (let i = startIndex; i < tableLines.length; i++) {
    const cells = parseCells(tableLines[i])
    if (cells.every((c) => !c)) continue
    const row: Record<string, string> = {}
    rawHeaders.forEach((h, idx) => {
      row[h] = cells[idx] || ''
    })
    rows.push(row)
  }

  return { headers: rawHeaders, rows }
}

/**
 * Mapeia automaticamente cabeçalhos para campos internos usando sinônimos pecuários
 */
export function inferColumnMappings(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const norm = normalizeHeader(header)

    // Checagem direta de sinônimo
    if (SINONIMOS_PECUARIOS[norm]) {
      const s = SINONIMOS_PECUARIOS[norm]
      return {
        colunaOrigem: header,
        campoDestino: s.campo,
        confianca: 95,
        unidadeDetectada: header.includes('@') ? '@' : header.includes('kg') ? 'kg' : undefined,
      }
    }

    // Checagem parcial de sinônimo
    for (const [key, item] of Object.entries(SINONIMOS_PECUARIOS)) {
      if (norm.includes(key) || key.includes(norm)) {
        return {
          colunaOrigem: header,
          campoDestino: item.campo,
          confianca: 80,
          unidadeDetectada: header.includes('@') ? '@' : header.includes('kg') ? 'kg' : undefined,
        }
      }
    }

    return {
      colunaOrigem: header,
      campoDestino: 'ignorar',
      confianca: 30,
    }
  })
}

/**
 * Envia arquivo ao endpoint de backend do Maestro para extração de markdown via $documents.toMarkdown
 */
export async function extrairDocumentoMaestro(file: File): Promise<{
  markdown: string
  truncated: boolean
  requiresOCR: boolean
  ocrUsado?: boolean
  origem_leitura?: 'texto' | 'visao' | 'nenhuma'
  aviso: string
}> {
  const formData = new FormData()
  formData.append('arquivo', file)

  try {
    const backendUrl = import.meta.env.VITE_POCKETBASE_URL
    const res = await fetch(`${backendUrl}/backend/v1/maestro/extract`, {
      method: 'POST',
      headers: {
        Authorization: pb.authStore.token,
      },
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      return {
        markdown: data.markdown || '',
        truncated: Boolean(data.truncated),
        requiresOCR: Boolean(data.requiresOCR),
        ocrUsado: Boolean(data.ocrUsado),
        origem_leitura: data.origem_leitura || 'texto',
        aviso: data.aviso || '',
      }
    }
  } catch (err) {
    console.warn('Falha no endpoint /backend/v1/maestro/extract:', err)
  }

  // Fallback client-side para arquivos de texto, CSV ou TSV
  const isText =
    file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv')
  if (isText) {
    const text = await file.text()
    return {
      markdown: text,
      truncated: false,
      requiresOCR: false,
      aviso: 'Lido diretamente via parser de texto.',
    }
  }

  return {
    markdown: '',
    truncated: false,
    requiresOCR: false,
    aviso:
      'Formato binário sem suporte a extração direta no navegador. Tente exportar para CSV ou XLSX.',
  }
}

/**
 * Aciona o agente Maestro via hook no backend para obter análise inteligente, sinônimos e normalização
 */
export async function consultarAgenteMaestro(
  content: string,
  filename: string,
  objetivo: string,
  origemLeitura: 'texto' | 'visao' = 'texto',
): Promise<any | null> {
  try {
    const backendUrl = import.meta.env.VITE_POCKETBASE_URL
    const res = await fetch(`${backendUrl}/backend/v1/maestro/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({
        content,
        filename,
        objetivo,
        origem_leitura: origemLeitura,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.analysis || null
    }
  } catch (err) {
    console.warn('Falha ao acionar agente Maestro no backend:', err)
  }
  return null
}

/**
 * Constrói a lista de registros normalizados com conversão explícita de unidades,
 * validações de faixa e correspondência contra registros existentes
 */
export async function compilarRegistrosNormalizados(
  rows: Record<string, any>[],
  mappings: ColumnMapping[],
  tipoDocumento: string,
): Promise<RegistroNormalizado[]> {
  // Carregar lotes e estoque existentes para correspondência
  let lotesExistentes: LotRecord[] = []
  let estoqueExistente: EstoqueInsumoRecord[] = []
  try {
    lotesExistentes = await getLots()
  } catch {
    /* intentionally ignored */
  }
  try {
    estoqueExistente = await getEstoqueInsumos()
  } catch {
    /* intentionally ignored */
  }

  const registros: RegistroNormalizado[] = []
  // Mapa de produtos já vistos nesta importação para evitar duplicatas internas
  const produtosVistosNestaImportacao = new Set<string>()

  rows.forEach((row, idx) => {
    const dadosMapeados: Record<string, any> = {}
    const conversoes: string[] = []
    const alertas: string[] = []

    mappings.forEach((m) => {
      if (m.campoDestino === 'ignorar') return
      const valorBruto = row[m.colunaOrigem]
      if (valorBruto === undefined || valorBruto === null || String(valorBruto).trim() === '')
        return

      const strVal = String(valorBruto).trim()

      switch (m.campoDestino) {
        case 'peso_arroba': {
          // 1 @ de peso vivo = 30 kg
          const num = parseFloat(strVal.replace(',', '.'))
          if (!isNaN(num)) {
            const kg = num * 30
            dadosMapeados['peso_kg'] = kg
            conversoes.push(`${num} @ de peso vivo convertidas para ${kg.toFixed(1)} kg`)
          } else {
            alertas.push(`Valor de arroba inválido: "${strVal}"`)
          }
          break
        }

        case 'peso_kg':
        case 'peso_medio_kg': {
          // Detectar se o valor veio com sufixo "@" mesmo mapeado em peso_kg
          if (strVal.includes('@')) {
            const num = parseFloat(strVal.replace('@', '').replace(',', '.').trim())
            if (!isNaN(num)) {
              const kg = num * 30
              dadosMapeados[m.campoDestino] = kg
              conversoes.push(`${num} @ convertidas para ${kg.toFixed(1)} kg (regra 30 kg/@ viva)`)
            }
          } else {
            const num = parseFloat(strVal.replace(/[^\d.,-]/g, '').replace(',', '.'))
            if (!isNaN(num)) {
              if (num < 0) {
                alertas.push(`Peso negativo detectado (${num} kg) na linha ${idx + 1}`)
              } else if (num > 1200) {
                alertas.push(`Peso atípico muito alto (${num} kg) na linha ${idx + 1}`)
              }
              dadosMapeados[m.campoDestino] = num
            }
          }
          break
        }

        case 'headcount': {
          const num = parseInt(strVal.replace(/[^\d-]/g, ''), 10)
          if (!isNaN(num)) {
            if (num <= 0) {
              alertas.push(`Quantidade zerada ou negativa na linha ${idx + 1}`)
            }
            dadosMapeados['headcount'] = num
          }
          break
        }

        case 'data': {
          // Formatar data para YYYY-MM-DD
          let parsedDate = strVal
          if (strVal.includes('/')) {
            const parts = strVal.split('/')
            if (parts.length === 3) {
              const d = parts[0].padStart(2, '0')
              const m = parts[1].padStart(2, '0')
              const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
              parsedDate = `${y}-${m}-${d}`
            }
          }
          const dt = new Date(parsedDate)
          if (!isNaN(dt.getTime())) {
            const hoje = new Date()
            if (dt > hoje) {
              alertas.push(`Data futura detectada (${parsedDate}) na linha ${idx + 1}`)
            }
            dadosMapeados['data'] = parsedDate
          } else {
            alertas.push(`Data inválida ou não reconhecida: "${strVal}"`)
          }
          break
        }

        case 'sexo': {
          const s = normalizeHeader(strVal)
          if (s.startsWith('m') || s === 'macho') {
            dadosMapeados['sexo'] = 'macho'
          } else if (s.startsWith('f') || s === 'femea' || s === 'fêmea') {
            dadosMapeados['sexo'] = 'femea'
          } else {
            dadosMapeados['sexo'] = strVal
          }
          break
        }

        case 'categoria': {
          // Normalização de categoria pecuária por faixa etária
          const c = normalizeHeader(strVal)
          if (c.includes('bezerro') || c.includes('bezerra'))
            dadosMapeados['categoria'] = 'Bezerros (0-12m)'
          else if (c.includes('garrote') || c.includes('novilha'))
            dadosMapeados['categoria'] = 'Recria (12-24m)'
          else if (c.includes('boi') || c.includes('vaca') || c.includes('touro'))
            dadosMapeados['categoria'] = 'Engorda (>24m)'
          else dadosMapeados['categoria'] = strVal
          break
        }

        case 'insumo_produto': {
          dadosMapeados['insumo_produto'] = strVal.trim()
          break
        }

        case 'insumo_unidade': {
          const u = normalizeHeader(strVal)
          if (u.includes('saco') || u === 'sc' || u === 'scs') {
            dadosMapeados['insumo_unidade'] = 'saco'
          } else if (u.includes('kg') || u === 'kilo' || u === 'quilo') {
            dadosMapeados['insumo_unidade'] = 'kg'
          } else if (u.includes('ton') || u === 't') {
            dadosMapeados['insumo_unidade'] = 'ton'
          } else {
            dadosMapeados['insumo_unidade'] = strVal.trim()
          }
          break
        }

        case 'insumo_estoque_inicial':
        case 'insumo_entradas':
        case 'insumo_saidas':
        case 'insumo_estoque_final': {
          const parsedNum = parseFloat(strVal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          if (!isNaN(parsedNum)) {
            dadosMapeados[m.campoDestino] = parsedNum
          } else {
            alertas.push(`Valor numérico inválido para ${m.colunaOrigem}: "${strVal}"`)
          }
          break
        }

        case 'insumo_preco_unitario': {
          const parsedPreco = parseFloat(strVal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          if (!isNaN(parsedPreco)) {
            if (parsedPreco < 0) {
              alertas.push(`Preço unitário negativo (${parsedPreco}) na linha ${idx + 1}`)
            }
            dadosMapeados['insumo_preco_unitario'] = parsedPreco
          } else {
            alertas.push(`Preço unitário inválido: "${strVal}"`)
          }
          break
        }

        default:
          dadosMapeados[m.campoDestino] = strVal
      }
    })

    // Decisão da Ação (Criar vs Atualizar)
    let acao: 'criar' | 'atualizar' | 'ignorar' = 'criar'
    let motivoAcao = 'Novo registro a ser cadastrado'
    let existingId: string | undefined = undefined

    const loteNome = dadosMapeados['lote_nome']
    const pastoNome = dadosMapeados['pasto_nome']
    const brinco = dadosMapeados['animal_id']
    const insumoProduto = dadosMapeados['insumo_produto']

    // -------------------------------------------------------------
    // FLUXO ESPECÍFICO: ESTOQUE DE INSUMOS
    // -------------------------------------------------------------
    if (tipoDocumento === 'estoque' || insumoProduto) {
      if (!insumoProduto || String(insumoProduto).trim() === '') {
        acao = 'ignorar'
        motivoAcao = 'Linha sem nome de produto especificado'
      } else {
        const prodNorm = normalizeHeader(String(insumoProduto))

        // Checar se já foi visto nesta mesma planilha para evitar duplicatas internas
        if (produtosVistosNestaImportacao.has(prodNorm)) {
          alertas.push(
            `Produto "${insumoProduto}" duplicado na mesma planilha. Atualizará o registro prévio.`,
          )
        }
        produtosVistosNestaImportacao.add(prodNorm)

        // Correspondência na coleção estoque_insumos existente
        const matchEstoque = estoqueExistente.find(
          (e) =>
            normalizeHeader(e.produto) === prodNorm ||
            (e.codigo && normalizeHeader(e.codigo) === prodNorm),
        )

        if (matchEstoque) {
          acao = 'atualizar'
          existingId = matchEstoque.id
          motivoAcao = `Produto existente "${matchEstoque.produto}" (ID ${matchEstoque.id.slice(0, 6)}) será atualizado — sem duplicação`
        } else {
          acao = 'criar'
          motivoAcao = `Novo produto "${insumoProduto}" será cadastrado no estoque`
        }

        // Recuperar valores numéricos
        const estInicial =
          dadosMapeados['insumo_estoque_inicial'] !== undefined
            ? Number(dadosMapeados['insumo_estoque_inicial'])
            : matchEstoque?.estoque_inicial || 0

        const entradas =
          dadosMapeados['insumo_entradas'] !== undefined
            ? Number(dadosMapeados['insumo_entradas'])
            : 0

        let saidas =
          dadosMapeados['insumo_saidas'] !== undefined
            ? Number(dadosMapeados['insumo_saidas'])
            : undefined

        let estFinal =
          dadosMapeados['insumo_estoque_final'] !== undefined
            ? Number(dadosMapeados['insumo_estoque_final'])
            : undefined

        // Cálculo coerente: se tiver estFinal mas não tiver saídas: saidas = estInicial + entradas - estFinal
        // Se tiver saídas mas não tiver estFinal: estFinal = estInicial + entradas - saidas
        // Se ambos foram dados, validar se estFinal calculado bate com informado
        if (estFinal !== undefined && saidas === undefined) {
          saidas = estInicial + entradas - estFinal
          dadosMapeados['insumo_saidas'] = Number(saidas.toFixed(2))
        } else if (saidas !== undefined && estFinal === undefined) {
          estFinal = estInicial + entradas - saidas
          dadosMapeados['insumo_estoque_final'] = Number(estFinal.toFixed(2))
        } else if (estFinal !== undefined && saidas !== undefined) {
          const estFinalEsperado = estInicial + entradas - saidas
          if (Math.abs(estFinalEsperado - estFinal) > 0.05) {
            conversoes.push(
              `Ajuste de fechamento: Saldo inicial (${estInicial}) + Entradas (${entradas}) − Saídas (${saidas}) = ${estFinalEsperado.toFixed(1)} (Planilha informava ${estFinal})`,
            )
          }
        } else {
          // Nenhum dos dois: mantém saldo inicial
          estFinal = estInicial + entradas
          saidas = 0
          dadosMapeados['insumo_estoque_final'] = estFinal
          dadosMapeados['insumo_saidas'] = 0
        }

        const unidade = dadosMapeados['insumo_unidade'] || matchEstoque?.unidade || 'kg'
        dadosMapeados['insumo_unidade'] = unidade

        // Conversões de sacos / kg (1 saco = 30 kg ou 40 kg, padrão 30 kg na pecuária F3)
        const isSaco = normalizeHeader(unidade).includes('saco')
        let fatorConversaoSacoKg = 30
        if (isSaco) {
          const inicialKg = estInicial * fatorConversaoSacoKg
          const entradasKg = entradas * fatorConversaoSacoKg
          const saidasKg = saidas * fatorConversaoSacoKg
          const finalKg = estFinal * fatorConversaoSacoKg
          dadosMapeados['insumo_qtd_kg'] = {
            estoque_inicial_kg: inicialKg,
            entradas_kg: entradasKg,
            saidas_kg: saidasKg,
            estoque_final_kg: finalKg,
          }
          conversoes.push(
            `Unidade em sacos: convertido para kg (${estFinal} sacos = ${finalKg.toLocaleString('pt-BR')} kg a 30 kg/saco)`,
          )
        }

        // Cálculo do Custo do Período:
        // Custo do período = estoque inicial + compras − estoque final = saídas
        // em unidades e em R$ (saídas * preço_unitário)
        const precoUnitario =
          dadosMapeados['insumo_preco_unitario'] !== undefined
            ? Number(dadosMapeados['insumo_preco_unitario'])
            : matchEstoque?.preco_unitario || 0
        dadosMapeados['insumo_preco_unitario'] = precoUnitario

        const custoPeriodoRs = Number((saidas * precoUnitario).toFixed(2))
        dadosMapeados['insumo_custo_periodo_rs'] = custoPeriodoRs
        dadosMapeados['insumo_consumo_periodo_qtd'] = saidas

        conversoes.push(
          `Custo do Período calculado: ${saidas.toFixed(1)} ${unidade} consumidos × R$ ${precoUnitario.toFixed(2)}/${unidade} = R$ ${custoPeriodoRs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        )

        // ---------------------------------------------------------
        // VALIDAÇÕES OBRIGATÓRIAS DO PEDIDO DO USUÁRIO
        // 1. Estoque final NÃO seja negativo (bloqueia com erro)
        // 2. Preço unitário coerente com histórico (aviso amarelo)
        // ---------------------------------------------------------
        if (estFinal < 0) {
          alertas.push(
            `BLOQUEIO: Estoque final negativo (${estFinal} ${unidade}). Saldo insuficiente (Inicial ${estInicial} + Entradas ${entradas} < Saídas ${saidas}).`,
          )
        }

        if (precoUnitario <= 0) {
          alertas.push(
            `Preço unitário zerado ou não informado (R$ 0,00). O custo do período em R$ ficará nulo.`,
          )
        } else if (matchEstoque && matchEstoque.preco_unitario > 0) {
          const precoHistorico = matchEstoque.preco_unitario
          const variacaoPct = Math.abs((precoUnitario - precoHistorico) / precoHistorico) * 100
          if (variacaoPct > 35) {
            alertas.push(
              `ALERTA DE PREÇO: Preço unitário (R$ ${precoUnitario.toFixed(2)}) diverge ${variacaoPct.toFixed(0)}% do histórico cadastrado (R$ ${precoHistorico.toFixed(2)}). Requer confirmação.`,
            )
          }
        }
      }
    } else if (tipoDocumento === 'lotes_animais' || (!brinco && (loteNome || pastoNome))) {
      // Correspondência por lote_nome e pasto_nome
      const match = lotesExistentes.find(
        (l) =>
          (loteNome && normalizeHeader(l.name) === normalizeHeader(loteNome)) ||
          (pastoNome &&
            l.pasto_atual &&
            normalizeHeader(l.pasto_atual) === normalizeHeader(pastoNome)),
      )
      if (match) {
        acao = 'atualizar'
        existingId = match.id
        motivoAcao = `Lote existente "${match.name}" (ID ${match.id.slice(0, 6)}) no pasto "${match.pasto_atual || 'Geral'}" será atualizado`
      }
    } else if (tipoDocumento === 'pesagens' || brinco) {
      motivoAcao = `Pesagem associada ao animal/brinco "${brinco || 'Lote'}" será lançada no histórico`
    }

    if (Object.keys(dadosMapeados).length === 0) {
      acao = 'ignorar'
      motivoAcao = 'Linha sem nenhum campo válido mapeado'
    }

    registros.push({
      idTemp: `reg_${idx}_${Date.now()}`,
      linhaOrigem: idx + 1,
      dadosOriginais: row,
      dadosMapeados,
      acaoSugerida: acao,
      motivoAcao,
      registroExistenteId: existingId,
      conversoesExplicitas: conversoes,
      alertas,
      ignoradoPeloUsuario: acao === 'ignorar',
    })
  })

  return registros
}

/**
 * Executa a aplicação integrada no banco de dados (Etapa 4 do Maestro)
 * - Cria/atualiza lotes
 * - Lança pesagens e recalcula GMD automaticamente
 * - Registra consumo de suplementação no estoque (dedução via registerConsumption)
 * - Registra evento APPEND-ONLY no audit_log
 */
export async function aplicarDadosConfirmados(
  registrosValidados: RegistroNormalizado[],
  origemArquivo: { nome: string; tipo: string },
  usuarioAtual: { id: string; nome: string; perfil: string },
): Promise<AplicacaoResult> {
  const result: AplicacaoResult = {
    sucesso: true,
    totalLidos: registrosValidados.length,
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    detalhesIgnorados: [],
    entidadesAfetadas: [],
    timestamp: new Date().toISOString(),
  }

  const itemsAuditCriados: any[] = []
  const itemsAuditAtualizados: any[] = []

  // Carregar dados de apoio
  let lotes = await getLots()
  const estoque = await getEstoqueInsumos()

  // Acumuladores de fechamento financeiro para fábrica de suplemento
  let custoTotalFabricaSuplemento = 0
  const produtosFabricaDetalhes: string[] = []

  for (const reg of registrosValidados) {
    if (reg.ignoradoPeloUsuario || reg.acaoSugerida === 'ignorar') {
      result.ignorados++
      result.detalhesIgnorados.push({
        linha: reg.linhaOrigem,
        motivo: reg.motivoAcao || 'Marcado para ignorar pelo usuário',
      })
      continue
    }

    const { dadosMapeados, acaoSugerida, registroExistenteId } = reg

    // Checar se há erro bloqueante (ex: estoque final negativo)
    const hasBloqueio = reg.alertas.some((a) => a.includes('BLOQUEIO') || a.includes('negativo'))
    if (hasBloqueio) {
      result.ignorados++
      result.detalhesIgnorados.push({
        linha: reg.linhaOrigem,
        motivo: `Bloqueado por validação: ${reg.alertas.join('; ')}`,
      })
      continue
    }

    try {
      // 0. FLUXO ESPECÍFICO DE PLANILHA DE ESTOQUE DE INSUMOS
      if (origemArquivo.tipo === 'estoque' || dadosMapeados['insumo_produto']) {
        const nomeProduto = String(dadosMapeados['insumo_produto']).trim()
        const unidade = String(dadosMapeados['insumo_unidade'] || 'kg')
        const precoUnit = Number(dadosMapeados['insumo_preco_unitario'] || 0)
        const ini = Number(dadosMapeados['insumo_estoque_inicial'] || 0)
        const ent = Number(dadosMapeados['insumo_entradas'] || 0)
        const sai = Number(dadosMapeados['insumo_saidas'] || 0)
        const fim = Number(dadosMapeados['insumo_estoque_final'] || ini + ent - sai)
        const custoPeriodo = Number(
          (dadosMapeados['insumo_custo_periodo_rs'] !== undefined
            ? dadosMapeados['insumo_custo_periodo_rs']
            : sai * precoUnit
          ).toFixed(2),
        )

        const mesAtual = new Date().toISOString().slice(0, 7)

        // Encontrar ou preparar item na coleção estoque_insumos
        let savedEstoqueItem: EstoqueInsumoRecord

        if (acaoSugerida === 'atualizar' && registroExistenteId) {
          savedEstoqueItem = await salvarItemEstoque({
            id: registroExistenteId,
            produto: nomeProduto,
            unidade: unidade,
            estoque_inicial: ini,
            entradas: ent,
            saidas: sai,
            estoque_final: fim,
            preco_unitario: precoUnit,
            custo_periodo: custoPeriodo,
            periodo_mes: mesAtual,
          })
          result.atualizados++
          itemsAuditAtualizados.push({
            tipo: 'estoque_insumos',
            id: registroExistenteId,
            produto: nomeProduto,
            unidade,
            saidas: sai,
            estoque_final: fim,
            custo_periodo: custoPeriodo,
          })
        } else {
          // Criar novo produto garantindo ausência de duplicação
          const codigoSugerido = `INS-${Date.now().toString().slice(-4)}`
          savedEstoqueItem = await salvarItemEstoque({
            produto: nomeProduto,
            codigo: codigoSugerido,
            unidade: unidade,
            categoria: 'nutricao',
            estoque_inicial: ini,
            entradas: ent,
            saidas: sai,
            estoque_final: fim,
            preco_unitario: precoUnit,
            custo_periodo: custoPeriodo,
            periodo_mes: mesAtual,
          })
          result.criados++
          itemsAuditCriados.push({
            tipo: 'estoque_insumos',
            id: savedEstoqueItem.id,
            produto: nomeProduto,
            unidade,
            saidas: sai,
            estoque_final: fim,
            custo_periodo: custoPeriodo,
          })
        }

        if (!result.entidadesAfetadas.includes('Estoque de Insumos')) {
          result.entidadesAfetadas.push('Estoque de Insumos')
        }

        // Acumular custo do período para o fechamento financeiro do centro de custo "fábrica de suplemento"
        if (custoPeriodo > 0) {
          custoTotalFabricaSuplemento += custoPeriodo
          produtosFabricaDetalhes.push(
            `${nomeProduto} (${sai} ${unidade} consumidos = R$ ${custoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
          )
        }

        continue
      }

      // 1. FLUXO DE LOTES / REBANHO
      if (dadosMapeados['lote_nome'] || dadosMapeados['headcount'] || dadosMapeados['pasto_nome']) {
        const nomeLote =
          dadosMapeados['lote_nome'] || `Lote ${dadosMapeados['pasto_nome'] || 'Novo'}`
        const pastoLote = dadosMapeados['pasto_nome'] || 'Pasto Geral'
        const qtd = dadosMapeados['headcount'] || 0
        const peso = dadosMapeados['peso_medio_kg'] || dadosMapeados['peso_kg'] || 350
        const categoria = dadosMapeados['categoria'] || 'Recria'
        const sexo = dadosMapeados['sexo'] === 'femea' ? 'femea' : 'macho'

        if (acaoSugerida === 'atualizar' && registroExistenteId) {
          await updateLot(registroExistenteId, {
            peso_medio_atual: peso,
            final_weight: peso,
            headcount: qtd > 0 ? qtd : undefined,
            pasto_atual: pastoLote,
            category: categoria,
          })
          result.atualizados++
          itemsAuditAtualizados.push({ tipo: 'lote', id: registroExistenteId, nome: nomeLote })
          if (!result.entidadesAfetadas.includes('Lotes')) result.entidadesAfetadas.push('Lotes')
        } else {
          const novoLote = await createLot({
            name: nomeLote,
            sector: 'recria',
            sex: sexo,
            category: categoria,
            initial_weight: peso,
            final_weight: peso,
            entry_date: dadosMapeados['data'] || new Date().toISOString().slice(0, 10),
            exit_date: '',
            value_per_animal: 3000,
            status: 'active',
            headcount: qtd > 0 ? qtd : 50,
            peso_entrada_medio: peso,
            peso_medio_atual: peso,
            pasto_atual: pastoLote,
            gmd_alvo_g_dia: 800,
            data_inicio_lote: dadosMapeados['data'] || new Date().toISOString().slice(0, 10),
            fase_atual: 'recria',
            frente: 'recria',
            is_arrendamento: false,
          })
          result.criados++
          itemsAuditCriados.push({ tipo: 'lote', id: novoLote.id, nome: nomeLote })
          if (!result.entidadesAfetadas.includes('Lotes')) result.entidadesAfetadas.push('Lotes')
          lotes.push(novoLote)
        }

        // Se houver suplemento informado, deduzir estoque correspondente
        if (dadosMapeados['suplemento']) {
          const matchEstoque = estoque.find((e) =>
            e.produto.toLowerCase().includes(String(dadosMapeados['suplemento']).toLowerCase()),
          )
          if (matchEstoque) {
            // Dedução proporcional: 0.3 kg/cab/dia * headcount (ou 30 kg padrão)
            const consumoEstimado = Math.max(10, (qtd || 30) * 0.3)
            await salvarItemEstoque({
              id: matchEstoque.id,
              produto: matchEstoque.produto,
              codigo: matchEstoque.codigo,
              unidade: matchEstoque.unidade,
              categoria: matchEstoque.categoria,
              estoque_inicial: matchEstoque.estoque_inicial,
              entradas: matchEstoque.entradas,
              saidas: (matchEstoque.saidas || 0) + consumoEstimado,
              preco_unitario: matchEstoque.preco_unitario,
              periodo_mes: new Date().toISOString().slice(0, 7),
            })
            if (!result.entidadesAfetadas.includes('Estoque & Nutrição')) {
              result.entidadesAfetadas.push('Estoque & Nutrição')
            }
          }
        }
      }

      // 2. FLUXO DE PESAGENS / ANIMAL
      if (dadosMapeados['peso_kg'] && (dadosMapeados['animal_id'] || dadosMapeados['lote_nome'])) {
        // Encontrar lote associado
        let targetLoteId = registroExistenteId
        if (!targetLoteId) {
          const lMatch = lotes.find(
            (l) =>
              dadosMapeados['lote_nome'] &&
              normalizeHeader(l.name) === normalizeHeader(dadosMapeados['lote_nome']),
          )
          targetLoteId = lMatch ? lMatch.id : lotes[0]?.id
        }

        if (targetLoteId) {
          await createPesagem({
            data_pesagem: dadosMapeados['data'] || new Date().toISOString().slice(0, 10),
            lote_id: targetLoteId,
            tipo: dadosMapeados['animal_id'] ? 'individual' : 'lote',
            animal_id: dadosMapeados['animal_id'] || undefined,
            qtd_animais: dadosMapeados['headcount'] || 1,
            peso_medio_kg: dadosMapeados['peso_kg'],
            peso_total_kg: dadosMapeados['peso_kg'] * (dadosMapeados['headcount'] || 1),
            origem: 'manual',
            observacoes: `Importado via Robô Maestro (${origemArquivo.nome})`,
          })
          result.criados++
          itemsAuditCriados.push({
            tipo: 'pesagem',
            animal_id: dadosMapeados['animal_id'],
            lote_id: targetLoteId,
            peso: dadosMapeados['peso_kg'],
          })
          if (!result.entidadesAfetadas.includes('Pesagens & GMD')) {
            result.entidadesAfetadas.push('Pesagens & GMD')
          }
        }
      }
    } catch (err: any) {
      console.warn('Erro ao aplicar registro da linha', reg.linhaOrigem, err)
      result.ignorados++
      result.detalhesIgnorados.push({
        linha: reg.linhaOrigem,
        motivo: `Erro de gravação: ${err.message || 'Falha ao salvar no banco'}`,
      })
    }
  }

  // 2. LANÇAMENTO NO FECHAMENTO FINANCEIRO DO CENTRO DE CUSTO "FÁBRICA DE SUPLEMENTO"
  // Quando importada planilha de estoque com consumo/custo do período calculado
  if (custoTotalFabricaSuplemento > 0) {
    try {
      const lancamento = await registrarLancamentoFinanceiro({
        data: new Date().toISOString().slice(0, 10),
        centro_custo: 'fabrica_suplemento',
        plano_contas: 'Insumos e Matérias-Primas (Fábrica de Suplemento)',
        classificacao: 'custo_variavel',
        tipo: 'despesa',
        valor: custoTotalFabricaSuplemento,
        descricao: `Consumo apurado via Robô Maestro (${origemArquivo.nome}): ${produtosFabricaDetalhes.join('; ').slice(0, 400)}`,
      })
      if (!result.entidadesAfetadas.includes('Fechamento Financeiro (Fábrica de Suplemento)')) {
        result.entidadesAfetadas.push('Fechamento Financeiro (Fábrica de Suplemento)')
      }
      itemsAuditCriados.push({
        tipo: 'lancamento_financeiro',
        id: lancamento.id,
        centro_custo: 'fabrica_suplemento',
        valor: custoTotalFabricaSuplemento,
      })
    } catch (finErr) {
      console.warn('Erro ao registrar lançamento financeiro para fábrica de suplemento:', finErr)
    }
  }

  // 3. REGISTRAR TRILHA DE AUDITORIA (APPEND-ONLY)
  const auditRecord = await registrarAuditLog({
    tipo_evento: 'criacao',
    usuario_id: usuarioAtual.id,
    usuario_nome: usuarioAtual.nome,
    perfil: usuarioAtual.perfil,
    origem: 'online',
    referencia_tipo: 'maestro_importacao',
    motivo: `Robô Maestro importou ${result.totalLidos} linhas do arquivo "${origemArquivo.nome}". Criados: ${result.criados}, Atualizados: ${result.atualizados}, Ignorados: ${result.ignorados}.${custoTotalFabricaSuplemento > 0 ? ` Custo do período fábrica de suplemento: R$ ${custoTotalFabricaSuplemento.toFixed(2)}.` : ''}`,
    payload_antes: {
      arquivo_nome: origemArquivo.nome,
      arquivo_tipo: origemArquivo.tipo,
    },
    payload_depois: {
      criados: itemsAuditCriados,
      atualizados: itemsAuditAtualizados,
      ignorados: result.detalhesIgnorados,
      entidadesAfetadas: result.entidadesAfetadas,
      custoTotalFabricaSuplemento,
    },
  })

  if (auditRecord) {
    result.protocoloAuditId = auditRecord.evento_id
  }

  return result
}

/**
 * Gera relatório formal em PDF com resumo da importação do Robô Maestro
 */
export function gerarRelatorioImportacaoPDF(
  aplicacaoResult: AplicacaoResult,
  origemArquivo: { nome: string; tipo: string },
  registros: RegistroNormalizado[],
  usuarioNome: string,
) {
  const doc = new jsPDF()

  // Cabeçalho
  doc.setFillColor(24, 76, 44) // Verde institucional Pecuária F3
  doc.rect(0, 0, 210, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PECUÁRIA F3 - ROBÔ MAESTRO', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório Oficial de Ingestão e Auditoria de Dados', 14, 18)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.text(`Arquivo de Origem: ${origemArquivo.nome} (${origemArquivo.tipo})`, 14, 32)
  doc.text(`Responsável pela Aprovação: ${usuarioNome}`, 14, 38)
  doc.text(`Data / Horário: ${new Date(aplicacaoResult.timestamp).toLocaleString('pt-BR')}`, 14, 44)
  if (aplicacaoResult.protocoloAuditId) {
    doc.text(`Protocolo de Auditoria (append-only): ${aplicacaoResult.protocoloAuditId}`, 14, 50)
  }

  // Tabela Resumo Executivo
  autoTable(doc, {
    startY: 56,
    head: [['Total Lido', 'Criados', 'Atualizados', 'Ignorados', 'Status']],
    body: [
      [
        String(aplicacaoResult.totalLidos),
        String(aplicacaoResult.criados),
        String(aplicacaoResult.atualizados),
        String(aplicacaoResult.ignorados),
        aplicacaoResult.sucesso ? 'Sucesso / Aplicado' : 'Falha Parcial',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [40, 90, 50] },
  })

  // Se for importação de estoque de insumos, gerar tabela detalhada com colunas do fechamento
  if (
    origemArquivo.tipo === 'estoque' ||
    registros.some((r) => r.dadosMapeados['insumo_produto'])
  ) {
    const tableEstoque = registros.map((r) => {
      const dm = r.dadosMapeados
      const prod = dm['insumo_produto'] || dm['produto'] || '-'
      const und = dm['insumo_unidade'] || 'kg'
      const ini = dm['insumo_estoque_inicial'] !== undefined ? dm['insumo_estoque_inicial'] : '-'
      const ent = dm['insumo_entradas'] !== undefined ? dm['insumo_entradas'] : '-'
      const sai = dm['insumo_saidas'] !== undefined ? dm['insumo_saidas'] : '-'
      const fim = dm['insumo_estoque_final'] !== undefined ? dm['insumo_estoque_final'] : '-'
      const preco =
        dm['insumo_preco_unitario'] !== undefined
          ? `R$ ${Number(dm['insumo_preco_unitario']).toFixed(2)}`
          : '-'
      const custo =
        dm['insumo_custo_periodo_rs'] !== undefined
          ? `R$ ${Number(dm['insumo_custo_periodo_rs']).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '-'
      return [
        String(r.linhaOrigem),
        r.acaoSugerida.toUpperCase(),
        String(prod),
        String(und),
        String(ini),
        String(ent),
        String(sai),
        String(fim),
        String(preco),
        String(custo),
      ]
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [
        [
          'Linha',
          'Ação',
          'Produto / Insumo',
          'Unid.',
          'Inicial',
          'Entradas',
          'Saídas',
          'Final',
          'Preço Unit.',
          'Custo Período',
        ],
      ],
      body: tableEstoque.slice(0, 100),
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [24, 76, 44] },
    })
  } else {
    // Detalhamento Padrão de Registros Aplicados (Lotes / Pesagens)
    const tableData = registros.map((r) => [
      String(r.linhaOrigem),
      r.acaoSugerida.toUpperCase(),
      Object.entries(r.dadosMapeados)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', '),
      r.conversoesExplicitas.join(' | ') || '-',
      r.alertas.join('; ') || (r.ignoradoPeloUsuario ? 'Ignorado manual' : 'OK'),
    ])

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['Linha', 'Ação', 'Dados Normalizados', 'Conversões Aplicadas', 'Alertas / Motivo']],
      body: tableData.slice(0, 100),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [70, 80, 90] },
    })
  }

  doc.save(`relatorio_maestro_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Busca mapeamento salvo anterior pela assinatura dos cabeçalhos
 */
export async function buscarMapeamentoReconhecido(
  tipoDocumento: string,
  headers: string[],
): Promise<MapeamentoSalvoRecord | null> {
  if (!headers || headers.length === 0) return null
  const assinatura = gerarAssinaturaColunas(headers)
  if (!assinatura) return null

  try {
    const records = await pb.collection('maestro_mapeamentos').getList(1, 1, {
      filter: `tipo_documento = "${tipoDocumento}" && assinatura = "${assinatura}"`,
      sort: '-updated',
    })
    if (records.items && records.items.length > 0) {
      const item = records.items[0]
      let colunas: ColumnMapping[] = []
      try {
        colunas =
          typeof item.colunas === 'string' ? JSON.parse(item.colunas) : (item.colunas as any) || []
      } catch {
        colunas = (item.colunas as any) || []
      }
      return {
        id: item.id,
        tipo_documento: item.tipo_documento,
        assinatura: item.assinatura,
        colunas,
        nome_arquivo: item.nome_arquivo,
        usuario_id: item.usuario_id,
        usuario_nome: item.usuario_nome,
        utilizacoes: item.utilizacoes || 1,
        ultima_utilizacao: item.ultima_utilizacao || item.created,
        created: item.created,
        updated: item.updated,
      }
    }
  } catch (err) {
    console.warn('Nenhum mapeamento prévio encontrado ou erro de permissão:', err)
  }
  return null
}

/**
 * Salva ou atualiza o mapeamento confirmado para que futuras importações
 * reconheçam a mesma estrutura automaticamente.
 */
export async function salvarMapeamentoConfirmado(
  tipoDocumento: string,
  headers: string[],
  mappings: ColumnMapping[],
  nomeArquivo?: string,
  usuario?: { id?: string; nome?: string },
): Promise<void> {
  if (!headers || headers.length === 0 || !mappings || mappings.length === 0) return
  const assinatura = gerarAssinaturaColunas(headers)
  if (!assinatura) return

  try {
    // Verificar se já existe registro com a mesma assinatura
    const existente = await pb.collection('maestro_mapeamentos').getList(1, 1, {
      filter: `tipo_documento = "${tipoDocumento}" && assinatura = "${assinatura}"`,
    })

    const hoje = new Date().toISOString().slice(0, 10)

    if (existente.items && existente.items.length > 0) {
      const recordId = existente.items[0].id
      const usosAtuais = existente.items[0].utilizacoes || 1
      await pb.collection('maestro_mapeamentos').update(recordId, {
        colunas: mappings,
        nome_arquivo: nomeArquivo || existente.items[0].nome_arquivo,
        usuario_id: usuario?.id || existente.items[0].usuario_id,
        usuario_nome: usuario?.nome || existente.items[0].usuario_nome,
        utilizacoes: usosAtuais + 1,
        ultima_utilizacao: hoje,
      })
    } else {
      await pb.collection('maestro_mapeamentos').create({
        tipo_documento: tipoDocumento,
        assinatura,
        colunas: mappings,
        nome_arquivo: nomeArquivo || '',
        usuario_id: usuario?.id || undefined,
        usuario_nome: usuario?.nome || '',
        utilizacoes: 1,
        ultima_utilizacao: hoje,
      })
    }
  } catch (err) {
    console.warn('Falha ao salvar mapeamento aprendido do Maestro:', err)
  }
}

/**
 * Gera arquivo de planilha oficial XLSX/XLS formatado para a equipe de campo preencher
 * Cabeçalhos mapeiam com 100% de confiança nas regras do Maestro
 */
export function baixarPlanilhaModeloOficial(tipo: 'lotes_animais' | 'pesagens' | 'estoque') {
  if (tipo === 'estoque') {
    // Template 3: Planilha Oficial de Estoque de Insumos
    // Produto, Unidade (kg/saco), Estoque Inicial, Entradas, Saídas, Estoque Final, Preço Unitário
    const dados = [
      {
        Produto: 'Milho em Grão',
        Unidade: 'kg',
        'Estoque Inicial': 50000,
        Entradas: 15000,
        Saídas: 12500,
        'Estoque Final': 52500,
        'Preço Unitário': 0.85,
        Observações: 'Custo período = (50000 + 15000 - 52500) * 0.85 = R$ 10.625,00',
      },
      {
        Produto: 'Farelo de Soja 46%',
        Unidade: 'kg',
        'Estoque Inicial': 12000,
        Entradas: 8000,
        Saídas: 6200,
        'Estoque Final': 13800,
        'Preço Unitário': 2.15,
        Observações: 'Consumo para formulação na fábrica de suplemento',
      },
      {
        Produto: 'Sal Mineral Reprodução',
        Unidade: 'saco',
        'Estoque Inicial': 120,
        Entradas: 50,
        Saídas: 45,
        'Estoque Final': 125,
        'Preço Unitário': 105.0,
        Observações: '1 saco = 30 kg. 45 sacos consumidos = 1.350 kg (R$ 4.725,00)',
      },
      {
        Produto: 'Núcleo Mineral Confinamento',
        Unidade: 'saco',
        'Estoque Inicial': 80,
        Entradas: 40,
        Saídas: 30,
        'Estoque Final': 90,
        'Preço Unitário': 135.0,
        Observações: 'Ração de terminação e fábrica',
      },
      {
        Produto: 'Ureia Pecuária',
        Unidade: 'saco',
        'Estoque Inicial': 60,
        Entradas: 20,
        Saídas: 15,
        'Estoque Final': 65,
        'Preço Unitário': 98.0,
        Observações: 'Suplemento proteico seca',
      },
    ]

    downloadExcelAsXlsx(dados, 'modelo_oficial_estoque_insumos', 'Estoque Insumos F3')
  } else if (tipo === 'lotes_animais') {
    // Template 1: Animais / Lotes
    // Quantidade, Categoria, Sexo, Pasto, Peso Médio, Suplementação
    const dados = [
      {
        Lote: 'Lote Recria 01',
        Quantidade: 85,
        Categoria: 'Garrote',
        Sexo: 'Macho',
        Pasto: 'Pasto 04 (Braquiarão)',
        'Peso Médio': '340 kg',
        Suplementação: 'Proteinado Seca',
        Observações: 'Entrada após desmame',
      },
      {
        Lote: 'Lote Matrizes A',
        Quantidade: 60,
        Categoria: 'Vaca Adulta',
        Sexo: 'Fêmea',
        Pasto: 'Pasto 07 (Mombaça)',
        'Peso Médio': '450 kg',
        Suplementação: 'Sal Mineral Adensado',
        Observações: 'Estação de monta ativa',
      },
      {
        Lote: 'Lote Engorda Tip',
        Quantidade: 100,
        Categoria: 'Boi Gordo',
        Sexo: 'Macho',
        Pasto: 'Confinamento Curral 02',
        'Peso Médio': '15 @',
        Suplementação: 'Ração Acabamento 80/20',
        Observações: 'Peso em arroba viva (será convertido para 450 kg)',
      },
    ]

    downloadExcelAsXlsx(dados, 'modelo_oficial_lotes_animais', 'Lotes e Rebanho F3')
  } else {
    // Template 2: Pesagens
    // Brinco, Data, Peso (kg), Lote
    const dados = [
      {
        Brinco: 'BR-1001',
        Data: new Date().toISOString().slice(0, 10),
        'Peso (kg)': 415.5,
        Lote: 'Lote Recria 01',
        Observações: 'Pesagem de rotina no curral',
      },
      {
        Brinco: 'BR-1002',
        Data: new Date().toISOString().slice(0, 10),
        'Peso (kg)': 398.0,
        Lote: 'Lote Recria 01',
        Observações: 'Excelente desenvolvimento zootécnico',
      },
      {
        Brinco: 'BR-1003',
        Data: new Date().toISOString().slice(0, 10),
        'Peso (kg)': 432.0,
        Lote: 'Lote Recria 01',
        Observações: 'Recalcular GMD pós 30 dias',
      },
    ]

    downloadExcelAsXlsx(dados, 'modelo_oficial_pesagens', 'Pesagens e GMD F3')
  }
}

/**
 * Gera documento de planilha em XML Spreadsheet / HTML Excel compatível com MS Excel
 * (.xlsx / .xls), aceito 100% pelo parser e pelo $documents.toMarkdown.
 */
function downloadExcelAsXlsx(
  data: Record<string, any>[],
  filename: string,
  tituloPlanilha: string,
) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<?mso-application progid="Excel.Sheet"?>\n'
  xml +=
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
    ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
    ' xmlns:html="http://www.w3.org/TR/REC-html40">\n'
  xml += ' <Styles>\n'
  xml += '  <Style ss:ID="Default" ss:Name="Normal">\n'
  xml += '   <Alignment ss:Vertical="Center"/>\n'
  xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>\n'
  xml += '  </Style>\n'
  xml += '  <Style ss:ID="Header">\n'
  xml += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n'
  xml += '   <Borders>\n'
  xml +=
    '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4D2E"/>\n'
  xml +=
    '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>\n'
  xml +=
    '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>\n'
  xml +=
    '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4D2E"/>\n'
  xml += '   </Borders>\n'
  xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>\n'
  xml += '   <Interior ss:Color="#1B4D2E" ss:Pattern="Solid"/>\n'
  xml += '  </Style>\n'
  xml += '  <Style ss:ID="Cell">\n'
  xml += '   <Borders>\n'
  xml +=
    '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n'
  xml +=
    '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n'
  xml +=
    '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n'
  xml +=
    '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>\n'
  xml += '   </Borders>\n'
  xml += '  </Style>\n'
  xml += ' </Styles>\n'

  xml += ` <Worksheet ss:Name="${tituloPlanilha}">\n`
  xml += '  <Table ss:DefaultRowHeight="20">\n'

  // Colunas com largura confortável
  headers.forEach(() => {
    xml += '   <Column ss:Width="130"/>\n'
  })

  // Linha de cabeçalho
  xml += '   <Row ss:Height="24">\n'
  headers.forEach((h) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`
  })
  xml += '   </Row>\n'

  // Linhas de dados / exemplos
  data.forEach((row) => {
    xml += '   <Row>\n'
    headers.forEach((h) => {
      const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : ''
      const isNum = !isNaN(Number(val)) && val.trim() !== ''
      const type = isNum ? 'Number' : 'String'
      xml += `    <Cell ss:StyleID="Cell"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>\n`
    })
    xml += '   </Row>\n'
  })

  xml += '  </Table>\n'
  xml += ' </Worksheet>\n'
  xml += '</Workbook>'

  const blob = new Blob([xml], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
