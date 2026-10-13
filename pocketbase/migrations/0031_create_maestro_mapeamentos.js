/// <reference path="../pb_data/types.d.ts" />

/**
 * 0031 - Coleção maestro_mapeamentos
 *
 * Guarda o mapeamento (colunas → campos + confianças) confirmado em importações
 * anteriores do Robô Maestro, por tipo de arquivo, para reconhecer automaticamente
 * o "relatório mensal" (mesma assinatura de colunas) e pré-preencher a etapa 2.
 * A trilha de auditoria continua append-only no audit_log (referencia_tipo = maestro_importacao).
 */

const REGRA_MAESTRO =
  "@request.auth.id != '' && (@request.auth.role = 'proprietario' || @request.auth.role = 'socio' || @request.auth.role = 'gestor')"

migrate(
  (app) => {
    const collection = new Collection({
      name: 'maestro_mapeamentos',
      type: 'base',
      listRule: REGRA_MAESTRO,
      viewRule: REGRA_MAESTRO,
      createRule: REGRA_MAESTRO,
      updateRule: REGRA_MAESTRO,
      deleteRule: REGRA_MAESTRO,
      fields: [
        {
          name: 'tipo_documento',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pesagens', 'lotes_animais', 'estoque', 'financeiro', 'atividades', 'generico'],
        },
        // Assinatura = cabeçalhos normalizados, ordenados e concatenados
        { name: 'assinatura', type: 'text', required: true },
        // [{ coluna, campo, confianca, unidade }]
        { name: 'colunas', type: 'json', maxSize: 262144 },
        { name: 'nome_arquivo', type: 'text', maxSize: 500 },
        {
          name: 'usuario_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'usuario_nome', type: 'text', maxSize: 200 },
        { name: 'utilizacoes', type: 'number', onlyInt: true },
        { name: 'ultima_utilizacao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_maestro_mapeamentos_assinatura ON maestro_mapeamentos (tipo_documento, assinatura)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('maestro_mapeamentos')
      app.delete(collection)
    } catch (_) {}
  },
)
