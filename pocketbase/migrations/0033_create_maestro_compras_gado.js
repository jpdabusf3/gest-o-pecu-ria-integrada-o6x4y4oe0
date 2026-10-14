/// <reference path="../pb_data/types.d.ts" />
/**
 * 0033 — Coleção do Robô Maestro: Ingestão de Compra de Gado.
 *
 * Registra cada importação APROVADA pelo usuário na conferência obrigatória
 * (Etapa 3 do Maestro). Nada é gravado aqui sem conferência — a coleção é
 * escrita apenas na Etapa 4 (Aplicação), junto com a trilha append-only.
 *
 * Não altera nenhuma coleção existente; integra-se via serviços:
 * - movimentacoes_rebanho (entrada tipo compra)
 * - lancamentos_financeiros (centro de custo da frente)
 * - lots / pesagens (rebanho)
 * - audit_log (trilha)
 * - config_benchmark (benchmark de preço/@, se existir)
 */
migrate(
  (app) => {
    const lotsId = app.findCollectionByNameOrId('lots').id

    const collection = new Collection({
      name: 'maestro_compras_gado',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      updateRule: null,
      deleteRule: null,
      fields: [
        // Documento de origem
        { name: 'arquivo_nome', type: 'text', required: true },
        { name: 'formato', type: 'text' }, // xlsx | csv | pdf | docx | foto
        { name: 'fornecedor', type: 'text' },
        { name: 'data_compra', type: 'date', required: true },

        // Frente / centro de custo escolhido pelo usuário na conferência
        {
          name: 'frente',
          type: 'select',
          required: true,
          values: ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
          maxSelect: 1,
        },
        { name: 'lote_id', type: 'relation', required: false, collectionId: lotsId, maxSelect: 1 },

        // Totais consolidados da importação
        { name: 'total_registros_lidos', type: 'number', onlyInt: true },
        { name: 'total_criados', type: 'number', onlyInt: true },
        { name: 'total_atualizados', type: 'number', onlyInt: true },
        { name: 'total_ignorados', type: 'number', onlyInt: true },
        { name: 'total_cabecas', type: 'number' },
        { name: 'peso_total_kg', type: 'number' },
        { name: 'arrobas_totais', type: 'number' },
        { name: 'investimento_total_rs', type: 'number' },
        { name: 'preco_medio_rs_at', type: 'number' },
        { name: 'agio_medio_pct', type: 'number' },

        // Cotação usada como referência do ágio (B3 vigente ou manual)
        {
          name: 'cotacao_origem',
          type: 'select',
          values: ['b3_vigente', 'manual'],
          maxSelect: 1,
        },
        { name: 'cotacao_preco_rs', type: 'number' },
        { name: 'cotacao_data_referencia', type: 'text' },
        { name: 'cotacao_desatualizada', type: 'bool' },

        // Linhas normalizadas e aplicadas (append-only, imutável após criação)
        {
          name: 'linhas',
          type: 'json',
          maxSize: 2000000,
        },

        // Auditoria
        { name: 'protocolo_audit_id', type: 'text' },
        {
          name: 'usuario_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'usuario_nome', type: 'text', required: true },
        { name: 'perfil', type: 'text', required: true },
        { name: 'timestamp_dispositivo', type: 'date', required: true },
        { name: 'timestamp_servidor', type: 'autodate', onCreate: true, onUpdate: false },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mcgc_data ON maestro_compras_gado (data_compra DESC)',
        'CREATE INDEX idx_mcgc_fornecedor ON maestro_compras_gado (fornecedor)',
        'CREATE INDEX idx_mcgc_frente ON maestro_compras_gado (frente)',
        'CREATE INDEX idx_mcgc_usuario ON maestro_compras_gado (usuario_id)',
        'CREATE INDEX idx_mcgc_audit ON maestro_compras_gado (protocolo_audit_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('maestro_compras_gado')
      app.delete(col)
    } catch (_) {}
  },
)
