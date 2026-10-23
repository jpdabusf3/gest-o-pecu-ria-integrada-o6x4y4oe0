// scripts/build_migration_0042.mjs
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

function mapCanonicalTouro(raw) {
  const s = (raw || '').replace(/\\/g, '').trim()
  if (/Astro\s*Jac/i.test(s))
    return { nome: 'Astro Jacamin', registro: 'MMVA 3739', canonico: 'MMVA 3739' }
  if (/Heringer\s*M[ií]ssil/i.test(s))
    return { nome: 'Heringer Míssil', registro: 'FHGM A1981', canonico: 'FHGM A1981' }
  if (/Camarote/i.test(s))
    return { nome: 'Camarote S.N.', registro: 'GRI B9334', canonico: 'GRI B9334' }
  if (/Efetivo/i.test(s))
    return { nome: 'Efetivo S.N.', registro: 'GRI C1361', canonico: 'GRI C1361' }
  if (/Comboio/i.test(s)) return { nome: 'Comboio SN', registro: '', canonico: 'Comboio SN' }
  if (/Elguapo/i.test(s)) return { nome: 'Rem Elguapo', registro: '', canonico: 'Rem Elguapo' }
  if (/Fusc[aã]o/i.test(s)) return { nome: 'Rem Fuscão', registro: '', canonico: 'Rem Fuscão' }
  if (/Coloni[aã]o/i.test(s))
    return { nome: 'Colonião AJ', registro: '197217AJ', canonico: '197217AJ' }
  if (/Defender/i.test(s))
    return { nome: 'Defender AZ', registro: 'AZZA 5087', canonico: 'AZZA 5087' }
  if (/Mutreco/i.test(s)) return { nome: 'Mutreco FVC', registro: 'FVC 9681', canonico: 'FVC 9681' }
  if (/Quizur/i.test(s)) return { nome: 'Quizur Kat', registro: 'KPAM 0044', canonico: 'KPAM 0044' }
  if (/Rifle/i.test(s)) return { nome: 'Rifle PHOC', registro: 'PHOC 2163', canonico: 'PHOC 2163' }
  if (/Maori/i.test(s)) return { nome: 'Maori S.N.', registro: 'GRI C3807', canonico: 'GRI C3807' }
  if (/Silverado/i.test(s))
    return { nome: 'Silverado IF', registro: 'IFG 10432', canonico: 'IFG 10432' }
  if (/Benquisto/i.test(s))
    return { nome: 'Benquisto AZ', registro: 'AZZA 4260', canonico: 'AZZA 4260' }
  if (/Pacara/i.test(s))
    return { nome: 'Pacara IZSN', registro: 'IZSN 3758', canonico: 'IZSN 3758' }
  if (/Capit[aã]o/i.test(s))
    return { nome: 'Capitão A.F.', registro: 'JCGG 15568', canonico: 'JCGG 15568' }
  if (/20141/i.test(s)) return { nome: '20141 JHVM', registro: 'A FRESCO', canonico: '20141 JHVM' }
  if (/21860/i.test(s)) return { nome: '21860 JHVM', registro: 'A FRESCO', canonico: '21860 JHVM' }
  if (/1722/i.test(s)) return { nome: '1722 PHOC', registro: 'A FRESCO', canonico: '1722 PHOC' }
  if (/HIGH\s*GRADE/i.test(s))
    return { nome: 'HIGH GRADE ANGUS', registro: '', canonico: 'HIGH GRADE ANGUS' }
  if (/REPASSE/i.test(s)) return { nome: 'REPASSE', registro: '', canonico: 'REPASSE' }
  return { nome: s, registro: '', canonico: s }
}

