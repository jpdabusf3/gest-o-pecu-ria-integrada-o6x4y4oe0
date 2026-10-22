/// <reference path="../pb_data/types.d.ts" />

/**
 * 0040 — Ingestão Idempotente das Estações Reprodutivas Reais (Safras 2025/2026 e 2024/2025)
 *
 * Registra:
 * 1. Estação 2025-2026 (Fazenda Sto Antonio - 883 expostas, 756 gestantes, 86% prenhez, 653 IATF, 103 Touro,
 *    mapa de parição JUL a DEZ, prenhez por touro, concepção por rodada e dados agregados)
 * 2. Estação 2024-2025 (Caderno de Parição 24-25 - 827 matrizes gestantes, mapa de parição e touros canônicos)
 */

migrate(
  (app) => {
    const colEstacoes = app.findCollectionByNameOrId('estacoes_monta')

    // 1. Estação 2025-2026
    let est2526 = null
    try {
      est2526 = app.findFirstRecordByFilter('estacoes_monta', "ano_safra = '2025/2026'")
    } catch (_) {}

    if (!est2526) {
      est2526 = new Record(colEstacoes)
    }

    est2526.set('nome', 'Fazenda Sto Antonio - Estação de Monta 2025-2026')
    est2526.set('ano_safra', '2025/2026')
    est2526.set('data_inicio', '2025-10-11')
    est2526.set('data_fim', '2026-02-27')
    est2526.set('duracao_dias', 139)
    est2526.set('data_inicio_parto', '2026-07-28')
    est2526.set('data_fim_parto', '2026-12-14')
    est2526.set('total_expostas', 883)
    est2526.set('total_prenhes', 756)
    est2526.set('total_vazias', 127)
    est2526.set('gestantes_iatf', 653)
    est2526.set('gestantes_touro', 103)
    est2526.set('taxa_prenhez_pct', 86.0)
    est2526.set('taxa_paricao_pct', 88.0)
    est2526.set('taxa_desmame_pct', 82.5)
    est2526.set('taxa_aborto_dg_inicial_pct', 5.0)
    est2526.set('taxa_cio_pct', 57.0)
    est2526.set('iep_medio_meses', 12.6)
    est2526.set('perda_gestacional_pct', 5.0)
    est2526.set('perda_primeiro_terco_pct', 65.0)
    est2526.set('perda_segundo_terco_pct', 25.0)
    est2526.set('perda_terceiro_terco_pct', 10.0)
    est2526.set('kg_desmamado_matriz', 198.5)
    est2526.set('status', 'em_andamento')
    est2526.set('formato_origem', 'relatorio_final_iatf')
    est2526.set('conciliacao_status', 'conciliado')
    est2526.set(
      'conciliacao_detalhes',
      JSON.stringify({
        gestantes_resumo: 756,
        gestantes_linhas: 756,
        diferenca: 0,
        status: 'conciliado',
        mensagem: '756 gestantes linha a linha conferem exatamente com o relatório final IATF.',
      }),
    )
    est2526.set(
      'mapa_paricao_mensal',
      JSON.stringify([
        { mes: 'JUL', qtd: 203 },
        { mes: 'AGO', qtd: 97 },
        { mes: 'SET', qtd: 76 },
        { mes: 'OUT', qtd: 108 },
        { mes: 'NOV', qtd: 154 },
        { mes: 'DEZ', qtd: 118 },
        { mes: 'JAN', qtd: 0 },
        { mes: 'FEV', qtd: 0 },
      ]),
    )
    est2526.set(
      'concepcao_por_rodada',
      JSON.stringify({
        iatf_1: 60,
        iatf_2: 54,
        iatf_3: 51,
        touro: 59,
      }),
    )
    est2526.set(
      'categorias_agregado',
      JSON.stringify({
        nuliparas: { trabalhadas: 165, gestantes: 147, taxa_prenhez_pct: 89, taxa_aborto_pct: 7 },
        primiparas: { trabalhadas: 202, gestantes: 175, taxa_prenhez_pct: 87, taxa_aborto_pct: 4 },
        secundiparas: { trabalhadas: 0, gestantes: 0, taxa_prenhez_pct: 0, taxa_aborto_pct: 0 },
        multiparas: { trabalhadas: 516, gestantes: 434, taxa_prenhez_pct: 84, taxa_aborto_pct: 4 },
        solteiras: { trabalhadas: 0, gestantes: 0, taxa_prenhez_pct: 0, taxa_aborto_pct: 0 },
      }),
    )
    est2526.set(
      'dados_iatf',
      JSON.stringify({
        expostas: 847,
        inseminacoes: 1244,
        total_gestantes: 715,
        total_vazias: 132,
        prenhez_parcial_pct: 84,
        concepcao_pct: 57,
        inseminacoes_por_categoria: {
          multiparas: 688,
          primiparas: 335,
          nuliparas: 220,
          precoce: 1,
        },
        gestantes_por_categoria: { multiparas: 429, primiparas: 179, nuliparas: 107 },
      }),
    )
    est2526.set(
      'prenhez_por_touro',
      JSON.stringify([
        {
          touro: 'Rifle PHOC',
          registro: 'PHOC 2163',
          qtd_prenhez: 106,
          media_prenhez_pct: 58,
          qtd_utilizada: 198,
        },
        {
          touro: 'REPASSE',
          registro: '',
          qtd_prenhez: 103,
          media_prenhez_pct: 59,
          qtd_utilizada: 175,
        },
        {
          touro: 'Maori S.N.',
          registro: 'GRI C3807',
          qtd_prenhez: 94,
          media_prenhez_pct: 61,
          qtd_utilizada: 124,
        },
        {
          touro: 'Quizur Kat',
          registro: 'KPAM 0044',
          qtd_prenhez: 92,
          media_prenhez_pct: 63,
          qtd_utilizada: 100,
        },
        {
          touro: 'Astro Jac',
          registro: 'MMVA 3739',
          qtd_prenhez: 81,
          media_prenhez_pct: 56,
          qtd_utilizada: 15,
        },
        {
          touro: 'Capitão A.F.',
          registro: 'JCGG 15568',
          qtd_prenhez: 68,
          media_prenhez_pct: 60,
          qtd_utilizada: 112,
        },
        {
          touro: 'Colonião AJ',
          registro: '197217AJ',
          qtd_prenhez: 65,
          media_prenhez_pct: 62,
          qtd_utilizada: 45,
        },
        {
          touro: 'Mutreco FVC',
          registro: 'FVC 9681',
          qtd_prenhez: 46,
          media_prenhez_pct: 53,
          qtd_utilizada: 27,
        },
        {
          touro: 'Defender AZ',
          registro: 'AZZA 5087',
          qtd_prenhez: 43,
          media_prenhez_pct: 67,
          qtd_utilizada: 40,
        },
        {
          touro: '20141 JHVM',
          registro: 'A FRESCO',
          qtd_prenhez: 28,
          media_prenhez_pct: 56,
          qtd_utilizada: 33,
        },
        {
          touro: '21860 JHVM',
          registro: 'A FRESCO',
          qtd_prenhez: 25,
          media_prenhez_pct: 56,
          qtd_utilizada: 98,
        },
        {
          touro: 'Silverado IF',
          registro: 'IFG 10432',
          qtd_prenhez: 14,
          media_prenhez_pct: 44,
          qtd_utilizada: 199,
        },
        {
          touro: 'Benquisto AZ',
          registro: 'AZZA 4260',
          qtd_prenhez: 13,
          media_prenhez_pct: 80,
          qtd_utilizada: 200,
        },
        {
          touro: '1722 PHOC',
          registro: 'A FRESCO',
          qtd_prenhez: 11,
          media_prenhez_pct: 56,
          qtd_utilizada: 52,
        },
        {
          touro: 'Pacara IZSN',
          registro: 'IZSN 3758',
          qtd_prenhez: 10,
          media_prenhez_pct: 100,
          qtd_utilizada: 1,
        },
      ]),
    )
    app.save(est2526)

    // 2. Estação 2024-2025
    let est2425 = null
    try {
      est2425 = app.findFirstRecordByFilter('estacoes_monta', "ano_safra = '2024/2025'")
    } catch (_) {}

    if (!est2425) {
      est2425 = new Record(colEstacoes)
    }

    est2425.set('nome', 'Fazenda Sto Antonio - Caderno de Parição 2024-2025')
    est2425.set('ano_safra', '2024/2025')
    est2425.set('data_inicio', '2024-10-08')
    est2425.set('data_fim', '2025-04-19')
    est2425.set('duracao_dias', 193)
    est2425.set('data_inicio_parto', '2025-07-25')
    est2425.set('data_fim_parto', '2026-02-03')
    est2425.set('total_expostas', 827)
    est2425.set('total_prenhes', 827)
    est2425.set('total_vazias', 0)
    est2425.set('gestantes_iatf', 720)
    est2425.set('gestantes_touro', 107)
    est2425.set('taxa_prenhez_pct', 81.2)
    est2425.set('taxa_paricao_pct', 78.5)
    est2425.set('taxa_desmame_pct', 76.4)
    est2425.set('iep_medio_meses', 12.9)
    est2425.set('perda_gestacional_pct', 4.2)
    est2425.set('kg_desmamado_matriz', 192.0)
    est2425.set('status', 'encerrada')
    est2425.set('formato_origem', 'caderno_paricao_previsao')
    est2425.set('conciliacao_status', 'conciliado')
    est2425.set(
      'conciliacao_detalhes',
      JSON.stringify({
        gestantes_resumo: 827,
        gestantes_linhas: 827,
        diferenca: 0,
        status: 'conciliado',
        mensagem: '827 gestantes linha a linha registradas no caderno de parição 2024-2025.',
      }),
    )
    est2425.set(
      'mapa_paricao_mensal',
      JSON.stringify([
        { mes: 'JUL', qtd: 178 },
        { mes: 'AGO', qtd: 112 },
        { mes: 'SET', qtd: 94 },
        { mes: 'OUT', qtd: 116 },
        { mes: 'NOV', qtd: 148 },
        { mes: 'DEZ', qtd: 124 },
        { mes: 'JAN', qtd: 55 },
        { mes: 'FEV', qtd: 0 },
      ]),
    )
    est2425.set(
      'prenhez_por_touro',
      JSON.stringify([
        { touro: 'Astro Jacamin (MMVA 3739)', qtd_prenhez: 198 },
        { touro: 'Heringer Míssil (FHGM A1981)', qtd_prenhez: 184 },
        { touro: 'Colonião AJ (197217AJ)', qtd_prenhez: 142 },
        { touro: 'REPASSE', qtd_prenhez: 107 },
        { touro: 'HIGH GRADE ANGUS', qtd_prenhez: 96 },
        { touro: 'Comboio SN', qtd_prenhez: 52 },
        { touro: 'Rem Elguapo', qtd_prenhez: 48 },
      ]),
    )
    app.save(est2425)
  },
  (app) => {
    try {
      const rec1 = app.findFirstRecordByFilter('estacoes_monta', "ano_safra = '2025/2026'")
      if (rec1) app.delete(rec1)
    } catch (_) {}
    try {
      const rec2 = app.findFirstRecordByFilter('estacoes_monta', "ano_safra = '2024/2025'")
      if (rec2) app.delete(rec2)
    } catch (_) {}
  },
)
