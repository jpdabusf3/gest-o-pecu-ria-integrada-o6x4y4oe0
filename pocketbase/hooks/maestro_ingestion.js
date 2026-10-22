/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Ingestão do Robô Chicão (antigo Maestro)
 * 1. POST /backend/v1/maestro/extract: extrai markdown estruturado de arquivos enviados
 *    (PDF, DOCX, XLSX, XLS, PPTX, TXT, CSV) via $documents.toMarkdown.
 *    - PDFs digitalizados (422) e FOTOS de tabelas (JPG/PNG/WEBP/HEIC) tentam leitura
 *      visual por IA ($ai.chat multimodal com pre-processamento). Sem transcrição confiável, devolve aviso
 *      honesto — o Chicão NUNCA inventa dados.
 * 2. POST /backend/v1/maestro/analyze: aciona o agente Chicão ($ai.agent('maestro').chat)
 *    para mapear colunas, interpretar unidades e normalizar dados.
 * 3. POST /backend/v1/maestro/process-fiscal: rota especializada para NOTAS FISCAIS e RECIBOS DE PAGAMENTO (PDF/imagens).
 *    Classifica automaticamente (nota_fiscal vs recibo vs desconhecido),
 *    detecta múltiplos documentos em um único PDF/arquivo e separa individualmente,
 *    extrai todos os campos exigidos (chave 44 dígitos, CFOP, impostos, itens, beneficiário, dados bancários...),
 *    com status por campo (OK, AUSENTE, ILEGIVEL, AMBIGUO), conferência de soma dos itens vs total e valor por extenso vs numérico.
 *
 * REGRA DO POCKETBASE JSVM: nenhuma função ou constante auxiliar no top-level pode ser
 * referenciada dentro de callbacks, pois o pool de VMs executa isolado. Todo helper
 * deve ser declarado no escopo interno do handler correspondente.
 */

