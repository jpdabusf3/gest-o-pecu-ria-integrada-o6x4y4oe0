import fs from 'fs'

const allData = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfCaderno2425 =
  allData['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf']
    .allParsedStrings

let weightMatches = []
for (let i = 0; i < pdfCaderno2425.length; i++) {
  const s = pdfCaderno2425[i]
  if (/kg|peso|desmam|nasc/i.test(s)) {
    weightMatches.push({
      index: i,
      str: s,
      context: pdfCaderno2425.slice(Math.max(0, i - 3), i + 4),
    })
  }
}

fs.writeFileSync('scripts/weight_matches.json', JSON.stringify(weightMatches, null, 2))
console.log('Weight matches found:', weightMatches.length)
