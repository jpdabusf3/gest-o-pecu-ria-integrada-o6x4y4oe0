import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ConfigBenchmarkHistoricoRecord } from '@/services/configBenchmark'

export interface GerarPdfBenchmarkingParams {
  nomeFazenda?: string
  safras: string[]
  indicadorFiltroNome?: string
  dadosGrafico: {
    safra: string
    data: string
    media: number
    referencia: number
    top: number
    alvo: number
    usuario: string
  }[]
  registros: ConfigBenchmarkHistoricoRecord[]
  unidadeIndicador?: string
}

export function gerarPdfHistoricoBenchmarking({
  nomeFazenda = 'Fazenda F3 — Pecuária Inteligente',
  safras,
  indicadorFiltroNome,
  dadosGrafico,
  registros,
  unidadeIndicador,
}: GerarPdfBenchmarkingParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Cabeçalho Principal com Barra Verde
  doc.setFillColor(16, 120, 70) // Verde escuro elegante
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RELATÓRIO DE HISTÓRICO DE BENCHMARKING', 14, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${nomeFazenda} | Metas & Faixas Estratégicas Exagro`, 14, 18)

  doc.setFontSize(8)
  const textoData = `Emissão: ${dataEmissao}`
  doc.text(textoData, pageWidth - 14 - doc.getTextWidth(textoData), 18)

  // Sub-bloco de informações
  let y = 32
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Escopo do Relatório', 14, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const safrasText = safras.length > 0 ? safras.join(', ') : 'Todas as safras registradas'
  doc.text(`• Safras abrangidas: ${safrasText}`, 14, y)

  y += 4.5
  doc.text(
    `• Indicador em Destaque: ${indicadorFiltroNome || 'Visão Consolidada'} ${
      unidadeIndicador ? `(${unidadeIndicador})` : ''
    }`,
    14,
    y,
  )

  y += 4.5
  doc.text(
    '• Regras Zootécnicas: GMD expresso estritamente em kg/dia; Metas de Cria avaliadas por Desmame (≥75%) e kg/matriz (≥190 kg).',
    14,
    y,
  )

  y += 8

  // Resumo da Evolução (Tabela de Linhas do Indicador Selecionado)
  if (dadosGrafico && dadosGrafico.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(16, 120, 70)
    doc.text(`Evolução das Faixas Safra a Safra — ${indicadorFiltroNome || 'Indicador'}`, 14, y)
    y += 2

    const rowsGrafico = dadosGrafico.map((d) => [
      d.safra,
      d.data,
      d.media.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      d.referencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      d.top.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      d.alvo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      d.usuario,
    ])

    autoTable(doc, {
      startY: y + 2,
      head: [
        [
          'Safra',
          'Data Calibração',
          'Média Exagro',
          'Referência',
          'TOP Brasil',
          'Alvo Fazenda',
          'Responsável',
        ],
      ],
      body: rowsGrafico,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 50,
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] },
        4: { halign: 'right', fontStyle: 'bold', textColor: [147, 51, 234] },
        5: { halign: 'right', fontStyle: 'bold', textColor: [16, 120, 70] },
        6: { halign: 'left' },
      },
      margin: { left: 14, right: 14 },
    })

    // Atualiza coordenada Y após a tabela
    y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : y + 35
  }

  // Tabela Completa de Snapshots Históricos
  if (y > pageHeight - 50) {
    doc.addPage()
    y = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(16, 120, 70)
  doc.text('Histórico Completo de Snapshots e Recalibrações Registradas', 14, y)
  y += 2

  const rowsRegistros = registros.map((r) => {
    const dataFormatada = r.data_recalibracao
      ? new Date(r.data_recalibracao).toLocaleDateString('pt-BR')
      : '—'
    const unidade = r.unidade || ''

    return [
      dataFormatada,
      r.ano_safra,
      `${r.indicador} (${unidade})`,
      r.valor_media.toLocaleString('pt-BR'),
      r.valor_referencia.toLocaleString('pt-BR'),
      r.valor_top.toLocaleString('pt-BR'),
      r.alvo_fazenda.toLocaleString('pt-BR'),
      r.usuario_nome || 'Gestor',
    ]
  })

  autoTable(doc, {
    startY: y + 2,
    head: [
      [
        'Data',
        'Safra',
        'Indicador (Unid.)',
        'Média',
        'Referência',
        'TOP Brasil',
        'Alvo Fazenda',
        'Responsável',
      ],
    ],
    body: rowsRegistros,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 120, 70],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: 50,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 50 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      5: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      6: { halign: 'right', cellWidth: 20, fontStyle: 'bold', textColor: [16, 120, 70] },
      7: { halign: 'left' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé da página
      const pageStr = `Página ${data.pageNumber}`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(130, 130, 130)
      doc.text(pageStr, pageWidth - 14 - doc.getTextWidth(pageStr), pageHeight - 8)
      doc.text('Pecuária Inteligente F3 — Sistema de Gestão Pecuária Integrada', 14, pageHeight - 8)
    },
  })

  // Download automático do PDF
  const nomeArquivo = `Benchmarking_Historico_${safras[0] || 'Safra'}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomeArquivo)
}
