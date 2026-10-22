/// <reference path="../pb_data/types.d.ts" />

/**
 * 0038 — Expansão dos campos analíticos de reprodução e estação de monta
 *
 * Adiciona em `estacoes_monta`:
 * - duracao_dias (number)
 * - data_inicio_parto (date)
 * - data_fim_parto (date)
 * - gestantes_iatf (number)
 * - gestantes_touro (number)
 * - taxa_cio_pct (number)
 * - taxa_aborto_dg_inicial_pct (number)
 * - dados_iatf (json: expostas, inseminacoes, total_gestantes, total_vazias, prenhez_parcial_pct, concepcao_pct, gestantes_por_categoria, inseminacoes_por_categoria, prenhez_final_por_categoria)
 * - categorias_agregado (json: nuliparas, primiparas, secundiparas, multiparas, solteiras com trabalhadas, gestantes, taxa_prenhez, taxa_aborto)
 * - mapa_paricao_mensal (json: array [{ mes: 'JUL', qtd: 203 }, ...])
 * - concepcao_por_rodada (json: { iatf_1: 60, iatf_2: 54, iatf_3: 51, touro: 59 })
 * - prenhez_por_touro (json: array de touros com { touro, registro, qtd_prenhez, media_prenhez_pct, qtd_utilizada })
 * - prenhez_por_lote (json: dados agregados por lote)
 * - formato_origem (text)
 * - conciliacao_status (text: 'conciliado' | 'divergente' | 'pendente')
 * - conciliacao_detalhes (json)
 *
 * Adiciona em `exames_gestacao`:
 * - serie (text)
 * - numero (text)
 * - categoria_matriz (text: 'Nulípara' | 'Primípara' | 'Secundípara' | 'Multípara' | 'Solteira')
 * - touro_nome (text)
 * - touro_registro (text)
 * - data_cobertura (date)
 * - data_prevista_parto (date)
 * - divergencia_previsao_dias (number)
 * - status_previsao (text: 'OK' | 'AMBIGUO' | 'AUSENTE')
 */

migrate(
  (app) => {
    // 1. Atualizar estacoes_monta
    try {
      const colEstacoes = app.findCollectionByNameOrId('estacoes_monta')

      const novosCamposEstacoes = [
        new NumberField({ name: 'duracao_dias', min: 0 }),
        new DateField({ name: 'data_inicio_parto' }),
        new DateField({ name: 'data_fim_parto' }),
        new NumberField({ name: 'gestantes_iatf', min: 0 }),
        new NumberField({ name: 'gestantes_touro', min: 0 }),
        new NumberField({ name: 'taxa_cio_pct', min: 0, max: 100 }),
        new NumberField({ name: 'taxa_aborto_dg_inicial_pct', min: 0, max: 100 }),
        new JSONField({ name: 'dados_iatf' }),
        new JSONField({ name: 'categorias_agregado' }),
        new JSONField({ name: 'mapa_paricao_mensal' }),
        new JSONField({ name: 'concepcao_por_rodada' }),
        new JSONField({ name: 'prenhez_por_touro' }),
        new JSONField({ name: 'prenhez_por_lote' }),
        new TextField({ name: 'formato_origem' }),
        new TextField({ name: 'conciliacao_status' }),
        new JSONField({ name: 'conciliacao_detalhes' }),
      ]

      for (let i = 0; i < novosCamposEstacoes.length; i++) {
        const campo = novosCamposEstacoes[i]
        if (!colEstacoes.fields.getByName(campo.name)) {
          colEstacoes.fields.add(campo)
        }
      }

      app.save(colEstacoes)
    } catch (e1) {
      console.log('Erro ao atualizar estacoes_monta na migration 0038:', e1 && e1.message)
      throw e1
    }

    // 2. Atualizar exames_gestacao
    try {
      const colExames = app.findCollectionByNameOrId('exames_gestacao')

      const novosCamposExames = [
        new TextField({ name: 'serie' }),
        new TextField({ name: 'numero' }),
        new TextField({ name: 'categoria_matriz' }),
        new TextField({ name: 'touro_nome' }),
        new TextField({ name: 'touro_registro' }),
        new DateField({ name: 'data_cobertura' }),
        new DateField({ name: 'data_prevista_parto' }),
        new NumberField({ name: 'divergencia_previsao_dias' }),
        new TextField({ name: 'status_previsao' }),
      ]

      for (let j = 0; j < novosCamposExames.length; j++) {
        const cExame = novosCamposExames[j]
        if (!colExames.fields.getByName(cExame.name)) {
          colExames.fields.add(cExame)
        }
      }

      app.save(colExames)
    } catch (e2) {
      console.log('Erro ao atualizar exames_gestacao na migration 0038:', e2 && e2.message)
      throw e2
    }
  },
  (app) => {
    // Revert opcional
    try {
      const colEstacoes = app.findCollectionByNameOrId('estacoes_monta')
      const camposEstacoes = [
        'duracao_dias',
        'data_inicio_parto',
        'data_fim_parto',
        'gestantes_iatf',
        'gestantes_touro',
        'taxa_cio_pct',
        'taxa_aborto_dg_inicial_pct',
        'dados_iatf',
        'categorias_agregado',
        'mapa_paricao_mensal',
        'concepcao_por_rodada',
        'prenhez_por_touro',
        'prenhez_por_lote',
        'formato_origem',
        'conciliacao_status',
        'conciliacao_detalhes',
      ]
      for (let i = 0; i < camposEstacoes.length; i++) {
        const c = colEstacoes.fields.getByName(camposEstacoes[i])
        if (c) colEstacoes.fields.remove(c)
      }
      app.save(colEstacoes)
    } catch (_) {}

    try {
      const colExames = app.findCollectionByNameOrId('exames_gestacao')
      const camposExames = [
        'serie',
        'numero',
        'categoria_matriz',
        'touro_nome',
        'touro_registro',
        'data_cobertura',
        'data_prevista_parto',
        'divergencia_previsao_dias',
        'status_previsao',
      ]
      for (let j = 0; j < camposExames.length; j++) {
        const c = colExames.fields.getByName(camposExames[j])
        if (c) colExames.fields.remove(c)
      }
      app.save(colExames)
    } catch (_) {}
  },
)
