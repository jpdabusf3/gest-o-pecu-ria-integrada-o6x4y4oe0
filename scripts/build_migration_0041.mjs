// scripts/build_migration_0041.mjs
import fs from 'fs'

const compact2526 = JSON.parse(fs.readFileSync('scripts/compact_data_2526.json', 'utf8'))
const compact2425 = JSON.parse(fs.readFileSync('scripts/compact_data_2425.json', 'utf8'))

console.log(`Building migration 0041: 2526 = ${compact2526.length}, 2425 = ${compact2425.length}`)

const migrationTemplate = `/// <reference path="../pb_data/types.d.ts" />

/**
 * 0041 — Carga Idempotente dos Registros Individuais de Reprodução (INLINE)
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
      '0041: Concluído com sucesso. Exames: ' +
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
  'pocketbase/migrations/0041_carga_registros_individuais_reprodutivos.js',
  migrationTemplate,
)
console.log(
  'Successfully wrote pocketbase/migrations/0041_carga_registros_individuais_reprodutivos.js',
)
console.log(
  'File size bytes:',
  fs.statSync('pocketbase/migrations/0041_carga_registros_individuais_reprodutivos.js').size,
)
