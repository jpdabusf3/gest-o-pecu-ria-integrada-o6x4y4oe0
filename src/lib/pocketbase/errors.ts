import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) {
    if (error && typeof error === 'object' && 'response' in error) {
      const resp = (error as { response?: { data?: Record<string, unknown> } }).response
      const data = resp?.data
      if (data && typeof data === 'object') {
        const errors: FieldErrors = {}
        for (const [field, detail] of Object.entries(data)) {
          if (
            detail &&
            typeof detail === 'object' &&
            'message' in detail &&
            typeof (detail as { message: unknown }).message === 'string'
          ) {
            errors[field] = (detail as { message: string }).message
          }
        }
        return errors
      }
    }
    return {}
  }
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!(error instanceof ClientResponseError)) {
    if (error && typeof error === 'object' && 'response' in error) {
      const fieldErrors = extractFieldErrors(error)
      const msgs = Object.values(fieldErrors)
      if (msgs.length > 0) return msgs.join(' ')
      const respMsg = (error as { response?: { message?: string } }).response?.message
      if (respMsg) return respMsg
    }
    return error instanceof Error ? error.message : fallback
  }
  const fieldErrors = extractFieldErrors(error)
  const entries = Object.entries(fieldErrors)
  if (entries.length > 0) {
    // Retorna mensagem formatada amigável
    return entries.map(([field, msg]) => `${field}: ${msg}`).join(' | ')
  }
  return error.message || fallback
}
