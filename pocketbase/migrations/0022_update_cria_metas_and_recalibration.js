migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('config_benchmark')

    // 1. Adicionar campos de recalibração caso ainda não existam
    if (!col.fields.getByName('data_ultima_recalibracao')) {
      col.fields.add(new DateField({ name: 'data_ultima_recalibracao' }))
    }
    if (!col.fields.getByName('recalibracao_adiada_ate')) {
      col.fields.add(new DateField({ name: 'recalibracao_adiada_ate' }))
    }
    app.save(col)

    // 2. Atualizar metas da frente CRIA definidas pelo usuário:
    // (a) Taxa de desmame acima de 75% -> alvo_fazenda = 75.0 (média 70, ref 75, top 85)
    // (b) kg de bezerro desmamado por matriz exposta acima de 190 kg -> alvo_fazenda = 190.0 (média 150, ref 175, top 190)
    try {
      const recDesmame = app.findFirstRecordByData(
        'config_benchmark',
        'codigo',
        'cria_taxa_desmame',
      )
      recDesmame.set('valor_media', 70.0)
      recDesmame.set('valor_referencia', 75.0)
      recDesmame.set('valor_top', 85.0)
      recDesmame.set('alvo_fazenda', 75.0)
      recDesmame.set(
        'observacao',
        'Meta definida: Taxa de desmame acima de 75%. Média 70% | Ref 75% | TOP 85%',
      )
      recDesmame.set('data_ultima_recalibracao', '2025-07-01 00:00:00.000Z')
      app.save(recDesmame)
    } catch (_) {}

    try {
      const recKgBezerro = app.findFirstRecordByData(
        'config_benchmark',
        'codigo',
        'cria_kg_bezerro_matriz',
      )
      recKgBezerro.set('valor_media', 150.0)
      recKgBezerro.set('valor_referencia', 175.0)
      recKgBezerro.set('valor_top', 190.0)
      recKgBezerro.set('alvo_fazenda', 190.0)
      recKgBezerro.set(
        'observacao',
        'Meta definida: kg de bezerro desmamado por matriz exposta acima de 190 kg. Média 150 kg | Ref 175 kg | TOP 190 kg',
      )
      recKgBezerro.set('data_ultima_recalibracao', '2025-07-01 00:00:00.000Z')
      app.save(recKgBezerro)
    } catch (_) {}

    // Definir data_ultima_recalibracao para os outros registros para inicializar o ciclo anual (ex: safra passada)
    const allRecords = app.findRecordsByFilter('config_benchmark', '', '', 50, 0)
    for (const r of allRecords) {
      if (!r.get('data_ultima_recalibracao')) {
        r.set('data_ultima_recalibracao', '2025-07-01 00:00:00.000Z')
        app.save(r)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('config_benchmark')
      col.fields.removeByName('data_ultima_recalibracao')
      col.fields.removeByName('recalibracao_adiada_ate')
      app.save(col)
    } catch (_) {}
  },
)
