migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lots')

    if (!col.fields.getByName('gmd_alvo_g_dia')) {
      col.fields.add(new NumberField({ name: 'gmd_alvo_g_dia' }))
    }
    if (!col.fields.getByName('data_inicio_lote')) {
      col.fields.add(new DateField({ name: 'data_inicio_lote' }))
    }
    if (!col.fields.getByName('fase_atual')) {
      col.fields.add(
        new SelectField({
          name: 'fase_atual',
          values: ['cria', 'recria', 'engorda', 'tip_rip', 'confinamento'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('frente')) {
      col.fields.add(
        new SelectField({
          name: 'frente',
          values: ['cria', 'recria', 'engorda', 'arrendamento'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('is_arrendamento')) {
      col.fields.add(new BoolField({ name: 'is_arrendamento' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('lots')
    col.fields.removeByName('gmd_alvo_g_dia')
    col.fields.removeByName('data_inicio_lote')
    col.fields.removeByName('fase_atual')
    col.fields.removeByName('frente')
    col.fields.removeByName('is_arrendamento')
    app.save(col)
  },
)
