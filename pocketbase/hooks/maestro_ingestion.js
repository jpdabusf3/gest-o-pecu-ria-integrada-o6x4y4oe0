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
 * Rota dedicada para extração de RELATÓRIOS REPRODUTIVOS (Diagnósticos de Gestação, IATF, Parição e Desmame em PDF/DOCX/imagens).
 */
routerAdd('POST', '/backend/v1/maestro/process-reproducao', (e) => {
  const PROMPT_REPRODUCAO =
    'Você é o módulo zootécnico especialista em Reprodução Bovina e Diagnóstico de Gestação do Robô Chicão do Gestão Pecuária Integrada. ' +
    'Sua missão é analisar laudos veterinários em PDF, relatórios de IATF, fichas de toque/ultrassonografia e planilhas de parição/desmama.\n\n' +
    'INSTRUÇÕES OBRIGATÓRIAS:\n' +
    '1. DADOS DA ESTAÇÃO/SAFRA:\n' +
    '   - Identifique ou sugira o nome da estação/safra (ex: "Estação 2024/2025", "IATF 1º Giro 2024").\n' +
    '   - ano_safra no formato "AAAA/AAAA" (ex: "2024/2025") ou ano base.\n' +
    '   - veterinario_responsavel e lote_ou_pasto se identificados no cabeçalho.\n' +
    '2. EXTRAÇÃO POR ANIMAL (lista `animais`):\n' +
    '   - brinco: identificador único da matriz (string limpa, ex: "BR-1020", "0452", "VACA-12"). OBRIGATÓRIO.\n' +
    '   - resultado: "prenhe" | "vazia" | "perda_embrionaria" | "perda_fetal" | "duvidoso". OBRIGATÓRIO.\n' +
    '   - dias_gestacao: número estimado de dias de gestação informado no laudo (se ausente, 0 ou null).\n' +
    '   - terco_gestacao: "primeiro" (até 90d), "segundo" (91-180d), "terceiro" (>180d) ou deduzido dos dias.\n' +
    '   - touro_ou_lote_iatf: touro utilizado, protocolo IATF ou lote de monta (se houver).\n' +
    '   - tipo_manejo: "iatf" | "monta_natural" | "repasses" | "revisite".\n' +
    '   - data_exame: data do toque/DG no formato AAAA-MM-DD. Se ausente no animal, herda a data geral do documento.\n' +
    '   - data_parto: data de parição quando o documento for histórico de parição/desmama (AAAA-MM-DD).\n' +
    '   - peso_bezerro_nascimento_kg: peso ao nascer em kg (se houver, padrão ~32-35kg).\n' +
    '   - peso_bezerro_desmama_kg: peso do bezerro na desmama em kg (se houver).\n' +
    '   - dias_ate_desmama: idade em dias do bezerro na desmama (padrão ~205 dias).\n' +
    '   - lote_origem: lote da matriz no documento.\n' +
    '3. CONFERÊNCIA DE STATUS POR CAMPO & CONFIANÇA:\n' +
    '   - Para cada campo ("brinco", "resultado", "data_exame", "dias_gestacao"), defina status ("OK", "AUSENTE", "ILEGIVEL", "AMBIGUO") e confianca ("alta", "media", "baixa").\n' +
    '   - Se o brinco estiver manchado ou ambíguo, aponte status "AMBIGUO" ou "ILEGIVEL".\n' +
    '   - NUNCA invente brinco ou resultado de diagnóstico: aponte ausência com clareza.\n' +
    '4. CONSOLIDAÇÃO PRELIMINAR:\n' +
    '   - total_expostas: contagem total de matrizes avaliadas no laudo.\n' +
    '   - total_prenhes: quantidade diagnosticadas prenhes.\n' +
    '   - total_vazias: quantidade diagnosticadas vazias.\n' +
    '   - taxa_prenhez_pct: (total_prenhes / total_expostas) * 100.\n' +
    '   - alertas: lista de inconsistências encontradas (ex: mesmo brinco duplicado no laudo, dias de gestação incompatíveis, etc).\n\n' +
    'Devolva EXCLUSIVAMENTE um objeto JSON válido no formato:\n' +
    '{\n' +
    '  "nome_estacao": "...",\n' +
    '  "ano_safra": "2024/2025",\n' +
    '  "data_padrao_exame": "AAAA-MM-DD",\n' +
    '  "veterinario_responsavel": "...",\n' +
    '  "lote_ou_pasto": "...",\n' +
    '  "total_expostas": 0,\n' +
    '  "total_prenhes": 0,\n' +
    '  "total_vazias": 0,\n' +
    '  "taxa_prenhez_pct": 0,\n' +
    '  "animais": [\n' +
    '    {\n' +
    '      "id_temp": "dg_1",\n' +
    '      "brinco": "...",\n' +
    '      "resultado": "prenhe"|"vazia"|"perda_embrionaria"|"perda_fetal"|"duvidoso",\n' +
    '      "dias_gestacao": 0,\n' +
    '      "terco_gestacao": "primeiro"|"segundo"|"terceiro",\n' +
    '      "touro_ou_lote_iatf": "...",\n' +
    '      "tipo_manejo": "iatf"|"monta_natural"|"repasses",\n' +
    '      "data_exame": "AAAA-MM-DD",\n' +
    '      "data_parto": "AAAA-MM-DD",\n' +
    '      "peso_bezerro_nascimento_kg": 0,\n' +
    '      "peso_bezerro_desmama_kg": 0,\n' +
    '      "dias_ate_desmama": 0,\n' +
    '      "lote_origem": "...",\n' +
    '      "campos_status": {\n' +
    '        "brinco": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "resultado": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" },\n' +
    '        "data_exame": { "status": "OK"|"AUSENTE"|"ILEGIVEL"|"AMBIGUO", "confianca": "alta"|"media"|"baixa" }\n' +
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
