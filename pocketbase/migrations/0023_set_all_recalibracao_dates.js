migrate(
  (app) => {
    const allRecords = app.findRecordsByFilter('config_benchmark', '', '', 50, 0)
    for (const r of allRecords) {
      if (!r.getString('data_ultima_recalibracao')) {
        r.set('data_ultima_recalibracao', '2025-07-01 00:00:00.000Z')
        app.save(r)
      }
    }
  },
  () => {},
)
