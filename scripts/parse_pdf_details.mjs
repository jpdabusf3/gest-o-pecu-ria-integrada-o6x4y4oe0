import fs from 'fs'
import zlib from 'zlib'

function extractPdfTextStreams(filePath) {
  const buf = fs.readFileSync(filePath)
  const str = buf.toString('latin1')
  const streamStarts = []
  let pos = 0
  while (pos < str.length) {
    const p1 = str.indexOf('stream\r\n', pos)
    const p2 = str.indexOf('stream\n', pos)
    let nextPos = -1
    let isCrLf = false
    if (p1 !== -1 && p2 !== -1) {
      if (p1 <= p2) {
        nextPos = p1
        isCrLf = true
      } else {
        nextPos = p2
        isCrLf = false
      }
    } else if (p1 !== -1) {
      nextPos = p1
      isCrLf = true
    } else if (p2 !== -1) {
      nextPos = p2
      isCrLf = false
    } else {
      break
    }
    const start = nextPos + (isCrLf ? 8 : 7)
    const end = str.indexOf('endstream', start)
    if (end !== -1) {
      streamStarts.push({ start, end, len: end - start })
      pos = end + 9
    } else {
      break
    }
  }

  const texts = []
  for (const s of streamStarts) {
    const streamBuf = buf.subarray(s.start, s.end)
    try {
      const decomp = zlib.inflateSync(streamBuf)
      const text = decomp.toString('latin1')
      texts.push(text)
    } catch (e) {
      // ignore
    }
  }
  return texts
}

const data = JSON.parse(fs.readFileSync('scripts/extracted_all_strings.json', 'utf8'))
const pdfParto2526 =
  data['src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf'].allParsedStrings
const pdfCaderno2425 =
  data['src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf'].allParsedStrings

let i = 0
const rows2526 = []
while (i < pdfParto2526.length) {
  const s = pdfParto2526[i]
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2526.length + 1) {
    rows2526.push({ idx: parseInt(s, 10), startPos: i })
  }
  i++
}

let j = 0
const rows2425 = []
while (j < pdfCaderno2425.length) {
  const s = pdfCaderno2425[j]
  if (/^\d+$/.test(s) && parseInt(s, 10) === rows2425.length + 1) {
    rows2425.push({ idx: parseInt(s, 10), startPos: j })
  }
  j++
}

const summary = {
  parto2526Count: pdfParto2526.length,
  caderno2425Count: pdfCaderno2425.length,
  rows2526Count: rows2526.length,
  rows2425Count: rows2425.length,
  sample2526_1: pdfParto2526.slice(rows2526[0]?.startPos || 0, (rows2526[0]?.startPos || 0) + 12),
  sample2526_2: pdfParto2526.slice(rows2526[1]?.startPos || 0, (rows2526[1]?.startPos || 0) + 12),
  sample2425_1: pdfCaderno2425.slice(rows2425[0]?.startPos || 0, (rows2425[0]?.startPos || 0) + 12),
  sample2425_2: pdfCaderno2425.slice(rows2425[1]?.startPos || 0, (rows2425[1]?.startPos || 0) + 12),
}
fs.writeFileSync('scripts/table_summary.json', JSON.stringify(summary, null, 2))

// 1. Inspecionar relatrio-final-iatf
const iatfStreams = extractPdfTextStreams(
  'src/assets/relatrio-final-iatf-faz.sto-antonio-e.m.25-26-2-7a65c.pdf',
)
console.log('IATF text streams count:', iatfStreams.length)

const iatfAllText = []
for (const ts of iatfStreams) {
  const tjRegex = /\(([^)]*)\)\s*Tj/g
  const tjArrayRegex = /\[(.*?)\]\s*TJ/g
  let m
  while ((m = tjRegex.exec(ts)) !== null) {
    if (m[1]) iatfAllText.push(m[1])
  }
  while ((m = tjArrayRegex.exec(ts)) !== null) {
    const inner = m[1]
    const innerRegex = /\(([^)]*)\)/g
    let im
    let piece = ''
    while ((im = innerRegex.exec(inner)) !== null) {
      piece += im[1]
    }
    if (piece) iatfAllText.push(piece)
  }
}

fs.writeFileSync('scripts/debug_iatf_strings.json', JSON.stringify(iatfAllText, null, 2))
console.log('IATF strings written:', iatfAllText.length)
