migrate(
  (app) => {
    // 1. Ampliar opções de role em _pb_users_auth_ se necessário
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      // Atualizar valores possíveis de role no users para acomodar os novos perfis
      roleField.values = [
        'proprietario',
        'socio',
        'gestor',
        'capataz',
        'vaqueiro',
        'servente',
        'operador',
        'admin',
        'gerente',
      ]
      app.save(usersCol)
    }

    // 2. Criar coleção equipe
    try {
      app.findCollectionByNameOrId('equipe')
    } catch (_) {
      const equipeCol = new Collection({
        name: 'equipe',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'nome', type: 'text', required: true, min: 3 },
          { name: 'cpf', type: 'text', required: true },
          { name: 'telefone', type: 'text', required: true },
          { name: 'email', type: 'email' },
          { name: 'data_nascimento', type: 'date' },
          {
            name: 'perfil',
            type: 'select',
            required: true,
            values: ['proprietario', 'socio', 'gestor', 'capataz', 'vaqueiro', 'servente'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativo', 'inativo'],
            maxSelect: 1,
          },
          {
            name: 'foto',
            type: 'file',
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          },
          // Campos adicionais por perfil
          { name: 'funcao_especifica', type: 'text' }, // trato, manejo, manutencao, etc.
          { name: 'lotes_responsabilidade', type: 'json' }, // array com IDs ou nomes dos lotes
          { name: 'setores_responsabilidade', type: 'json' }, // array de setores
          { name: 'data_admissao', type: 'date' },
          { name: 'registro_profissional', type: 'text' }, // CRMV, Zootecnista, etc.
          { name: 'frentes_supervisao', type: 'json' }, // cria, recria, engorda, confinamento, arrendamento
          { name: 'percentual_participacao', type: 'number' }, // Para sócio
          { name: 'socio_administrador', type: 'bool' }, // Para sócio
          { name: 'primeiro_acesso', type: 'bool' }, // Flag para troca obrigatória de senha
          { name: 'senha_temporaria_exibida', type: 'text' }, // Guardar para auditoria/exibição
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_equipe_cpf ON equipe (cpf)',
          'CREATE INDEX idx_equipe_perfil ON equipe (perfil)',
          'CREATE INDEX idx_equipe_status ON equipe (status)',
          'CREATE INDEX idx_equipe_user_id ON equipe (user_id)',
        ],
      })
      app.save(equipeCol)
    }

    // 3. Cadastrar registros iniciais na equipe sincronizados com os usuários existentes
    const equipe = app.findCollectionByNameOrId('equipe')

    // 3.1 João Pedro (Gestor)
    try {
      app.findFirstRecordByData('equipe', 'cpf', '111.111.111-11')
    } catch (_) {
      let userId = ''
      try {
        const u = app.findAuthRecordByEmail('_pb_users_auth_', 'joaopedro_zoo@hotmail.com')
        userId = u.id
      } catch (_) {}

      const rec = new Record(equipe)
      rec.set('nome', 'João Pedro (Gestor)')
      rec.set('cpf', '111.111.111-11')
      rec.set('telefone', '(67) 99876-5432')
      rec.set('email', 'joaopedro_zoo@hotmail.com')
      rec.set('perfil', 'gestor')
      rec.set('status', 'ativo')
      rec.set('user_id', userId)
      rec.set('registro_profissional', 'CRMV-MS 14820 - Zootecnista')
      rec.set('frentes_supervisao', ['cria', 'recria', 'engorda', 'confinamento', 'arrendamento'])
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }

    // 3.2 Dr. Carlos Silva (Proprietário)
    try {
      app.findFirstRecordByData('equipe', 'cpf', '222.222.222-22')
    } catch (_) {
      // Garantir usuário no auth
      let propUser
      try {
        propUser = app.findAuthRecordByEmail('_pb_users_auth_', 'proprietario@pecuariaf3.com.br')
      } catch (_) {
        propUser = new Record(usersCol)
        propUser.setEmail('proprietario@pecuariaf3.com.br')
        propUser.setPassword('Skip@Pass')
        propUser.setVerified(true)
        propUser.set('name', 'Dr. Carlos Eduardo (Proprietário)')
        propUser.set('role', 'proprietario')
        app.save(propUser)
      }

      const rec = new Record(equipe)
      rec.set('nome', 'Dr. Carlos Eduardo')
      rec.set('cpf', '222.222.222-22')
      rec.set('telefone', '(67) 99988-1122')
      rec.set('email', 'proprietario@pecuariaf3.com.br')
      rec.set('perfil', 'proprietario')
      rec.set('status', 'ativo')
      rec.set('user_id', propUser.id)
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }

    // 3.3 Mariana Castro (Sócia Administradora)
    try {
      app.findFirstRecordByData('equipe', 'cpf', '333.333.333-33')
    } catch (_) {
      let sociaUser
      try {
        sociaUser = app.findAuthRecordByEmail('_pb_users_auth_', 'socio@pecuariaf3.com.br')
      } catch (_) {
        sociaUser = new Record(usersCol)
        sociaUser.setEmail('socio@pecuariaf3.com.br')
        sociaUser.setPassword('Skip@Pass')
        sociaUser.setVerified(true)
        sociaUser.set('name', 'Mariana Castro (Sócia)')
        sociaUser.set('role', 'socio')
        app.save(sociaUser)
      }

      const rec = new Record(equipe)
      rec.set('nome', 'Mariana Castro')
      rec.set('cpf', '333.333.333-33')
      rec.set('telefone', '(67) 99654-7890')
      rec.set('email', 'socio@pecuariaf3.com.br')
      rec.set('perfil', 'socio')
      rec.set('status', 'ativo')
      rec.set('user_id', sociaUser.id)
      rec.set('percentual_participacao', 25.0)
      rec.set('socio_administrador', true)
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }

    // 3.4 Antônio Capataz
    try {
      app.findFirstRecordByData('equipe', 'cpf', '444.444.444-44')
    } catch (_) {
      let capatazId = ''
      try {
        const u = app.findAuthRecordByEmail('_pb_users_auth_', 'antonio.capataz@pecuariaf3.com.br')
        capatazId = u.id
      } catch (_) {}

      const rec = new Record(equipe)
      rec.set('nome', 'Antônio Capataz')
      rec.set('cpf', '444.444.444-44')
      rec.set('telefone', '(67) 99123-4567')
      rec.set('email', 'antonio.capataz@pecuariaf3.com.br')
      rec.set('perfil', 'capataz')
      rec.set('status', 'ativo')
      rec.set('user_id', capatazId)
      rec.set('frentes_supervisao', ['recria', 'engorda', 'confinamento'])
      rec.set('data_admissao', '2021-03-01 08:00:00.000Z')
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }

    // 3.5 João Vaqueiro
    try {
      app.findFirstRecordByData('equipe', 'cpf', '555.555.555-55')
    } catch (_) {
      let vaqueiroId = ''
      try {
        const u = app.findAuthRecordByEmail('_pb_users_auth_', 'joao.vaqueiro@pecuariaf3.com.br')
        vaqueiroId = u.id
      } catch (_) {}

      const rec = new Record(equipe)
      rec.set('nome', 'João Vaqueiro')
      rec.set('cpf', '555.555.555-55')
      rec.set('telefone', '(67) 98765-4321')
      rec.set('email', 'joao.vaqueiro@pecuariaf3.com.br')
      rec.set('perfil', 'vaqueiro')
      rec.set('status', 'ativo')
      rec.set('user_id', vaqueiroId)
      rec.set('funcao_especifica', 'Manejo e Pesagens de Campo')
      rec.set('lotes_responsabilidade', ['Lote RE-01', 'Lote RE-02', 'Lote ENG-01'])
      rec.set('setores_responsabilidade', ['Recria Rotacionada', 'Pasto Fundo'])
      rec.set('data_admissao', '2022-05-10 08:00:00.000Z')
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }

    // 3.6 Tiago Servente (Serviços Gerais / Trato)
    try {
      app.findFirstRecordByData('equipe', 'cpf', '666.666.666-66')
    } catch (_) {
      let servUser
      try {
        servUser = app.findAuthRecordByEmail('_pb_users_auth_', 'tiago.servente@pecuariaf3.com.br')
      } catch (_) {
        servUser = new Record(usersCol)
        servUser.setEmail('tiago.servente@pecuariaf3.com.br')
        servUser.setPassword('Skip@Pass')
        servUser.setVerified(true)
        servUser.set('name', 'Tiago Servente')
        servUser.set('role', 'servente')
        app.save(servUser)
      }

      const rec = new Record(equipe)
      rec.set('nome', 'Tiago Servente')
      rec.set('cpf', '666.666.666-66')
      rec.set('telefone', '(67) 98111-2233')
      rec.set('email', 'tiago.servente@pecuariaf3.com.br')
      rec.set('perfil', 'servente')
      rec.set('status', 'ativo')
      rec.set('user_id', servUser.id)
      rec.set('funcao_especifica', 'Trato, Suplementação e Cercas')
      rec.set('lotes_responsabilidade', ['Lote CONF-01', 'Lote CONF-02'])
      rec.set('setores_responsabilidade', ['Fábrica de Ração', 'Confinamento A'])
      rec.set('data_admissao', '2023-01-15 08:00:00.000Z')
      rec.set('primeiro_acesso', false)
      app.save(rec)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('equipe'))
    } catch (_) {}
  },
)
