migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lots')

    const seedData = [
      {
        name: 'Lote CR-01',
        sector: 'cria',
        sex: 'femea',
        category: 'Vacas (Matrizes)',
        initial_weight: 450,
        final_weight: 460,
        entry_date: '2023-01-10 10:00:00.000Z',
        exit_date: '',
        value_per_animal: 3500,
        status: 'active',
        headcount: 120,
      },
      {
        name: 'Lote RE-01',
        sector: 'recria',
        sex: 'macho',
        category: 'Garrotes',
        initial_weight: 200,
        final_weight: 280,
        entry_date: '2023-06-15 10:00:00.000Z',
        exit_date: '',
        value_per_animal: 2200,
        status: 'active',
        headcount: 85,
      },
      {
        name: 'Lote EN-01',
        sector: 'engorda',
        sex: 'macho',
        category: 'Bois',
        initial_weight: 380,
        final_weight: 520,
        entry_date: '2023-10-20 10:00:00.000Z',
        exit_date: '',
        value_per_animal: 4100,
        status: 'active',
        headcount: 60,
      },
      {
        name: 'Lote VE-01',
        sector: 'venda',
        sex: 'macho',
        category: 'Bezerros',
        initial_weight: 180,
        final_weight: 210,
        entry_date: '2023-08-01 10:00:00.000Z',
        exit_date: '2023-11-01 10:00:00.000Z',
        value_per_animal: 1800,
        status: 'sold',
        headcount: 45,
      },
      {
        name: 'Lote AB-01',
        sector: 'engorda',
        sex: 'macho',
        category: 'Novilhos',
        initial_weight: 400,
        final_weight: 550,
        entry_date: '2023-05-10 10:00:00.000Z',
        exit_date: '2023-09-20 10:00:00.000Z',
        value_per_animal: 4500,
        status: 'abated',
        headcount: 50,
      },
      {
        name: 'Lote AB-02',
        sector: 'engorda',
        sex: 'femea',
        category: 'Vacas de corte',
        initial_weight: 380,
        final_weight: 480,
        entry_date: '2023-06-10 10:00:00.000Z',
        exit_date: '2023-10-15 10:00:00.000Z',
        value_per_animal: 3800,
        status: 'abated',
        headcount: 30,
      },
    ]

    for (const data of seedData) {
      try {
        app.findFirstRecordByData('lots', 'name', data.name)
      } catch (_) {
        const record = new Record(col)
        for (const [key, value] of Object.entries(data)) {
          record.set(key, value)
        }
        app.save(record)
      }
    }
  },
  (app) => {
    const lotNames = [
      'Lote CR-01',
      'Lote RE-01',
      'Lote EN-01',
      'Lote VE-01',
      'Lote AB-01',
      'Lote AB-02',
    ]
    for (const name of lotNames) {
      try {
        const record = app.findFirstRecordByData('lots', 'name', name)
        app.delete(record)
      } catch (_) {}
    }
  },
)
