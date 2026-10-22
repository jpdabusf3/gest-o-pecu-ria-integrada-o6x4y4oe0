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

const r2526 = parseNumberedRows(pdfParto2526)
const r2425 = parseNumberedRows(pdfCaderno2425)

console.log('r2526 length:', r2526.length)
console.log('r2425 length:', r2425.length)

// Check tokens around end of each row in 2425
const sampleWithNascimentoOrObs = []
for (const r of r2425) {
  if (r.tokens.length > 8) {
    sampleWithNascimentoOrObs.push({
      idx: r.idx,
      tokens: r.tokens,
    })
  }
}
console.log('r2425 rows with > 8 tokens:', sampleWithNascimentoOrObs.length)
if (sampleWithNascimentoOrObs.length > 0) {
  console.log(
    'First 5 sample rows with > 8 tokens:',
    JSON.stringify(sampleWithNascimentoOrObs.slice(0, 5), null, 2),
  )
}
