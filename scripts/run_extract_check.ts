import fs from 'fs'
import { consolidatedRecords } from './src/data/dados_reprodutivos_individuais.ts'

console.log('2526 total:', consolidatedRecords.itens2526.length)
console.log('2425 total:', consolidatedRecords.itens2425.length)

const cat2526 = {}
for (const it of consolidatedRecords.itens2526) {
  cat2526[it.categoria_matriz] = (cat2526[it.categoria_matriz] || 0) + 1
}
console.log('2526 categories:', cat2526)

fs.writeFileSync(
  'scripts/dados_reprodutivos_consolidados.json',
  JSON.stringify(consolidatedRecords),
)
console.log('Saved scripts/dados_reprodutivos_consolidados.json')
