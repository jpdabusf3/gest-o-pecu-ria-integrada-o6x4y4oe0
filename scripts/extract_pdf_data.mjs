import fs from 'fs'
import zlib from 'zlib'

const files = [
  'src/assets/relatrio-final-iatf-faz.sto-antonio-e.m.25-26-2-7a65c.pdf',
  'src/assets/relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf',
  'src/assets/caderno-de-paricao-fazenda-santo-antonio-e.m.2024-25-1bfbb.pdf',
]

const results = {}

for (const f of files) {
  const buf = fs.readFileSync(f)
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
      // not compressed or different filter
    }
  }
  const textStreams = texts.filter(
    (t) => t.includes('BT') && (t.includes('Tj') || t.includes('TJ')),
  )
  // Let's parse text commands from textStreams
  const parsedStrings = []
  for (const ts of textStreams) {
    // TJ pattern: [(str) 12 (str2)...] TJ
    // Tj pattern: (str) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g
    let m
    while ((m = tjRegex.exec(ts)) !== null) {
      if (m[1]) parsedStrings.push(m[1])
    }
    while ((m = tjArrayRegex.exec(ts)) !== null) {
      const inner = m[1]
      const innerRegex = /\(([^)]*)\)/g
      let im
      let piece = ''
      while ((im = innerRegex.exec(inner)) !== null) {
        piece += im[1]
      }
      if (piece) parsedStrings.push(piece)
    }
  }

  results[f] = {
    streamCount: streamStarts.length,
    decompressedCount: texts.length,
    textStreamsCount: textStreams.length,
    parsedStringsCount: parsedStrings.length,
    allParsedStrings: parsedStrings,
  }
}

fs.writeFileSync('scripts/extracted_all_strings.json', JSON.stringify(results, null, 2))
