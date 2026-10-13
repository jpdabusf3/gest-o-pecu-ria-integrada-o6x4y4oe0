migrate(
  (app) => {
    // =========================================================================
    // MIGRAÇÃO 0029: ZERAGEM CONTROLADA DE DADOS OPERACIONAIS
    // =========================================================================
    // Conforme decisão do usuário:
    // 1. MANTER configurações e cadastros de base:
    //    - config_benchmark
    //    - config_benchmark_historico
    //    - metas_safra
    //    - tipos_ocorrencia (os 14 tipos do catálogo)
    // 2. MANTER apenas o usuário do e-mail joaopedro_zoo@hotmail.com:
    //    - Promover a 'proprietario' com acesso total
    //    - Deixar ativo, verificado, sem exigência de primeiro acesso
    //    - Atualizar cadastro correspondente na coleção equipe
    //    - Excluir todos os demais usuários do PocketBase (users) e da equipe
    // 3. APAGAR registros de todas as coleções operacionais e transacionais:
    //    - Ordem de exclusão respeitando chaves estrangeiras (filhos -> pais)
    // =========================================================================

    // -------------------------------------------------------------------------
    // ETAPA 1: Limpeza das coleções filhas / operacionais
    // -------------------------------------------------------------------------
    // Coleções operacionais a limpar:
    // 1.1 audit_log
    //     Nota: audit_log possui deleteRule = null na API REST do PocketBase,
    //     mas métodos internos de migração (app.truncateCollection / app.delete / SQL)
    //     executam em nível de sistema.
    if (app.hasTable('audit_log')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('audit_log'))
      } catch (_) {
        app.db().newQuery('DELETE FROM audit_log').execute()
      }
    }

    // 1.2 ocorrencias
    if (app.hasTable('ocorrencias')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('ocorrencias'))
      } catch (_) {
        app.db().newQuery('DELETE FROM ocorrencias').execute()
      }
    }

    // 1.3 historico_status (relacionado com atividades)
    if (app.hasTable('historico_status')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('historico_status'))
      } catch (_) {
        app.db().newQuery('DELETE FROM historico_status').execute()
      }
    }

    // 1.4 atividades
    if (app.hasTable('atividades')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('atividades'))
      } catch (_) {
        app.db().newQuery('DELETE FROM atividades').execute()
      }
    }

    // 1.5 alertas_gmd (relacionado com lots)
    if (app.hasTable('alertas_gmd')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('alertas_gmd'))
      } catch (_) {
        app.db().newQuery('DELETE FROM alertas_gmd').execute()
      }
    }

    // 1.6 pesagens (relacionado com lots)
    if (app.hasTable('pesagens')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('pesagens'))
      } catch (_) {
        app.db().newQuery('DELETE FROM pesagens').execute()
      }
    }

    // 1.7 hedge_operations (relacionado com lots)
    if (app.hasTable('hedge_operations')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('hedge_operations'))
      } catch (_) {
        app.db().newQuery('DELETE FROM hedge_operations').execute()
      }
    }

    // 1.8 movimentacoes_rebanho (relacionado com lots)
    if (app.hasTable('movimentacoes_rebanho')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('movimentacoes_rebanho'))
      } catch (_) {
        app.db().newQuery('DELETE FROM movimentacoes_rebanho').execute()
      }
    }

    // 1.9 vendas (relacionado com lots)
    if (app.hasTable('vendas')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('vendas'))
      } catch (_) {
        app.db().newQuery('DELETE FROM vendas').execute()
      }
    }

    // 1.10 compras_gado (relacionado com lots)
    if (app.hasTable('compras_gado')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('compras_gado'))
      } catch (_) {
        app.db().newQuery('DELETE FROM compras_gado').execute()
      }
    }

    // 1.11 lancamentos_financeiros (relacionado com lots)
    if (app.hasTable('lancamentos_financeiros')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('lancamentos_financeiros'))
      } catch (_) {
        app.db().newQuery('DELETE FROM lancamentos_financeiros').execute()
      }
    }

    // 1.12 lots (pai de hedge, pesagens, movimentacoes, etc.)
    if (app.hasTable('lots')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('lots'))
      } catch (_) {
        app.db().newQuery('DELETE FROM lots').execute()
      }
    }

    // 1.13 estoque_insumos
    if (app.hasTable('estoque_insumos')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('estoque_insumos'))
      } catch (_) {
        app.db().newQuery('DELETE FROM estoque_insumos').execute()
      }
    }

    // 1.14 imobilizado
    if (app.hasTable('imobilizado')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('imobilizado'))
      } catch (_) {
        app.db().newQuery('DELETE FROM imobilizado').execute()
      }
    }

    // 1.15 fechamentos_arquivados
    if (app.hasTable('fechamentos_arquivados')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('fechamentos_arquivados'))
      } catch (_) {
        app.db().newQuery('DELETE FROM fechamentos_arquivados').execute()
      }
    }

    // 1.16 notificacoes_sistema
    if (app.hasTable('notificacoes_sistema')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('notificacoes_sistema'))
      } catch (_) {
        app.db().newQuery('DELETE FROM notificacoes_sistema').execute()
      }
    }

    // 1.17 reconhecimentos_trajetoria
    if (app.hasTable('reconhecimentos_trajetoria')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('reconhecimentos_trajetoria'))
      } catch (_) {
        app.db().newQuery('DELETE FROM reconhecimentos_trajetoria').execute()
      }
    }

    // 1.18 market_prices (cotações de teste antigas)
    if (app.hasTable('market_prices')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('market_prices'))
      } catch (_) {
        app.db().newQuery('DELETE FROM market_prices').execute()
      }
    }

    // 1.19 Databasef3 (tabela legada de teste, se houver registros)
    if (app.hasTable('Databasef3')) {
      try {
        app.truncateCollection(app.findCollectionByNameOrId('Databasef3'))
      } catch (_) {
        app.db().newQuery('DELETE FROM Databasef3').execute()
      }
    }

    // -------------------------------------------------------------------------
    // ETAPA 2: Manter exclusivamente o usuário joaopedro_zoo@hotmail.com
    //          e remover os usuários de teste de 'users' e 'equipe'
    // -------------------------------------------------------------------------
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let jpUserRecord = null

    try {
      jpUserRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'joaopedro_zoo@hotmail.com')
    } catch (_) {
      // Se não existir por algum motivo, cria garantido
      jpUserRecord = new Record(usersCol)
      jpUserRecord.setEmail('joaopedro_zoo@hotmail.com')
      jpUserRecord.setPassword('Skip@Pass')
    }

    // Garantir que João Pedro tenha perfil 'proprietario' (acesso total no sistema)
    jpUserRecord.set('name', 'João Pedro')
    jpUserRecord.set('role', 'proprietario')
    jpUserRecord.setVerified(true)
    app.save(jpUserRecord)

    // Apagar todos os outros usuários de users (exceto joaopedro_zoo@hotmail.com)
    const allUsers = app.findRecordsByFilter('users', 'id != ""', '', 100, 0)
    for (const u of allUsers) {
      const email = u.getString('email').toLowerCase().trim()
      if (email !== 'joaopedro_zoo@hotmail.com') {
        try {
          app.delete(u)
        } catch (e) {
          console.warn('Erro ao deletar user de teste:', email, e)
        }
      }
    }

    // Limpar coleção equipe mantendo apenas o registro de João Pedro (atualizado para proprietário)
    if (app.hasTable('equipe')) {
      const allEquipe = app.findRecordsByFilter('equipe', 'id != ""', '', 100, 0)
      for (const eq of allEquipe) {
        const eqEmail = eq.getString('email').toLowerCase().trim()
        if (eqEmail !== 'joaopedro_zoo@hotmail.com') {
          try {
            app.delete(eq)
          } catch (e) {
            console.warn('Erro ao deletar membro de equipe de teste:', eqEmail, e)
          }
        }
      }

      // Atualizar ou criar o registro de João Pedro na equipe
      let jpEquipeRecord = null
      try {
        jpEquipeRecord = app.findFirstRecordByData('equipe', 'email', 'joaopedro_zoo@hotmail.com')
      } catch (_) {}

      const equipeCol = app.findCollectionByNameOrId('equipe')
      if (!jpEquipeRecord) {
        jpEquipeRecord = new Record(equipeCol)
        jpEquipeRecord.set('email', 'joaopedro_zoo@hotmail.com')
      }

      jpEquipeRecord.set('nome', 'João Pedro')
      jpEquipeRecord.set('cpf', '111.111.111-11')
      jpEquipeRecord.set('telefone', '(67) 99876-5432')
      jpEquipeRecord.set('perfil', 'proprietario')
      jpEquipeRecord.set('status', 'ativo')
      jpEquipeRecord.set('user_id', jpUserRecord.id)
      jpEquipeRecord.set('registro_profissional', 'CRMV-MS 14820 - Zootecnista')
      jpEquipeRecord.set('frentes_supervisao', [
        'cria',
        'recria',
        'engorda',
        'confinamento',
        'arrendamento',
      ])
      jpEquipeRecord.set('primeiro_acesso', false)
      jpEquipeRecord.set('lotes_responsabilidade', [])
      jpEquipeRecord.set('setores_responsabilidade', [])
      app.save(jpEquipeRecord)
    }

    // -------------------------------------------------------------------------
    // ETAPA 3: Garantir preservação das coleções de configuração
    // -------------------------------------------------------------------------
    // tipos_ocorrencia, config_benchmark, config_benchmark_historico e metas_safra
    // permanecem intactas com seus respectivos registros.
    // Garantir que criador das metas de safra aponte para o João Pedro:
    if (app.hasTable('metas_safra')) {
      const metas = app.findRecordsByFilter('metas_safra', 'id != ""', '', 100, 0)
      for (const m of metas) {
        if (!m.getString('created_by')) {
          m.set('created_by', jpUserRecord.id)
          try {
            app.save(m)
          } catch (_) {}
        }
      }
    }
  },
  (app) => {
    // Zeragem de dados não é reversível automaticamente
  },
)
