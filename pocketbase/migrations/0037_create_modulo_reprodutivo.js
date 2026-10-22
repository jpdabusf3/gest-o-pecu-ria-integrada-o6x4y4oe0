/// <reference path="../pb_data/types.d.ts" />

/**
 * 0037 — Módulo Reprodutivo Completo & Ingestão de Relatórios pelo Robô Chicão
 *
 * Cria 3 coleções centrais:
 * 1. `estacoes_monta`: safras/estações de monta (ano_safra, nome, data_inicio, data_fim,
 *    total_expostas, total_prenhes, total_vazias, taxa_prenhez_pct, taxa_paricao_pct,
 *    taxa_desmame_pct, iep_medio_meses, perda_gestacional_pct, kg_desmamado_matriz, observacoes).
 * 2. `exames_gestacao`: exames e diagnósticos de gestação individuais/IATF (brinco, estacao_id,
 *    data_exame, resultado: prenhe|vazia|perda, dias_gestacao, touro_ou_lote_iatf, tipo_manejo: iatf|monta_natural|revisite,
 *    data_parto, peso_bezerro_desmama, lote_origem, arquivo_origem, dedup_hash, protocolo_audit_id).
 * 3. `historico_matrizes`: consolidado por matriz (brinco, numero_partos, idade_primeiro_parto_meses,
 *    iep_medio_meses, ultimo_diagnostico, ultimo_peso_bezerro_desmame, partos_por_ano_vida,
 *    eficiencia_acumulada_pct, status_reprodutivo: apta|descarte_sugerido|descartada, motivo_descarte).
 *
 * RLS: leitura e escrita para gestores, proprietários, sócios e administradores.
 */

