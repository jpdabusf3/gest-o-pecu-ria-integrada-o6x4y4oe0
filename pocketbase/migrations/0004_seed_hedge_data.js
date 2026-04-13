migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'joaopedro_zoo@hotmail.com')
    } catch (_) {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      user = new Record(usersCol)
      user.setEmail('joaopedro_zoo@hotmail.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'João Pedro')
      app.save(user)
    }

    let lot
    try {
      lot = app.findFirstRecordByData('lots', 'name', 'Lote Semente 1')
    } catch (_) {
      const lotsCol = app.findCollectionByNameOrId('lots')
      lot = new Record(lotsCol)
      lot.set('name', 'Lote Semente 1')
      app.save(lot)
    }

    const hedgeOpsCol = app.findCollectionByNameOrId('hedge_operations')

    const seedOp = (code, type, strike, pPaid, pRec, qty, cPrice, basis) => {
      try {
        app.findFirstRecordByData('hedge_operations', 'contract_code', code)
      } catch (_) {
        const rec = new Record(hedgeOpsCol)
        rec.set('lot_id', lot.id)
        rec.set('contract_code', code)
        rec.set('type', type)
        rec.set('status', 'closed')
        rec.set('strike_price', strike)
        rec.set('premium_paid', pPaid)
        rec.set('premium_received', pRec)
        rec.set('quantity_arrobas', qty)
        rec.set('entry_date', '2024-01-01 12:00:00.000Z')
        rec.set('expiry_date', '2024-06-01 12:00:00.000Z')
        rec.set('closing_price', cPrice)
        rec.set('closing_date', '2024-05-15 12:00:00.000Z')
        rec.set('basis_at_entry', basis)
        app.save(rec)
      }
    }

    seedOp('BGI_PUT_01', 'put', 250, 5, 0, 1000, 220, -5)
    seedOp('BGI_COL_01', 'collar', 260, 2, 1.5, 2000, 230, -4)
    seedOp('BGI_FUT_01', 'future', 240, 0, 0, 1500, 260, -6)

    const marketPricesCol = app.findCollectionByNameOrId('market_prices')
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dStr = d.toISOString().split('T')[0] + ' 12:00:00.000Z'
      const price = 220 + Math.random() * 20

      try {
        app.findFirstRecordByFilter(
          'market_prices',
          `reference_date >= '${d.toISOString().split('T')[0]} 00:00:00.000Z' && reference_date <= '${d.toISOString().split('T')[0]} 23:59:59.000Z'`,
        )
      } catch (_) {
        const mp = new Record(marketPricesCol)
        mp.set('indicator', 'boi_gordo')
        mp.set('region', 'SP')
        mp.set('price', price)
        mp.set('reference_date', dStr)
        app.save(mp)
      }
    }
  },
  (app) => {
    try {
      const ops = app.findRecordsByFilter('hedge_operations', "contract_code ~ 'BGI_'", '', 100, 0)
      ops.forEach((r) => app.delete(r))
    } catch (_) {}
  },
)