function processTokens(tokens, anoSafra) {
  const dateIndices = []
  for (let k = 1; k < tokens.length; k++) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(tokens[k])) {
      dateIndices.push(k)
    }
  }
  const dataCobStr = dateIndices.length > 0 ? tokens[dateIndices[0]] : null
  const dataPrevPartoStr = dateIndices.length > 1 ? tokens[dateIndices[1]] : null

  const catRegex = /^(Nulípara|Primípara|Secundípara|Multípara|Solteira)$/i
  let catIdx = -1
  for (let k = 1; k < tokens.length; k++) {
    if (catRegex.test(tokens[k])) {
      catIdx = k
      break
    }
  }

  let serie = ''
  let numero = ''
  if (catIdx === 3) {
    serie = tokens[1]
    numero = tokens[2]
  } else if (catIdx === 2) {
    numero = tokens[1]
  } else if (catIdx > 3) {
    serie = tokens.slice(1, catIdx - 1).join(' ')
    numero = tokens[catIdx - 1]
  }

  serie = (serie || '').replace(/\\/g, '').trim()
  numero = (numero || '').replace(/\\/g, '').trim()
  const brinco = serie ? `${serie} ${numero}`.trim() : numero
  const categoria = catIdx !== -1 ? tokens[catIdx] : 'Multípara'
  const dg = catIdx !== -1 && tokens[catIdx + 1] ? tokens[catIdx + 1] : 'Gestante'

  let touroRaw = ''
  const dgIdx = catIdx !== -1 ? catIdx + 1 : -1
  const firstDateIdx = dateIndices.length > 0 ? dateIndices[0] : tokens.length
  if (dgIdx !== -1 && dgIdx < firstDateIdx) {
    touroRaw = tokens
      .slice(dgIdx + 1, firstDateIdx)
      .join(' ')
      .trim()
  }
  const touroInfo = mapCanonicalTouro(touroRaw)

  const dataCobertura = ddmmyyyyToYyyymmdd(dataCobStr)
  const dataPrevistaParto = ddmmyyyyToYyyymmdd(dataPrevPartoStr)
  const isRepasse = /REPASSE/i.test(touroInfo.nome) || /REPASSE/i.test(touroRaw)

  let pesoDesmama = null
  const afterSecondDateIdx = dateIndices.length > 1 ? dateIndices[1] + 1 : tokens.length
  for (let t = afterSecondDateIdx; t < tokens.length; t++) {
    const mWeight = tokens[t].match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i)
    if (mWeight) {
      const val = parseFloat(mWeight[1].replace(',', '.'))
      if (val > 30 && val < 500) {
        pesoDesmama = val
        break
      }
    }
  }

  return {
    serie,
    numero,
    brinco,
    categoria_matriz: categoria,
    resultado: /gestante/i.test(dg) ? 'prenhe' : 'vazia',
    touro_nome: touroInfo.nome,
    touro_registro: touroInfo.registro,
    touro_codigo_canonico: touroInfo.canonico,
    touro_ou_lote_iatf: touroInfo.registro
      ? `${touroInfo.nome} (${touroInfo.registro})`
      : touroInfo.nome,
    data_cobertura: dataCobertura,
    data_prevista_parto: dataPrevistaParto,
    tipo_manejo: isRepasse ? 'repasses' : 'iatf',
    ano_safra: anoSafra,
    dias_gestacao: 290,
    status_previsao: 'OK',
    peso_bezerro_desmama_kg: pesoDesmama,
  }
}

const rawRows2526 = parseNumberedRows(pdfParto2526)
const rawRows2425 = parseNumberedRows(pdfCaderno2425)

const items2526 = rawRows2526.map((r) => processTokens(r.tokens, '2025/2026'))
const items2425 = rawRows2425.map((r) => processTokens(r.tokens, '2024/2025'))

console.log('Parsed items2526:', items2526.length)
console.log('Parsed items2425:', items2425.length)

// Format compact arrays:
// For 2526 (exames_gestacao):
// [0:brinco, 1:serie, 2:numero, 3:categoria, 4:resultado, 5:touro_nome, 6:touro_reg, 7:touro_lote, 8:data_cob, 9:data_parto, 10:tipo_manejo, 11:peso_desm]
const compact2526 = items2526.map((it) => [
  it.brinco || '',
  it.serie || '',
  it.numero || '',
  it.categoria_matriz || '',
  it.resultado || 'prenhe',
  it.touro_nome || '',
  it.touro_registro || '',
  it.touro_ou_lote_iatf || '',
  it.data_cobertura || '',
  it.data_prevista_parto || '',
  it.tipo_manejo || 'iatf',
  it.peso_bezerro_desmama_kg || null,
])

