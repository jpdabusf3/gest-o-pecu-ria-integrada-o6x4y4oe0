migrate(
  (app) => {
    // 1. Criar coleção metas_safra
    try {
      app.findCollectionByNameOrId('metas_safra')
    } catch (_) {
      const metasCol = new Collection({
        name: 'metas_safra',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'safra', type: 'text', required: true },
          { name: 'indicador', type: 'text', required: true },
          { name: 'valor_alvo', type: 'number', required: true },
          { name: 'observacoes', type: 'text' },
          { name: 'created_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_metas_safra_indicador ON metas_safra (safra, indicador)',
        ],
      })
      app.save(metasCol)
    }

    const col = app.findCollectionByNameOrId('metas_safra')

    let gestorId = ''
    try {
      const gestor = app.findFirstRecordByData('users', 'email', 'joaopedro_zoo@hotmail.com')
      gestorId = gestor.id
    } catch (_) {}

    // 2. Seed inicial para a safra vigente (2025/2026) e anterior (2024/2025)
    const seeds = [
      // 2025/2026 (safra vigente)
      {
        safra: '2025/2026',
        indicador: 'arroba_ha_ano',
        valor_alvo: 10.0,
        observacoes: 'Alvo de referência de produtividade em pastagem (10,0 @/ha/ano)',
      },
      {
        safra: '2025/2026',
        indicador: 'custo_arroba',
        valor_alvo: 199.59,
        observacoes: 'Custo meta da @ produzida sem reposição (R$ 199,59/@)',
      },
      {
        safra: '2025/2026',
        indicador: 'margem_ebitda',
        valor_alvo: 17.1,
        observacoes: 'Meta de margem EBITDA de 17,1%',
      },
      // 2024/2025 (safra anterior)
      {
        safra: '2024/2025',
        indicador: 'arroba_ha_ano',
        valor_alvo: 9.5,
        observacoes: 'Meta da safra 2024/2025',
      },
      {
        safra: '2024/2025',
        indicador: 'custo_arroba',
        valor_alvo: 205.0,
        observacoes: 'Meta de custo da safra 2024/2025',
      },
      {
        safra: '2024/2025',
        indicador: 'margem_ebitda',
        valor_alvo: 16.5,
        observacoes: 'Meta EBITDA 2024/2025',
      },
    ]

    for (const s of seeds) {
      try {
        const filter = `safra = '${s.safra}' && indicador = '${s.indicador}'`
        const existing = app.findRecordsByFilter('metas_safra', filter, '', 1, 0)
        if (existing && existing.length > 0) continue
      } catch (_) {}

      const rec = new Record(col)
      rec.set('safra', s.safra)
      rec.set('indicador', s.indicador)
      rec.set('valor_alvo', s.valor_alvo)
      rec.set('observacoes', s.observacoes)
      if (gestorId) rec.set('created_by', gestorId)
      app.save(rec)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('metas_safra'))
    } catch (_) {}
  },
)