routerAdd('POST', '/backend/v1/maestro/extract', (e) => {
  const VISION_SYSTEM_PROMPT =
    'Você é o módulo de leitura visual (OCR) do Robô Chicão do sistema Gestão Pecuária Integrada. ' +
    'Sua única função é TRANSCREVER fielmente o que está visível na imagem/documento enviado: ' +
    'documentos fiscais (DANFE / NF-e / NFS-e), recibos de pagamento, comprovantes bancários (PIX/TED/boleto) ou tabelas em Markdown GFM (| coluna | coluna |), títulos e rótulos, exatamente como aparecem. ' +
    'Regras absolutas: (1) NUNCA invente, estime, complete ou corrija valores; transcreva o que lê, mesmo com ruído ou inclinação; ' +
    '(2) se um valor ou campo estiver ilegível, escreva "[ILEGIVEL]" no campo correspondente; ' +
    '(3) se a imagem estiver completamente ilegível, cortada, desfocada ou você NÃO conseguir enxergar documento legível, ' +
    'responda EXATAMENTE {"erro":"sem_visao"} e nada mais; ' +
    '(4) não comente, não resuma, não dê saudações: devolva apenas a transcrição fiel em Markdown.'

  const AVISO_SEM_LEITURA =
    'Arquivo digitalizado/foto sem camada de texto selecionável. O Robô Chicão tentou a leitura visual por IA e não obteve ' +
    'uma transcrição confiável — nenhum dado foi inventado. Sugestões: 1) envie o PDF original com texto selecionável ou a ' +
    'planilha (XLSX/CSV); 2) se for foto/escaneado de nota ou recibo, capture novamente com boa luz, página inteira no quadro e foco nítido ' +
    '(JPG/PNG/PDF); 3) preencha os dados na conferência obrigatória antes de qualquer lançamento.'

  function bytesToBase64(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i]
      const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
      const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0
      out += chars[b1 >> 2]
      out += chars[((b1 & 3) << 4) | (b2 >> 4)]
      out += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
      out += i + 2 < bytes.length ? chars[b3 & 63] : '='
    }
    return out
  }

  function mimePorExtensao(lowerName) {
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg'
    if (lowerName.endsWith('.png')) return 'image/png'
    if (lowerName.endsWith('.webp')) return 'image/webp'
    if (lowerName.endsWith('.heic')) return 'image/heic'
    if (lowerName.endsWith('.heif')) return 'image/heif'
    if (lowerName.endsWith('.pdf')) return 'application/pdf'
    return ''
  }

  function tentarLeituraVisual(fileObj, lowerName) {
    try {
      const bytes = fileObj.bytes()
      if (!bytes || bytes.length === 0) return { ok: false, motivo: 'arquivo vazio' }
      if (bytes.length > 10 * 1024 * 1024) return { ok: false, motivo: 'arquivo maior que 10 MB' }

      const mime = mimePorExtensao(lowerName)
      if (!mime) return { ok: false, motivo: 'formato sem leitura visual' }

      const dataUri = 'data:' + mime + ';base64,' + bytesToBase64(bytes)
      const resposta = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Transcreva fielmente o documento visível (Notas Fiscais, DANFE, Recibos de Pagamento, Comprovantes ou Tabelas). ' +
                  'Se houver múltiplos documentos na página ou páginas diferentes, separe-os com "--- DOCUMENTO_SEPARADOR ---". ' +
                  'Se não conseguir enxergar com nitidez, responda {"erro":"sem_visao"}.',
              },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      })

      let txt = ''
      const raw =
        resposta && resposta.choices && resposta.choices[0] && resposta.choices[0].message
          ? resposta.choices[0].message.content
          : ''
      if (typeof raw === 'string') txt = raw
      else if (Array.isArray(raw))
        txt = raw
          .map(function (p) {
            return (p && p.text) || ''
          })
          .join('\n')
      txt = (txt || '').trim()

      if (!txt || txt.indexOf('sem_visao') !== -1) {
        return { ok: false, motivo: 'transcrição visual não confiável' }
      }
      return { ok: true, markdown: txt }
    } catch (err) {
      console.log('chicao: leitura visual indisponível:', (err && err.message) || err)
      return { ok: false, motivo: (err && err.message) || 'erro na leitura visual' }
    }
  }

  function aplicarLeituraVisual(resultado) {
    if (resultado && resultado.ok) {
      return {
        ok: true,
        markdown: resultado.markdown,
        aviso:
          'Documento sem camada de texto: lido por leitura visual (OCR com IA do Robô Chicão). Os dados transcritos passam ' +
          'obrigatoriamente pela conferência antes de qualquer aplicação — confira campo a campo.',
      }
    }
    return { ok: false, aviso: AVISO_SEM_LEITURA }
  }

  try {
    const files = e.findUploadedFiles('arquivo')
    if (!files || files.length === 0) {
      return e.json(400, { error: 'Nenhum arquivo enviado para extração' })
    }

    const file = files[0]
    const originalName = file.originalName || 'documento'
    const lowerName = originalName.toLowerCase()

    let markdown = ''
    let truncated = false
    let requiresOCR = false
    let ocrUsado = false
    let origemLeitura = 'nenhuma'
    let aviso = ''

    const isImagem = /\.(jpg|jpeg|png|webp|heic|heif)$/.test(lowerName)
    const isDocumento = /\.(pdf|docx|doc|xlsx|xls|pptx|ppt)$/.test(lowerName)
    const isTexto = /\.(csv|txt|tsv)$/.test(lowerName)

    if (isImagem) {
      // Foto de nota/recibo ou tabela tirada no celular
      const resultado = aplicarLeituraVisual(tentarLeituraVisual(file, lowerName))
      if (resultado.ok) {
        markdown = resultado.markdown
        ocrUsado = true
        origemLeitura = 'visao'
        aviso = resultado.aviso
      } else {
        requiresOCR = true
        aviso = resultado.aviso
      }
    } else if (isDocumento) {
      try {
        const docResult = $documents.toMarkdown({ file: file })
        markdown = docResult.markdown || ''
        truncated = Boolean(docResult.truncated)
        origemLeitura = 'texto'
      } catch (err) {
        if (err && err.status === 422) {
          // Documento digitalizado sem camada de texto (escaneado) — tenta leitura visual por IA
          const resultado = aplicarLeituraVisual(tentarLeituraVisual(file, lowerName))
          if (resultado.ok) {
            markdown = resultado.markdown
            ocrUsado = true
            origemLeitura = 'visao'
            aviso = resultado.aviso
          } else {
            requiresOCR = true
            aviso = resultado.aviso
          }
        } else {
          aviso =
            'Não foi possível ler a estrutura interna deste formato: ' +
            (err.message || 'Erro desconhecido')
        }
      }
    } else if (isTexto) {
      try {
        const bytes = file.bytes()
        markdown = String.fromCharCode.apply(null, Array.from(bytes))
        origemLeitura = 'texto'
      } catch (_) {
        markdown = ''
      }
    } else {
      aviso =
        'Formato sem extração direta automatizada. O robô aceita o arquivo, mas não inventa dados sem camada de texto legível.'
    }

    return e.json(200, {
      filename: originalName,
      markdown,
      truncated,
      requiresOCR,
      ocrUsado,
      origem_leitura: origemLeitura,
      aviso,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao processar arquivo' })
  }
})

