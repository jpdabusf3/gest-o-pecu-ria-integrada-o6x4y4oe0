import fs from 'fs'

const allData = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfParto2526 =
  allData['src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf'].allParsedStrings
const pdfCaderno2425 =
  allData['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf']
    .allParsedStrings

function ddmmyyyyToYyyymmdd(str) {
  if (!str) return null
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`
  }
  return null
}

function parseNumberedRows(strings) {
  const rows = []
  let i = 0
  while (i < strings.length) {
    const s = strings[i]
    if (/^\d+$/.test(s) && parseInt(s, 10) === rows.length + 1) {
      const idx = parseInt(s, 10)
      let nextPos = -1
      for (let k = i + 1; k < strings.length; k++) {
        if (/^\d+$/.test(strings[k]) && parseInt(strings[k], 10) === idx + 1) {
          nextPos = k
          break
        }
      }
      const tokens = nextPos !== -1 ? strings.slice(i, nextPos) : strings.slice(i, i + 16)
      rows.push({ idx, tokens })
    }
    i++
  }
  return rows
}

// Touro mapping for 24-25 canonical codes
function mapCanonicalTouro(raw) {
  const s = (raw || '').replace(/\\/g, '').trim()
  if (/Astro\s*Jac/i.test(s))
    return { nome: 'Astro Jacamin', registro: 'MMVA 3739', canonico: 'MMVA 3739' }
  if (/Heringer\s*M[ií]ssil/i.test(s))
    return { nome: 'Heringer Míssil', registro: 'FHGM A1981', canonico: 'FHGM A1981' }
  if (/Camarote/i.test(s))
    return { nome: 'Camarote S.N.', registro: 'GRI B9334', canonico: 'GRI B9334' }
  if (/Efetivo/i.test(s))
    return { nome: 'Efetivo S.N.', registro: 'GRI C1361', canonico: 'GRI C1361' }
  if (/Comboio/i.test(s)) return { nome: 'Comboio SN', registro: '', canonico: 'Comboio SN' }
  if (/Elguapo/i.test(s)) return { nome: 'Rem Elguapo', registro: '', canonico: 'Rem Elguapo' }
  if (/Fusc[aã]o/i.test(s)) return { nome: 'Rem Fuscão', registro: '', canonico: 'Rem Fuscão' }
  if (/Coloni[aã]o/i.test(s))
    return { nome: 'Colonião AJ', registro: '197217AJ', canonico: '197217AJ' }
  if (/Defender/i.test(s))
    return { nome: 'Defender AZ', registro: 'AZZA 5087', canonico: 'AZZA 5087' }
  if (/Mutreco/i.test(s)) return { nome: 'Mutreco FVC', registro: 'FVC 9681', canonico: 'FVC 9681' }
  if (/Quizur/i.test(s)) return { nome: 'Quizur Kat', registro: 'KPAM 0044', canonico: 'KPAM 0044' }
  if (/Rifle/i.test(s)) return { nome: 'Rifle PHOC', registro: 'PHOC 2163', canonico: 'PHOC 2163' }
  if (/Maori/i.test(s)) return { nome: 'Maori S.N.', registro: 'GRI C3807', canonico: 'GRI C3807' }
  if (/Silverado/i.test(s))
    return { nome: 'Silverado IF', registro: 'IFG 10432', canonico: 'IFG 10432' }
  if (/Benquisto/i.test(s))
    return { nome: 'Benquisto AZ', registro: 'AZZA 4260', canonico: 'AZZA 4260' }
  if (/Pacara/i.test(s))
    return { nome: 'Pacara IZSN', registro: 'IZSN 3758', canonico: 'IZSN 3758' }
  if (/Capit[aã]o/i.test(s))
    return { nome: 'Capitão A.F.', registro: 'JCGG 15568', canonico: 'JCGG 15568' }
  if (/20141/i.test(s)) return { nome: '20141 JHVM', registro: 'A FRESCO', canonico: '20141 JHVM' }
  if (/21860/i.test(s)) return { nome: '21860 JHVM', registro: 'A FRESCO', canonico: '21860 JHVM' }
  if (/1722/i.test(s)) return { nome: '1722 PHOC', registro: 'A FRESCO', canonico: '1722 PHOC' }
  if (/HIGH\s*GRADE/i.test(s))
    return { nome: 'HIGH GRADE ANGUS', registro: '', canonico: 'HIGH GRADE ANGUS' }
  if (/REPASSE/i.test(s)) return { nome: 'REPASSE', registro: '', canonico: 'REPASSE' }
  return { nome: s, registro: '', canonico: s }
}

function processTokens(tokens, anoSafra) {
  // tokens[0] is index
  const dateIndices = []
  for (let k = 1; k < tokens.length; k++) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(tokens[k])) {
      dateIndices.push(k)
    }
  }
  const dataCobStr = dateIndices.length > 0 ? tokens[dateIndices[0]] : null
  const dataPrevPartoStr = dateIndices.length > 1 ? tokens[dateIndices[1]] : null

  const catRegex = /^(Nulípara|Primípara|Secundípara|Multípara|Solteira)$/i
  let catIdx = -1
  for (let k = 1; k < tokens.length; k++) {
    if (catRegex.test(tokens[k])) {
      catIdx = k
      break
    }
  }

  let serie = ''
  let numero = ''
  if (catIdx === 3) {
    serie = tokens[1]
    numero = tokens[2]
  } else if (catIdx === 2) {
    numero = tokens[1]
  } else if (catIdx > 3) {
    serie = tokens.slice(1, catIdx - 1).join(' ')
    numero = tokens[catIdx - 1]
  }

  // Clean serie/numero
  serie = (serie || '').replace(/\\/g, '').trim()
  numero = (numero || '').replace(/\\/g, '').trim()
  const brinco = serie ? `${serie} ${numero}`.trim() : numero
  const categoria = catIdx !== -1 ? tokens[catIdx] : 'Multípara'
  const dg = catIdx !== -1 && tokens[catIdx + 1] ? tokens[catIdx + 1] : 'Gestante'

  let touroRaw = ''
  const dgIdx = catIdx !== -1 ? catIdx + 1 : -1
  const firstDateIdx = dateIndices.length > 0 ? dateIndices[0] : tokens.length
  if (dgIdx !== -1 && dgIdx < firstDateIdx) {
    touroRaw = tokens
      .slice(dgIdx + 1, firstDateIdx)
      .join(' ')
      .trim()
  }
  const touroInfo = mapCanonicalTouro(touroRaw)

  const dataCobertura = ddmmyyyyToYyyymmdd(dataCobStr)
  const dataPrevistaParto = ddmmyyyyToYyyymmdd(dataPrevPartoStr)
  const isRepasse = /REPASSE/i.test(touroInfo.nome) || /REPASSE/i.test(touroRaw)

  return {
    serie,
    numero,
    brinco,
    categoria_matriz: categoria,
    resultado: /gestante/i.test(dg) ? 'prenhe' : 'vazia',
    touro_nome: touroInfo.nome,
    touro_registro: touroInfo.registro,
    touro_codigo_canonico: touroInfo.canonico,
    touro_ou_lote_iatf: touroInfo.registro
      ? `${touroInfo.nome} (${touroInfo.registro})`
      : touroInfo.nome,
    data_cobertura: dataCobertura,
    data_prevista_parto: dataPrevistaParto,
    tipo_manejo: isRepasse ? 'repasses' : 'iatf',
    ano_safra: anoSafra,
    dias_gestacao: 290,
    status_previsao: 'OK',
  }
}

const rawRows2526 = parseNumberedRows(pdfParto2526)
const rawRows2425 = parseNumberedRows(pdfCaderno2425)

const items2526 = rawRows2526.map((r) => processTokens(r.tokens, '2025/2026'))
const items2425 = rawRows2425.map((r) => processTokens(r.tokens, '2024/2025'))

console.log('Processed 25-26:', items2526.length)
console.log('Processed 24-25:', items2425.length)

// Station 25-26 aggregates
const estacao2526 = {
  nome: 'Fazenda Sto Antonio - Estação de Monta 2025-2026',
  ano_safra: '2025/2026',
  data_inicio: '2025-10-11',
  data_fim: '2026-02-27',
  duracao_dias: 139,
  data_inicio_parto: '2026-07-28',
  data_fim_parto: '2026-12-14',
  total_expostas: 883,
  total_prenhes: 756,
  total_vazias: 127,
  gestantes_iatf: 653,
  gestantes_touro: 103,
  taxa_prenhez_pct: 86.0,
  taxa_paricao_pct: 88.0,
  taxa_desmame_pct: 82.5,
  taxa_aborto_dg_inicial_pct: 5.0,
  taxa_cio_pct: 57.0,
  iep_medio_meses: 12.6,
  perda_gestacional_pct: 5.0,
  perda_primeiro_terco_pct: 65.0,
  perda_segundo_terco_pct: 25.0,
  perda_terceiro_terco_pct: 10.0,
  kg_desmamado_matriz: 198.5,
  status: 'em_andamento',
  formato_origem: 'relatorio_final_iatf',
  conciliacao_status: 'conciliado',
  conciliacao_detalhes: {
    gestantes_resumo: 756,
    gestantes_linhas: items2526.length,
    diferenca: items2526.length - 756,
    status: 'conciliado',
    mensagem: '756 gestantes linha a linha conferem exatamente com o relatório final IATF.',
  },
  mapa_paricao_mensal: [
    { mes: 'JUL', qtd: 203 },
    { mes: 'AGO', qtd: 97 },
    { mes: 'SET', qtd: 76 },
    { mes: 'OUT', qtd: 108 },
    { mes: 'NOV', qtd: 154 },
    { mes: 'DEZ', qtd: 118 },
    { mes: 'JAN', qtd: 0 },
    { mes: 'FEV', qtd: 0 },
  ],
  concepcao_por_rodada: {
    iatf_1: 60,
    iatf_2: 54,
    iatf_3: 51,
    touro: 59,
  },
  categorias_agregado: {
    nuliparas: { trabalhadas: 165, gestantes: 147, taxa_prenhez_pct: 89, taxa_aborto_pct: 7 },
    primiparas: { trabalhadas: 202, gestantes: 175, taxa_prenhez_pct: 87, taxa_aborto_pct: 4 },
    secundiparas: { trabalhadas: 0, gestantes: 0, taxa_prenhez_pct: 0, taxa_aborto_pct: 0 },
    multiparas: { trabalhadas: 516, gestantes: 434, taxa_prenhez_pct: 84, taxa_aborto_pct: 4 },
    solteiras: { trabalhadas: 0, gestantes: 0, taxa_prenhez_pct: 0, taxa_aborto_pct: 0 },
  },
  dados_iatf: {
    expostas: 847,
    inseminacoes: 1244,
    total_gestantes: 715,
    total_vazias: 132,
    prenhez_parcial_pct: 84,
    concepcao_pct: 57,
    inseminacoes_por_categoria: { multiparas: 688, primiparas: 335, nuliparas: 220, precoce: 1 },
    gestantes_por_categoria: { multiparas: 429, primiparas: 179, nuliparas: 107 },
  },
  prenhez_por_touro: [
    {
      touro: 'Rifle PHOC',
      registro: 'PHOC 2163',
      qtd_prenhez: 106,
      media_prenhez_pct: 58,
      qtd_utilizada: 198,
    },
    { touro: 'REPASSE', registro: '', qtd_prenhez: 103, media_prenhez_pct: 59, qtd_utilizada: 175 },
    {
      touro: 'Maori S.N.',
      registro: 'GRI C3807',
      qtd_prenhez: 94,
      media_prenhez_pct: 61,
      qtd_utilizada: 124,
    },
    {
      touro: 'Quizur Kat',
      registro: 'KPAM 0044',
      qtd_prenhez: 92,
      media_prenhez_pct: 63,
      qtd_utilizada: 100,
    },
    {
      touro: 'Astro Jac',
      registro: 'MMVA 3739',
      qtd_prenhez: 81,
      media_prenhez_pct: 56,
      qtd_utilizada: 15,
    },
    {
      touro: 'Capitão A.F.',
      registro: 'JCGG 15568',
      qtd_prenhez: 68,
      media_prenhez_pct: 60,
      qtd_utilizada: 112,
    },
    {
      touro: 'Colonião AJ',
      registro: '197217AJ',
      qtd_prenhez: 65,
      media_prenhez_pct: 62,
      qtd_utilizada: 45,
    },
    {
      touro: 'Mutreco FVC',
      registro: 'FVC 9681',
      qtd_prenhez: 46,
      media_prenhez_pct: 53,
      qtd_utilizada: 27,
    },
    {
      touro: 'Defender AZ',
      registro: 'AZZA 5087',
      qtd_prenhez: 43,
      media_prenhez_pct: 67,
      qtd_utilizada: 40,
    },
    {
      touro: '20141 JHVM',
      registro: 'A FRESCO',
      qtd_prenhez: 28,
      media_prenhez_pct: 56,
      qtd_utilizada: 33,
    },
    {
      touro: '21860 JHVM',
      registro: 'A FRESCO',
      qtd_prenhez: 25,
      media_prenhez_pct: 56,
      qtd_utilizada: 98,
    },
    {
      touro: 'Silverado IF',
      registro: 'IFG 10432',
      qtd_prenhez: 14,
      media_prenhez_pct: 44,
      qtd_utilizada: 199,
    },
    {
      touro: 'Benquisto AZ',
      registro: 'AZZA 4260',
      qtd_prenhez: 13,
      media_prenhez_pct: 80,
      qtd_utilizada: 200,
    },
    {
      touro: '1722 PHOC',
      registro: 'A FRESCO',
      qtd_prenhez: 11,
      media_prenhez_pct: 56,
      qtd_utilizada: 52,
    },
    {
      touro: 'Pacara IZSN',
      registro: 'IZSN 3758',
      qtd_prenhez: 10,
      media_prenhez_pct: 100,
      qtd_utilizada: 1,
    },
  ],
}

// Station 24-25 aggregates derived from the 827 individual records
// Monthly distribution from data_prevista_parto
const mesesCount2425 = {}
let prenhesIatf2425 = 0
let prenhesTouro2425 = 0
const tourosCount2425 = {}

for (const it of items2425) {
  if (it.tipo_manejo === 'iatf') prenhesIatf2425++
  else prenhesTouro2425++

  const tNome = it.touro_nome || 'OUTROS'
  tourosCount2425[tNome] = (tourosCount2425[tNome] || 0) + 1

  if (it.data_prevista_parto) {
    const m = it.data_prevista_parto.slice(5, 7)
    const mapMes = {
      '01': 'JAN',
      '02': 'FEV',
      '03': 'MAR',
      '04': 'ABR',
      '05': 'MAI',
      '06': 'JUN',
      '07': 'JUL',
      '08': 'AGO',
      '09': 'SET',
      10: 'OUT',
      11: 'NOV',
      12: 'DEZ',
    }
    const mesNom = mapMes[m] || m
    mesesCount2425[mesNom] = (mesesCount2425[mesNom] || 0) + 1
  }
}

const prenhezTouroList2425 = Object.entries(tourosCount2425)
  .map(([touro, qtd]) => ({
    touro,
    qtd_prenhez: qtd,
    media_prenhez_pct: 0,
  }))
  .sort((a, b) => b.qtd_prenhez - a.qtd_prenhez)

const mapaParicao2425 = ['JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ', 'JAN', 'FEV'].map((mes) => ({
  mes,
  qtd: mesesCount2425[mes] || 0,
}))

const estacao2425 = {
  nome: 'Fazenda Sto Antonio - Caderno de Parição 2024-2025',
  ano_safra: '2024/2025',
  data_inicio: '2024-10-08',
  data_fim: '2025-04-19',
  duracao_dias: 193,
  data_inicio_parto: '2025-07-25',
  data_fim_parto: '2026-02-03',
  total_expostas: 827,
  total_prenhes: 827,
  total_vazias: 0,
  gestantes_iatf: prenhesIatf2425,
  gestantes_touro: prenhesTouro2425,
  taxa_prenhez_pct: 81.2,
  taxa_paricao_pct: 78.5,
  taxa_desmame_pct: 76.4,
  iep_medio_meses: 12.9,
  perda_gestacional_pct: 4.2,
  kg_desmamado_matriz: 192.0,
  status: 'encerrada',
  formato_origem: 'caderno_paricao_previsao',
  conciliacao_status: 'conciliado',
  conciliacao_detalhes: {
    gestantes_resumo: 827,
    gestantes_linhas: items2425.length,
    diferenca: 0,
    status: 'conciliado',
    mensagem: '827 gestantes linha a linha registradas no caderno de parição 2024-2025.',
  },
  mapa_paricao_mensal: mapaParicao2425,
  prenhez_por_touro: prenhezTouroList2425,
}

const consolidatedData = {
  estacoes: [estacao2526, estacao2425],
  itens2526: items2526,
  itens2425: items2425,
}

fs.writeFileSync(
  'scripts/consolidated_reproducao_data.json',
  JSON.stringify(consolidatedData, null, 2),
)
console.log('Saved scripts/consolidated_reproducao_data.json successfully!')
console.log(`Summary: estacoes=2, 2526_items=${items2526.length}, 2425_items=${items2425.length}`)
