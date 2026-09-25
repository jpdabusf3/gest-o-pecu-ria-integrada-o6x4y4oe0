migrate(
  (app) => {
    const collection = new Collection({
      name: 'reconhecimentos_trajetoria',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'safra_atual', type: 'text', required: true },
        { name: 'safra_anterior', type: 'text', required: true },
        {
          name: 'tipo_indicador',
          type: 'select',
          values: ['produtividade', 'custo'],
          required: true,
        },
        { name: 'faixa_anterior', type: 'text', required: true },
        { name: 'faixa_atual', type: 'text', required: true },
        { name: 'reconhecido', type: 'bool' },
        { name: 'reconhecido_por', type: 'text' },
        { name: 'reconhecido_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_rec_traj_safras ON reconhecimentos_trajetoria (safra_atual, tipo_indicador)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('reconhecimentos_trajetoria')
      app.delete(col)
    } catch (_) {}
  },
)
