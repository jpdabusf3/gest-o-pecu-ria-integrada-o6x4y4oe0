/// <reference path="../pb_data/types.d.ts" />

/**
 * 0032 - Coleções para Conciliação de Estoque e expansão de auditoria / alertas
 *
 * 1. Coleção conciliacoes_estoque:
 *    Registra cada rodada de contagem física confrontada com o estoque_insumos/planilha.
 *    Guarda responsável, período, divergências detalhadas, justificativas, se gerou ajuste de estoque.
 *
 * 2. Coleção itens_conciliacao_estoque:
 *    Linha a linha por insumo: saldo_sistema, contagem_fisica, unidade_contada,
 *    diferenca_kg, diferenca_sacos, diferenca_rs, preco_unitario, dentro_tolerancia,
 *    justificativa, ajustado.
 *
 * 3. Atualizar notificacoes_sistema para aceitar 'ruptura_estoque' se necessário, ou usar 'estoque_baixo'.
 */

const REGRA_GESTAO =
  "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')"

migrate(
  (app) => {
    // 1. Coleção conciliacoes_estoque
    const conciliacoes = new Collection({
      name: 'conciliacoes_estoque',
      type: 'base',
      listRule: REGRA_GESTAO,
      viewRule: REGRA_GESTAO,
      createRule: REGRA_GESTAO,
      updateRule: REGRA_GESTAO,
      deleteRule: REGRA_GESTAO,
      fields: [
        { name: 'data_conciliacao', type: 'date', required: true },
        { name: 'periodo_mes', type: 'text', maxSize: 20 },
        { name: 'responsavel_id', type: 'text', maxSize: 100 },
        { name: 'responsavel_nome', type: 'text', maxSize: 200 },
        { name: 'total_itens', type: 'number', onlyInt: true },
        { name: 'total_divergentes', type: 'number', onlyInt: true },
        { name: 'total_divergencia_rs', type: 'number' },
        {
          name: 'status',
          type: 'select',
          maxSelect: 1,
          values: ['pendente', 'justificada', 'ajustada', 'concluida'],
        },
        { name: 'observacoes_gerais', type: 'text', maxSize: 2000 },
        { name: 'protocolo_audit_id', type: 'text', maxSize: 100 },
        { name: 'ajuste_gerado', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_conciliacao_data ON conciliacoes_estoque (data_conciliacao DESC)',
        'CREATE INDEX idx_conciliacao_periodo ON conciliacoes_estoque (periodo_mes)',
      ],
    })
    app.save(conciliacoes)

    const conciliacaoColId = app.findCollectionByNameOrId('conciliacoes_estoque').id

    // 2. Coleção itens_conciliacao_estoque
    const itensConciliacao = new Collection({
      name: 'itens_conciliacao_estoque',
      type: 'base',
      listRule: REGRA_GESTAO,
      viewRule: REGRA_GESTAO,
      createRule: REGRA_GESTAO,
      updateRule: REGRA_GESTAO,
      deleteRule: REGRA_GESTAO,
      fields: [
        {
          name: 'conciliacao_id',
          type: 'relation',
          collectionId: conciliacaoColId,
          maxSelect: 1,
          cascadeDelete: true,
          required: true,
        },
        { name: 'insumo_id', type: 'text', maxSize: 100 },
        { name: 'produto', type: 'text', required: true, maxSize: 250 },
        { name: 'categoria', type: 'text', maxSize: 100 },
        { name: 'saldo_sistema', type: 'number', required: true },
        { name: 'unidade_sistema', type: 'text', maxSize: 20 },
        { name: 'contagem_fisica', type: 'number', required: true },
        {
          name: 'unidade_contada',
          type: 'select',
          maxSelect: 1,
          values: ['kg', 'saco', 'l', 'dose', 'un'],
        },
        { name: 'contagem_em_kg', type: 'number' },
        { name: 'diferenca_qtd', type: 'number' },
        { name: 'diferenca_pct', type: 'number' },
        { name: 'diferenca_rs', type: 'number' },
        { name: 'preco_unitario', type: 'number' },
        { name: 'dentro_tolerancia', type: 'bool' },
        { name: 'justificativa', type: 'text', maxSize: 2000 },
        { name: 'ajustado', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_item_conciliacao_parent ON itens_conciliacao_estoque (conciliacao_id)',
        'CREATE INDEX idx_item_conciliacao_produto ON itens_conciliacao_estoque (produto)',
      ],
    })
    app.save(itensConciliacao)
  },
  (app) => {
    try {
      const colItens = app.findCollectionByNameOrId('itens_conciliacao_estoque')
      app.delete(colItens)
    } catch (_) {}
    try {
      const colConc = app.findCollectionByNameOrId('conciliacoes_estoque')
      app.delete(colConc)
    } catch (_) {}
  },
)
