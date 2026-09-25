migrate(
  (app) => {
    const lots = app.findCollectionByNameOrId('lots')

    const atividades = new Collection({
      name: 'atividades',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'sanidade',
            'reproducao',
            'manejo',
            'pesagem',
            'manutencao',
            'comercial',
            'nutricao',
          ],
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'data_fim', type: 'date' },
        {
          name: 'frente',
          type: 'select',
          required: true,
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        {
          name: 'lote_ids',
          type: 'relation',
          collectionId: lots.id,
          cascadeDelete: false,
          maxSelect: 10,
        },
        { name: 'setor', type: 'text' },
        { name: 'responsavel_id', type: 'text', required: true },
        {
          name: 'recorrencia',
          type: 'select',
          required: true,
          values: ['unica', 'diaria', 'semanal', 'anual'],
          maxSelect: 1,
        },
        { name: 'insumos', type: 'json' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['planejada', 'em_andamento', 'concluida', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'is_arrendamento', type: 'bool' },
        { name: 'custo_previsto', type: 'number' },
        { name: 'concluido_em', type: 'date' },
        { name: 'concluido_por', type: 'text' },
        { name: 'alerta_dias_antes', type: 'number' },
        { name: 'parent_event_id', type: 'text' },
        { name: 'created_by', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_atividades_data ON atividades (data DESC)',
        'CREATE INDEX idx_atividades_status ON atividades (status)',
        'CREATE INDEX idx_atividades_frente ON atividades (frente)',
        'CREATE INDEX idx_atividades_responsavel ON atividades (responsavel_id)',
      ],
    })

    app.save(atividades)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('atividades'))
    } catch (_) {}
  },
)
