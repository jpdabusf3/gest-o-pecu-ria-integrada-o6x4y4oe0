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

// 1. Parse Parto 25-26
// Headers: Série, Número, Categoria, DG, Touro, Data Cobertura, Previsão de Parto (290), Nascimento, Observações
// Rows: sequential index 1..756
let i = 0
const rows2526 = []
while (i < pdfParto2526.length) {
  const s = pdfParto2526[i]
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2526.length + 1) {
    const idx = parseInt(s, 10)
    // Gather tokens until next number or end
    let nextIdxPos = -1
    for (let k = i + 1; k < pdfParto2526.length; k++) {
      if (/^\d+$/.test(pdfParto2526[k]) && parseInt(pdfParto2526[k], 10) === idx + 1) {
        nextIdxPos = k
        break
      }
    }
    const tokens =
      nextIdxPos !== -1 ? pdfParto2526.slice(i, nextIdxPos) : pdfParto2526.slice(i, i + 12)
    rows2526.push({ idx, tokens })
  }
  i++
}

// 2. Parse Caderno 24-25
let j = 0
const rows2425 = []
while (j < pdfCaderno2425.length) {
  const s = pdfCaderno2425[j]
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2425.length + 1) {
    const idx = parseInt(s, 10)
    let nextIdxPos = -1
    for (let k = j + 1; k < pdfCaderno2425.length; k++) {
      if (/^\d+$/.test(pdfCaderno2425[k]) && parseInt(pdfCaderno2425[k], 10) === idx + 1) {
        nextIdxPos = k
        break
      }
    }
    const tokens =
      nextIdxPos !== -1 ? pdfCaderno2425.slice(j, nextIdxPos) : pdfCaderno2425.slice(j, j + 14)
    rows2425.push({ idx, tokens })
  }
  j++
}

const sampleParsed = {
  total2526: rows2526.length,
  total2425: rows2425.length,
  r2526_1: rows2526[0],
  r2526_10: rows2526[9],
  r2526_100: rows2526[99],
  r2526_756: rows2526[rows2526.length - 1],
  r2425_1: rows2425[0],
  r2425_10: rows2425[9],
  r2425_100: rows2425[99],
  r2425_827: rows2425[rows2425.length - 1],
}

fs.writeFileSync('scripts/parsed_rows_debug.json', JSON.stringify(sampleParsed, null, 2))
