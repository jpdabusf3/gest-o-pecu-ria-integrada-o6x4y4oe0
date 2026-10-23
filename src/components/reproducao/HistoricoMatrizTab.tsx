import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { HistoricoMatrizRecord } from '@/services/reproducao'

interface HistoricoMatrizTabProps {
  matrizes: HistoricoMatrizRecord[]
  buscaBrinco: string
  setBuscaBrinco: (val: string) => void
  matrizSelecionada: HistoricoMatrizRecord | null
  setMatrizSelecionada: (m: HistoricoMatrizRecord) => void
  matrizesFiltradas: HistoricoMatrizRecord[]
}

/**
 * @deprecated Use `HistoricoReprodutivoTab` no lugar. Mantido para compatibilidade reversa.
 */
export function HistoricoMatrizTab({
  matrizes,
  buscaBrinco,
  setBuscaBrinco,
  matrizSelecionada,
  setMatrizSelecionada,
  matrizesFiltradas,
}: HistoricoMatrizTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna da Esquerda: Busca & Lista de Matrizes */}
      <Card className="lg:col-span-1">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Buscar Matriz por Brinco</span>
            <Badge variant="outline" className="text-[10px]">
              {matrizes.length} cadastradas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: BR-1010, 0452..."
              value={buscaBrinco}
              onChange={(e) => setBuscaBrinco(e.target.value)}
              className="pl-8 text-xs h-9 uppercase font-mono"
            />
          </div>

          <div className="border rounded-lg divide-y max-h-[460px] overflow-y-auto text-xs">
            {matrizesFiltradas.length > 0 ? (
              matrizesFiltradas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMatrizSelecionada(m)}
                  className={`w-full p-2.5 text-left flex items-center justify-between transition-colors ${
                    matrizSelecionada?.id === m.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-700'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div>
                    <span className="font-semibold font-mono text-foreground">{m.brinco}</span>
                    <p className="text-[11px] text-muted-foreground">
                      {m.total_partos} partos • IEP: {m.iep_medio_meses?.toFixed(1) || '12.0'} m
                    </p>
                  </div>
                  <Badge
                    variant={m.ultimo_resultado_diagnostico === 'prenhe' ? 'outline' : 'secondary'}
                    className={`text-[10px] ${
                      m.ultimo_resultado_diagnostico === 'prenhe'
                        ? 'border-emerald-600/50 text-emerald-800'
                        : 'text-amber-800'
                    }`}
                  >
                    {m.ultimo_resultado_diagnostico
                      ? m.ultimo_resultado_diagnostico.toUpperCase()
                      : 'SEM EXAME'}
                  </Badge>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-xs">
                Nenhuma matriz encontrada para &quot;{buscaBrinco}&quot;.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coluna da Direita: Ficha Técnica & Linha do Tempo Individual */}
      <div className="lg:col-span-2 space-y-4">
        {matrizSelecionada ? (
          <Card className="border-border">
            <CardHeader className="py-4 px-5 bg-muted/20 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-foreground">
                      {matrizSelecionada.brinco}
                    </span>
                    <Badge
                      className={
                        matrizSelecionada.status_reprodutivo === 'prenhe'
                          ? 'bg-emerald-700 text-white'
                          : matrizSelecionada.status_reprodutivo === 'candidata_descarte'
                            ? 'bg-amber-700 text-white'
                            : 'bg-muted text-foreground'
                      }
                    >
                      {matrizSelecionada.status_reprodutivo.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pasto atual: {matrizSelecionada.pasto_atual || 'Pasto 11 (Piatã)'} • Lote:{' '}
                    {matrizSelecionada.lote_atual || 'Lote Matrizes'}
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-muted-foreground block">Eficiência Acumulada</span>
                  <span className="text-lg font-bold font-sans text-emerald-700">
                    {matrizSelecionada.eficiencia_acumulada_pct || 94.5}%
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Grid de Indicadores Individuais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground block">Total de Partos</span>
                  <span className="text-xl font-bold font-sans">
                    {matrizSelecionada.total_partos} partos
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    histórico vitalício
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground block">Idade 1º Parto</span>
                  <span className="text-xl font-bold font-sans">
                    {matrizSelecionada.idade_primeiro_parto_meses || 26} m
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    precocidade sexual
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground block">IEP Médio</span>
                  <span className="text-xl font-bold font-sans">
                    {matrizSelecionada.iep_medio_meses?.toFixed(1) || '12.2'} m
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">1 bezerro/ano</span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground block">Último Peso Desmama</span>
                  <span className="text-xl font-bold font-sans">
                    {matrizSelecionada.peso_ultimo_bezerro_desmama_kg || 205} kg
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    habilidade materna
                  </span>
                </div>
              </div>

              {/* Linha do Tempo / Ciclos Reprodutivos da Matriz */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Linha do Tempo dos Ciclos Reprodutivos:
                </span>

                <div className="border rounded-lg divide-y bg-background text-xs">
                  {matrizSelecionada.ciclos_reprodutivos &&
                  matrizSelecionada.ciclos_reprodutivos.length > 0 ? (
                    matrizSelecionada.ciclos_reprodutivos.map((ciclo, idx) => (
                      <div key={idx} className="p-3 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {ciclo.ano_safra}
                            </Badge>
                            <span className="font-semibold text-foreground">
                              Diagnóstico: {ciclo.resultado.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Exame em {ciclo.data_exame} • Touro/IATF: {ciclo.touro || 'Rem USP'}
                            {ciclo.data_parto && ` • Parto: ${ciclo.data_parto}`}
                            {ciclo.peso_desmama_kg &&
                              ` • Bezerro Desm.: ${ciclo.peso_desmama_kg} kg`}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge className="bg-emerald-600 text-white text-[10px]">CONCLUÍDO</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      Histórico registrado a partir do último exame de{' '}
                      {matrizSelecionada.data_ultimo_diagnostico || '2025'}. Importe laudos em PDF
                      pelo Chicão para compilar ciclos pregressos.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            Selecione uma matriz na coluna ao lado para visualizar a linha do tempo e indicadores
            individuais.
          </Card>
        )}
      </div>
    </div>
  )
}
