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

function parseRows(strings, totalExpected) {
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

const r2526 = parseRows(pdfParto2526, 756)
const r2425 = parseRows(pdfCaderno2425, 827)

console.log('r2526 parsed count:', r2526.length)
console.log('r2425 parsed count:', r2425.length)

// Analyze tokens structure
const sampleAnalysis = {
  sample2526_first5: r2526.slice(0, 5),
  sample2526_last5: r2526.slice(-5),
  sample2425_first5: r2425.slice(0, 5),
  sample2425_last5: r2425.slice(-5),
}
fs.writeFileSync('scripts/parsed_samples_debug.json', JSON.stringify(sampleAnalysis, null, 2))
console.log('Sample analysis written')