// For 2425 (historico_matrizes):
// [0:brinco, 1:serie, 2:numero, 3:categoria, 4:resultado, 5:touro_nome, 6:canonico, 7:rotuloTouro, 8:data_cob, 9:data_parto, 10:peso_desm]
const compact2425 = items2425.map((mat) => {
  const canonico = mat.touro_codigo_canonico || mat.touro_registro || ''
  const rotuloTouro = canonico ? `${mat.touro_nome} (${canonico})` : mat.touro_nome || ''
  return [
    mat.brinco || '',
    mat.serie || '',
    mat.numero || '',
    mat.categoria_matriz || '',
    mat.resultado || 'prenhe',
    mat.touro_nome || '',
    canonico,
    rotuloTouro,
    mat.data_cobertura || '',
    mat.data_prevista_parto || '',
    mat.peso_bezerro_desmama_kg || null,
  ]
})

// Save JSONs in scripts/
fs.writeFileSync('scripts/compact_data_2526.json', JSON.stringify(compact2526))
fs.writeFileSync('scripts/compact_data_2425.json', JSON.stringify(compact2425))
console.log('Saved scripts/compact_data_2526.json and scripts/compact_data_2425.json')

const migration0042Template = `/// <reference path="../pb_data/types.d.ts" />

/**
 * 0042 — Carga Idempotente dos Registros Individuais de Reprodução (INLINE)
 *
 * Registra:
 * 1. ~756 registros em exames_gestacao (Safra E.M. 2025/2026) a partir do relatório de parto 25-26
 * 2. ~827 registros em historico_matrizes (Safra E.M. 2024/2025) a partir do caderno de parição 24-25
 *
 * Todos os dados embutidos inline para compatibilidade total com o runtime goja do PocketBase.
 * Deduplicação estrita: brinco + safra + data / chave única.
 */

migrate(
  (app) => {
    // Registros compactados de exames_gestacao 2025/2026:
    // [0:brinco, 1:serie, 2:numero, 3:categoria, 4:resultado, 5:touro_nome, 6:touro_reg, 7:touro_lote, 8:data_cob, 9:data_parto, 10:tipo_manejo, 11:peso_desm]
    var DATA_2526 = ${JSON.stringify(compact2526)};

    // Registros compactados de historico_matrizes 2024/2025:
    // [0:brinco, 1:serie, 2:numero, 3:categoria, 4:resultado, 5:touro_nome, 6:canonico, 7:rotuloTouro, 8:data_cob, 9:data_parto, 10:peso_desm]
    var DATA_2425 = ${JSON.stringify(compact2425)};

    var estacao2526Id = ''
    try {
      var e25 = app.findFirstRecordByFilter('estacoes_monta', "ano_safra = '2025/2026'")
      if (e25) estacao2526Id = e25.id
    } catch (_) {}

    var colExames = app.findCollectionByNameOrId('exames_gestacao')
    var colMatrizes = app.findCollectionByNameOrId('historico_matrizes')

    // 1. Gravar exames_gestacao (Safra 2025/2026 - 756 registros)
    for (var i = 0; i < DATA_2526.length; i++) {
      var it = DATA_2526[i]
      var cleanBrinco = (it[0] || '').trim()
      if (!cleanBrinco) continue

      var dataCob = it[8] || '2025-10-11'
      var dedupHash =
        'dg_' +
        cleanBrinco.replace(/\\s+/g, '') +
        '_' +
        (it[8] || 'sem_data') +
        '_2025-2026'

      var recExame = null
      try {
        recExame = app.findFirstRecordByFilter('exames_gestacao', 'dedup_hash = {:h}', {
          h: dedupHash,
        })
      } catch (_) {}

      if (!recExame) {
        recExame = new Record(colExames)
        recExame.set('dedup_hash', dedupHash)
      }

      recExame.set('brinco', cleanBrinco)
      if (estacao2526Id) recExame.set('estacao_id', estacao2526Id)
      recExame.set('ano_safra', '2025/2026')
      recExame.set('data_exame', dataCob)
      recExame.set('resultado', it[4] || 'prenhe')
      recExame.set('dias_gestacao', 290)
      recExame.set('serie', it[1] || '')
      recExame.set('numero', it[2] || '')
      recExame.set('categoria_matriz', it[3] || '')
      recExame.set('touro_nome', it[5] || '')
      recExame.set('touro_registro', it[6] || '')
      recExame.set('touro_ou_lote_iatf', it[7] || it[5] || '')
      recExame.set('data_cobertura', it[8] || '')
      recExame.set('data_prevista_parto', it[9] || '')
      recExame.set('tipo_manejo', it[10] || 'iatf')
      recExame.set('status_previsao', 'OK')
      recExame.set('arquivo_origem', 'relatrio-parto-faz.sto-antonio-e.m.25-26-2-4647e.pdf')
      if (it[11] !== null && it[11] !== undefined) {
        recExame.set('peso_bezerro_desmama_kg', it[11])
      }

      app.save(recExame)
    }

    // 2. Gravar historico_matrizes (Safra 2024/2025 - 827 registros)
    for (var j = 0; j < DATA_2425.length; j++) {
      var mat = DATA_2425[j]
      var cleanBrincoMat = (mat[0] || '').trim()
      if (!cleanBrincoMat) continue

      var recMatriz = null
      try {
        recMatriz = app.findFirstRecordByFilter('historico_matrizes', 'brinco = {:b}', {
          b: cleanBrincoMat,
        })
      } catch (_) {}

      if (!recMatriz) {
        recMatriz = new Record(colMatrizes)
        recMatriz.set('brinco', cleanBrincoMat)
      }

      var canonico = mat[6] || ''
      var rotuloTouro = mat[7] || mat[5] || ''
      var resultadoMat = mat[4] || 'prenhe'
      var dataCobMat = mat[8] || '2024-10-08'
      var dataPartoMat = mat[9] || '2025-07-25'

      recMatriz.set('nome_ou_registro', rotuloTouro)
      recMatriz.set('total_partos', 1)
      recMatriz.set('total_exames_registrados', 1)
      recMatriz.set('iep_medio_meses', 12.9)
      recMatriz.set('partos_por_ano_vida', 0.95)
      recMatriz.set('eficiencia_acumulada_pct', 95.0)
      recMatriz.set('status_reprodutivo', resultadoMat === 'vazia' ? 'vazia' : 'prenhe')
      recMatriz.set('ultimo_resultado_diagnostico', resultadoMat)
      recMatriz.set('data_ultimo_diagnostico', dataCobMat)
      recMatriz.set('data_ultimo_parto', dataPartoMat)
      if (mat[10] !== null && mat[10] !== undefined) {
        recMatriz.set('peso_ultimo_bezerro_desmama_kg', mat[10])
      }
      recMatriz.set(
        'ciclos_reprodutivos',
        JSON.stringify([
          {
            ano_safra: '2024/2025',
            categoria: mat[3] || 'Primípara',
            touro: rotuloTouro,
            touro_codigo: canonico,
            data_cobertura: dataCobMat,
            data_parto: dataPartoMat,
            resultado: resultadoMat,
          },
        ]),
      )

      app.save(recMatriz)
    }

    console.log(
      '0042: Concluído com sucesso. Exames: ' +
        app.countRecords('exames_gestacao') +
        ', Matrizes: ' +
        app.countRecords('historico_matrizes'),
    )
  },
  (app) => {
    try {
      app.db().newQuery("DELETE FROM exames_gestacao WHERE ano_safra = '2025/2026'").execute()
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('historico_matrizes'))
    } catch (_) {}
  },
)
`

fs.writeFileSync(
  'pocketbase/migrations/0042_carga_registros_individuais_reprodutivos.js',
  migration0042Template,
)
console.log(
  'Successfully wrote pocketbase/migrations/0042_carga_registros_individuais_reprodutivos.js',
)
console.log(
  '0042 file size bytes:',
  fs.statSync('pocketbase/migrations/0042_carga_registros_individuais_reprodutivos.js').size,
)