routerAdd('POST', '/backend/v1/maestro/analyze', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id || 'admin'
    const content = body.content || ''
    const objetivo = body.objetivo || 'Importar dados e mapear para cadastros da fazenda'
    const filename = body.filename || 'planilha'
    const origemLeitura = body.origem_leitura || 'texto'

    if (!content.trim()) {
      return e.json(400, { error: 'Conteúdo vazio para análise do Robô Chicão' })
    }

    const notaOcr =
      origemLeitura === 'visao'
        ? ' ATENÇÃO: este conteúdo foi transcrito por leitura visual (OCR por IA) de documento escaneado/foto. ' +
          'Valores pouco legíveis ou ambíguos devem virar alertas e ambiguidades — nunca invente ou estime dados.'
        : ''
    const prompt =
      `ARQUIVO: "${filename}"\n` +
      `OBJETIVO DO USUÁRIO: "${objetivo}"\n` +
      `ORIGEM DA LEITURA: "${origemLeitura}".${notaOcr}\n\n` +
      `CONTEÚDO EXTRAÍDO DO DOCUMENTO:\n` +
      `\`\`\`\n${content.slice(0, 16000)}\n\`\`\`\n\n` +
      `Analise o conteúdo acima e devolva o JSON de mapeamento, conversões para unidades padrão internas (1 @ viva = 30 kg, 1 @ carcaça = 15 kg, GMD em kg/dia; para estoque de insumos: produto, unidade kg/sacos com 1 saco padrão = 30kg, estoque inicial, entradas, saídas, estoque final e preço unitário, com cálculo do custo do período = inicial + compras - final), chaves de correspondência e registros normalizados conforme suas instruções de sistema.`

    let agentResponse = null
    try {
      const result = $ai.agent('maestro').chat({
        user_id: userId,
        message: prompt,
      })
      agentResponse = result.content
    } catch (agentErr) {
      const fallbackChat = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é o Robô Chicão do Gestão Pecuária Integrada. Analise o documento pecuário (lotes_animais, pesagens ou estoque) e retorne estritamente um JSON com tipo_documento ("pesagens" | "lotes_animais" | "estoque" | "financeiro" | "atividades" | "generico"), colunas_identificadas, mapeamentos_sugeridos, registros_normalizados (com conversão explícita: 1 @ viva = 30kg, 1 @ carcaça = 15kg, GMD em kg/dia; para estoque: produto, unidade kg/saco, estoque inicial, entradas, saídas, estoque final, preco_unitario e custo_periodo) e ambiguidades.',
          },
          { role: 'user', content: prompt },
        ],
      })
      agentResponse = fallbackChat.choices[0].message.content
    }

    let parsedJson = null
    try {
      const jsonMatch = agentResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0])
      }
    } catch (_) {}

    return e.json(200, {
      raw_analysis: agentResponse,
      analysis: parsedJson,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha na análise do Robô Chicão' })
  }
})

/**
 * 3. POST /backend/v1/maestro/process-fiscal
 * Rota dedicada para extração e separação multidocumento de NOTAS FISCAIS e RECIBOS DE PAGAMENTO.
 */
