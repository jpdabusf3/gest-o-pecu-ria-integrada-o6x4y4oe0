migrate(
  (app) => {
    // 1. Criar coleção config_benchmark_historico
    try {
      app.findCollectionByNameOrId('config_benchmark_historico')
    } catch (_) {
      const historicoCol = new Collection({
        name: 'config_benchmark_historico',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'data_recalibracao', type: 'date', required: true },
          { name: 'ano_safra', type: 'text', required: true },
          { name: 'codigo', type: 'text', required: true },
          { name: 'indicador', type: 'text', required: true },
          { name: 'unidade', type: 'text' },
          { name: 'categoria', type: 'text' },
          { name: 'valor_media', type: 'number', required: true },
          { name: 'valor_referencia', type: 'number', required: true },
          { name: 'valor_top', type: 'number', required: true },
          { name: 'alvo_fazenda', type: 'number', required: true },
          { name: 'usuario_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'usuario_nome', type: 'text' },
          { name: 'observacao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_hist_bench_safra ON config_benchmark_historico (ano_safra)',
          'CREATE INDEX idx_hist_bench_codigo ON config_benchmark_historico (codigo)',
          'CREATE INDEX idx_hist_bench_data ON config_benchmark_historico (data_recalibracao)',
        ],
      })
      app.save(historicoCol)
    }

    // 2. Seed inicial de histórico com safras anteriores (2023/2024 e 2024/2025 e 2025/2026)
    const colHist = app.findCollectionByNameOrId('config_benchmark_historico')

    let gestorId = ''
    let gestorNome = 'João Pedro (Gestor)'
    try {
      const gestor = app.findFirstRecordByData('users', 'email', 'joaopedro_zoo@hotmail.com')
      gestorId = gestor.id
      gestorNome = gestor.getString('name') || 'João Pedro (Gestor)'
    } catch (_) {}

    const safrasHistoricas = [
      {
        ano_safra: '2023/2024',
        data_recalibracao: '2023-07-01 10:00:00.000Z',
        observacao: 'Calibração Safra 2023/2024 - Levantamento inicial MT/TIP',
        indicadores: [
          {
            codigo: 'prod_arroba_ha_ano_pasto',
            indicador: 'Produção em pastagem (@/ha/ano)',
            unidade: '@ / ha / ano',
            categoria: 'produtividade',
            valor_media: 6.2,
            valor_referencia: 9.0,
            valor_top: 10.2,
            alvo_fazenda: 9.0,
          },
          {
            codigo: 'gmd_engorda_tip',
            indicador: 'GMD Engorda / TIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 1.1,
            valor_referencia: 1.25,
            valor_top: 1.32,
            alvo_fazenda: 1.25,
          },
          {
            codigo: 'gmd_recria_pasto',
            indicador: 'GMD Recria a pasto / RIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 0.32,
            valor_referencia: 0.42,
            valor_top: 0.58,
            alvo_fazenda: 0.45,
          },
          {
            codigo: 'cria_taxa_desmame',
            indicador: 'Cria: Taxa de desmame (%)',
            unidade: '%',
            categoria: 'reproducao',
            valor_media: 68.0,
            valor_referencia: 72.0,
            valor_top: 80.0,
            alvo_fazenda: 72.0,
          },
          {
            codigo: 'cria_kg_bezerro_matriz',
            indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
            unidade: 'kg / matriz',
            categoria: 'reproducao',
            valor_media: 140.0,
            valor_referencia: 165.0,
            valor_top: 180.0,
            alvo_fazenda: 170.0,
          },
          {
            codigo: 'custo_arroba_produzida_engorda',
            indicador: 'Custo da @ produzida (engorda, sem reposição)',
            unidade: 'R$ / @',
            categoria: 'economico',
            valor_media: 228.0,
            valor_referencia: 210.0,
            valor_top: 195.0,
            alvo_fazenda: 210.0,
          },
          {
            codigo: 'custeio_total_cab_ano',
            indicador: 'Custeio total por cabeça / ano',
            unidade: 'R$ / cab / ano',
            categoria: 'economico',
            valor_media: 810.0,
            valor_referencia: 1020.0,
            valor_top: 1080.0,
            alvo_fazenda: 1020.0,
          },
          {
            codigo: 'margem_ebitda',
            indicador: 'Margem EBITDA',
            unidade: '%',
            categoria: 'economico',
            valor_media: 12.0,
            valor_referencia: 15.5,
            valor_top: 22.0,
            alvo_fazenda: 15.5,
          },
        ],
      },
      {
        ano_safra: '2024/2025',
        data_recalibracao: '2024-07-01 10:00:00.000Z',
        observacao: 'Calibração Safra 2024/2025 - Revisão anual com metas de cria ajustadas',
        indicadores: [
          {
            codigo: 'prod_arroba_ha_ano_pasto',
            indicador: 'Produção em pastagem (@/ha/ano)',
            unidade: '@ / ha / ano',
            categoria: 'produtividade',
            valor_media: 6.4,
            valor_referencia: 9.5,
            valor_top: 10.6,
            alvo_fazenda: 9.5,
          },
          {
            codigo: 'gmd_engorda_tip',
            indicador: 'GMD Engorda / TIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 1.12,
            valor_referencia: 1.28,
            valor_top: 1.35,
            alvo_fazenda: 1.28,
          },
          {
            codigo: 'gmd_recria_pasto',
            indicador: 'GMD Recria a pasto / RIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 0.34,
            valor_referencia: 0.44,
            valor_top: 0.62,
            alvo_fazenda: 0.48,
          },
          {
            codigo: 'cria_taxa_desmame',
            indicador: 'Cria: Taxa de desmame (%)',
            unidade: '%',
            categoria: 'reproducao',
            valor_media: 70.0,
            valor_referencia: 75.0,
            valor_top: 85.0,
            alvo_fazenda: 75.0,
          },
          {
            codigo: 'cria_kg_bezerro_matriz',
            indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
            unidade: 'kg / matriz',
            categoria: 'reproducao',
            valor_media: 150.0,
            valor_referencia: 175.0,
            valor_top: 190.0,
            alvo_fazenda: 190.0,
          },
          {
            codigo: 'custo_arroba_produzida_engorda',
            indicador: 'Custo da @ produzida (engorda, sem reposição)',
            unidade: 'R$ / @',
            categoria: 'economico',
            valor_media: 220.0,
            valor_referencia: 205.0,
            valor_top: 190.0,
            alvo_fazenda: 205.0,
          },
          {
            codigo: 'custeio_total_cab_ano',
            indicador: 'Custeio total por cabeça / ano',
            unidade: 'R$ / cab / ano',
            categoria: 'economico',
            valor_media: 840.0,
            valor_referencia: 1070.0,
            valor_top: 1110.0,
            alvo_fazenda: 1070.0,
          },
          {
            codigo: 'margem_ebitda',
            indicador: 'Margem EBITDA',
            unidade: '%',
            categoria: 'economico',
            valor_media: 12.8,
            valor_referencia: 16.5,
            valor_top: 24.0,
            alvo_fazenda: 16.5,
          },
        ],
      },
      {
        ano_safra: '2025/2026',
        data_recalibracao: '2025-07-01 10:00:00.000Z',
        observacao: 'Calibração Safra 2025/2026 - Padrão Exagro atual (vigente)',
        indicadores: [
          {
            codigo: 'prod_arroba_ha_ano_pasto',
            indicador: 'Produção em pastagem (@/ha/ano)',
            unidade: '@ / ha / ano',
            categoria: 'produtividade',
            valor_media: 6.6,
            valor_referencia: 10.0,
            valor_top: 11.0,
            alvo_fazenda: 10.0,
          },
          {
            codigo: 'gmd_engorda_tip',
            indicador: 'GMD Engorda / TIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 1.15,
            valor_referencia: 1.29,
            valor_top: 1.375,
            alvo_fazenda: 1.3,
          },
          {
            codigo: 'gmd_recria_pasto',
            indicador: 'GMD Recria a pasto / RIP',
            unidade: 'kg/dia',
            categoria: 'zootecnico',
            valor_media: 0.352,
            valor_referencia: 0.45,
            valor_top: 0.65,
            alvo_fazenda: 0.5,
          },
          {
            codigo: 'cria_taxa_desmame',
            indicador: 'Cria: Taxa de desmame (%)',
            unidade: '%',
            categoria: 'reproducao',
            valor_media: 70.0,
            valor_referencia: 75.0,
            valor_top: 85.0,
            alvo_fazenda: 75.0,
          },
          {
            codigo: 'cria_kg_bezerro_matriz',
            indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
            unidade: 'kg / matriz',
            categoria: 'reproducao',
            valor_media: 150.0,
            valor_referencia: 175.0,
            valor_top: 190.0,
            alvo_fazenda: 190.0,
          },
          {
            codigo: 'custo_arroba_produzida_engorda',
            indicador: 'Custo da @ produzida (engorda, sem reposição)',
            unidade: 'R$ / @',
            categoria: 'economico',
            valor_media: 215.0,
            valor_referencia: 199.59,
            valor_top: 185.0,
            alvo_fazenda: 199.59,
          },
          {
            codigo: 'custeio_total_cab_ano',
            indicador: 'Custeio total por cabeça / ano',
            unidade: 'R$ / cab / ano',
            categoria: 'economico',
            valor_media: 861.2,
            valor_referencia: 1102.5,
            valor_top: 1142.1,
            alvo_fazenda: 1102.5,
          },
          {
            codigo: 'margem_ebitda',
            indicador: 'Margem EBITDA',
            unidade: '%',
            categoria: 'economico',
            valor_media: 13.4,
            valor_referencia: 17.1,
            valor_top: 25.6,
            alvo_fazenda: 17.1,
          },
        ],
      },
    ]

    for (const safra of safrasHistoricas) {
      for (const item of safra.indicadores) {
        try {
          const filter = `ano_safra = '${safra.ano_safra}' && codigo = '${item.codigo}'`
          const existing = app.findRecordsByFilter('config_benchmark_historico', filter, '', 1, 0)
          if (existing && existing.length > 0) continue
        } catch (_) {}

        const rec = new Record(colHist)
        rec.set('ano_safra', safra.ano_safra)
        rec.set('data_recalibracao', safra.data_recalibracao)
        rec.set('codigo', item.codigo)
        rec.set('indicador', item.indicador)
        rec.set('unidade', item.unidade)
        rec.set('categoria', item.categoria)
        rec.set('valor_media', item.valor_media)
        rec.set('valor_referencia', item.valor_referencia)
        rec.set('valor_top', item.valor_top)
        rec.set('alvo_fazenda', item.alvo_fazenda)
        if (gestorId) rec.set('usuario_id', gestorId)
        rec.set('usuario_nome', gestorNome)
        rec.set('observacao', safra.observacao)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('config_benchmark_historico'))
    } catch (_) {}
  },
)
