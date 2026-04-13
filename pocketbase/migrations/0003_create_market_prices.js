migrate(
  (app) => {
    const market_prices = new Collection({
      name: 'market_prices',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'indicator', type: 'text', required: true },
        { name: 'region', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'reference_date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(market_prices)

    market_prices.addIndex(
      'idx_market_prices_unique',
      true,
      'indicator, region, reference_date',
      '',
    )
    app.save(market_prices)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('market_prices'))
    } catch (_) {}
  },
)
