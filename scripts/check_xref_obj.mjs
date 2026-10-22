import fs from 'fs'

const buf = fs.readFileSync('src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf')
const str = buf.toString('latin1')
// Find object with /XRef or /Type /XRef
const xrefObj = str.match(/\d+\s+\d+\s+obj[\s\S]*?\/Type\s*\/XRef[\s\S]*?endobj/)
console.log('Xref obj:', xrefObj ? xrefObj[0].slice(0, 300) : 'none')