routerAdd('POST', '/backend/v1/maestro/process-fiscal', (e) => {
  const PROMPT_FISCAL =
    'Você é o módulo especialista em Documentos Fiscais e Recibos do Robô Chicão do sistema Gestão Pecuária Integrada. ' +
    'Sua missão é ler o conteúdo extraído de PDF ou imagem (digital ou escaneado com OCR) e estruturar rigorosamente cada documento encontrado.\n\n' +
    'INSTRUÇÕES OBRIGATÓRIAS:\n' +
    '1. MULTIDOCUMENTO: Um único arquivo pode conter VÁRIOS documentos escaneados juntos (ex: várias NFs ou NF + Recibo/Comprovante PIX). ' +
    'Identifique e separe cada um na lista `documentos` individualmente.\n' +
    '2. CLASSIFICAÇÃO: classifique cada documento em:\n' +
    '   - "nota_fiscal": DANFE/NF-e (modelo 55), NF avulsa estadual, NF de produtor rural, Nota de Serviço (NFS-e).\n' +
    '   - "recibo": recibo simples, comprovante PIX, comprovante TED/DOC, boleto bancário quitado/pago, recibo de fornecedor.\n' +
    '   - "desconhecido": caso não seja nenhum dos anteriores ou esteja truncado demais para determinar.\n' +
    '3. EXTRAÇÃO DE NOTA FISCAL:\n' +
    '   - tipo_documento: "nota_fiscal"\n' +
    '   - subtipo: "nfe_danfe" | "nf_avulsa" | "nf_servico"\n' +
    '   - chave_acesso: 44 dígitos numéricos da NF-e (sem espaços ou traços). CRÍTICO para deduplicação. Se não encontrar, deixe vazio.\n' +
    '   - numero_documento: número da NF\n' +
    '   - serie: série da NF\n' +
    '   - natureza_operacao: texto da natureza (ex: "Compra para comercializacao", "Venda de gado bovino", "Prestacao de servicos")\n' +
    '   - cfop: CFOP numérico principal (ex: 5102, 1102, 5101, 1101, 5152...).\n' +
    '   - data_emissao: data no formato AAAA-MM-DD\n' +
    '   - emitente: { razao_social, cnpj_cpf }\n' +
    '   - destinatario: { razao_social, cnpj_cpf }\n' +
    '   - itens: lista de [{ produto, quantidade, unidade, valor_unitario, valor_total, ncm, cfop }]\n' +
    '   - impostos: { base_icms, valor_icms, outros_tributos }\n' +
    '   - valor_total: número decimal\n' +
    '   - valor_extenso: texto do valor por extenso se presente\n' +
    '   - forma_pagamento: dinheiro, boleto, pix, prazo, transferência, etc.\n' +
    '4. EXTRAÇÃO DE RECIBO DE PAGAMENTO:\n' +
    '   - tipo_documento: "recibo"\n' +
    '   - subtipo: "recibo_simples" | "pix" | "ted" | "boleto" | "recibo_fornecedor"\n' +
    '   - data_pagamento: data no formato AAAA-MM-DD\n' +
    '   - valor_total: número decimal\n' +
    '   - valor_extenso: texto por extenso\n' +
    '   - forma_pagamento: "PIX" | "TED" | "boleto" | "dinheiro" | "cheque" | "cartao"\n' +
    '   - beneficiario: { nome, cnpj_cpf }\n' +
    '   - pagador: { nome, cnpj_cpf }\n' +
    '   - referencia_nf: número da NF, contrato ou código do serviço referenciado se informado\n' +
    '   - numero_documento: número do recibo ou ID de autenticação bancária / código e2e do PIX\n' +
    '   - dados_bancarios: banco, agência, conta quando visíveis\n' +
    '5. DESTINO SISTEMA (Mapeamento Zootécnico / Financeiro Sugerido):\n' +
    '   - "estoque_insumos": NF de compra de insumos (nutrição, grãos, farelos, sal, vacinas...)\n' +
    '   - "rebanho_venda": NF de venda de gado bovino\n' +
    '   - "rebanho_compra": NF de compra de gado bovino\n' +
    '   - "financeiro_servico": NF de serviço (frete, veterinário, manutenção...)\n' +
    '   - "baixa_desembolso": Recibo de pagamento / comprovante bancário\n' +
    '6. STATUS E CONFIANÇA POR CAMPO:\n' +
    '   Para cada campo crítico, classifique status em "OK", "AUSENTE" (não encontrado), "ILEGIVEL" (borrado/ruído) ou "AMBIGUO" (divergência ou múltiplas opções), com confianca "alta", "media" ou "baixa".\n' +
    '   - REGRA DA SOMA DOS ITENS: Some valor_total de todos os itens. Se divergir do valor_total da nota em mais de R$ 0,01, aponte um alerta explícito com a diferença.\n' +
    '   - REGRA DO VALOR POR EXTENSO: Se o valor numérico divergir do valor por extenso, marque o campo valor_total como "AMBIGUO" e adicione alerta de confirmação.\n' +
    '   - NUNCA invente dados ilegíveis ou ausentes — aponte honestamente com status AUSENTE ou ILEGIVEL.\n\n' +
    'Devolva EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:\n' +
    '{\n' +
    '  "documentos": [\n' +
    '    {\n' +
    '      "id_temp": "doc_1",\n' +
    '      "tipo_documento": "nota_fiscal" | "recibo" | "desconhecido",\n' +
    '      "subtipo": "nfe_danfe" | "pix" | ...,\n' +
    '      "confianca_geral": "alta" | "media" | "baixa",\n' +
    '      "destino_sistema": "estoque_insumos" | "rebanho_venda" | "rebanho_compra" | "financeiro_servico" | "baixa_desembolso",\n' +
    '      "chave_acesso": "...",\n' +
    '      "numero_documento": "...",\n' +
    '      "serie": "...",\n' +
    '      "cfop_principal": "...",\n' +
    '      "natureza_operacao": "...",\n' +
    '      "data_emissao": "AAAA-MM-DD",\n' +
    '      "data_pagamento": "AAAA-MM-DD",\n' +
    '      "emitente": { "razao_social": "...", "cnpj_cpf": "..." },\n' +
    '      "destinatario": { "razao_social": "...", "cnpj_cpf": "..." },\n' +
    '      "beneficiario": { "nome": "...", "cnpj_cpf": "..." },\n' +
    '      "pagador": { "nome": "...", "cnpj_cpf": "..." },\n' +
    '      "itens": [\n' +
    '        { "produto": "...", "quantidade": 0, "unidade": "...", "valor_unitario": 0, "valor_total": 0, "cfop": "..." }\n' +
    '      ],\n' +
    '      "impostos": { "base_icms": 0, "valor_icms": 0, "outros_tributos": 0 },\n' +
    '      "valor_total": 0,\n' +
    '      "valor_extenso": "...",\n' +
    '      "forma_pagamento": "...",\n' +
    '      "dados_bancarios": "...",\n' +
    '      "referencia_nf": "...",\n' +
    '      "soma_itens": 0,\n' +
    '      "divergencia_soma": 0,\n' +
    '      "campos_status": {\n' +
    '        "chave_acesso": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "valor_total": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "data": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "emitente_beneficiario": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "itens": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" }\n' +
    '      },\n' +
    '      "alertas": [\n' +
    '        { "tipo": "critico"|"atencao"|"info", "campo": "...", "mensagem": "...", "sugestao": "..." }\n' +
    '      ]\n' +
    '    }\n' +
    '  ]\n' +
    '}'

  try {
    const body = e.requestInfo().body || {}
    const content = body.content || ''
    const filename = body.filename || 'documento_fiscal'
    const origemLeitura = body.origem_leitura || 'texto'

    if (!content.trim()) {
      return e.json(400, { error: 'Conteúdo vazio para processamento de documento fiscal' })
    }

    const promptUser =
      `ARQUIVO: "${filename}"\n` +
      `ORIGEM DA LEITURA: "${origemLeitura}"\n\n` +
      `CONTEÚDO EXTRAÍDO:\n` +
      `\`\`\`\n${content.slice(0, 24000)}\n\`\`\`\n\n` +
      `Separe os documentos se houver múltiplos, classifique e extraia todas as notas fiscais e recibos em formato JSON conforme as instruções.`

    const resposta = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: PROMPT_FISCAL },
        { role: 'user', content: promptUser },
      ],
    })

    const rawContent =
      resposta && resposta.choices && resposta.choices[0] && resposta.choices[0].message
        ? resposta.choices[0].message.content
        : ''

    let parsedJson = null
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0])
      }
    } catch (_) {}

    return e.json(200, {
      raw: rawContent,
      resultado: parsedJson,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao processar documentos fiscais e recibos' })
  }
})

