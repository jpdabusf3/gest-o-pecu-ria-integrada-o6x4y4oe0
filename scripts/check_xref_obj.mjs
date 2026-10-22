import fs from 'fs'
import zlib from 'zlib'

// Helper to inspect PDF structure
const files = [
  'src/assets/relatrio-final-iatf-faz.sto-antonio-e.m.25-26-2-7a65c.pdf',
  'src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf',
  'src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf',
]

export function inspectPdfStreams() {
  const buf = fs.readFileSync(
    'src/assets/relatrio-final-iatf-faz.sto-antonio-e.m.25-26-2-7a65c.pdf',
  )
  const str = buf.toString('latin1')
  // Check text without decompression
  const matches = str.match(/[A-Z0-9\s]{4,}/g) || []
  return { len: buf.length, matchesCount: matches.length }
}