migrate(
  (app) => {
    // 1. Coleção `estacoes_monta`
    try {
      app.findCollectionByNameOrId('estacoes_monta')
    } catch (_) {
      const colEstacoes = new Collection({
        name: 'estacoes_monta',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin')",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'ano_safra', type: 'text', required: true },
          { name: 'data_inicio', type: 'date' },
          { name: 'data_fim', type: 'date' },
          { name: 'total_expostas', type: 'number', min: 0 },
          { name: 'total_prenhes', type: 'number', min: 0 },
          { name: 'total_vazias', type: 'number', min: 0 },
          { name: 'total_paridas', type: 'number', min: 0 },
          { name: 'total_desmamados', type: 'number', min: 0 },
          { name: 'taxa_prenhez_pct', type: 'number', min: 0, max: 100 },
          { name: 'taxa_paricao_pct', type: 'number', min: 0, max: 100 },
          { name: 'taxa_desmame_pct', type: 'number', min: 0, max: 100 },
          { name: 'iep_medio_meses', type: 'number', min: 0 },
          { name: 'perda_gestacional_pct', type: 'number', min: 0, max: 100 },
          { name: 'perda_primeiro_terco_pct', type: 'number', min: 0, max: 100 },
          { name: 'perda_segundo_terco_pct', type: 'number', min: 0, max: 100 },
          { name: 'perda_terceiro_terco_pct', type: 'number', min: 0, max: 100 },
          { name: 'kg_desmamado_matriz', type: 'number', min: 0 },
          { name: 'observacoes', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['planejada', 'em_andamento', 'encerrada'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_estacoes_safra_nome ON estacoes_monta (ano_safra, nome)',
          'CREATE INDEX idx_estacoes_safra ON estacoes_monta (ano_safra)',
          'CREATE INDEX idx_estacoes_status ON estacoes_monta (status)',
        ],
      })
      app.save(colEstacoes)
    }

    const estacoesColId = app.findCollectionByNameOrId('estacoes_monta').id

    // 2. Coleção `exames_gestacao`
    try {
      app.findCollectionByNameOrId('exames_gestacao')
    } catch (_) {
      const colExames = new Collection({
        name: 'exames_gestacao',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio' || @request.auth.role = 'capataz')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
        deleteRule: null, // append-friendly
        fields: [
          { name: 'brinco', type: 'text', required: true },
          { name: 'estacao_id', type: 'relation', collectionId: estacoesColId, maxSelect: 1 },
          { name: 'ano_safra', type: 'text', required: true },
          { name: 'data_exame', type: 'date', required: true },
          {
            name: 'resultado',
            type: 'select',
            required: true,
            values: ['prenhe', 'vazia', 'perda_embrionaria', 'perda_fetal', 'duvidoso'],
            maxSelect: 1,
          },
          { name: 'dias_gestacao', type: 'number', min: 0 },
          {
            name: 'terco_gestacao',
            type: 'select',
            values: ['primeiro', 'segundo', 'terceiro'],
            maxSelect: 1,
          },
          { name: 'touro_ou_lote_iatf', type: 'text' },
          {
            name: 'tipo_manejo',
            type: 'select',
            values: ['iatf', 'monta_natural', 'repasses', 'revisite'],
            maxSelect: 1,
          },
          { name: 'data_parto', type: 'date' },
          { name: 'peso_bezerro_nascimento_kg', type: 'number', min: 0 },
          { name: 'data_desmama', type: 'date' },
          { name: 'peso_bezerro_desmama_kg', type: 'number', min: 0 },
          { name: 'dias_ate_desmama', type: 'number', min: 0 },
          { name: 'peso_ajustado_205d_kg', type: 'number', min: 0 },
          { name: 'lote_origem', type: 'text' },
          { name: 'veterinario_responsavel', type: 'text' },
          { name: 'arquivo_origem', type: 'text' },
          { name: 'dedup_hash', type: 'text' },
          { name: 'protocolo_audit_id', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_exames_brinco ON exames_gestacao (brinco)',
          'CREATE INDEX idx_exames_estacao ON exames_gestacao (estacao_id)',
          'CREATE INDEX idx_exames_safra ON exames_gestacao (ano_safra)',
          'CREATE INDEX idx_exames_data ON exames_gestacao (data_exame DESC)',
          'CREATE INDEX idx_exames_dedup ON exames_gestacao (dedup_hash)',
        ],
      })
      app.save(colExames)
    }

    // 3. Coleção `historico_matrizes`
    try {
      app.findCollectionByNameOrId('historico_matrizes')
    } catch (_) {
      const colMatrizes = new Collection({
        name: 'historico_matrizes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'gestor' || @request.auth.role = 'admin' || @request.auth.role = 'socio')",
        deleteRule: null,
        fields: [
          { name: 'brinco', type: 'text', required: true },
          { name: 'nome_ou_registro', type: 'text' },
          { name: 'data_nascimento', type: 'date' },
          { name: 'idade_meses', type: 'number', min: 0 },
          { name: 'idade_primeiro_parto_meses', type: 'number', min: 0 },
          { name: 'total_partos', type: 'number', min: 0 },
          { name: 'total_exames_registrados', type: 'number', min: 0 },
          { name: 'iep_medio_meses', type: 'number', min: 0 },
          { name: 'ultimo_iep_meses', type: 'number', min: 0 },
          { name: 'ultimo_resultado_diagnostico', type: 'text' },
          { name: 'data_ultimo_diagnostico', type: 'date' },
          { name: 'data_ultimo_parto', type: 'date' },
          { name: 'peso_ultimo_bezerro_desmama_kg', type: 'number', min: 0 },
          { name: 'peso_ajustado_205d_kg', type: 'number', min: 0 },
          { name: 'partos_por_ano_vida', type: 'number', min: 0 },
          { name: 'eficiencia_acumulada_pct', type: 'number', min: 0 },
          {
            name: 'status_reprodutivo',
            type: 'select',
            values: ['apta', 'candidata_descarte', 'descartada', 'em_lactacao', 'prenhe', 'vazia'],
            maxSelect: 1,
          },
          { name: 'motivo_descarte_sugerido', type: 'text' },
          { name: 'impacto_economico_estimado_rs', type: 'number' },
          { name: 'pasto_atual', type: 'text' },
          { name: 'lote_atual', type: 'text' },
          { name: 'ciclos_reprodutivos', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_matrizes_brinco ON historico_matrizes (brinco)',
          'CREATE INDEX idx_matrizes_status ON historico_matrizes (status_reprodutivo)',
          'CREATE INDEX idx_matrizes_iep ON historico_matrizes (iep_medio_meses)',
        ],
      })
      app.save(colMatrizes)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('historico_matrizes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('exames_gestacao'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('estacoes_monta'))
    } catch (_) {}
  },
)