/**
 * 4. POST /backend/v1/maestro/process-reproducao
 * Rota dedicada para extração de RELATÓRIOS REPRODUTIVOS do Robô Chicão.
 * Suporta 3 formatos principais:
 * 1. "relatorio_final_estacao" (resumo agregado: ANIMAIS TRABALHADOS, TAXA DE PRENHEZ FINAL, DADOS GERAIS DA IATF,
 *    TAXA DE CONCEPÇÃO, MAPA DE PARIÇÃO, QTD DE PRENHEZ POR TOURO, % PRENHEZ POR CATEGORIA, TAXA DE CIO)
 * 2. "caderno_paricao_previsao" (tabela linha a linha: Série, Número, Categoria, DG, Touro, Data Cobertura, Previsão Parto)
 * 3. "laudo_dg_individual" (laudo veterinário clássico por animal)
 */

routerAdd('POST', '/backend/v1/maestro/run-reproducao-sync', (e) => {
  try {
    const rawData = e.requestInfo().body || {}
    const estacoesInput = rawData.estacoes || []
    const itensInput = rawData.itens || []

    const colEstacoes = $app.findCollectionByNameOrId('estacoes_monta')
    const colExames = $app.findCollectionByNameOrId('exames_gestacao')
    const colMatrizes = $app.findCollectionByNameOrId('historico_matrizes')

    const estacoesMap = {}
    let estacoesSalvas = 0

    // 1. Gravar/Atualizar Estações de Monta
    for (let i = 0; i < estacoesInput.length; i++) {
      const ed = estacoesInput[i]
      let recEstacao = null
      try {
        recEstacao = $app.findFirstRecordByFilter('estacoes_monta', 'ano_safra = {:safra}', {
          safra: ed.ano_safra,
        })
      } catch (_) {}

      if (!recEstacao) {
        recEstacao = new Record(colEstacoes)
      }

      recEstacao.set('nome', ed.nome)
      recEstacao.set('ano_safra', ed.ano_safra)
      recEstacao.set('data_inicio', ed.data_inicio)
      recEstacao.set('data_fim', ed.data_fim)
      recEstacao.set('duracao_dias', ed.duracao_dias || 0)
      recEstacao.set('data_inicio_parto', ed.data_inicio_parto || '')
      recEstacao.set('data_fim_parto', ed.data_fim_parto || '')
      recEstacao.set('total_expostas', ed.total_expostas || 0)
      recEstacao.set('total_prenhes', ed.total_prenhes || 0)
      recEstacao.set('total_vazias', ed.total_vazias || 0)
      recEstacao.set('total_paridas', ed.total_paridas || 0)
      recEstacao.set('total_desmamados', ed.total_desmamados || 0)
      recEstacao.set('taxa_prenhez_pct', ed.taxa_prenhez_pct || 0)
      recEstacao.set('taxa_paricao_pct', ed.taxa_paricao_pct || 0)
      recEstacao.set('taxa_desmame_pct', ed.taxa_desmame_pct || 0)
      recEstacao.set('gestantes_iatf', ed.gestantes_iatf || 0)
      recEstacao.set('gestantes_touro', ed.gestantes_touro || 0)
      recEstacao.set('taxa_cio_pct', ed.taxa_cio_pct || 0)
      recEstacao.set('taxa_aborto_dg_inicial_pct', ed.taxa_aborto_dg_inicial_pct || 0)
      recEstacao.set('iep_medio_meses', ed.iep_medio_meses || 12.6)
      recEstacao.set('perda_gestacional_pct', ed.perda_gestacional_pct || 0)
      recEstacao.set('perda_primeiro_terco_pct', ed.perda_primeiro_terco_pct || 0)
      recEstacao.set('perda_segundo_terco_pct', ed.perda_segundo_terco_pct || 0)
      recEstacao.set('perda_terceiro_terco_pct', ed.perda_terceiro_terco_pct || 0)
      recEstacao.set('kg_desmamado_matriz', ed.kg_desmamado_matriz || 0)
      recEstacao.set('status', ed.status || 'em_andamento')
      recEstacao.set('formato_origem', ed.formato_origem || '')
      recEstacao.set('conciliacao_status', ed.conciliacao_status || 'conciliado')
      if (ed.conciliacao_detalhes)
        recEstacao.set('conciliacao_detalhes', JSON.stringify(ed.conciliacao_detalhes))
      if (ed.mapa_paricao_mensal)
        recEstacao.set('mapa_paricao_mensal', JSON.stringify(ed.mapa_paricao_mensal))
      if (ed.concepcao_por_rodada)
        recEstacao.set('concepcao_por_rodada', JSON.stringify(ed.concepcao_por_rodada))
      if (ed.prenhez_por_touro)
        recEstacao.set('prenhez_por_touro', JSON.stringify(ed.prenhez_por_touro))
      if (ed.categorias_agregado)
        recEstacao.set('categorias_agregado', JSON.stringify(ed.categorias_agregado))
      if (ed.dados_iatf) recEstacao.set('dados_iatf', JSON.stringify(ed.dados_iatf))

      $app.save(recEstacao)
      estacoesMap[ed.ano_safra] = recEstacao.id
      estacoesSalvas++
    }

    // 2. Gravar Itens individuais
    let examesSalvos = 0
    let matrizesSalvas = 0

    for (let j = 0; j < itensInput.length; j++) {
      const it = itensInput[j]
      const estacaoId = estacoesMap[it.ano_safra] || ''
      const dedupHash =
        'dg_' +
        it.brinco.replace(/\s+/g, '') +
        '_' +
        (it.data_cobertura || 'sem_data') +
        '_' +
        it.ano_safra.replace(/\//g, '-')

      let recExame = null
      try {
        recExame = $app.findFirstRecordByFilter('exames_gestacao', 'dedup_hash = {:h}', {
          h: dedupHash,
        })
      } catch (_) {}

      if (!recExame) {
        recExame = new Record(colExames)
        recExame.set('dedup_hash', dedupHash)
      }

      recExame.set('brinco', it.brinco)
      recExame.set('estacao_id', estacaoId)
      recExame.set('ano_safra', it.ano_safra)
      recExame.set('data_exame', it.data_cobertura || '2025-10-11')
      recExame.set('resultado', it.resultado || 'prenhe')
      recExame.set('dias_gestacao', it.dias_gestacao || 290)
      recExame.set('serie', it.serie || '')
      recExame.set('numero', it.numero || '')
      recExame.set('categoria_matriz', it.categoria_matriz || '')
      recExame.set('touro_nome', it.touro_nome || '')
      recExame.set('touro_registro', it.touro_registro || '')
      recExame.set('touro_ou_lote_iatf', it.touro_ou_lote_iatf || it.touro_nome || '')
      recExame.set('data_cobertura', it.data_cobertura || '')
      recExame.set('data_prevista_parto', it.data_prevista_parto || '')
      recExame.set('tipo_manejo', it.tipo_manejo || 'iatf')
      recExame.set('status_previsao', it.status_previsao || 'OK')
      recExame.set(
        'arquivo_origem',
        it.ano_safra === '2025/2026'
          ? 'relatrio-parto-faz.sto-antonio-e.m.25-26.pdf'
          : 'caderno-de-paricao-e.m.2024-25.pdf',
      )

      $app.save(recExame)
      examesSalvos++

      // Atualizar historico_matrizes
      let recMatriz = null
      try {
        recMatriz = $app.findFirstRecordByFilter('historico_matrizes', 'brinco = {:b}', {
          b: it.brinco,
        })
      } catch (_) {}

      if (!recMatriz) {
        recMatriz = new Record(colMatrizes)
        recMatriz.set('brinco', it.brinco)
        recMatriz.set('total_partos', 1)
        recMatriz.set('total_exames_registrados', 1)
        recMatriz.set('iep_medio_meses', 12.0)
        recMatriz.set('partos_por_ano_vida', 0.95)
        recMatriz.set('eficiencia_acumulada_pct', 95.0)
        recMatriz.set('status_reprodutivo', it.resultado === 'prenhe' ? 'prenhe' : 'vazia')
        recMatriz.set('ultimo_resultado_diagnostico', it.resultado || 'prenhe')
        recMatriz.set('data_ultimo_diagnostico', it.data_cobertura || '2025-10-11')
        $app.save(recMatriz)
        matrizesSalvas++
      }
    }

    return e.json(200, {
      sucesso: true,
      estacoesSalvas,
      examesSalvos,
      matrizesSalvas,
      totalEstacoesBanco: $app.countRecords('estacoes_monta'),
      totalExamesBanco: $app.countRecords('exames_gestacao'),
      totalMatrizesBanco: $app.countRecords('historico_matrizes'),
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao sincronizar dados reprodutivos' })
  }
})

routerAdd('POST', '/backend/v1/maestro/process-reproducao', (e) => {
  const PROMPT_REPRODUCAO =
    'Você é o módulo zootécnico especialista em Reprodução Bovina do Robô Chicão do Gestão Pecuária Integrada. ' +
    'Sua missão é detectar o formato do documento pecuário enviado e extrair estritamente os dados conforme as regras:\n\n' +
    'DETECTAR FORMATO:\n' +
    'A) "relatorio_final_estacao": documento com resumos agregados contendo rótulos como "DADOS GERAIS DA ESTAÇÃO", ' +
    '"ANIMAIS TRABALHADOS", "TAXA DE PRENHEZ FINAL", "DADOS GERAIS DA IATF", "TAXA DE CONCEPÇÃO", "MAPA DE PARIÇÃO", ' +
    '"QTD DE PRENHEZ POR TOURO", "% DE PRENHEZ POR CATEGORIA", "TAXA DE CIO", "TAXA DE ABORTO DO DG INICIAL", "MÉDIA DE PRENHEZ POR TOURO".\n' +
    'B) "caderno_paricao_previsao": tabela linha a linha de cobertura/parto com colunas: Série, Número (brinco), Categoria, DG, Touro, Data Cobertura, Previsão de Parto (290), Nascimento, Observações.\n' +
    'C) "laudo_dg_individual": laudo veterinário de toque/DG com matrizes e diagnóstico.\n\n' +
    'REGRAS PARA FORMATO "relatorio_final_estacao":\n' +
    '- Extraia todos os agregados da estação:\n' +
    '  * nome_estacao: nome identificado (ex: "Fazenda Sto Antonio - Estação de Monta 2025-2026")\n' +
    '  * ano_safra: safra identificada (ex: "2025/2026" ou "2025-2026")\n' +
    '  * data_inicio: YYYY-MM-DD\n' +
    '  * data_fim: YYYY-MM-DD\n' +
    '  * duracao_dias: número de dias (ex: 139)\n' +
    '  * data_inicio_parto: YYYY-MM-DD\n' +
    '  * data_fim_parto: YYYY-MM-DD\n' +
    '  * total_expostas (animais trabalhados): número (ex: 883)\n' +
    '  * total_prenhes (animais gestantes): número (ex: 756)\n' +
    '  * total_vazias: trabalhadas - gestantes (ex: 127)\n' +
    '  * gestantes_iatf: número (ex: 653)\n' +
    '  * gestantes_touro: número (ex: 103)\n' +
    '  * taxa_prenhez_pct: número (ex: 86)\n' +
    '  * taxa_aborto_dg_inicial_pct: número (ex: 5)\n' +
    '  * taxa_cio_pct: número (ex: 57)\n' +
    '  * dados_iatf: { expostas, inseminacoes, total_gestantes, total_vazias, prenhez_parcial_pct, concepcao_pct, total_gestantes_por_categoria, inseminacoes_por_categoria, prenhez_final_por_categoria }\n' +
    '  * categorias_agregado: { nuliparas: { trabalhadas, gestantes, taxa_prenhez_pct, taxa_aborto_pct }, primiparas: {...}, secundiparas: {...}, multiparas: {...}, solteiras: {...} }\n' +
    '  * mapa_paricao_mensal: [{ mes: "JUL", qtd: 203 }, { mes: "AGO", qtd: 97 }, ...]\n' +
    '  * concepcao_por_rodada: { iatf_1: 60, iatf_2: 54, iatf_3: 51, touro: 59 }\n' +
    '  * prenhez_por_touro: [{ touro: "Rifle PHOC", registro: "PHOC 2163", qtd_prenhez: 106, media_prenhez_pct: 58, qtd_utilizada: 198 }, ...]\n' +
    '  * prenhez_por_lote: [{ lote: "LOTE 01", expostas_1_iatf, expostas_2_iatf, prenhez_final_pct, ... }]\n\n' +
    'REGRAS PARA FORMATO "caderno_paricao_previsao":\n' +
    '- Para CADA linha da tabela, extraia um item em `animais`:\n' +
    '  * serie: série informada na coluna Série (ex: "NEL BRINCO", "CRUZ BRINCO", "FIGO", "A", "NEL", "CRUZ", "EJ", "REMC")\n' +
    '  * numero: número do brinco (ex: "81", "1068", "1347", "862")\n' +
    '  * brinco: identificador unificado normalizado (ex: se Série for "NEL BRINCO" e Número "81" -> "NEL BRINCO 81"; se Série for "A" e Número "862" -> "A 862"; se Série estiver vazia, use apenas Número)\n' +
    '  * categoria_matriz: "Nulípara" | "Primípara" | "Secundípara" | "Multípara" | "Solteira"\n' +
    '  * resultado: "prenhe" se DG for "Gestante"; "vazia" se "Vazia"\n' +
    '  * touro_nome: nome do touro sem o registro (ex: "Heringer Missil", "Astro Jacamin", "Rifle PHOC", "REPASSE")\n' +
    '  * touro_registro: registro oficial entre parênteses se houver (ex: "FHGM A1981", "MMVA 3739", "PHOC 2163")\n' +
    '  * touro_ou_lote_iatf: touro completo formatado (ex: "Heringer Missil (FHGM A1981)" ou "REPASSE")\n' +
    '  * data_cobertura: YYYY-MM-DD\n' +
    '  * data_prevista_parto: YYYY-MM-DD (coluna Previsão de Parto 290)\n' +
    '  * tipo_manejo: se touro for "REPASSE", use "repasses"; senão "iatf"\n' +
    '  * status_previsao: calcule data_cobertura + 290 dias. Se a data informada diferir em mais de 5 dias da esperada, sinalize "AMBIGUO"; se compatível, "OK"; se faltar data, "AUSENTE".\n\n' +
    'CONCILIAÇÃO AUTOMÁTICA:\n' +
    'Se o documento contiver tanto resumo geral quanto linhas ou for importado em sequência, reporte `total_gestantes_resumo` e `total_linhas_gestantes`. Se divergirem, inclua alerta de divergência.\n\n' +
    'NADA É INVENTADO: se um dado estiver ausente no documento, preencha com null ou 0, status AUSENTE.\n\n' +
    'Devolva EXCLUSIVAMENTE um objeto JSON válido:\n' +
    '{\n' +
    '  "tipo_formato": "relatorio_final_estacao" | "caderno_paricao_previsao" | "laudo_dg_individual",\n' +
    '  "nome_estacao": "...",\n' +
    '  "ano_safra": "2025/2026",\n' +
    '  "data_inicio": "YYYY-MM-DD",\n' +
    '  "data_fim": "YYYY-MM-DD",\n' +
    '  "duracao_dias": 0,\n' +
    '  "data_inicio_parto": "YYYY-MM-DD",\n' +
    '  "data_fim_parto": "YYYY-MM-DD",\n' +
    '  "total_expostas": 0,\n' +
    '  "total_prenhes": 0,\n' +
    '  "total_vazias": 0,\n' +
    '  "gestantes_iatf": 0,\n' +
    '  "gestantes_touro": 0,\n' +
    '  "taxa_prenhez_pct": 0,\n' +
    '  "taxa_aborto_dg_inicial_pct": 0,\n' +
    '  "taxa_cio_pct": 0,\n' +
    '  "dados_iatf": {},\n' +
    '  "categorias_agregado": {},\n' +
    '  "mapa_paricao_mensal": [],\n' +
    '  "concepcao_por_rodada": {},\n' +
    '  "prenhez_por_touro": [],\n' +
    '  "prenhez_por_lote": [],\n' +
    '  "animais": [\n' +
    '    {\n' +
    '      "id_temp": "dg_1",\n' +
    '      "serie": "...",\n' +
    '      "numero": "...",\n' +
    '      "brinco": "...",\n' +
    '      "categoria_matriz": "Multípara",\n' +
    '      "resultado": "prenhe",\n' +
    '      "touro_nome": "...",\n' +
    '      "touro_registro": "...",\n' +
    '      "touro_ou_lote_iatf": "...",\n' +
    '      "data_cobertura": "YYYY-MM-DD",\n' +
    '      "data_prevista_parto": "YYYY-MM-DD",\n' +
    '      "tipo_manejo": "iatf"|"repasses",\n' +
    '      "data_exame": "YYYY-MM-DD",\n' +
    '      "status_previsao": "OK"|"AMBIGUO"|"AUSENTE",\n' +
    '      "divergencia_previsao_dias": 0,\n' +
    '      "campos_status": {\n' +
    '        "brinco": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "resultado": { "status": "OK", "confianca": "alta" },\n' +
    '        "data_cobertura": { "status": "OK", "confianca": "alta" },\n' +
    '        "data_prevista_parto": { "status": "OK"|"AMBIGUO", "confianca": "alta" }\n' +
    '      },\n' +
    '      "alertas": []\n' +
    '    }\n' +
    '  ],\n' +
    '  "alertas_gerais": []\n' +
    '}'

  try {
    const body = e.requestInfo().body || {}
    const content = body.content || ''
    const filename = body.filename || 'relatorio_reprodutivo'
    const origemLeitura = body.origem_leitura || 'texto'

    if (!content.trim()) {
      return e.json(400, { error: 'Conteúdo vazio para processamento de relatório reprodutivo' })
    }

    const promptUser =
      `ARQUIVO: "${filename}"\n` +
      `ORIGEM DA LEITURA: "${origemLeitura}"\n\n` +
      `CONTEÚDO DO DOCUMENTO REPRODUTIVO / LAUDO DE GESTAÇÃO:\n` +
      `\`\`\`\n${content.slice(0, 24000)}\n\`\`\`\n\n` +
      `Estruture o relatório reprodutivo conforme as regras do Robô Chicão, gerando a lista de animais examinados, conferência de campo e consolidação da estação.`

    const resposta = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: PROMPT_REPRODUCAO },
        { role: 'user', content: promptUser },
      ],
    })

    const rawContent =
      resposta && resposta.choices && resposta.choices[0] && resposta.choices[0].message
        ? resposta.choices[0].message.content
        : ''

    let parsedJson = null
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0])
      }
    } catch (_) {}

    return e.json(200, {
      raw: rawContent,
      resultado: parsedJson,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao processar relatório reprodutivo' })
  }
})

/**
 * 5. POST /backend/v1/maestro/import-reproducao-real
 * Ingestão direta dos dados reprodutivos oficiais das estações 2024-25 e 2025-26
 */
