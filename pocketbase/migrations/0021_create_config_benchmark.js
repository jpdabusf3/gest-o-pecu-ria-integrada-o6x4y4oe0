migrate(
  (app) => {
    // 1. Criar coleção config_benchmark
    try {
      app.findCollectionByNameOrId('config_benchmark')
    } catch (_) {
      const benchmarkCol = new Collection({
        name: 'config_benchmark',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'indicador', type: 'text', required: true },
          { name: 'unidade', type: 'text', required: true },
          { name: 'categoria', type: 'text' },
          { name: 'valor_media', type: 'number', required: true },
          { name: 'valor_referencia', type: 'number', required: true },
          { name: 'valor_top', type: 'number', required: true },
          { name: 'alvo_fazenda', type: 'number', required: true },
          { name: 'observacao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_config_benchmark_codigo ON config_benchmark (codigo)'],
      })
      app.save(benchmarkCol)
    }

    // 2. Seed com os indicadores Exagro fornecidos
    const col = app.findCollectionByNameOrId('config_benchmark')

    const seeds = [
      {
        codigo: 'prod_arroba_ha_ano_pasto',
        indicador: 'Produção em pastagem (@/ha/ano)',
        unidade: '@ / ha / ano',
        categoria: 'produtividade',
        valor_media: 6.6,
        valor_referencia: 10.0,
        valor_top: 11.0,
        alvo_fazenda: 10.0,
        observacao:
          'Média 6,6 | Referência (MT, TIP) 10,0 | TOP 11,0 | Alvo: 10,0 @/ha/ano no pasto',
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
        observacao:
          'Referência do caso 1,290 kg/dia (1G 1,375; 2G 1,215; 3G 1,331) | Alvo da fazenda: 1,30 kg/dia',
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
        observacao:
          'Referência do caso 0,352 kg/dia | Alvo RIP configurável pelo gestor (iniciar em 0,50 kg/dia)',
      },
      {
        codigo: 'cria_taxa_desmame',
        indicador: 'Cria: Taxa de desmame (%)',
        unidade: '%',
        categoria: 'reproducao',
        valor_media: 75.0,
        valor_referencia: 82.5,
        valor_top: 88.0,
        alvo_fazenda: 85.0,
        observacao:
          'Cria avaliada por taxa de desmame e kg bezerro/matriz (não por GMD). Metas editáveis.',
      },
      {
        codigo: 'cria_kg_bezerro_matriz',
        indicador: 'Cria: kg de bezerro desmamado / matriz exposta',
        unidade: 'kg / matriz',
        categoria: 'reproducao',
        valor_media: 135.0,
        valor_referencia: 160.0,
        valor_top: 185.0,
        alvo_fazenda: 165.0,
        observacao: 'Produtividade de cria por matriz exposta. Editável pelo gestor.',
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
        observacao: 'Referência Exagro R$ 199,59/@',
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
        observacao: 'Média R$ 861,2 | Referência R$ 1.102,5 | TOP R$ 1.142,1',
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
        observacao: 'Média 13,4% | Referência 17,1% | TOP 25,6%',
      },
    ]

    for (const s of seeds) {
      try {
        const existing = app.findFirstRecordByData('config_benchmark', 'codigo', s.codigo)
        // Se já existe, atualiza valores base
        existing.set('indicador', s.indicador)
        existing.set('unidade', s.unidade)
        existing.set('categoria', s.categoria)
        existing.set('valor_media', s.valor_media)
        existing.set('valor_referencia', s.valor_referencia)
        existing.set('valor_top', s.valor_top)
        existing.set('alvo_fazenda', s.alvo_fazenda)
        existing.set('observacao', s.observacao)
        app.save(existing)
      } catch (_) {
        const rec = new Record(col)
        rec.set('codigo', s.codigo)
        rec.set('indicador', s.indicador)
        rec.set('unidade', s.unidade)
        rec.set('categoria', s.categoria)
        rec.set('valor_media', s.valor_media)
        rec.set('valor_referencia', s.valor_referencia)
        rec.set('valor_top', s.valor_top)
        rec.set('alvo_fazenda', s.alvo_fazenda)
        rec.set('observacao', s.observacao)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('config_benchmark'))
    } catch (_) {}
  },
)
