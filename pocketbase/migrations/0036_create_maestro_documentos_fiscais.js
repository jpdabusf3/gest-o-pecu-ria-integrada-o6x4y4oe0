/// <reference path="../pb_data/types.d.ts" />

/**
 * 0036 — Coleção maestro_documentos_fiscais
 * Registra o histórico append-only de notas fiscais e recibos de pagamento processados pelo Robô Chicão.
 * Deduplicação estrita:
 * - Nota Fiscal: chave_acesso (44 dígitos)
 * - Recibo: hash único baseado em data + valor + beneficiário_cnpj_cpf
 *
 * Regras RLS:
 * - Acesso liberado para leitura e criação aos usuários autenticados (ou regras compatíveis com o app).
 * - Imutabilidade: update e delete bloqueados (append-only) para preservar auditoria e consistência contábil.
 */

migrate(
  (app) => {
    const col = new Collection({
      name: 'maestro_documentos_fiscais',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'tipo_documento',
          type: 'select',
          values: ['nota_fiscal', 'recibo', 'desconhecido'],
          maxSelect: 1,
          required: true,
        },
        { name: 'subtipo', type: 'text' }, // nfe_danfe, nf_avulsa, nf_servico, recibo_simples, pix, ted, boleto, recibo_fornecedor
        { name: 'origem_arquivo', type: 'text', required: true },
        { name: 'chave_acesso', type: 'text' }, // 44 dígitos para NF-e
        { name: 'numero_documento', type: 'text' },
        { name: 'serie', type: 'text' },
        { name: 'cfop_principal', type: 'text' },
        { name: 'natureza_operacao', type: 'text' },
        { name: 'data_emissao', type: 'date' },
        { name: 'data_pagamento', type: 'date' },
        { name: 'emitente_razao', type: 'text' },
        { name: 'emitente_cnpj_cpf', type: 'text' },
        { name: 'destinatario_razao', type: 'text' },
        { name: 'destinatario_cnpj_cpf', type: 'text' },
        { name: 'beneficiario_nome', type: 'text' },
        { name: 'beneficiario_cnpj_cpf', type: 'text' },
        { name: 'pagador_nome', type: 'text' },
        { name: 'pagador_cnpj_cpf', type: 'text' },
        { name: 'valor_total', type: 'number' },
        { name: 'valor_extenso', type: 'text' },
        { name: 'forma_pagamento', type: 'text' },
        { name: 'dados_bancarios', type: 'text' },
        { name: 'referencia_nf', type: 'text' }, // número ou chave da NF referenciada no recibo
        { name: 'documento_vinculado_id', type: 'text' }, // ID da NF vinculada ou ID do Recibo vinculado
        { name: 'conciliado', type: 'bool' },
        { name: 'destino_sistema', type: 'text' }, // estoque_insumos, rebanho_venda, rebanho_compra, financeiro_servico, baixa_desembolso
        { name: 'itens', type: 'json' }, // lista de itens da nota fiscal
        { name: 'impostos', type: 'json' }, // ICMS, outros tributos
        { name: 'campos_status', type: 'json' }, // status por campo (OK, AUSENTE, ILEGIVEL, AMBIGUO, confianca)
        { name: 'alertas', type: 'json' },
        { name: 'protocolo_audit_id', type: 'text' },
        { name: 'usuario_id', type: 'text' },
        { name: 'usuario_nome', type: 'text' },
        { name: 'dedup_hash', type: 'text' }, // hash para deduplicação rápida
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mdf_tipo ON maestro_documentos_fiscais (tipo_documento)',
        'CREATE INDEX idx_mdf_chave ON maestro_documentos_fiscais (chave_acesso)',
        'CREATE INDEX idx_mdf_dedup ON maestro_documentos_fiscais (dedup_hash)',
        'CREATE INDEX idx_mdf_emitente ON maestro_documentos_fiscais (emitente_cnpj_cpf)',
        'CREATE INDEX idx_mdf_beneficiario ON maestro_documentos_fiscais (beneficiario_cnpj_cpf)',
        'CREATE INDEX idx_mdf_data_emissao ON maestro_documentos_fiscais (data_emissao DESC)',
        'CREATE INDEX idx_mdf_data_pagto ON maestro_documentos_fiscais (data_pagamento DESC)',
        'CREATE INDEX idx_mdf_audit ON maestro_documentos_fiscais (protocolo_audit_id)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('maestro_documentos_fiscais'))
    } catch (_) {}
  },
)
