migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Garantir usuário João Pedro como Gestor
    try {
      const jp = app.findAuthRecordByEmail('_pb_users_auth_', 'joaopedro_zoo@hotmail.com')
      jp.set('name', 'João Pedro (Gestor)')
      jp.set('role', 'gestor')
      app.save(jp)
    } catch (_) {
      const record = new Record(usersCol)
      record.setEmail('joaopedro_zoo@hotmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'João Pedro (Gestor)')
      record.set('role', 'gestor')
      app.save(record)
    }

    // 2. Criar Capataz real para testes de login individual
    try {
      const capataz = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'antonio.capataz@pecuariaf3.com.br',
      )
      capataz.set('role', 'capataz')
      app.save(capataz)
    } catch (_) {
      const record = new Record(usersCol)
      record.setEmail('antonio.capataz@pecuariaf3.com.br')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Antônio Capataz')
      record.set('role', 'capataz')
      app.save(record)
    }

    // 3. Criar Vaqueiro (Operador) real para testes de login individual
    try {
      const vaqueiro = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'joao.vaqueiro@pecuariaf3.com.br',
      )
      vaqueiro.set('role', 'operador')
      app.save(vaqueiro)
    } catch (_) {
      const record = new Record(usersCol)
      record.setEmail('joao.vaqueiro@pecuariaf3.com.br')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'João Vaqueiro')
      record.set('role', 'operador')
      app.save(record)
    }

    // 4. Seed de safras arquivadas para demonstrar comparativo histórico de safras
    const arqCol = app.findCollectionByNameOrId('fechamentos_arquivados')
    const safrasExistentes = app.findRecordsByFilter(
      'fechamentos_arquivados',
      "ano_safra != ''",
      '-created',
      10,
      0,
    )

    if (safrasExistentes.length === 0) {
      // Safra 2022/2023
      const s1 = new Record(arqCol)
      s1.set('ano_safra', '2022/2023')
      s1.set('periodo_rotulo', 'Safra 2022/2023 (Consolidada)')
      s1.set('frente', 'todas')
      s1.set('arrobas_ha_ano', 15.8)
      s1.set('arrobas_cab_ano', 5.1)
      s1.set('custo_arroba_produzida', 128.4)
      s1.set('cotacao_arroba_media', 230.0)
      s1.set('margem_ebitda_pct', 22.4)
      s1.set('ebitda_total', 485000)
      s1.set('lucro_liquido', 392000)
      s1.set('receita_total', 2165000)
      s1.set('custeio_cab_ano', 1650)
      s1.set('taxa_lotacao_ua_ha', 1.15)
      s1.set('mortalidade_pct', 1.4)
      s1.set('taxa_desmame_pct', 79.5)
      s1.set('gmd_medio_kg_dia', 0.82)
      s1.set('rebanho_medio_cab', 340)
      s1.set('arrobas_totais_produzidas', 1734)
      s1.set('arquivado_por', 'João Pedro (Gestor)')
      s1.set('arquivado_em', '2023-07-15 10:00:00.000Z')
      app.save(s1)

      // Safra 2023/2024
      const s2 = new Record(arqCol)
      s2.set('ano_safra', '2023/2024')
      s2.set('periodo_rotulo', 'Safra 2023/2024 (Consolidada)')
      s2.set('frente', 'todas')
      s2.set('arrobas_ha_ano', 17.6)
      s2.set('arrobas_cab_ano', 5.6)
      s2.set('custo_arroba_produzida', 139.2)
      s2.set('cotacao_arroba_media', 242.0)
      s2.set('margem_ebitda_pct', 26.8)
      s2.set('ebitda_total', 642000)
      s2.set('lucro_liquido', 518000)
      s2.set('receita_total', 2395000)
      s2.set('custeio_cab_ano', 1780)
      s2.set('taxa_lotacao_ua_ha', 1.28)
      s2.set('mortalidade_pct', 1.1)
      s2.set('taxa_desmame_pct', 82.0)
      s2.set('gmd_medio_kg_dia', 0.89)
      s2.set('rebanho_medio_cab', 380)
      s2.set('arrobas_totais_produzidas', 2128)
      s2.set('arquivado_por', 'João Pedro (Gestor)')
      s2.set('arquivado_em', '2024-07-20 10:00:00.000Z')
      app.save(s2)
    }

    // 5. Seed inicial de notificações in-app
    const notifCol = app.findCollectionByNameOrId('notificacoes_sistema')
    const notifsCount = app.findRecordsByFilter(
      'notificacoes_sistema',
      "titulo != ''",
      '-created',
      5,
      0,
    )
    if (notifsCount.length === 0) {
      const n1 = new Record(notifCol)
      n1.set('titulo', 'Alerta Crítico de GMD')
      n1.set(
        'mensagem',
        'O lote Lote RE-01 apresentou desvio de GMD superior a 20% abaixo da meta nos últimos 2 ciclos.',
      )
      n1.set('tipo', 'gmd_critico')
      n1.set('severidade', 'alta')
      n1.set('lido', false)
      n1.set('link_destino', '/pesagens')
      n1.set('destinatario_role', 'gestor')
      app.save(n1)

      const n2 = new Record(notifCol)
      n2.set('titulo', 'Atividade Não Realizada com Impacto')
      n2.set(
        'mensagem',
        'Atividade de sanidade não realizada no Pasto 01 requer revisão ou reagendamento imediato.',
      )
      n2.set('tipo', 'atividade_pendente')
      n2.set('severidade', 'media')
      n2.set('lido', false)
      n2.set('link_destino', '/calendario')
      n2.set('destinatario_role', 'gestor')
      app.save(n2)
    }
  },
  (app) => {
    // Reverter seeds não é estritamente obrigatório, deixar idempotente
  },
)
