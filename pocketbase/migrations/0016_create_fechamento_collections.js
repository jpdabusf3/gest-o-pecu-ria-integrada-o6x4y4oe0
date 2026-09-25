migrate(
  (app) => {
    const lotsCol = app.findCollectionByNameOrId('lots')

    // 1. movimentacoes_rebanho:
    // data, frente, lote_id, tipo (compra/nascimento/venda/morte/transferencia), qtd_cabecas, peso_total_kg, valor_total_rs, documento
    const movimentacoes = new Collection({
      name: 'movimentacoes_rebanho',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'data', type: 'date', required: true },
        {
          name: 'frente',
          type: 'select',
          required: true,
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        {
          name: 'lote_id',
          type: 'relation',
          collectionId: lotsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['compra', 'nascimento', 'venda', 'morte', 'transferencia'],
          maxSelect: 1,
        },
        { name: 'qtd_cabecas', type: 'number', required: true },
        { name: 'peso_total_kg', type: 'number' },
        { name: 'valor_total_rs', type: 'number' },
        { name: 'documento', type: 'text' },
        { name: 'sexo', type: 'select', values: ['macho', 'femea'], maxSelect: 1 },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mov_data ON movimentacoes_rebanho (data DESC)',
        'CREATE INDEX idx_mov_frente ON movimentacoes_rebanho (frente)',
        'CREATE INDEX idx_mov_tipo ON movimentacoes_rebanho (tipo)',
        'CREATE INDEX idx_mov_lote ON movimentacoes_rebanho (lote_id)',
      ],
    })
    app.save(movimentacoes)

    // 2. vendas:
    // data, lote_id, qtd_cabecas, peso_vivo_total, rendimento_carcaca_pct, peso_carcaca_total, preco_rs_at, receita_total, comprador
    const vendas = new Collection({
      name: 'vendas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'data', type: 'date', required: true },
        {
          name: 'lote_id',
          type: 'relation',
          collectionId: lotsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'frente',
          type: 'select',
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        { name: 'sexo', type: 'select', values: ['macho', 'femea'], maxSelect: 1 },
        { name: 'qtd_cabecas', type: 'number', required: true },
        { name: 'peso_vivo_total', type: 'number' },
        { name: 'rendimento_carcaca_pct', type: 'number' },
        { name: 'peso_carcaca_total', type: 'number' },
        { name: 'preco_rs_at', type: 'number' },
        { name: 'receita_total', type: 'number', required: true },
        { name: 'comprador', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vendas_data ON vendas (data DESC)',
        'CREATE INDEX idx_vendas_lote ON vendas (lote_id)',
      ],
    })
    app.save(vendas)

    // 3. compras_gado:
    // data, frente, qtd_cabecas, peso_medio, preco_rs_cab, preco_rs_at, valor_total, agio_pct
    const comprasGado = new Collection({
      name: 'compras_gado',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'data', type: 'date', required: true },
        {
          name: 'frente',
          type: 'select',
          required: true,
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        {
          name: 'lote_id',
          type: 'relation',
          collectionId: lotsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'sexo', type: 'select', values: ['macho', 'femea'], maxSelect: 1 },
        { name: 'qtd_cabecas', type: 'number', required: true },
        { name: 'peso_medio', type: 'number' },
        { name: 'preco_rs_cab', type: 'number' },
        { name: 'preco_rs_at', type: 'number' },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'agio_pct', type: 'number' },
        { name: 'fornecedor', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_compras_data ON compras_gado (data DESC)',
        'CREATE INDEX idx_compras_frente ON compras_gado (frente)',
      ],
    })
    app.save(comprasGado)

    // 4. lancamentos_financeiros:
    // data, centro_custo, plano_contas, classificacao (investimento/custo_variavel/custo_fixo/despesa/desembolso/perda), valor, descricao
    const lancamentos = new Collection({
      name: 'lancamentos_financeiros',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'data', type: 'date', required: true },
        {
          name: 'centro_custo',
          type: 'select',
          required: true,
          values: [
            'cria',
            'recria',
            'engorda',
            'confinamento',
            'arrendamento',
            'fabrica_suplemento',
            'frota',
            'administrativo',
          ],
          maxSelect: 1,
        },
        { name: 'plano_contas', type: 'text', required: true },
        {
          name: 'classificacao',
          type: 'select',
          required: true,
          values: [
            'investimento',
            'custo_variavel',
            'custo_fixo',
            'despesa',
            'desembolso',
            'perda',
          ],
          maxSelect: 1,
        },
        { name: 'tipo', type: 'select', values: ['despesa', 'receita'], maxSelect: 1 },
        { name: 'valor', type: 'number', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'lote_id',
          type: 'relation',
          collectionId: lotsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lanc_data ON lancamentos_financeiros (data DESC)',
        'CREATE INDEX idx_lanc_centro ON lancamentos_financeiros (centro_custo)',
        'CREATE INDEX idx_lanc_classif ON lancamentos_financeiros (classificacao)',
      ],
    })
    app.save(lancamentos)

    // 5. estoque_insumos:
    // produto, unidade, estoque_inicial, entradas, saidas, estoque_final, preco_unitario, custo_periodo
    const estoque = new Collection({
      name: 'estoque_insumos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'produto', type: 'text', required: true },
        { name: 'codigo', type: 'text' },
        { name: 'unidade', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          values: ['nutricao', 'sanidade', 'combustivel', 'semen', 'geral'],
          maxSelect: 1,
        },
        { name: 'estoque_inicial', type: 'number', required: true },
        { name: 'entradas', type: 'number', required: true },
        { name: 'saidas', type: 'number', required: true },
        { name: 'estoque_final', type: 'number', required: true },
        { name: 'preco_unitario', type: 'number', required: true },
        { name: 'custo_periodo', type: 'number', required: true },
        { name: 'periodo_mes', type: 'text' }, // Ex: "2024-03" ou "2024-04"
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_estoque_produto ON estoque_insumos (produto)',
        'CREATE INDEX idx_estoque_periodo ON estoque_insumos (periodo_mes)',
      ],
    })
    app.save(estoque)

    // 6. imobilizado:
    // descricao, tipo, vida_util_anos, valor_residual_pct, valor_imobilizado, depreciacao_anual
    const imobilizado = new Collection({
      name: 'imobilizado',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['edificacoes', 'maquinas', 'tratores', 'veiculos', 'benfeitorias', 'pastagens'],
          maxSelect: 1,
        },
        { name: 'vida_util_anos', type: 'number', required: true },
        { name: 'valor_residual_pct', type: 'number', required: true },
        { name: 'valor_imobilizado', type: 'number', required: true },
        { name: 'depreciacao_anual', type: 'number', required: true },
        { name: 'data_aquisicao', type: 'date' },
        {
          name: 'centro_custo',
          type: 'select',
          values: [
            'cria',
            'recria',
            'engorda',
            'confinamento',
            'arrendamento',
            'fabrica_suplemento',
            'frota',
            'administrativo',
          ],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_imobilizado_tipo ON imobilizado (tipo)',
        'CREATE INDEX idx_imobilizado_centro ON imobilizado (centro_custo)',
      ],
    })
    app.save(imobilizado)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('imobilizado'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('estoque_insumos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('lancamentos_financeiros'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('compras_gado'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('vendas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('movimentacoes_rebanho'))
    } catch (_) {}
  },
)
