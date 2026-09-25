migrate(
  (app) => {
    const lotsCol = app.findCollectionByNameOrId('lots')
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const pesagensCol = app.findCollectionByNameOrId('pesagens')
    const estoqueCol = app.findCollectionByNameOrId('estoque_insumos')

    // 1. Garantir lote LCR-01 na coleção 'lots'
    let lcr01Record = null
    try {
      lcr01Record = app.findFirstRecordByData('lots', 'name', 'LCR-01')
    } catch (_) {
      try {
        lcr01Record = app.findFirstRecordByData('lots', 'name', 'Lote CR-01')
        lcr01Record.set('name', 'LCR-01')
      } catch (_) {
        lcr01Record = new Record(lotsCol)
        lcr01Record.set('name', 'LCR-01')
      }
    }

    lcr01Record.set('sector', 'cria')
    lcr01Record.set('frente', 'cria')
    lcr01Record.set('category', 'Vacas (Matrizes)')
    lcr01Record.set('sex', 'femea')
    lcr01Record.set('headcount', 120)
    lcr01Record.set('initial_weight', 450)
    lcr01Record.set('peso_entrada_medio', 450)
    lcr01Record.set('final_weight', 460)
    lcr01Record.set('peso_medio_atual', 460)
    lcr01Record.set('gmd_alvo_g_dia', 650)
    lcr01Record.set('pasto_atual', 'Pasto 01 - Sede')
    lcr01Record.set('status', 'active')
    lcr01Record.set('dias_permanencia', 95)
    lcr01Record.set('entry_date', '2023-01-10 10:00:00.000Z')
    lcr01Record.set('data_entrada', '2023-01-10 10:00:00.000Z')
    lcr01Record.set('data_inicio_lote', '2023-01-10 10:00:00.000Z')
    lcr01Record.set('is_arrendamento', false)
    lcr01Record.set('value_per_animal', 3500)
    app.save(lcr01Record)

    const lcr01Id = lcr01Record.id

    // 2. Garantir pesagem anterior para LCR-01 (para cálculo de GMD automático no intervalo)
    try {
      const pesagensExistentes = app.findRecordsByFilter(
        'pesagens',
        `lote_id = '${lcr01Id}'`,
        '-data_pesagem',
        1,
        0,
      )
      if (pesagensExistentes.length === 0) {
        const pRec = new Record(pesagensCol)
        pRec.set('lote_id', lcr01Id)
        pRec.set('data_pesagem', '2026-08-25 08:00:00.000Z')
        pRec.set('tipo', 'lote')
        pRec.set('qtd_animais', 120)
        pRec.set('peso_medio_kg', 450)
        pRec.set('peso_total_kg', 54000)
        pRec.set('responsavel_id', 'João (Vaqueiro)')
        pRec.set('origem', 'balanca')
        pRec.set('observacoes', 'Pesagem inicial/anterior de referência do lote LCR-01.')
        pRec.set('dias_intervalo', 0)
        pRec.set('gmd_intervalo', 0)
        pRec.set('peso_anterior_kg', 450)
        app.save(pRec)
      }
    } catch (_) {}

    // 3. Garantir item no estoque_insumos para Vacina F1
    try {
      const f1Item = app.findFirstRecordByData('estoque_insumos', 'codigo', 'F1')
      if (f1Item.getInt('estoque_final') < 120) {
        f1Item.set('estoque_inicial', 500)
        f1Item.set('entradas', 200)
        f1Item.set('saidas', 150)
        f1Item.set('estoque_final', 550)
        app.save(f1Item)
      }
    } catch (_) {
      const f1Rec = new Record(estoqueCol)
      f1Rec.set('produto', 'Vacina Aftosa Bivalente')
      f1Rec.set('codigo', 'F1')
      f1Rec.set('unidade', 'doses')
      f1Rec.set('categoria', 'sanidade')
      f1Rec.set('estoque_inicial', 500)
      f1Rec.set('entradas', 200)
      f1Rec.set('saidas', 100)
      f1Rec.set('estoque_final', 600)
      f1Rec.set('preco_unitario', 3.5)
      f1Rec.set('custo_periodo', 350)
      f1Rec.set('periodo_mes', '2026-09')
      app.save(f1Rec)
    }

    // 4. Garantir atividade de vacinação para LCR-01 agendada para hoje
    const todayStr = new Date().toISOString().split('T')[0] + ' 08:00:00.000Z'
    try {
      const atvs = app.findRecordsByFilter(
        'atividades',
        `titulo ~ 'Vacinação' && lote_ids ~ '${lcr01Id}'`,
        '-data',
        1,
        0,
      )
      if (atvs.length === 0) {
        const atvRec = new Record(atividadesCol)
        atvRec.set('titulo', 'Vacinação Febre Aftosa e Sanidade - LCR-01')
        atvRec.set('tipo', 'sanidade')
        atvRec.set('data', todayStr)
        atvRec.set('frente', 'cria')
        atvRec.set('lote_ids', [lcr01Id])
        atvRec.set('setor', 'Curral de Manejo')
        atvRec.set('responsavel_id', 'João (Vaqueiro)')
        atvRec.set('recorrencia', 'unica')
        atvRec.set('insumos', [
          { inventoryId: 'F1', item: 'Vacina Aftosa Bivalente', quantidade: 120, unidade: 'Doses' },
        ])
        atvRec.set('status', 'agendada')
        atvRec.set(
          'descricao',
          'Campanha de vacinação oficial e protocolo sanitário no lote de matrizes LCR-01.',
        )
        atvRec.set('is_arrendamento', false)
        atvRec.set('custo_previsto', 420)
        atvRec.set('created_by', 'system_seed')
        app.save(atvRec)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const atv = app.findFirstRecordByData(
        'atividades',
        'titulo',
        'Vacinação Febre Aftosa e Sanidade - LCR-01',
      )
      app.delete(atv)
    } catch (_) {}
  },
)
