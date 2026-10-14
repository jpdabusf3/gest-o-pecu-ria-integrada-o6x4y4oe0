/// <reference path="../pb_data/types.d.ts" />

// 0034: coleção maestro_vendas_gado — registro consolidado append-only das vendas
// de gado ingestadas pelo Robô Chicão. Não altera coleções existentes.

migrate(
  (app) => {
    const vendasGado = new Collection({
      name: 'maestro_vendas_gado',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'arquivo_nome', type: 'text', required: true },
        { name: 'formato', type: 'text' },
        { name: 'comprador', type: 'text' },
        { name: 'data_venda', type: 'date' },
        {
          name: 'frente',
          type: 'select',
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        { name: 'total_registros_lidos', type: 'number' },
        { name: 'total_criados', type: 'number' },
        { name: 'total_atualizados', type: 'number' },
        { name: 'total_ignorados', type: 'number' },
        { name: 'total_cabecas', type: 'number' },
        { name: 'peso_total_kg', type: 'number' },
        { name: 'arrobas_totais', type: 'number' },
        { name: 'receita_total_rs', type: 'number' },
        { name: 'preco_medio_rs_at', type: 'number' },
        { name: 'agio_medio_pct', type: 'number' },
        { name: 'cotacao_origem', type: 'text' },
        { name: 'cotacao_preco_rs', type: 'number' },
        { name: 'cotacao_data_referencia', type: 'text' },
        { name: 'cotacao_desatualizada', type: 'bool' },
        { name: 'linhas', type: 'json' },
        { name: 'protocolo_audit_id', type: 'text' },
        { name: 'usuario_id', type: 'text' },
        { name: 'usuario_nome', type: 'text' },
        { name: 'perfil', type: 'text' },
        { name: 'timestamp_dispositivo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mvendas_data ON maestro_vendas_gado (data_venda DESC)',
        'CREATE INDEX idx_mvendas_comprador ON maestro_vendas_gado (comprador)',
      ],
    })
    app.save(vendasGado)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('maestro_vendas_gado'))
    } catch (_) {}
  },
)
