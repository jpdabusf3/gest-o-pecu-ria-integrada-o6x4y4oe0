/// <reference path="../pb_data/types.d.ts" />

/**
 * 0042 — Criação da coleção `nascimentos_estacao`
 *
 * Registra os nascimentos realizados agregados ou por lote/parto na estação de monta:
 * - estacao_id: relation para estacoes_monta
 * - ano_safra: safra de referência (ex: "2025/2026")
 * - mes_referencia: mês de nascimento (ex: "JUL", "AGO", "SET", "OUT", "NOV", "DEZ", "JAN", "FEV" ou YYYY-MM)
 * - data_referencia: data aproximada / de registro do lote
 * - sexo: select ("macho", "femea", "indefinido")
 * - raca: texto (Nelore, Anelorado, Cruzamento Industrial, etc. Se vazio => "Não informado")
 * - categoria_matriz: select ("nulipara", "primipara", "multipara", "indefinida")
 * - classe_matriz: select ("PO", "comercial", "indefinida")
 * - quantidade: número inteiro >= 1
 * - peso_medio_nasc_kg: peso médio ao nascer se informado
 * - dedup_hash: chave de deduplicação idempotente (estacao_id + mes + sexo + raca + categoria + classe)
 * - observacoes: notas do lote
 */

migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('nascimentos_estacao')
      return // Já existe
    } catch (_) {}

    let estacoesColId = ''
    try {
      estacoesColId = app.findCollectionByNameOrId('estacoes_monta').id
    } catch (_) {
      estacoesColId = ''
    }

    const fields = [
      { name: 'ano_safra', type: 'text', required: true },
      { name: 'mes_referencia', type: 'text', required: true },
      { name: 'data_referencia', type: 'date' },
      {
        name: 'sexo',
        type: 'select',
        required: true,
        values: ['macho', 'femea', 'indefinido'],
        maxSelect: 1,
      },
      { name: 'raca', type: 'text' },
      {
        name: 'categoria_matriz',
        type: 'select',
        values: ['nulipara', 'primipara', 'multipara', 'indefinida'],
        maxSelect: 1,
      },
      {
        name: 'classe_matriz',
        type: 'select',
        values: ['PO', 'comercial', 'indefinida'],
        maxSelect: 1,
      },
      { name: 'quantidade', type: 'number', required: false, min: 0 },
      { name: 'peso_medio_nasc_kg', type: 'number', min: 0 },
      { name: 'dedup_hash', type: 'text' },
      { name: 'observacoes', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (estacoesColId) {
      fields.splice(1, 0, {
        name: 'estacao_id',
        type: 'relation',
        collectionId: estacoesColId,
        maxSelect: 1,
        cascadeDelete: false,
      })
    } else {
      fields.splice(1, 0, {
        name: 'estacao_id',
        type: 'text',
      })
    }

    const colNascimentos = new Collection({
      name: 'nascimentos_estacao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio' || @request.auth.role = 'capataz')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
      fields,
      indexes: [],
    })

    app.save(colNascimentos)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('nascimentos_estacao')
      app.delete(col)
    } catch (_) {}
  },
)
