migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('market_prices')

    var existing = app.findRecordsByFilter(
      'market_prices',
      'indicator = "Boi Gordo" && region = "MT"',
      '',
      1,
      0,
    )
    if (existing.length > 0) return

    var data = [
      { date: '2025-04-15', mt: 255.5, b3: 270.0 },
      { date: '2025-05-15', mt: 258.0, b3: 272.0 },
      { date: '2025-06-15', mt: 260.0, b3: 275.0 },
      { date: '2025-07-15', mt: 265.0, b3: 278.0 },
      { date: '2025-08-15', mt: 268.0, b3: 280.0 },
      { date: '2025-09-15', mt: 272.0, b3: 282.0 },
      { date: '2025-10-15', mt: 275.0, b3: 285.0 },
      { date: '2025-11-15', mt: 278.0, b3: 290.0 },
      { date: '2025-12-15', mt: 280.0, b3: 292.0 },
      { date: '2026-01-15', mt: 285.0, b3: 291.0 },
      { date: '2026-02-15', mt: 287.0, b3: 295.0 },
      { date: '2026-03-15', mt: 265.5, b3: 270.5 },
      { date: '2026-04-15', mt: 268.0, b3: 272.0 },
      { date: '2026-05-15', mt: 270.5, b3: 274.0 },
      { date: '2026-06-15', mt: 273.0, b3: 276.0 },
      { date: '2026-06-22', mt: 272.0, b3: 275.0 },
      { date: '2026-06-29', mt: 273.5, b3: 276.5 },
      { date: '2026-07-06', mt: 271.0, b3: 274.0 },
      { date: '2026-07-13', mt: 270.5, b3: 275.5 },
      { date: '2026-07-20', mt: 272.5, b3: 276.0 },
      { date: '2026-07-27', mt: 271.0, b3: 275.0 },
      { date: '2026-08-03', mt: 270.0, b3: 274.5 },
    ]

    data.forEach(function (m) {
      var rec1 = new Record(col)
      rec1.set('indicator', 'Boi Gordo')
      rec1.set('region', 'MT')
      rec1.set('price', m.mt)
      rec1.set('reference_date', m.date)
      app.save(rec1)

      var rec2 = new Record(col)
      rec2.set('indicator', 'Boi Gordo')
      rec2.set('region', 'B3')
      rec2.set('price', m.b3)
      rec2.set('reference_date', m.date)
      app.save(rec2)
    })
  },
  (app) => {
    var records = app.findRecordsByFilter('market_prices', 'indicator = "Boi Gordo"', '', 500, 0)
    records.forEach(function (r) {
      app.delete(r)
    })
  },
)
