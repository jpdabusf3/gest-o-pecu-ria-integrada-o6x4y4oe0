migrate(
  (app) => {
    // 1. Atualizar campos do lote no padrão Exagro e controle de pesagens
    const lots = app.findCollectionByNameOrId('lots')

    if (!lots.fields.getByName('data_entrada')) {
      lots.fields.add(new DateField({ name: 'data_entrada' }))
    }
    if (!lots.fields.getByName('data_saida')) {
      lots.fields.add(new DateField({ name: 'data_saida' }))
    }
    if (!lots.fields.getByName('dias_permanencia')) {
      lots.fields.add(new NumberField({ name: 'dias_permanencia' }))
    }
    if (!lots.fields.getByName('peso_entrada_medio')) {
      lots.fields.add(new NumberField({ name: 'peso_entrada_medio' }))
    }
    if (!lots.fields.getByName('peso_saida_medio')) {
      lots.fields.add(new NumberField({ name: 'peso_saida_medio' }))
    }
    if (!lots.fields.getByName('rendimento_carcaca_pct')) {
      lots.fields.add(new NumberField({ name: 'rendimento_carcaca_pct' }))
    }
    if (!lots.fields.getByName('peso_medio_atual')) {
      lots.fields.add(new NumberField({ name: 'peso_medio_atual' }))
    }
    if (!lots.fields.getByName('pasto_atual')) {
      lots.fields.add(new TextField({ name: 'pasto_atual' }))
    }

    // Permitir leitura/escrita para usuários autenticados ou públicas conforme o padrão das outras coleções
    lots.listRule = ''
    lots.viewRule = ''
    lots.createRule = ''
    lots.updateRule = ''
    lots.deleteRule = ''
    app.save(lots)

    // 2. Criar coleção pesagens
    const pesagens = new Collection({
      name: 'pesagens',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'data_pesagem', type: 'date', required: true },
        {
          name: 'lote_id',
          type: 'relation',
          required: true,
          collectionId: lots.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['lote', 'individual'],
          maxSelect: 1,
        },
        { name: 'animal_id', type: 'text' },
        { name: 'qtd_animais', type: 'number', required: true },
        { name: 'peso_medio_kg', type: 'number', required: true },
        { name: 'peso_total_kg', type: 'number' },
        { name: 'ecc', type: 'number' },
        { name: 'responsavel_id', type: 'text' },
        {
          name: 'origem',
          type: 'select',
          required: true,
          values: ['manual', 'balanca'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'gmd_intervalo', type: 'number' },
        { name: 'dias_intervalo', type: 'number' },
        { name: 'peso_anterior_kg', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pesagens_lote ON pesagens (lote_id, data_pesagem DESC)'],
    })
    app.save(pesagens)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('pesagens'))
    } catch (_) {}
  },
)
