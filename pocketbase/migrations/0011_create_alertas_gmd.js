migrate(
  (app) => {
    const lots = app.findCollectionByNameOrId('lots')

    const alertasCol = new Collection({
      name: 'alertas_gmd',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'lote_id',
          type: 'relation',
          required: true,
          collectionId: lots.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'desvio_pct', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'resolvido'],
          maxSelect: 1,
        },
        { name: 'causa', type: 'text' },
        { name: 'contramedida', type: 'text' },
        { name: 'gmd_real', type: 'number' },
        { name: 'gmd_alvo', type: 'number' },
        { name: 'ciclos_consecutivos', type: 'number' },
        { name: 'resolvido_em', type: 'date' },
        { name: 'resolvido_por', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_alertas_gmd_lote ON alertas_gmd (lote_id, status)',
        'CREATE INDEX idx_alertas_gmd_data ON alertas_gmd (data DESC)',
      ],
    })

    app.save(alertasCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('alertas_gmd'))
    } catch (_) {}
  },
)
