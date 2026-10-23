// scripts/make_compact_migration.mjs
import fs from 'fs'

const allData = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfParto2526 =
  allData['src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf'].allParsedStrings
const pdfCaderno2425 =
  allData['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf']
    .allParsedStrings

console.log('Generating scripts/compact_data_2526.json and scripts/compact_data_2425.json...')

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

  let pesoDesmama = null
  const afterSecondDateIdx = dateIndices.length > 1 ? dateIndices[1] + 1 : tokens.length
  for (let t = afterSecondDateIdx; t < tokens.length; t++) {
    const mWeight = tokens[t].match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i)
    if (mWeight) {
      const val = parseFloat(mWeight[1].replace(',', '.'))
      if (val > 30 && val < 500) {
        pesoDesmama = val
        break
      }
    }
  }

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
    peso_bezerro_desmama_kg: pesoDesmama,
  }
}

const rawRows2526 = parseNumberedRows(pdfParto2526)
const rawRows2425 = parseNumberedRows(pdfCaderno2425)

const items2526 = rawRows2526.map((r) => processTokens(r.tokens, '2025/2026'))
const items2425 = rawRows2425.map((r) => processTokens(r.tokens, '2024/2025'))

console.log('2526:', items2526.length, '2425:', items2425.length)

// Format compact arrays:
// For 2526 (exames_gestacao):
// [brinco, serie, numero, categoria, resultado, touro_nome, touro_reg, touro_lote, data_cob, data_parto, tipo_manejo, peso_desm]
const compact2526 = items2526.map((it) => [
  it.brinco || '',
  it.serie || '',
  it.numero || '',
  it.categoria_matriz || '',
  it.resultado || 'prenhe',
  it.touro_nome || '',
  it.touro_registro || '',
  it.touro_ou_lote_iatf || '',
  it.data_cobertura || '',
  it.data_prevista_parto || '',
  it.tipo_manejo || 'iatf',
  it.peso_bezerro_desmama_kg || null,
])

// For 2425 (historico_matrizes):
// [brinco, serie, numero, categoria, resultado, touro_nome, touro_canonico, rotuloTouro, data_cob, data_parto, peso_desm]
const compact2425 = items2425.map((mat) => {
  const canonico = mat.touro_codigo_canonico || mat.touro_registro || ''
  const rotuloTouro = canonico ? `${mat.touro_nome} (${canonico})` : mat.touro_nome || ''
  return [
    mat.brinco || '',
    mat.serie || '',
    mat.numero || '',
    mat.categoria_matriz || '',
    mat.resultado || 'prenhe',
    mat.touro_nome || '',
    canonico,
    rotuloTouro,
    mat.data_cobertura || '',
    mat.data_prevista_parto || '',
    mat.peso_bezerro_desmama_kg || null,
  ]
})

fs.writeFileSync('scripts/compact_data_2526.json', JSON.stringify(compact2526))
fs.writeFileSync('scripts/compact_data_2425.json', JSON.stringify(compact2425))
console.log('2526 JSON size bytes:', fs.statSync('scripts/compact_data_2526.json').size)
console.log('2425 JSON size bytes:', fs.statSync('scripts/compact_data_2425.json').size)
