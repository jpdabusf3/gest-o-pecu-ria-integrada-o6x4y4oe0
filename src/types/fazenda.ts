export interface Fazenda {
  id: string
  nome: string
  proprietario: string
  localizacao: string
  area: number
  rebanho: number
  sistemas: string[]
  arrendamento: boolean
  atividades: string[]
}
