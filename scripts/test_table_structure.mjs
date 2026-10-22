import fs from 'fs'

const data = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfParto2526 =
  data['src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf'].allParsedStrings
const pdfCaderno2425 =
  data['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf'].allParsedStrings

const summary = {
  parto2526Count: pdfParto2526.length,
  caderno2425Count: pdfCaderno2425.length,
  rows2526Count: rows2526.length,
  rows2425Count: rows2425.length,
}
fs.writeFileSync('scripts/table_summary.json', JSON.stringify(summary, null, 2))

// Let's test parsing Parto 25-26
// Header seems: 0, Série, Número, Categoria, DG, Touro, Data Cobertura, Previsão de Parto, \(290\, Nascimento, Observações
// Then items: 1, NEL, 4168, Nulípara, Gestante, REPASSE, 01/10/2025, 18/07/2026 ...
// Let's analyze structure
let i = 0
const rows2526 = []
while (i < pdfParto2526.length) {
  const s = pdfParto2526[i]
  // check if s is a number (row index 1..756)
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2526.length + 1) {
    const idx = parseInt(s, 10)
    // collect following items
    rows2526.push({
      idx,
      startPos: i,
    })
  }
  i++
}
console.log('Found sequential numbered rows in 25-26:', rows2526.length)
if (rows2526.length > 0) {
  console.log('First row idx:', rows2526[0].idx, 'Last row idx:', rows2526[rows2526.length - 1].idx)
}

let j = 0
const rows2425 = []
while (j < pdfCaderno2425.length) {
  const s = pdfCaderno2425[j]
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2425.length + 1) {
    const idx = parseInt(s, 10)
    rows2425.push({
      idx,
      startPos: j,
    })
  }
  j++
}
console.log('Found sequential numbered rows in 24-25:', rows2425.length)
if (rows2425.length > 0) {
  console.log(
    'First row idx 24-25:',
    rows2425[0].idx,
    'Last row idx 24-25:',
    rows2425[rows2425.length - 1].idx,
  )
}
