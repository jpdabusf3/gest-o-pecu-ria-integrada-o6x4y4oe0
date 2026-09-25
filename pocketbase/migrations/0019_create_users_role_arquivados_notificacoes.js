migrate(
  (app) => {
    // 1. Atualizar a coleção users com o campo role se não existir
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['gestor', 'capataz', 'operador', 'admin', 'gerente'],
          maxSelect: 1,
        }),
      )
      // Ajustar regras para permitir list/view/update públicos/autenticados conforme uso do app
      usersCol.listRule = ''
      usersCol.viewRule = ''
      usersCol.updateRule = '@request.auth.id != ""'
      app.save(usersCol)
    }

    // 2. Criar coleção 'fechamentos_arquivados' para comparativo entre safras
    try {
      app.findCollectionByNameOrId('fechamentos_arquivados')
    } catch (_) {
      const arquivados = new Collection({
        name: 'fechamentos_arquivados',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'ano_safra', type: 'text', required: true }, // ex: "2023/2024", "2024/2025"
          { name: 'periodo_rotulo', type: 'text', required: true }, // ex: "Safra 2023/2024 Consolidada"
          {
            name: 'frente',
            type: 'select',
            required: true,
            values: ['todas', 'cria', 'recria', 'engorda', 'confinamento', 'arrendamento'],
            maxSelect: 1,
          },
          { name: 'arrobas_ha_ano', type: 'number', required: true },
          { name: 'arrobas_cab_ano', type: 'number', required: true },
          { name: 'custo_arroba_produzida', type: 'number', required: true },
          { name: 'cotacao_arroba_media', type: 'number' },
          { name: 'margem_ebitda_pct', type: 'number' },
          { name: 'ebitda_total', type: 'number' },
          { name: 'lucro_liquido', type: 'number' },
          { name: 'receita_total', type: 'number' },
          { name: 'custeio_cab_ano', type: 'number' },
          { name: 'taxa_lotacao_ua_ha', type: 'number' },
          { name: 'mortalidade_pct', type: 'number' },
          { name: 'taxa_desmame_pct', type: 'number' },
          { name: 'gmd_medio_kg_dia', type: 'number' },
          { name: 'rebanho_medio_cab', type: 'number' },
          { name: 'arrobas_totais_produzidas', type: 'number' },
          { name: 'snapshot_dados', type: 'json' },
          { name: 'arquivado_por', type: 'text' },
          { name: 'arquivado_em', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_arq_safra ON fechamentos_arquivados (ano_safra DESC)',
          'CREATE INDEX idx_arq_frente ON fechamentos_arquivados (frente)',
        ],
      })
      app.save(arquivados)
    }

    // 3. Criar coleção 'notificacoes_sistema' para persistir alertas in-app
    try {
      app.findCollectionByNameOrId('notificacoes_sistema')
    } catch (_) {
      const notifs = new Collection({
        name: 'notificacoes_sistema',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'mensagem', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: [
              'gmd_critico',
              'atividade_pendente',
              'margem_comprimida',
              'estoque_baixo',
              'meta',
              'geral',
            ],
            maxSelect: 1,
          },
          {
            name: 'severidade',
            type: 'select',
            values: ['baixa', 'media', 'alta', 'critica'],
            maxSelect: 1,
          },
          { name: 'lido', type: 'bool' },
          { name: 'link_destino', type: 'text' },
          { name: 'referencia_id', type: 'text' },
          { name: 'destinatario_role', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notif_created ON notificacoes_sistema (created DESC)',
          'CREATE INDEX idx_notif_lido ON notificacoes_sistema (lido)',
        ],
      })
      app.save(notifs)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notificacoes_sistema'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fechamentos_arquivados'))
    } catch (_) {}
  },
)
