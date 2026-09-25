migrate(
  (app) => {
    // 1. Atualizar historico_status para suportar tanto atividade quanto ocorrencias/geral
    // tornando atividade_id não obrigatório e adicionando registro_id se necessário
    const histCol = app.findCollectionByNameOrId('historico_status')
    const ativIdField = histCol.fields.getByName('atividade_id')
    if (ativIdField) {
      ativIdField.required = false
    }
    if (!histCol.fields.getByName('registro_id')) {
      histCol.fields.add(new TextField({ name: 'registro_id' }))
    }
    app.save(histCol)

    // 2. Criar coleção tipos_ocorrencia
    try {
      app.findCollectionByNameOrId('tipos_ocorrencia')
    } catch (_) {
      const tiposCol = new Collection({
        name: 'tipos_ocorrencia',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'icone', type: 'text', required: true },
          { name: 'categoria', type: 'text' },
          { name: 'campos', type: 'json' },
          { name: 'ativo', type: 'bool' },
          { name: 'criado_por', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tipos_ocorrencia_codigo ON tipos_ocorrencia (codigo)',
          'CREATE INDEX idx_tipos_ocorrencia_ativo ON tipos_ocorrencia (ativo)',
        ],
      })
      app.save(tiposCol)
    }

    // 3. Criar coleção ocorrencias
    try {
      app.findCollectionByNameOrId('ocorrencias')
    } catch (_) {
      const lotsColId = app.findCollectionByNameOrId('lots').id
      const ocorrenciasCol = new Collection({
        name: 'ocorrencias',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null, // Bloqueia delete direto na API - cancelamento lógico obrigatório
        fields: [
          { name: 'uuid_dispositivo', type: 'text', required: true },
          { name: 'tipo', type: 'text', required: true },
          { name: 'data_hora_dispositivo', type: 'date', required: true },
          { name: 'data_hora_servidor', type: 'date' },
          { name: 'usuario_id', type: 'text', required: true },
          { name: 'usuario_nome', type: 'text' },
          {
            name: 'perfil',
            type: 'select',
            required: true,
            values: [
              'proprietario',
              'socio',
              'gestor',
              'capataz',
              'vaqueiro',
              'servente',
              'operador',
              'admin',
            ],
            maxSelect: 1,
          },
          { name: 'lote_id', type: 'relation', collectionId: lotsColId, maxSelect: 1 },
          { name: 'lote_nome', type: 'text' },
          { name: 'pasto_id', type: 'text' },
          { name: 'animal_id', type: 'text' },
          { name: 'campos_especificos', type: 'json' },
          {
            name: 'foto',
            type: 'file',
            maxSelect: 1,
            maxSize: 10485760,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          },
          { name: 'geolocalizacao', type: 'json' }, // { lat, lng, precisao }
          {
            name: 'urgencia',
            type: 'select',
            required: true,
            values: ['informativo', 'requer_acao_hoje'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['registrada', 'em_analise', 'resolvida', 'cancelada'],
            maxSelect: 1,
          },
          { name: 'cancelado_em', type: 'date' },
          { name: 'cancelado_por', type: 'text' },
          { name: 'motivo_cancelamento', type: 'text' },
          { name: 'resolvido_em', type: 'date' },
          { name: 'resolvido_por', type: 'text' },
          { name: 'resolucao_observacao', type: 'text' },
          { name: 'aprovado_em', type: 'date' },
          { name: 'aprovado_por', type: 'text' },
          { name: 'evento_correcao_id', type: 'text' }, // Aponta para evento de correção encadeado
          { name: 'conflito_sinalizado', type: 'bool' },
          { name: 'conflito_detalhes', type: 'text' },
          { name: 'sincronizado', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ocorrencias_uuid ON ocorrencias (uuid_dispositivo)',
          'CREATE INDEX idx_ocorrencias_tipo ON ocorrencias (tipo)',
          'CREATE INDEX idx_ocorrencias_status ON ocorrencias (status)',
          'CREATE INDEX idx_ocorrencias_urgencia ON ocorrencias (urgencia)',
          'CREATE INDEX idx_ocorrencias_lote ON ocorrencias (lote_id)',
          'CREATE INDEX idx_ocorrencias_data_srv ON ocorrencias (data_hora_servidor DESC)',
        ],
      })
      app.save(ocorrenciasCol)
    }

    // 4. Criar coleção audit_log (APPEND-ONLY: create/list/view liberado, update/delete estritamente null)
    try {
      app.findCollectionByNameOrId('audit_log')
    } catch (_) {
      const auditCol = new Collection({
        name: 'audit_log',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: null, // APPEND-ONLY: Nenhum evento pode ser editado
        deleteRule: null, // APPEND-ONLY: Nenhum evento pode ser deletado
        fields: [
          { name: 'evento_id', type: 'text', required: true }, // UUID do evento
          {
            name: 'tipo_evento',
            type: 'select',
            required: true,
            values: ['criacao', 'correcao', 'cancelamento', 'mudanca_status', 'redefinicao_senha'],
            maxSelect: 1,
          },
          { name: 'usuario_id', type: 'text', required: true },
          { name: 'usuario_nome', type: 'text' },
          {
            name: 'perfil',
            type: 'select',
            required: true,
            values: [
              'proprietario',
              'socio',
              'gestor',
              'capataz',
              'vaqueiro',
              'servente',
              'operador',
              'admin',
            ],
            maxSelect: 1,
          },
          { name: 'payload_antes', type: 'json' },
          { name: 'payload_depois', type: 'json' },
          { name: 'timestamp_dispositivo', type: 'date', required: true },
          { name: 'timestamp_servidor', type: 'date', required: true },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['online', 'offline'],
            maxSelect: 1,
          },
          { name: 'dispositivo_id', type: 'text' },
          { name: 'geolocalizacao', type: 'json' },
          { name: 'referencia_tipo', type: 'text' }, // 'ocorrencia', 'equipe', 'lote', etc.
          { name: 'referencia_id', type: 'text' },
          { name: 'lote_id', type: 'text' },
          { name: 'pasto_id', type: 'text' },
          { name: 'motivo', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_audit_evento_id ON audit_log (evento_id)',
          'CREATE INDEX idx_audit_tipo ON audit_log (tipo_evento)',
          'CREATE INDEX idx_audit_timestamp_srv ON audit_log (timestamp_servidor DESC)',
          'CREATE INDEX idx_audit_usuario ON audit_log (usuario_id)',
          'CREATE INDEX idx_audit_referencia ON audit_log (referencia_id)',
          'CREATE INDEX idx_audit_lote ON audit_log (lote_id)',
        ],
      })
      app.save(auditCol)
    }

    // 5. Semear os 14 tipos fixos iniciais de ocorrência
    const tiposCol = app.findCollectionByNameOrId('tipos_ocorrencia')
    const tiposIniciais = [
      {
        codigo: 'atividade_geral',
        nome: 'Atividade Geral',
        icone: 'CheckSquare',
        categoria: 'geral',
        campos: [
          {
            nome: 'descricao',
            label: 'Descrição da Atividade',
            tipo: 'textarea',
            obrigatorio: true,
          },
          { nome: 'pasto_nome', label: 'Pasto / Local', tipo: 'text', obrigatorio: false },
          { nome: 'observacao', label: 'Observação Adicional', tipo: 'text', obrigatorio: false },
        ],
      },
      {
        codigo: 'ponto_atencao',
        nome: 'Ponto de Atenção',
        icone: 'AlertTriangle',
        categoria: 'alerta',
        campos: [
          {
            nome: 'descricao',
            label: 'Descrição do Problema/Atenção',
            tipo: 'textarea',
            obrigatorio: true,
          },
          { nome: 'local', label: 'Local / Pasto', tipo: 'text', obrigatorio: false },
          { nome: 'acao_recomendada', label: 'Ação Recomendada', tipo: 'text', obrigatorio: false },
        ],
      },
      {
        codigo: 'mudanca_pasto_necessidade',
        nome: 'Necessidade Mudança de Pasto',
        icone: 'RefreshCw',
        categoria: 'manejo',
        campos: [
          { nome: 'pasto_sugerido', label: 'Pasto Sugerido', tipo: 'text', obrigatorio: true },
          {
            nome: 'motivo',
            label: 'Motivo',
            tipo: 'select',
            opcoes: [
              'Pasto baixo / raspado',
              'Excesso de lotação',
              'Troca de manejo programada',
              'Qualidade da água/cocho',
            ],
            obrigatorio: true,
          },
          {
            nome: 'previsao_dias',
            label: 'Previsão de dias restantes',
            tipo: 'number',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'suplemento_cocho',
        nome: 'Colocar Suplemento no Cocho',
        icone: 'Wheat',
        categoria: 'nutricao',
        campos: [
          { nome: 'produto', label: 'Produto / Suplemento', tipo: 'text', obrigatorio: true },
          { nome: 'quantidade_kg', label: 'Quantidade (kg)', tipo: 'number', obrigatorio: true },
          {
            nome: 'cocho_trato',
            label: 'Identificação do Cocho / Trato',
            tipo: 'text',
            obrigatorio: false,
          },
          { nome: 'sacos_qtd', label: 'Qtd de Sacos', tipo: 'number', obrigatorio: false },
        ],
      },
      {
        codigo: 'observar_lote',
        nome: 'Observar Lote',
        icone: 'Eye',
        categoria: 'manejo',
        campos: [
          {
            nome: 'observacao',
            label: 'Observação (animais, água, sombra, pasto)',
            tipo: 'textarea',
            obrigatorio: true,
          },
          {
            nome: 'comportamento',
            label: 'Comportamento do Rebanho',
            tipo: 'text',
            obrigatorio: false,
          },
          {
            nome: 'estado_escore',
            label: 'Escore Corporal Geral',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'morte_animal',
        nome: 'Morte de Animal',
        icone: 'Skull',
        categoria: 'sanidade',
        campos: [
          {
            nome: 'brinco',
            label: 'Brinco do Animal (ou Scanner)',
            tipo: 'text',
            obrigatorio: true,
          },
          {
            nome: 'possivel_causa',
            label: 'Possível Causa',
            tipo: 'select',
            opcoes: [
              'Doença',
              'Parto / Distocia',
              'Predador',
              'Acidente / Atolado',
              'Desconhecida',
            ],
            obrigatorio: true,
          },
          {
            nome: 'categoria',
            label: 'Categoria do Animal',
            tipo: 'select',
            opcoes: ['Bezerro(a)', 'Garrote/Novilha', 'Boi/Vaca Adulto', 'Touro'],
            obrigatorio: false,
          },
          { nome: 'causa_detalhes', label: 'Detalhes da Morte', tipo: 'text', obrigatorio: false },
        ],
      },
      {
        codigo: 'mudanca_lote_pasto',
        nome: 'Mudança de Lote de Pasto',
        icone: 'MapPin',
        categoria: 'manejo',
        campos: [
          { nome: 'pasto_saida', label: 'Pasto de Saída', tipo: 'text', obrigatorio: true },
          { nome: 'pasto_entrada', label: 'Pasto de Entrada', tipo: 'text', obrigatorio: true },
          {
            nome: 'qtd_cabecas',
            label: 'Nº de Cabeças Movimentadas',
            tipo: 'number',
            obrigatorio: false,
          },
          {
            nome: 'observacao_pastagem',
            label: 'Condição da nova pastagem',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'transferencia_animal',
        nome: 'Transferência de Animal',
        icone: 'ArrowRightLeft',
        categoria: 'manejo',
        campos: [
          { nome: 'brinco', label: 'Brinco do Animal', tipo: 'text', obrigatorio: true },
          { nome: 'lote_destino_nome', label: 'Lote de Destino', tipo: 'text', obrigatorio: true },
          {
            nome: 'motivo_transferencia',
            label: 'Motivo da Troca de Lote',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'nascimento',
        nome: 'Nascimento de Bezerro',
        icone: 'Baby',
        categoria: 'reproducao',
        campos: [
          {
            nome: 'matriz_identificacao',
            label: 'Brinco da Matriz ou Lote',
            tipo: 'text',
            obrigatorio: true,
          },
          {
            nome: 'sexo_bezerro',
            label: 'Sexo do Bezerro',
            tipo: 'select',
            opcoes: ['Macho', 'Fêmea'],
            obrigatorio: true,
          },
          {
            nome: 'condicao_nascimento',
            label: 'Condição do Parto',
            tipo: 'select',
            opcoes: ['Normal (sem auxílio)', 'Assistido (com auxílio)', 'Cesariana'],
            obrigatorio: false,
          },
          {
            nome: 'brinco_bezerro',
            label: 'Brinco Provisório/Definitivo',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'chuva',
        nome: 'Pluviometria / Chuva',
        icone: 'CloudRain',
        categoria: 'clima',
        campos: [
          { nome: 'quantidade_mm', label: 'Milímetros (mm)', tipo: 'number', obrigatorio: true },
          {
            nome: 'pluviometro_local',
            label: 'Local / Pluviômetro / Região',
            tipo: 'text',
            obrigatorio: false,
          },
          {
            nome: 'intensidade',
            label: 'Intensidade Observada',
            tipo: 'select',
            opcoes: ['Leve / Garoa', 'Média', 'Forte / Tempestade'],
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'fogo',
        nome: 'Incêndio / Fogo',
        icone: 'Flame',
        categoria: 'urgencia',
        campos: [
          {
            nome: 'area_afetada_descricao',
            label: 'Área Afetada / Dimensão Estimada',
            tipo: 'text',
            obrigatorio: true,
          },
          {
            nome: 'pastos_ameacados',
            label: 'Pastos ou Retiros Ameaçados',
            tipo: 'text',
            obrigatorio: true,
          },
          {
            nome: 'necessidade_apoio',
            label: 'Necessidade de Apoio',
            tipo: 'select',
            opcoes: ['Tratores com grade e pipa', 'Brigada vizinha', 'Controle com equipe própria'],
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'necessidade_manutencao',
        nome: 'Necessidade de Manutenção',
        icone: 'Wrench',
        categoria: 'infraestrutura',
        campos: [
          {
            nome: 'item_manutencao',
            label: 'Item Danificado',
            tipo: 'select',
            opcoes: [
              'Cerca',
              'Bebedouro',
              'Cocho',
              'Porteira',
              'Sombrite',
              'Rede Elétrica / Bomba',
              'Ponte / Mata-burro',
            ],
            obrigatorio: true,
          },
          { nome: 'local_especifico', label: 'Local / Pasto', tipo: 'text', obrigatorio: true },
          {
            nome: 'descricao_avaria',
            label: 'Descrição da Avaria',
            tipo: 'textarea',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'lavar_bebedouro',
        nome: 'Lavar Bebedouro',
        icone: 'Droplets',
        categoria: 'manejo',
        campos: [
          {
            nome: 'identificacao_bebedouro',
            label: 'Bebedouro / Pasto',
            tipo: 'text',
            obrigatorio: true,
          },
          {
            nome: 'condicao_limpeza',
            label: 'Condição Encontrada',
            tipo: 'select',
            opcoes: ['Muito sujo com lodo', 'Moderado', 'Limpeza de rotina'],
            obrigatorio: false,
          },
          {
            nome: 'vazamento_detectado',
            label: 'Havia vazamento ou boia travada?',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
      {
        codigo: 'outros',
        nome: 'Outros / Registro Livre',
        icone: 'MoreHorizontal',
        categoria: 'geral',
        campos: [
          { nome: 'descricao', label: 'Descrição Completa', tipo: 'textarea', obrigatorio: true },
          { nome: 'local', label: 'Local / Referência', tipo: 'text', obrigatorio: false },
          {
            nome: 'sugestao_virar_tipo',
            label: 'Deseja sugerir que vire um tipo fixo?',
            tipo: 'text',
            obrigatorio: false,
          },
        ],
      },
    ]

    for (const t of tiposIniciais) {
      try {
        app.findFirstRecordByData('tipos_ocorrencia', 'codigo', t.codigo)
      } catch (_) {
        const rec = new Record(tiposCol)
        rec.set('codigo', t.codigo)
        rec.set('nome', t.nome)
        rec.set('icone', t.icone)
        rec.set('categoria', t.categoria)
        rec.set('campos', t.campos)
        rec.set('ativo', true)
        rec.set('criado_por', 'sistema')
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('audit_log'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ocorrencias'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('tipos_ocorrencia'))
    } catch (_) {}
  },
)
