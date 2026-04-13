migrate(
  (app) => {
    const lots = new Collection({
      name: 'lots',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(lots)

    const hedge_operations = new Collection({
      name: 'hedge_operations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'lot_id',
          type: 'relation',
          required: true,
          collectionId: lots.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'contract_code', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['put', 'call', 'future', 'collar'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['open', 'closed', 'simulated'],
          maxSelect: 1,
        },
        { name: 'strike_price', type: 'number' },
        { name: 'premium_paid', type: 'number' },
        { name: 'premium_received', type: 'number' },
        { name: 'quantity_arrobas', type: 'number', required: true },
        { name: 'entry_date', type: 'date', required: true },
        { name: 'expiry_date', type: 'date', required: true },
        { name: 'closing_price', type: 'number' },
        { name: 'closing_date', type: 'date' },
        { name: 'basis_at_entry', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(hedge_operations)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('hedge_operations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('lots'))
    } catch (_) {}
  },
)
