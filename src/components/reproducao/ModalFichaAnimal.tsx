import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Baby, Calendar, Activity, Weight, Award, Clock } from 'lucide-react'
import { HistoricoMatrizRecord, ExameGestacaoRecord } from '@/services/reproducao'

interface ModalFichaAnimalProps {
  animal: HistoricoMatrizRecord | null
  examesDoAnimal?: ExameGestacaoRecord[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalFichaAnimal({
  animal,
  examesDoAnimal = [],
  open,
  onOpenChange,
}: ModalFichaAnimalProps) {
  if (!animal) return null

  const ultimoResultado = (animal.ultimo_resultado_diagnostico || '').toLowerCase()
  const statusReprodutivo =
    animal.status_reprodutivo || (ultimoResultado === 'prenhe' ? 'prenhe' : 'vazia')

  // Combina ciclos do animal ou exames de gestação encontrados
  const ciclos =
    animal.ciclos_reprodutivos && animal.ciclos_reprodutivos.length > 0
      ? animal.ciclos_reprodutivos
      : examesDoAnimal.map((e) => ({
          ano_safra: e.ano_safra,
          data_exame: e.data_exame,
          resultado: e.resultado,
          touro: e.touro_ou_lote_iatf || e.touro_nome || '',
          data_parto: e.data_parto,
          data_desmama: e.data_desmama,
          peso_desmama_kg: e.peso_bezerro_desmama_kg,
          peso_ajustado_205d: e.peso_ajustado_205d_kg,
        }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-800 dark:text-emerald-400">
                  Ficha Zootécnica & Histórico Reprodutivo
                </span>
                <Badge
                  className={
                    statusReprodutivo === 'prenhe'
                      ? 'bg-emerald-700 text-white text-[10px]'
                      : statusReprodutivo === 'candidata_descarte'
                        ? 'bg-amber-700 text-white text-[10px]'
                        : 'bg-muted text-foreground text-[10px]'
                  }
                >
                  {statusReprodutivo.toUpperCase()}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold font-mono tracking-tight text-foreground mt-0.5">
                {animal.brinco}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Lote: <strong>{animal.lote_atual || 'Não especificado'}</strong> • Pasto:{' '}
                {animal.pasto_atual || 'Piquete de Matrizes'}
                {animal.nome_ou_registro ? ` • Registro: ${animal.nome_ou_registro}` : ''}
              </DialogDescription>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block uppercase">
                Eficiência Acumulada
              </span>
              <span className="text-2xl font-bold font-sans text-emerald-700 tabular-nums">
                {animal.eficiencia_acumulada_pct || 94.5}%
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Grid de Métricas Principais do Animal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Baby className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="text-[10px] uppercase font-medium">Total de Partos</span>
                </div>
                <span className="text-xl font-bold font-sans tabular-nums text-foreground">
                  {animal.total_partos}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  partos registrados
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="text-[10px] uppercase font-medium">Idade 1º Parto</span>
                </div>
                <span className="text-xl font-bold font-sans tabular-nums text-foreground">
                  {animal.idade_primeiro_parto_meses || 26} m
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  precocidade sexual
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="text-[10px] uppercase font-medium">IEP Médio</span>
                </div>
                <span className="text-xl font-bold font-sans tabular-nums text-emerald-800 dark:text-emerald-200">
                  {animal.iep_medio_meses ? `${animal.iep_medio_meses.toFixed(1)} m` : '12.0 m'}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  {animal.ultimo_iep_meses
                    ? `Último: ${animal.ultimo_iep_meses.toFixed(1)}m`
                    : '1 bezerro/ano'}
                </span>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Weight className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="text-[10px] uppercase font-medium">Última Desmama</span>
                </div>
                <span className="text-xl font-bold font-sans tabular-nums text-foreground">
                  {animal.peso_ultimo_bezerro_desmama_kg
                    ? `${animal.peso_ultimo_bezerro_desmama_kg} kg`
                    : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {animal.peso_ajustado_205d_kg
                    ? `P205: ${animal.peso_ajustado_205d_kg} kg`
                    : 'habilidade materna'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Último Diagnóstico e Motivo Descarte se Houver */}
          <div className="p-3 bg-muted/30 border rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground block">
                Último Diagnóstico de Gestação
              </span>
              <span className="text-sm font-bold font-mono text-foreground flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    ultimoResultado === 'prenhe' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
                {(animal.ultimo_resultado_diagnostico || 'SEM EXAME').toUpperCase()}
                {animal.data_ultimo_diagnostico && (
                  <span className="text-xs font-normal text-muted-foreground">
                    (em {animal.data_ultimo_diagnostico})
                  </span>
                )}
              </span>
            </div>

            {animal.motivo_descarte_sugerido && (
              <div className="text-right max-w-xs">
                <span className="text-[10px] text-amber-700 font-semibold block uppercase">
                  Alerta Zootécnico
                </span>
                <span className="text-xs text-amber-900 dark:text-amber-200">
                  {animal.motivo_descarte_sugerido}
                </span>
              </div>
            )}
          </div>

          {/* Linha do Tempo dos Ciclos Reprodutivos */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              Linha do Tempo dos Ciclos Reprodutivos ({ciclos.length} ciclo
              {ciclos.length === 1 ? '' : 's'})
            </span>

            {ciclos.length > 0 ? (
              <div className="border rounded-xl divide-y bg-card overflow-hidden">
                {ciclos.map((ciclo, idx) => (
                  <div
                    key={idx}
                    className="p-3 flex items-start justify-between gap-3 hover:bg-muted/20"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] border-emerald-600/40"
                        >
                          {ciclo.ano_safra || 'Safra Atual'}
                        </Badge>
                        <span className="font-semibold text-foreground">
                          Diagnóstico: {String(ciclo.resultado || '').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {ciclo.data_exame && `Exame em ${ciclo.data_exame}`}
                        {ciclo.touro && ` • Touro/IATF: ${ciclo.touro}`}
                        {ciclo.data_parto && ` • Parto: ${ciclo.data_parto}`}
                        {ciclo.peso_desmama_kg && ` • Bezerro Desmama: ${ciclo.peso_desmama_kg} kg`}
                        {ciclo.peso_ajustado_205d && ` (P205: ${ciclo.peso_ajustado_205d} kg)`}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <Badge
                        className={
                          ciclo.resultado === 'prenhe'
                            ? 'bg-emerald-700 text-white text-[10px]'
                            : 'bg-rose-700 text-white text-[10px]'
                        }
                      >
                        {ciclo.resultado === 'prenhe' ? 'PRENHE' : 'VAZIA'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground border border-dashed rounded-xl">
                Nenhum ciclo anterior cadastrado para esta matriz. Cadastre diagnósticos de gestação
                ou ingira laudos pelo Robô Chicão para registrar ciclos pregressos.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
