migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const lotsCol = app.findCollectionByNameOrId('lots')

    // Buscar lotes existentes para vincular
    let cr01Id = ''
    let re01Id = ''
    let en01Id = ''
    let ve01Id = ''

    try {
      const cr = app.findFirstRecordByData('lots', 'name', 'Lote CR-01')
      cr01Id = cr.id
    } catch (_) {}
    try {
      const re = app.findFirstRecordByData('lots', 'name', 'Lote RE-01')
      re01Id = re.id
    } catch (_) {}
    try {
      const en = app.findFirstRecordByData('lots', 'name', 'Lote EN-01')
      en01Id = en.id
    } catch (_) {}
    try {
      const ve = app.findFirstRecordByData('lots', 'name', 'Lote VE-01')
      ve01Id = ve.id
    } catch (_) {}

    // Formatar data no padrão ISO ou YYYY-MM-DD
    const today = new Date()
    const fmt = (d) => d.toISOString().split('T')[0] + ' 08:00:00.000Z'

    const dToday = new Date(today)
    const dPast = new Date(today.getTime() - 2 * 86400000)
    const dFuture1 = new Date(today.getTime() + 1 * 86400000)
    const dFuture3 = new Date(today.getTime() + 3 * 86400000)
    const dFuture7 = new Date(today.getTime() + 7 * 86400000)
    const dFuture30 = new Date(today.getTime() + 30 * 86400000)

    const samples = [
      {
        titulo: 'Fornecer Sal Mineral Diário',
        tipo: 'nutricao',
        data: fmt(dToday),
        frente: 'recria',
        lote_ids: re01Id ? [re01Id] : [],
        setor: 'Pasto 01 - Sede',
        responsavel_id: 'João (Operador Campo)',
        recorrencia: 'diaria',
        insumos: [
          { inventoryId: 'N1', item: 'Sal Mineral Fosbov 40', quantidade: 50, unidade: 'kg' },
        ],
        status: 'planejada',
        descricao: 'Rotina fixa diária de distribuição de sal mineral no cocho coberto.',
        is_arrendamento: false,
        custo_previsto: 125,
      },
      {
        titulo: 'Trato Diário Confinamento (Dieta Terminação)',
        tipo: 'nutricao',
        data: fmt(dToday),
        frente: 'confinamento',
        lote_ids: en01Id ? [en01Id] : [],
        setor: 'Baia Confinamento A',
        responsavel_id: 'Carlos (Gerente)',
        recorrencia: 'diaria',
        insumos: [
          {
            inventoryId: 'N2',
            item: 'Ração Confinamento Terminação',
            quantidade: 400,
            unidade: 'kg',
          },
        ],
        status: 'planejada',
        descricao: 'Leitura de cocho nota 2 e fornecimento de trato matinal balanceado.',
        is_arrendamento: false,
        custo_previsto: 680,
      },
      {
        titulo: 'Vacinação Febre Aftosa (Campanha)',
        tipo: 'sanidade',
        data: fmt(dPast), // Atividade vencida propositalmente para teste de destaque visual
        frente: 'recria',
        lote_ids: re01Id ? [re01Id] : [],
        setor: 'Curral Principal',
        responsavel_id: 'João (Operador Campo)',
        recorrencia: 'anual',
        insumos: [
          { inventoryId: 'F1', item: 'Vacina Aftosa Bivalente', quantidade: 85, unidade: 'Doses' },
        ],
        status: 'planejada',
        descricao:
          'Vacinação oficial obrigatória no rebanho de recria. Alerta gerado com antecedência.',
        is_arrendamento: false,
        custo_previsto: 255,
        alerta_dias_antes: 7,
      },
      {
        titulo: 'IATF Matrizes Lote CR-01 (Protocolo D0)',
        tipo: 'reproducao',
        data: fmt(dToday),
        frente: 'cria',
        lote_ids: cr01Id ? [cr01Id] : [],
        setor: 'Curral de Manejo',
        responsavel_id: 'Administrador (Sede)',
        recorrencia: 'unica',
        insumos: [
          { inventoryId: 'R-1', item: 'Sêmen Touro Fajardo', quantidade: 60, unidade: 'Doses' },
          {
            inventoryId: 'R-2',
            item: 'Protocolo Sincronização J-Synch',
            quantidade: 60,
            unidade: 'Doses',
          },
        ],
        status: 'planejada',
        descricao: 'Inseminação artificial por tempo fixo com touro provado.',
        is_arrendamento: false,
        custo_previsto: 3000,
      },
      {
        titulo: 'DG - Diagnóstico de Gestação (35 dias pós-IATF)',
        tipo: 'reproducao',
        data: fmt(dFuture30),
        frente: 'cria',
        lote_ids: cr01Id ? [cr01Id] : [],
        setor: 'Tronco Veterinário',
        responsavel_id: 'Carlos (Gerente)',
        recorrencia: 'unica',
        insumos: [],
        status: 'planejada',
        descricao: 'Ultrassonografia para confirmação de prenhez precoce.',
        is_arrendamento: false,
        custo_previsto: 450,
      },
      {
        titulo: 'Pesagem Trimestral de Acompanhamento GMD',
        tipo: 'pesagem',
        data: fmt(dFuture3),
        frente: 'engorda',
        lote_ids: en01Id ? [en01Id] : [],
        setor: 'Balança Eletrônica Curral',
        responsavel_id: 'João (Operador Campo)',
        recorrencia: 'semanal',
        insumos: [],
        status: 'planejada',
        descricao: 'Conferência de ganho médio diário e fechamento do ciclo de engorda.',
        is_arrendamento: false,
        custo_previsto: 0,
      },
      {
        titulo: 'Manejo Sanitário de Fêmeas Arrendadas',
        tipo: 'sanidade',
        data: fmt(dFuture7),
        frente: 'arrendamento',
        lote_ids: ve01Id ? [ve01Id] : [],
        setor: 'Pasto Arrendamento 04',
        responsavel_id: 'Carlos (Gerente)',
        recorrencia: 'unica',
        insumos: [
          {
            inventoryId: 'F2',
            item: 'Endectocida Ivermectina 1%',
            quantidade: 45,
            unidade: 'Frascos',
          },
        ],
        status: 'planejada',
        descricao: 'Controle de ecto/endoparasitas em matrizes do contrato de arrendamento.',
        is_arrendamento: true,
        custo_previsto: 380,
      },
    ]

    for (const item of samples) {
      try {
        const record = new Record(col)
        record.set('titulo', item.titulo)
        record.set('tipo', item.tipo)
        record.set('data', item.data)
        record.set('frente', item.frente)
        record.set('lote_ids', item.lote_ids)
        record.set('setor', item.setor)
        record.set('responsavel_id', item.responsavel_id)
        record.set('recorrencia', item.recorrencia)
        record.set('insumos', item.insumos)
        record.set('status', item.status)
        record.set('descricao', item.descricao)
        record.set('is_arrendamento', !!item.is_arrendamento)
        record.set('custo_previsto', item.custo_previsto)
        if (item.alerta_dias_antes) {
          record.set('alerta_dias_antes', item.alerta_dias_antes)
        }
        record.set('created_by', 'system_seed')
        app.save(record)
      } catch (err) {
        console.log('Erro ao criar seed de atividade:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const records = app.findRecordsByFilter(
        'atividades',
        'created_by = "system_seed"',
        '',
        100,
        0,
      )
      for (const rec of records) {
        app.delete(rec)
      }
    } catch (_) {}
  },
)
