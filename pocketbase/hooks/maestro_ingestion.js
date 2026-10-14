/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Ingestão do Robô Maestro
 * 1. POST /backend/v1/maestro/extract: extrai markdown estruturado de arquivos enviados
 *    (PDF, DOCX, XLSX, XLS, PPTX, TXT, CSV) via $documents.toMarkdown.
 *    - PDFs digitalizados (422) e FOTOS de tabelas (JPG/PNG/WEBP/HEIC) tentam leitura
 *      visual por IA ($ai.chat multimodal). Sem transcrição confiável, devolve aviso
 *      honesto — o Maestro NUNCA inventa dados.
 * 2. POST /backend/v1/maestro/analyze: aciona o agente Maestro ($ai.agent('maestro').chat)
 *    para mapear colunas, interpretar unidades e normalizar dados.
 *
 * REGRA DO POCKETBASE JSVM: nenhuma função ou constante auxiliar no top-level pode ser
 * referenciada dentro de callbacks, pois o pool de VMs executa isolado. Todo helper
 * deve ser declarado no escopo interno do handler correspondente.
 */

routerAdd('POST', '/backend/v1/maestro/extract', (e) => {
  const VISION_SYSTEM_PROMPT =
    'Você é o módulo de leitura visual (OCR) do Robô Maestro do sistema Gestão Pecuária Integrada. ' +
    'Sua única função é TRANSCREVER fielmente o que está visível na imagem/documento enviado: ' +
    'tabelas em Markdown GFM (| coluna | coluna |), títulos e rótulos, exatamente como aparecem. ' +
    'Regras absolutas: (1) NUNCA invente, estime, complete ou corrija valores; transcreva o que lê, mesmo com ruído; ' +
    '(2) se um valor/célula estiver ilegível, escreva "?" na célula correspondente; ' +
    '(3) se a imagem estiver ilegível, cortada, girada, desfocada ou você NÃO conseguir enxergar um documento/tabela, ' +
    'responda EXATAMENTE {"erro":"sem_visao"} e nada mais; ' +
    '(4) não comente, não resuma, não explique: devolva apenas a transcrição em Markdown.'

  const AVISO_SEM_LEITURA =
    'Arquivo digitalizado/foto sem camada de texto selecionável. O Maestro tentou a leitura visual por IA e não obteve ' +
    'uma transcrição confiável — nenhum dado foi inventado. Sugestões: 1) envie o PDF original com texto selecionável ou a ' +
    'planilha (XLSX/CSV); 2) se for foto de tabela, fotografe novamente com boa luz, página inteira no quadro e foco nítido ' +
    '(JPG/PNG); 3) baixe um dos modelos oficiais de planilha na própria página do Maestro e preencha em campo. Em qualquer ' +
    'caminho, a conferência obrigatória antes de aplicar continua valendo.'

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
      if (bytes.length > 8 * 1024 * 1024) return { ok: false, motivo: 'arquivo maior que 8 MB' }

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
                  'Transcreva fielmente o documento/tabela visível (títulos, cabeçalhos de coluna e todas as linhas). ' +
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
      console.log('maestro: leitura visual indisponível:', (err && err.message) || err)
      return { ok: false, motivo: (err && err.message) || 'erro na leitura visual' }
    }
  }

  function aplicarLeituraVisual(resultado) {
    if (resultado && resultado.ok) {
      return {
        ok: true,
        markdown: resultado.markdown,
        aviso:
          'Documento sem camada de texto: tabela lida por leitura visual (IA). Os valores transcritos passam ' +
          'obrigatoriamente pela conferência antes de qualquer aplicação — confira valor a valor.',
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
      // Foto de tabela tirada no celular: entra pelo mesmo fluxo, via leitura visual
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
          // Documento digitalizado sem camada de texto — tenta leitura visual por IA
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
      // Arquivos de texto ou CSV simples podem ser lidos diretamente
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
      return e.json(400, { error: 'Conteúdo vazio para análise do Maestro' })
    }

    // Prompt enriquecido para o agente Maestro
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
      // Fallback gracioso com $ai.chat se o agente encontrar erro de contexto de usuário
      const fallbackChat = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é o Robô Maestro do Gestão Pecuária Integrada. Analise o documento pecuário (lotes_animais, pesagens ou estoque) e retorne estritamente um JSON com tipo_documento ("pesagens" | "lotes_animais" | "estoque" | "financeiro" | "atividades" | "generico"), colunas_identificadas, mapeamentos_sugeridos, registros_normalizados (com conversão explícita: 1 @ viva = 30kg, 1 @ carcaça = 15kg, GMD em kg/dia; para estoque: produto, unidade kg/saco, estoque inicial, entradas, saídas, estoque final, preco_unitario e custo_periodo) e ambiguidades.',
          },
          { role: 'user', content: prompt },
        ],
      })
      agentResponse = fallbackChat.choices[0].message.content
    }

    // Tentar extrair bloco JSON da resposta
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
    return e.json(500, { error: err.message || 'Falha na análise do Maestro' })
  }
})
