migrate(
  (app) => {
    const lotsCol = app.findCollectionByNameOrId('lots')
    const pesCol = app.findCollectionByNameOrId('pesagens')

    // Atualizar dados de entrada e permanência nos lotes existentes
    const existingLots = app.findRecordsByFilter('lots', '', '', 50, 0)
    for (const lot of existingLots) {
      const entryDate = lot.getString('entry_date') || '2023-06-01 10:00:00.000Z'
      lot.set('data_entrada', entryDate)
      lot.set('peso_entrada_medio', lot.getInt('initial_weight') || 300)
      lot.set('peso_medio_atual', lot.getInt('final_weight') || 400)
      if (lot.getString('status') === 'abated' || lot.getString('status') === 'sold') {
        const exitDate = lot.getString('exit_date') || '2023-10-01 10:00:00.000Z'
        lot.set('data_saida', exitDate)
        lot.set('peso_saida_medio', lot.getInt('final_weight') || 520)
        lot.set('rendimento_carcaca_pct', 53.5)
        lot.set('dias_permanencia', 120)
      } else {
        lot.set('dias_permanencia', 95)
      }
      if (!lot.getString('pasto_atual')) {
        lot.set('pasto_atual', 'Pasto 01 - Sede')
      }
      app.save(lot)
    }

    // Criar histórico de pesagens realista para os lotes principais
    const lotEn01 = app.findFirstRecordByData('lots', 'name', 'Lote EN-01')
    const lotRe01 = app.findFirstRecordByData('lots', 'name', 'Lote RE-01')
    const lotCr01 = app.findFirstRecordByData('lots', 'name', 'Lote CR-01')

    const seedPesagens = [
      // Lote EN-01 (Engorda) - 3 pesagens
      {
        lote_id: lotEn01.id,
        tipo: 'lote',
        animal_id: '',
        qtd_animais: 60,
        peso_medio_kg: 380,
        peso_total_kg: 22800,
        ecc: 3.5,
        responsavel_id: 'João Pedro',
        origem: 'manual',
        observacoes: 'Pesagem de entrada no confinamento / piquete de engorda.',
        data_pesagem: '2023-10-20 10:00:00.000Z',
        dias_intervalo: 0,
        gmd_intervalo: 0,
        peso_anterior_kg: 380,
      },
      {
        lote_id: lotEn01.id,
        tipo: 'lote',
        animal_id: '',
        qtd_animais: 60,
        peso_medio_kg: 445,
        peso_total_kg: 26700,
        ecc: 4.0,
        responsavel_id: 'João Pedro',
        origem: 'balanca',
        observacoes: 'Aferição intermediária 50 dias. Ótimo consumo de concentrado.',
        data_pesagem: '2023-12-10 10:00:00.000Z',
        dias_intervalo: 51,
        gmd_intervalo: 1.275,
        peso_anterior_kg: 380,
      },
      {
        lote_id: lotEn01.id,
        tipo: 'lote',
        animal_id: '',
        qtd_animais: 60,
        peso_medio_kg: 520,
        peso_total_kg: 31200,
        ecc: 4.5,
        responsavel_id: 'Carlos (Gerente)',
        origem: 'balanca',
        observacoes: 'Pesagem pré-embarque. Lote pronto para abate frigorífico.',
        data_pesagem: '2024-02-05 10:00:00.000Z',
        dias_intervalo: 57,
        gmd_intervalo: 1.316,
        peso_anterior_kg: 445,
      },
      // Lote RE-01 (Recria)
      {
        lote_id: lotRe01.id,
        tipo: 'lote',
        animal_id: '',
        qtd_animais: 85,
        peso_medio_kg: 200,
        peso_total_kg: 17000,
        ecc: 3.0,
        responsavel_id: 'João Pedro',
        origem: 'manual',
        observacoes: 'Entrada da desmama na recria a pasto rotacionado.',
        data_pesagem: '2023-06-15 10:00:00.000Z',
        dias_intervalo: 0,
        gmd_intervalo: 0,
        peso_anterior_kg: 200,
      },
      {
        lote_id: lotRe01.id,
        tipo: 'lote',
        animal_id: '',
        qtd_animais: 85,
        peso_medio_kg: 280,
        peso_total_kg: 23800,
        ecc: 3.5,
        responsavel_id: 'João (Operador Campo)',
        origem: 'balanca',
        observacoes: 'Pesagem de controle após 115 dias de suplementação proteica.',
        data_pesagem: '2023-10-10 10:00:00.000Z',
        dias_intervalo: 117,
        gmd_intervalo: 0.684,
        peso_anterior_kg: 200,
      },
      // Individual no Lote CR-01
      {
        lote_id: lotCr01.id,
        tipo: 'individual',
        animal_id: 'TAG-1234',
        qtd_animais: 1,
        peso_medio_kg: 462,
        peso_total_kg: 462,
        ecc: 3.5,
        responsavel_id: 'João Pedro',
        origem: 'balanca',
        observacoes: 'Pesagem individual com leitor de brinco RFID e balança.',
        data_pesagem: '2024-01-15 10:00:00.000Z',
        dias_intervalo: 0,
        gmd_intervalo: 0,
        peso_anterior_kg: 450,
      },
    ]

    for (const item of seedPesagens) {
      const rec = new Record(pesCol)
      for (const [key, val] of Object.entries(item)) {
        rec.set(key, val)
      }
      app.save(rec)
    }
  },
  (app) => {
    const pes = app.findRecordsByFilter('pesagens', '', '', 500, 0)
    for (const p of pes) {
      app.delete(p)
    }
  },
)
