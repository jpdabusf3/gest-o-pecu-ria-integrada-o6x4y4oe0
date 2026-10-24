migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Garantir campo avatar do tipo file
    if (!usersCol.fields.getByName('avatar')) {
      usersCol.fields.add(
        new FileField({
          name: 'avatar',
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        }),
      )
    }

    // 2. Garantir opções completas de role
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      const perfis = [
        'proprietario',
        'socio',
        'gestor',
        'capataz',
        'vaqueiro',
        'servente',
        'operador',
        'admin',
        'gerente',
        'funcionario',
      ]
      let alterou = false
      for (const p of perfis) {
        if (!roleField.values.includes(p)) {
          roleField.values.push(p)
          alterou = true
        }
      }
      if (alterou) {
        roleField.maxSelect = 1
      }
    }

    // 3. Regras de acesso da coleção users:
    // list / view: aberto para autenticados ou quem precisa listar equipe
    // create: gestor ou proprietário ou inicial
    // update: o próprio usuário (para foto/dados) OU gestor/proprietário
    // delete: gestor ou proprietário, bloqueando excluir a si mesmo
    usersCol.listRule = '@request.auth.id != ""'
    usersCol.viewRule = '@request.auth.id != ""'
    usersCol.createRule =
      '@request.auth.id = "" || @request.auth.role = "proprietario" || @request.auth.role = "gestor" || @request.auth.role = "admin"'
    usersCol.updateRule =
      'id = @request.auth.id || @request.auth.role = "proprietario" || @request.auth.role = "gestor" || @request.auth.role = "admin"'
    usersCol.deleteRule =
      'id != @request.auth.id && (@request.auth.role = "proprietario" || @request.auth.role = "gestor" || @request.auth.role = "admin")'

    app.save(usersCol)
  },
  (app) => {
    // Reversão básica
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = ''
      usersCol.viewRule = ''
      usersCol.updateRule = '@request.auth.id != ""'
      usersCol.deleteRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
