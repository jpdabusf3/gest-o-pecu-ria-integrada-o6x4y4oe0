migrate(
  (app) => {
    // 1. Adicionar valor 'funcionario' às opções de role/perfil se não existir
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField && !roleField.values.includes('funcionario')) {
        roleField.values.push('funcionario')
        app.save(usersCol)
      }
    } catch (err) {
      console.log('Erro ao atualizar role em users:', err)
    }

    try {
      const equipeCol = app.findCollectionByNameOrId('equipe')
      const perfilField = equipeCol.fields.getByName('perfil')
      if (perfilField && !perfilField.values.includes('funcionario')) {
        perfilField.values.push('funcionario')
        app.save(equipeCol)
      }
    } catch (err) {
      console.log('Erro ao atualizar perfil em equipe:', err)
    }

    // 2. Garantir usuário de autenticação para Claudio Figueiredo
    let claudioUserId = ''
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      let claudioRecord
      try {
        claudioRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'claudiodabus@gmail.com')
        claudioUserId = claudioRecord.id
      } catch (_) {
        claudioRecord = new Record(usersCol)
        claudioRecord.setEmail('claudiodabus@gmail.com')
        claudioRecord.setPassword('Skip@Pass')
        claudioRecord.set('name', 'Claudio Figueiredo')
        claudioRecord.set('role', 'proprietario')
        claudioRecord.setVerified(true)
        app.save(claudioRecord)
        claudioUserId = claudioRecord.id
      }
    } catch (err) {
      console.log('Erro ao garantir usuario Claudio:', err)
    }

    // 3. Vincular ou atualizar registro na coleção equipe
    try {
      const equipeRecords = app.findRecordsByFilter('equipe', "email = 'claudiodabus@gmail.com'")
      if (equipeRecords.length > 0) {
        const eq = equipeRecords[0]
        eq.set('nome', 'Claudio Figueiredo')
        if (claudioUserId) {
          eq.set('user_id', claudioUserId)
        }
        eq.set('perfil', 'proprietario')
        eq.set('status', 'ativo')
        app.save(eq)
      }
    } catch (err) {
      console.log('Erro ao atualizar equipe Claudio:', err)
    }

    // 4. Limpar do banco qualquer usuário de demonstração que não seja João Pedro ou Claudio Figueiredo
    try {
      app
        .db()
        .newQuery(`
      DELETE FROM users 
      WHERE email NOT IN ('joaopedro_zoo@hotmail.com', 'claudiodabus@gmail.com')
        AND name NOT LIKE '%João Pedro%'
        AND name NOT LIKE '%Claudio%'
        AND name NOT LIKE '%Cláudio%'
    `)
        .execute()
    } catch (err) {
      console.log('Erro ao limpar users demonstracao:', err)
    }

    try {
      app
        .db()
        .newQuery(`
      DELETE FROM equipe 
      WHERE email NOT IN ('joaopedro_zoo@hotmail.com', 'claudiodabus@gmail.com')
        AND nome NOT LIKE '%João Pedro%'
        AND nome NOT LIKE '%Claudio%'
        AND nome NOT LIKE '%Cláudio%'
    `)
        .execute()
    } catch (err) {
      console.log('Erro ao limpar equipe demonstracao:', err)
    }
  },
  (app) => {
    // Revert opcional
  },
)
