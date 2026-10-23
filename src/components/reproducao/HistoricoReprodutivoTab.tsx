import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Baby,
  Layers,
  Sparkles,
  Stethoscope,
  ExternalLink,
  Info,
} from 'lucide-react'
import {
  HistoricoMatrizRecord,
  ExameGestacaoRecord,
  EstacaoMontaRecord,
} from '@/services/reproducao'
import { ModalFichaAnimal } from './ModalFichaAnimal'

interface HistoricoReprodutivoTabProps {
  matrizes: HistoricoMatrizRecord[]
  exames: ExameGestacaoRecord[]
  estacoes: EstacaoMontaRecord[]
  onAbrirCadastroDg?: () => void
  onAbrirCadastroIatf?: () => void
}

interface GrupoLote {
  nomeLote: string
  safra: string
  totalMatrizes: number
  totalPrenhes: number
  totalVazias: number
  taxaPrenhezPct: number
  iepMedio: number
  matrizes: HistoricoMatrizRecord[]
}

/**
 * Normaliza busca tolerante a acentos, maiúsculas/minúsculas e pontuação
 */
function normalizarTexto(txt: string): string {
  return (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function HistoricoReprodutivoTab({
  matrizes,
  exames,
  estacoes,
  onAbrirCadastroDg,
  onAbrirCadastroIatf,
}: HistoricoReprodutivoTabProps) {
  const [buscaBrinco, setBuscaBrinco] = useState('')
  const [lotesExpandidos, setLotesExpandidos] = useState<Record<string, boolean>>({})
  const [animalModal, setAnimalModal] = useState<HistoricoMatrizRecord | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  // Alterna expansão de um lote
  const toggleLote = (nomeLote: string) => {
    setLotesExpandidos((prev) => ({
      ...prev,
      [nomeLote]: !prev[nomeLote],
    }))
  }

  // Agrupamento por lote com indicadores resumidos
  const gruposLote = useMemo<GrupoLote[]>(() => {
    // Se a coleção de matrizes individuais estiver vazia, tentar montar grupos com os exames ou estações
    const mapa = new Map<string, HistoricoMatrizRecord[]>()

    matrizes.forEach((m) => {
      const lote = m.lote_atual || 'Lote Geral de Matrizes'
      if (!mapa.has(lote)) {
        mapa.set(lote, [])
      }
      mapa.get(lote)!.push(m)
    })

    // Caso não haja matrizes cadastradas em historico_matrizes, mas haja exames com lote_origem
    if (matrizes.length === 0 && exames.length > 0) {
      exames.forEach((ex) => {
        const lote = ex.lote_origem || 'Lote de Matrizes'
        if (!mapa.has(lote)) {
          mapa.set(lote, [])
        }
        // constrói matriz sintética
        mapa.get(lote)!.push({
          id: ex.id,
          brinco: ex.brinco,
          total_partos: ex.data_parto ? 1 : 0,
          total_exames_registrados: 1,
          iep_medio_meses: 12.0,
          ultimo_resultado_diagnostico: ex.resultado,
          data_ultimo_diagnostico: ex.data_exame,
          peso_ultimo_bezerro_desmama_kg: ex.peso_bezerro_desmama_kg,
          partos_por_ano_vida: 0.95,
          eficiencia_acumulada_pct: 95.0,
          status_reprodutivo: ex.resultado === 'prenhe' ? 'prenhe' : 'vazia',
          lote_atual: lote,
          created: ex.created,
          updated: ex.updated,
        })
      })
    }

    const lista: GrupoLote[] = []
    const safraPadrao = estacoes[0]?.ano_safra || '2025/2026'

    mapa.forEach((mats, nomeLote) => {
      const total = mats.length
      const prenhes = mats.filter(
        (m) =>
          m.status_reprodutivo === 'prenhe' ||
          (m.ultimo_resultado_diagnostico || '').toLowerCase() === 'prenhe',
      ).length
      const vazias = mats.filter(
        (m) =>
          m.status_reprodutivo === 'vazia' ||
          (m.ultimo_resultado_diagnostico || '').toLowerCase() === 'vazia',
      ).length
      const taxa = total > 0 ? (prenhes / total) * 100 : 0
      const somaIep = mats.reduce((acc, m) => acc + (m.iep_medio_meses || 12.2), 0)
      const iepMedio = total > 0 ? somaIep / total : 12.2

      lista.push({
        nomeLote,
        safra: safraPadrao,
        totalMatrizes: total,
        totalPrenhes: prenhes,
        totalVazias: vazias,
        taxaPrenhezPct: Number(taxa.toFixed(1)),
        iepMedio: Number(iepMedio.toFixed(1)),
        matrizes: mats,
      })
    })

    return lista.sort((a, b) => b.totalMatrizes - a.totalMatrizes)
  }, [matrizes, exames, estacoes])

  // Busca tolerante a acentos, maiúsculas e séries (ex: "NEL 4168", "nel4168", "4168")
  const animaisFiltradosBusca = useMemo(() => {
    const termo = normalizarTexto(buscaBrinco)
    if (!termo) return []

    // Junta todas as matrizes ou sintetizadas
    const todas: HistoricoMatrizRecord[] = []
    gruposLote.forEach((g) => {
      g.matrizes.forEach((m) => todas.push(m))
    })

    return todas.filter((m) => {
      const bNorm = normalizarTexto(m.brinco)
      const regNorm = normalizarTexto(m.nome_ou_registro || '')
      return bNorm.includes(termo) || regNorm.includes(termo)
    })
  }, [buscaBrinco, gruposLote])

  const abrirCardAnimal = (animal: HistoricoMatrizRecord) => {
    setAnimalModal(animal)
    setModalAberto(true)
  }

  const examesDoAnimalModal = useMemo(() => {
    if (!animalModal) return []
    const bNorm = normalizarTexto(animalModal.brinco)
    return exames.filter((e) => normalizarTexto(e.brinco) === bNorm)
  }, [animalModal, exames])

  const temDadosIndividuais = matrizes.length > 0 || exames.length > 0

  return (
    <div className="space-y-6">
      {/* Barra Superior: Busca tolerante por Brinco & Ações de Cadastro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-card border rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={buscaBrinco}
            onChange={(e) => setBuscaBrinco(e.target.value)}
            placeholder="Buscar por brinco ou série (ex: NEL 4168, 0452)..."
            className="pl-9 text-xs h-9 font-mono"
          />
          {buscaBrinco && (
            <button
              onClick={() => setBuscaBrinco('')}
              className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onAbrirCadastroDg && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAbrirCadastroDg}
              className="text-xs h-9 gap-1.5 border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />+ Diagnóstico (DG)
            </Button>
          )}
          {onAbrirCadastroIatf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAbrirCadastroIatf}
              className="text-xs h-9 gap-1.5 border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Baby className="h-3.5 w-3.5 text-emerald-700" />+ Rodada IATF
            </Button>
          )}
        </div>
      </div>

      {/* Resultado Direto da Busca por Brinco (se o usuário estiver digitando) */}
      {buscaBrinco.trim().length > 0 && (
        <Card className="border-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200">
                <Search className="h-3.5 w-3.5 text-emerald-700" />
                Resultado da busca por &quot;{buscaBrinco}&quot;
              </span>
              <Badge variant="outline" className="text-[10px]">
                {animaisFiltradosBusca.length} encontrado(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {animaisFiltradosBusca.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {animaisFiltradosBusca.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => abrirCardAnimal(animal)}
                    className="p-3 text-left border rounded-lg bg-background hover:border-emerald-600 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold font-mono text-sm text-foreground group-hover:text-emerald-700">
                        {animal.brinco}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {animal.total_partos} partos • IEP:{' '}
                        {animal.iep_medio_meses?.toFixed(1) || '12.0'} m
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Lote: {animal.lote_atual || 'Geral'}
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          animal.ultimo_resultado_diagnostico === 'prenhe' ? 'outline' : 'secondary'
                        }
                        className={`text-[10px] ${
                          animal.ultimo_resultado_diagnostico === 'prenhe'
                            ? 'border-emerald-600 text-emerald-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {(animal.ultimo_resultado_diagnostico || 'SEM DG').toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-emerald-700 flex items-center justify-end gap-0.5 mt-1">
                        Ver ficha <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Nenhum animal encontrado para o termo &quot;{buscaBrinco}&quot;. Tente apenas os
                números do brinco ou a série.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ESTADO VAZIO EXPLICATIVO (se as coleções individuais estiverem vazias) */}
      {!temDadosIndividuais && (
        <Card className="border-dashed border-2 border-border/80 bg-muted/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="p-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 inline-block">
              <Layers className="h-8 w-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-serif font-bold text-lg text-foreground">
                Nenhum Histórico Individual Cadastrado Ainda
              </h3>
              <p className="text-xs text-muted-foreground">
                As estações de monta já possuem dados consolidados (safras 2025/2026 e 2024/2025),
                mas a base individual de matrizes e exames de gestação ainda está vazia no banco.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {onAbrirCadastroDg && (
                <Button
                  size="sm"
                  onClick={onAbrirCadastroDg}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold gap-1.5 text-xs"
                >
                  <Stethoscope className="h-4 w-4" /> Cadastrar Diagnóstico Manualmente
                </Button>
              )}
              {onAbrirCadastroIatf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAbrirCadastroIatf}
                  className="text-xs gap-1.5 border-emerald-700 text-emerald-800 dark:text-emerald-300"
                >
                  <Baby className="h-4 w-4 text-emerald-700" /> Cadastrar Ação de IATF
                </Button>
              )}
            </div>

            <div className="p-3 bg-muted/40 rounded-lg max-w-lg mx-auto flex items-center gap-2 text-[11px] text-muted-foreground text-left">
              <Info className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                Você também pode importar laudos de DG completos em PDF pelo{' '}
                <strong>Robô Chicão</strong> na página <em>/maestro</em> para carregar centenas de
                matrizes de uma só vez.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VISÃO PRINCIPAL: LISTAGEM POR LOTE */}
      {temDadosIndividuais && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-700" />
                Matrizes Organizadas por Lote
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clique sobre o lote para expandir e visualizar as matrizes correspondentes.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {gruposLote.length} lote(s) • {matrizes.length || exames.length} matrizes
            </Badge>
          </div>

          <div className="space-y-3">
            {gruposLote.map((grupo) => {
              const expandido = Boolean(lotesExpandidos[grupo.nomeLote])

              return (
                <Card key={grupo.nomeLote} className="border-border overflow-hidden">
                  {/* Cabeçalho do Lote (Clicável) */}
                  <button
                    type="button"
                    onClick={() => toggleLote(grupo.nomeLote)}
                    className="w-full p-4 text-left bg-card hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 border-b"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                        {expandido ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {grupo.nomeLote}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {grupo.safra}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {grupo.totalMatrizes} matriz{grupo.totalMatrizes === 1 ? '' : 'es'}{' '}
                          alocada
                          {grupo.totalMatrizes === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    {/* Indicadores Resumidos do Lote */}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">
                          Taxa Prenhez
                        </span>
                        <span className="font-bold font-sans text-emerald-800 dark:text-emerald-200">
                          {grupo.taxaPrenhezPct}%
                        </span>
                      </div>

                      <div className="border-l pl-3">
                        <span className="text-[10px] text-muted-foreground block uppercase">
                          Prenhes / Vazias
                        </span>
                        <span className="font-bold font-sans text-foreground">
                          {grupo.totalPrenhes}P / {grupo.totalVazias}V
                        </span>
                      </div>

                      <div className="border-l pl-3">
                        <span className="text-[10px] text-muted-foreground block uppercase">
                          IEP Médio
                        </span>
                        <span className="font-bold font-sans text-foreground">
                          {grupo.iepMedio} m
                        </span>
                      </div>

                      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                        {expandido ? 'Ocultar Matrizes' : 'Ver Matrizes'}
                      </Badge>
                    </div>
                  </button>

                  {/* Lista de Matrizes do Lote Expandido */}
                  {expandido && (
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted text-muted-foreground font-semibold">
                            <tr>
                              <th className="p-3 text-left">Brinco</th>
                              <th className="p-3 text-left">Último Diagnóstico</th>
                              <th className="p-3 text-center">Partos</th>
                              <th className="p-3 text-center">IEP Médio</th>
                              <th className="p-3 text-right">Última Desmama</th>
                              <th className="p-3 text-right">Eficiência</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {grupo.matrizes.map((matriz) => (
                              <tr
                                key={matriz.id}
                                className="hover:bg-muted/30 cursor-pointer"
                                onClick={() => abrirCardAnimal(matriz)}
                              >
                                <td className="p-3 font-mono font-bold text-foreground">
                                  {matriz.brinco}
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-foreground">
                                    {(
                                      matriz.ultimo_resultado_diagnostico || 'Sem DG'
                                    ).toUpperCase()}
                                  </span>
                                  {matriz.data_ultimo_diagnostico && (
                                    <span className="text-[10px] text-muted-foreground block">
                                      {matriz.data_ultimo_diagnostico}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono">{matriz.total_partos}</td>
                                <td className="p-3 text-center font-mono">
                                  {matriz.iep_medio_meses
                                    ? `${matriz.iep_medio_meses.toFixed(1)} m`
                                    : '12.0 m'}
                                </td>
                                <td className="p-3 text-right font-mono">
                                  {matriz.peso_ultimo_bezerro_desmama_kg
                                    ? `${matriz.peso_ultimo_bezerro_desmama_kg} kg`
                                    : '—'}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                                  {matriz.eficiencia_acumulada_pct || 94.5}%
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={
                                      matriz.status_reprodutivo === 'prenhe'
                                        ? 'bg-emerald-700 text-white text-[10px]'
                                        : matriz.status_reprodutivo === 'candidata_descarte'
                                          ? 'bg-amber-700 text-white text-[10px]'
                                          : 'bg-muted text-foreground text-[10px]'
                                    }
                                  >
                                    {(matriz.status_reprodutivo || 'apta').toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      abrirCardAnimal(matriz)
                                    }}
                                    className="h-7 text-[11px] gap-1 text-emerald-800 hover:text-emerald-900"
                                  >
                                    Ficha <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal / Card com Histórico Zootécnico do Animal Selecionado */}
      <ModalFichaAnimal
        animal={animalModal}
        examesDoAnimal={examesDoAnimalModal}
        open={modalAberto}
        onOpenChange={setModalAberto}
      />
    </div>
  )
}
