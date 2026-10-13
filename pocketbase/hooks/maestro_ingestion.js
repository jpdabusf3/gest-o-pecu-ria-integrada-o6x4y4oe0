/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Ingestão do Robô Maestro
 * 1. POST /backend/v1/maestro/extract: extrai markdown estruturado de arquivos enviados (PDF, DOCX, XLSX, PPTX, TXT, CSV) via $documents.toMarkdown
 * 2. POST /backend/v1/maestro/analyze: aciona o agente Maestro ($ai.agent('maestro').chat) para mapear colunas, interpretar unidades e normalizar dados
 */

routerAdd('POST', '/backend/v1/maestro/extract', (e) => {
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
    let aviso = ''

    // Documentos suportados nativamente pelo $documents.toMarkdown: PDF, DOCX, XLSX, PPTX
    if (
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.pptx') ||
      lowerName.endsWith('.ppt')
    ) {
      try {
        const docResult = $documents.toMarkdown({ file: file })
        markdown = docResult.markdown || ''
        truncated = Boolean(docResult.truncated)
      } catch (err) {
        if (err && err.status === 422) {
          // Documento digitalizado sem camada de texto (requer OCR)
          requiresOCR = true
          aviso =
            'O documento enviado é digitalizado/imagem e necessita de OCR (camada de texto selecionável). Extração limitada.'
        } else {
          aviso =
            'Não foi possível ler a estrutura interna deste formato: ' +
            (err.message || 'Erro desconhecido')
        }
      }
    } else if (
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.tsv')
    ) {
      // Arquivos de texto ou CSV simples podem ser lidos diretamente
      try {
        const bytes = file.bytes()
        markdown = String.fromCharCode.apply(null, Array.from(bytes))
      } catch (_) {
        // Fallback simples
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

    if (!content.trim()) {
      return e.json(400, { error: 'Conteúdo vazio para análise do Maestro' })
    }

    // Prompt enriquecido para o agente Maestro
    const prompt =
      `ARQUIVO: "${filename}"\n` +
      `OBJETIVO DO USUÁRIO: "${objetivo}"\n\n` +
      `CONTEÚDO EXTRAÍDO DO DOCUMENTO:\n` +
      `\`\`\`\n${content.slice(0, 16000)}\n\`\`\`\n\n` +
      `Analise o conteúdo acima e devolva o JSON de mapeamento, conversões para unidades padrão internas (1 @ viva = 30 kg, 1 @ carcaça = 15 kg, GMD em kg/dia), chaves de correspondência e registros normalizados conforme suas instruções de sistema.`

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
              'Você é o Robô Maestro. Analise o documento pecuário e retorne estritamente um JSON com tipo_documento, colunas_identificadas, mapeamentos_sugeridos, registros_normalizados (com conversão explícita: 1 @ viva = 30kg, 1 @ carcaça = 15kg, GMD em kg/dia) e ambiguidades.',
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
