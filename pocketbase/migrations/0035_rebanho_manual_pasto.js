/// <reference path="../pb_data/types.d.ts" />
/**
 * 0035 — Módulo de Atualização Manual do Rebanho.
 *
 * 1) Coleção nova `pastos_rebanho`: cadastro REAL dos pastos da fazenda
 *    (nome, área em ha e capacidade de suporte em UA/ha). É a porta de
 *    entrada do fluxo — todo lote/animal individual fica vinculado a
 *    exatamente um pasto desta coleção.
 *
 * 2) Coleção nova `animais_individuais`: matrizes, touros e animais
 *    identificados por brinco. Brinco ÚNICO no sistema (índice UNIQUE).
 *
 * 3) Coleção nova `movimentacoes_pasto`: trilha append-only das
 *    transferências entre pastos (origem → destino, data, responsável).
 *
 * 4) Extensão NÃO-destrutiva de `lots`: pasto_atual_id (relation para o
 *    pasto real) + status de saída ('inativo') + fase 'confinamento' já
 *    existente em fase_atual. Nenhum campo existente é alterado ou removido.
 */
migrate(
  (app) => {
    // ---------- 1. Coleção de pastos reais da fazenda ----------
    try {
      app.findCollectionByNameOrId('pastos_rebanho')
    } catch (_) {
      const pastosCol = new Collection({
        name: 'pastos_rebanho',
        type: 'base',
        // Proprietário/Sócio/Gestor/Admin: leitura e escrita
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'fazenda', type: 'text' },
          { name: 'area_ha', type: 'number', required: true, min: 0.1 },
          // Capacidade de suporte estimada do pasto, em UA/ha
          { name: 'capacidade_ua_ha', type: 'number', required: true, min: 0.1, max: 20 },
          { name: 'observacoes', type: 'text' },
          { name: 'criado_por', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pastos_rebanho_nome ON pastos_rebanho (nome)',
          'CREATE INDEX idx_pastos_rebanho_area ON pastos_rebanho (area_ha)',
        ],
      })
      app.save(pastosCol)
    }

    const pastosId = app.findCollectionByNameOrId('pastos_rebanho').id
    const lotsId = app.findCollectionByNameOrId('lots').id

    // ---------- 2. Coleção de animais individuais (brinco único) ----------
    try {
      app.findCollectionByNameOrId('animais_individuais')
    } catch (_) {
      const animaisCol = new Collection({
        name: 'animais_individuais',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        deleteRule: null, // append-friendly: saída é por status, nunca delete
        fields: [
          { name: 'brinco', type: 'text', required: true },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['bezerro', 'garrote', 'novilho', 'boi', 'novilha', 'vaca', 'touro'],
            maxSelect: 1,
          },
          {
            name: 'sexo',
            type: 'select',
            required: true,
            values: ['macho', 'femea'],
            maxSelect: 1,
          },
          { name: 'peso_kg', type: 'number', required: true, min: 0 },
          { name: 'ecc', type: 'number', min: 0, max: 5 }, // Escore de Condição Corporal 1–5 (opcional)
          { name: 'data_entrada', type: 'date' },
          { name: 'observacoes', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativo', 'transferido', 'vendido', 'morto', 'inativo'],
            maxSelect: 1,
          },
          { name: 'pasto_atual_id', type: 'relation', collectionId: pastosId, maxSelect: 1 },
          { name: 'lote_id', type: 'relation', collectionId: lotsId, maxSelect: 1 },
          // Quem registrou (padrão do Modo Campo: grava o usuário logado)
          { name: 'registrado_por', type: 'text' },
          { name: 'registrado_por_id', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_animais_ind_brinco ON animais_individuais (brinco)',
          'CREATE INDEX idx_animais_ind_pasto ON animais_individuais (pasto_atual_id)',
          'CREATE INDEX idx_animais_ind_lote ON animais_individuais (lote_id)',
          'CREATE INDEX idx_animais_ind_status ON animais_individuais (status)',
        ],
      })
      app.save(animaisCol)
    }

    const animaisId = app.findCollectionByNameOrId('animais_individuais').id

    // ---------- 3. Coleção de transferências entre pastos ----------
    try {
      app.findCollectionByNameOrId('movimentacoes_pasto')
    } catch (_) {
      const movCol = new Collection({
        name: 'movimentacoes_pasto',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        viewRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'capataz')",
        updateRule: null, // append-only: movimentação nunca é editada nem apagada
        deleteRule: null,
        fields: [
          { name: 'lote_id', type: 'relation', collectionId: lotsId, maxSelect: 1 },
          { name: 'lote_nome', type: 'text' },
          { name: 'animal_id', type: 'relation', collectionId: animaisId, maxSelect: 1 },
          { name: 'qtd_cabecas', type: 'number', onlyInt: true, min: 1 },
          { name: 'pasto_origem_id', type: 'text' },
          { name: 'pasto_destino_id', type: 'text' },
          { name: 'pasto_origem_nome', type: 'text' },
          { name: 'pasto_destino_nome', type: 'text' },
          { name: 'data', type: 'date', required: true },
          { name: 'responsavel_id', type: 'text' },
          { name: 'responsavel_nome', type: 'text' },
          { name: 'motivo', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mvpasto_data ON movimentacoes_pasto (data DESC)',
          'CREATE INDEX idx_mvpasto_lote ON movimentacoes_pasto (lote_id)',
          'CREATE INDEX idx_mvpasto_origem ON movimentacoes_pasto (pasto_origem_id)',
          'CREATE INDEX idx_mvpasto_destino ON movimentacoes_pasto (pasto_destino_id)',
        ],
      })
      app.save(movCol)
    }

    // ---------- 4. Extensão NÃO-destrutiva de `lots` ----------
    const lots = app.findCollectionByNameOrId('lots')
    if (!lots.fields.getByName('pasto_atual_id')) {
      lots.fields.add(
        new RelationField({
          name: 'pasto_atual_id',
          collectionId: pastosId,
          maxSelect: 1,
        }),
      )
    }
    // status de saída "inativo" (rebanho contabilizado de outra forma)
    const statusField = lots.fields.getByName('status')
    if (statusField && statusField.values.indexOf('inativo') === -1) {
      statusField.values.push('inativo')
    }
    lots.addIndex('idx_lots_pasto_atual', false, 'pasto_atual_id', '')
    app.save(lots)
  },
  (app) => {
    // Down: remove a extensão de lots e as 3 coleções novas
    try {
      const lots = app.findCollectionByNameOrId('lots')
      const f = lots.fields.getByName('pasto_atual_id')
      if (f) lots.fields.removeByName('pasto_atual_id')
      lots.removeIndex('idx_lots_pasto_atual')
      app.save(lots)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('movimentacoes_pasto'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('animais_individuais'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pastos_rebanho'))
    } catch (_) {}
  },
)
