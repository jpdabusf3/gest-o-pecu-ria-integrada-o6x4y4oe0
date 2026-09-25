migrate(
  (app) => {
    // 1. Atualizar a coleção 'atividades'
    const atividades = app.findCollectionByNameOrId('atividades')

    // Atualizar os valores permitidos do select 'status'
    // Novos estados solicitados: agendada, em_andamento, realizada, nao_realizada, reagendada
    // Também manter compatibilidade com legados: planejada, concluida, cancelada
    const statusField = atividades.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'agendada',
        'em_andamento',
        'realizada',
        'nao_realizada',
        'reagendada',
        'planejada',
        'concluida',
        'cancelada',
      ]
      statusField.maxSelect = 1
    }

    // Adicionar novos campos auxiliares se não existirem
    if (!atividades.fields.getByName('motivo_nao_realizada')) {
      atividades.fields.add(
        new TextField({
          name: 'motivo_nao_realizada',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('detalhes_motivo')) {
      atividades.fields.add(
        new TextField({
          name: 'detalhes_motivo',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('progresso_observacoes')) {
      atividades.fields.add(
        new TextField({
          name: 'progresso_observacoes',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('iniciado_em')) {
      atividades.fields.add(
        new DateField({
          name: 'iniciado_em',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('revisado_gestor')) {
      atividades.fields.add(
        new BoolField({
          name: 'revisado_gestor',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('revisado_em')) {
      atividades.fields.add(
        new DateField({
          name: 'revisado_em',
          required: false,
        }),
      )
    }

    if (!atividades.fields.getByName('revisado_por')) {
      atividades.fields.add(
        new TextField({
          name: 'revisado_por',
          required: false,
        }),
      )
    }

    app.save(atividades)

    // Migrar dados existentes de 'planejada' para 'agendada' e 'concluida' para 'realizada'
    try {
      app
        .db()
        .newQuery("UPDATE atividades SET status = 'agendada' WHERE status = 'planejada'")
        .execute()
      app
        .db()
        .newQuery("UPDATE atividades SET status = 'realizada' WHERE status = 'concluida'")
        .execute()
    } catch (e) {
      console.log('Erro ao normalizar status legados:', e)
    }

    // 2. Criar a coleção 'historico_status'
    // atividade_id, status_anterior, status_novo, usuario_id, timestamp, motivo, offline (bool)
    try {
      app.findCollectionByNameOrId('historico_status')
    } catch (_) {
      const historicoCol = new Collection({
        name: 'historico_status',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          {
            name: 'atividade_id',
            type: 'relation',
            collectionId: atividades.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'status_anterior',
            type: 'text',
            required: false,
          },
          {
            name: 'status_novo',
            type: 'text',
            required: true,
          },
          {
            name: 'usuario_id',
            type: 'text',
            required: true,
          },
          {
            name: 'motivo',
            type: 'text',
            required: false,
          },
          {
            name: 'detalhes',
            type: 'text',
            required: false,
          },
          {
            name: 'offline',
            type: 'bool',
            required: false,
          },
          {
            name: 'timestamp',
            type: 'date',
            required: true,
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_historico_atividade ON historico_status (atividade_id)',
          'CREATE INDEX idx_historico_timestamp ON historico_status (timestamp DESC)',
          'CREATE INDEX idx_historico_usuario ON historico_status (usuario_id)',
        ],
      })

      app.save(historicoCol)
    }
  },
  (app) => {
    try {
      const hist = app.findCollectionByNameOrId('historico_status')
      app.delete(hist)
    } catch (_) {}
  },
)
