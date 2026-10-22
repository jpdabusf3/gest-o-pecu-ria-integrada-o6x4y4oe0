import fs from 'fs'

const data = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfParto2526 =
  data['src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf'].allParsedStrings
const pdfCaderno2425 =
  data['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf'].allParsedStrings

function ddmmyyyyToYyyymmdd(str) {
  if (!str) return null
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`
  }
  return null
}

function parseRows(strings) {
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
      const tokens = nextPos !== -1 ? strings.slice(i, nextPos) : strings.slice(i, i + 15)
      rows.push({ idx, tokens })
    }
    i++
  }
  return rows
}

const r2526 = parseRows(pdfParto2526)
const r2425 = parseRows(pdfCaderno2425)

// Let's inspect token structures for 25-26
// Format in PDF header: [Index], Série, Número, Categoria, DG, Touro, Data Cobertura, Previsão de Parto (290), Nascimento, Observações
// Notice tokens[0] is the index string (e.g. "1")
function parseItem2526(r) {
  const tokens = r.tokens
  // tokens[0] is idx e.g. "1"
  // Let's find dates (DD/MM/YYYY)
  const dateIndices = []
  for (let k = 1; k < tokens.length; k++) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(tokens[k])) {
      dateIndices.push(k)
    }
  }
  let dataCobertura = null
  let dataPrevistaParto = null
  if (dateIndices.length >= 2) {
    dataCobertura = tokens[dateIndices[0]]
    dataPrevistaParto = tokens[dateIndices[1]]
  } else if (dateIndices.length === 1) {
    dataCobertura = tokens[dateIndices[0]]
  }

  // Categoria: Nulípara, Primípara, Secundípara, Multípara, Solteira
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

  const categoria = catIdx !== -1 ? tokens[catIdx] : 'Multípara'

  // DG is typically tokens[catIdx + 1] e.g. "Gestante" or "Vazia"
  // Touro is between DG and dateIndices[0]
  let touroRaw = ''
  const dgIdx = catIdx !== -1 ? catIdx + 1 : -1
  const firstDateIdx = dateIndices.length > 0 ? dateIndices[0] : tokens.length
  if (dgIdx !== -1 && dgIdx < firstDateIdx) {
    touroRaw = tokens
      .slice(dgIdx + 1, firstDateIdx)
      .join(' ')
      .trim()
  }

  return {
    idx: r.idx,
    serie,
    numero,
    brinco: serie ? `${serie} ${numero}`.trim() : numero,
    categoria,
    dg: dgIdx !== -1 ? tokens[dgIdx] : 'Gestante',
    touro: touroRaw,
    dataCobertura: ddmmyyyyToYyyymmdd(dataCobertura),
    dataPrevistaParto: ddmmyyyyToYyyymmdd(dataPrevistaParto),
    rawTokens: tokens,
  }
}

const parsedItems2526 = r2526.map(parseItem2526)
const parsedItems2425 = r2425.map(parseItem2526)

fs.writeFileSync(
  'scripts/parsed_debug_result.json',
  JSON.stringify(
    {
      count2526: parsedItems2526.length,
      count2425: parsedItems2425.length,
      first10_2526: parsedItems2526.slice(0, 10),
      first10_2425: parsedItems2425.slice(0, 10),
      touros2526: Array.from(new Set(parsedItems2526.map((x) => x.touro))),
      touros2425: Array.from(new Set(parsedItems2425.map((x) => x.touro))),
    },
    null,
    2,
  ),
)
console.log('Result written')
