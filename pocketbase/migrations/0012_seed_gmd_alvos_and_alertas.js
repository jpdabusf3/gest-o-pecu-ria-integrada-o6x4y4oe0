migrate(
  (app) => {
    const lotsCol = app.findCollectionByNameOrId('lots')
    const alertasCol = app.findCollectionByNameOrId('alertas_gmd')

    // 1. Atualizar alvos e fases para lotes existentes
    const lotTargets = {
      'Lote EN-01': {
        gmd_alvo_g_dia: 1350,
        fase_atual: 'confinamento',
        frente: 'engorda',
        data_inicio: '2023-10-20 10:00:00.000Z',
        is_arrendamento: false,
      },
      'Lote RE-01': {
        gmd_alvo_g_dia: 850, // Real foi 684g -> desvio de -19.5% (amarelo)
        fase_atual: 'recria',
        frente: 'recria',
        data_inicio: '2023-06-15 10:00:00.000Z',
        is_arrendamento: false,
      },
      'Lote CR-01': {
        gmd_alvo_g_dia: 650,
        fase_atual: 'cria',
        frente: 'cria',
        data_inicio: '2023-01-10 10:00:00.000Z',
        is_arrendamento: false,
      },
      'Lote VE-01': {
        gmd_alvo_g_dia: 700,
        fase_atual: 'recria',
        frente: 'arrendamento', // Exemplo de frente arrendamento segregada
        data_inicio: '2023-08-01 10:00:00.000Z',
        is_arrendamento: true,
      },
      'Lote AB-01': {
        gmd_alvo_g_dia: 1300,
        fase_atual: 'engorda',
        frente: 'engorda',
        data_inicio: '2023-05-10 10:00:00.000Z',
        is_arrendamento: false,
      },
      'Lote AB-02': {
        gmd_alvo_g_dia: 1050,
        fase_atual: 'engorda',
        frente: 'engorda',
        data_inicio: '2023-06-10 10:00:00.000Z',
        is_arrendamento: false,
      },
      'Lote Semente 1': {
        gmd_alvo_g_dia: 900,
        fase_atual: 'recria',
        frente: 'recria',
        data_inicio: '2023-06-01 10:00:00.000Z',
        is_arrendamento: false,
      },
    }

    const allLots = app.findRecordsByFilter('lots', '', '', 100, 0)
    for (const lot of allLots) {
      const name = lot.getString('name')
      const targetConfig = lotTargets[name] || {
        gmd_alvo_g_dia: 900,
        fase_atual: 'recria',
        frente: 'recria',
        data_inicio: '2023-06-01 10:00:00.000Z',
        is_arrendamento: false,
      }

      lot.set('gmd_alvo_g_dia', targetConfig.gmd_alvo_g_dia)
      lot.set('fase_atual', targetConfig.fase_atual)
      lot.set('frente', targetConfig.frente)
      lot.set('is_arrendamento', targetConfig.is_arrendamento)
      lot.set('data_inicio_lote', lot.getString('data_entrada') || targetConfig.data_inicio)
      app.save(lot)
    }

    // 2. Seeding de 1 lote específico com desvio persistente vermelho por 2 ciclos consecutivos
    // Vamos garantir um lote em alerta: Criar ou vincular no Lote RE-01 ou criar histórico de 2 ciclos
    try {
      const lotRe = app.findFirstRecordByData('lots', 'name', 'Lote RE-01')
      // Criar alerta registrado para esse lote
      const alerta = new Record(alertasCol)
      alerta.set('lote_id', lotRe.id)
      alerta.set('data', '2023-10-10 10:00:00.000Z')
      alerta.set('desvio_pct', -23.5)
      alerta.set('status', 'aberto')
      alerta.set('causa', '')
      alerta.set('contramedida', '')
      alerta.set('gmd_real', 650)
      alerta.set('gmd_alvo', 850)
      alerta.set('ciclos_consecutivos', 2)
      app.save(alerta)
    } catch (_) {}
  },
  (app) => {
    try {
      const recs = app.findRecordsByFilter('alertas_gmd', '', '', 100, 0)
      for (const r of recs) {
        app.delete(r)
      }
    } catch (_) {}
  },
)
