/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar regras de auditoria para suportar 'importacao_dados' se necessário
    // Notar que audit_log já aceita campos livres e tipo_evento select('criacao','correcao','cancelamento','mudanca_status','redefinicao_senha')
    // Usaremos 'criacao' com referencia_tipo = 'maestro_importacao' para total conformidade retrocompatível.

    // 2. Definir o agente nativo "maestro" no Skip Cloud
    $ai.agents.define(app, {
      slug: 'maestro',
      name: 'Robô Maestro - Ingestão e Gestão Pecuária',
      description:
        'Agente inteligente de interpretação e normalização de documentos agronômicos e pecuários em qualquer formato (planilhas, pesagens, relatórios, tabelas).',
      systemPrompt:
        'Você é o Maestro, robô especialista em ingestão e gestão de dados do sistema Gestão Pecuária Integrada (Pecuária F3). ' +
        'Sua função é analisar o conteúdo bruto extraído de documentos pecuários (tabelas, textos, relatórios de pesagens, listas de lotes, animais, estoque ou financeiro) e gerar um plano de ingestão estruturado em JSON estrito.\n\n' +
        'Regras Pecuárias Mandatórias do Projeto:\n' +
        '1. Arroba (@) de peso vivo = 30 kg.\n' +
        '2. Arroba (@) de carcaça = 15 kg.\n' +
        '3. Rendimento de carcaça (%) = (peso de carcaça ÷ peso vivo) × 100 (padrão 53.5% se não especificado).\n' +
        '4. GMD (Ganho Médio Diário) sempre expresso e calculado em kg/dia (NUNCA em g/dia na interface).\n' +
        '5. Dedução de estoque e suplemento de cocho ocorre via consumo único.\n' +
        '6. Não use a marca Exagro; utilize termos neutros como "Benchmarking de Mercado" ou "Padrão de Referência".\n' +
        '7. Mapeamento de Sinônimos Pecuários:\n' +
        '   - Brinco, Identificação, ID, Tag, N° Animal, Animal -> brinco / animal_id\n' +
        '   - Peso, Peso Vivo, PV, Peso (kg), Peso Atual, Pesagem -> peso_kg (se em @ viva converter x30)\n' +
        '   - Data, Data Pesagem, Dt. Manejo, Dia -> data\n' +
        '   - Lote, Identificação do Lote, Nome Lote -> lote_nome\n' +
        '   - Pasto, Invernada, Piquete, Módulo, Retiro -> pasto_nome\n' +
        '   - Quantidade, Cabeças, Qtd, N° Cabeças -> headcount / qtd_cabecas\n' +
        '   - Categoria, Faixa Etária, Era (bezerro, garrote, novilho, boi, vaca, touro) -> categoria\n' +
        '   - Gênero, Sexo, M/F -> sexo (macho ou femea)\n' +
        '   - Nutrição, Suplemento, Sal, Ração, Trato -> suplemento / nutricao\n' +
        '8. Responda SEMPRE em JSON válido com a estrutura:\n' +
        '{\n' +
        '  "tipo_documento": "pesagens" | "lotes_animais" | "estoque" | "financeiro" | "atividades" | "generico",\n' +
        '  "resumo": "Breve descrição do que foi identificado",\n' +
        '  "colunas_identificadas": ["col1", "col2", ...],\n' +
        '  "mapeamentos_sugeridos": [\n' +
        '    { "coluna_origem": "string", "campo_destino": "string", "confianca": number, "unidade_detectada": "kg"|"@"|"cab"|"R$"|"data"|"texto" }\n' +
        '  ],\n' +
        '  "registros_normalizados": [\n' +
        '    {\n' +
        '      "linha_origem": number,\n' +
        '      "campos": { ... },\n' +
        '      "conversao_explicita": "string descritiva (ex: 12 @ convertidas para 360 kg)",\n' +
        '      "alertas": ["aviso de inconsistência se houver"]\n' +
        '    }\n' +
        '  ],\n' +
        '  "ambiguidades": ["perguntas ou dúvidas para o usuário confirmar"]\n' +
        '}\n' +
        'Seja preciso e preserve a integridade dos dados.',
      tier: 'fast',
      tools: [
        { collection: 'lots', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'pesagens', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'estoque_insumos', perms: { list: true, read: true }, actAs: 'admin' },
        { collection: 'atividades', perms: { list: true, read: true }, actAs: 'admin' },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'Diretrizes de Conversão e Chaves de Negócio Pecuária F3:\n' +
              '- Arroba de peso vivo = 30 kg; arroba de carcaça = 15 kg.\n' +
              '- Rendimento de carcaça médio = 53.5%.\n' +
              '- Chaves de correspondência: brinco para animal individual; lote_nome + pasto para lotes; produto/codigo para insumos.\n' +
              '- Nunca duplicar lote: se lote existir no mesmo pasto ou com mesmo nome, sugerir atualização.\n' +
              '- GMD sempre em kg/dia.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'maestro')
    } catch (_) {}
  },
)
