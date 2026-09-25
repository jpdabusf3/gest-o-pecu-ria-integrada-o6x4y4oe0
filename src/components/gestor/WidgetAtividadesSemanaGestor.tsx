import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Hourglass,
  XCircle,
  AlertTriangle,
  RotateCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Package,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AtividadeRecord,
  getAtividades,
  updateAtividade,
  transicionarStatusAtividade,
  isAlertaEmAndamentoExcessivo,
  temImpactoEstoqueOuSanidade,
  tipoCores,
  tipoLabel,
  getFrenteLabel,
} from '@/services/atividades'
import { getMotivoLabel } from '@/services/historicoStatus'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { ModalReagendarAtividade } from '@/components/campo/ModalReagendarAtividade'

export function WidgetAtividadesSemanaGestor() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [atividades, setAtividades] = useState<AtividadeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedParaReagendar, setSelectedParaReagendar] = useState<AtividadeRecord | null>(null)
  const [modalReagendarOpen, setModalReagendarOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAtividades()
      setAtividades(data)
    } catch (err) {
      console.warn('Erro ao carregar atividades no widget do gestor:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('atividades', () => loadData())
  useRealtime('historico_status', () => loadData())

  // Filtrar atividades dos últimos 7 dias até próximos 7 dias (Semana de operação)
  const {
    atividadesSemana,
    concluidasCount,
    emAndamentoCount,
    naoRealizadasList,
    alertasLongaDuracao,
  } = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 3)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 4)
    endOfWeek.setHours(23, 59, 59, 999)

    const semana = atividades.filter((a) => {
      const d = new Date(a.data)
      return d >= startOfWeek && d <= endOfWeek
    })

    const concluidas = semana.filter(
      (a) => a.status === 'realizada' || a.status === 'concluida',
    ).length

    const emAndamento = semana.filter((a) => a.status === 'em_andamento').length

    // Não realizadas que demandam revisão do gestor (impacto em estoque ou sanidade)
    const naoRealizadas = semana.filter((a) => a.status === 'nao_realizada')

    // Alertas de atividades "em_andamento" há mais de 3 dias em qualquer data
    const alertas3Dias = atividades.filter((a) => isAlertaEmAndamentoExcessivo(a, now))

    return {
      atividadesSemana: semana,
      concluidasCount: concluidas,
      emAndamentoCount: emAndamento,
      naoRealizadasList: naoRealizadas,
      alertasLongaDuracao: alertas3Dias,
    }
  }, [atividades])

  // Meta de conclusão semanal configurável por frente ou geral (Padrão 90%)
  const [metaConclusaoPct, setMetaConclusaoPct] = useState<number>(() => {
    const saved = localStorage.getItem('gpi_meta_conclusao_semanal')
    return saved ? parseInt(saved, 10) : 90
  })

  const totalSemana = atividadesSemana.length
  const pctConclusao = totalSemana > 0 ? Math.round((concluidasCount / totalSemana) * 100) : 0
  const abaixoDaMeta = pctConclusao < metaConclusaoPct

  // Aprovar / Dar ciente na pendência de não realizada
  const handleAprovarRevisao = async (rec: AtividadeRecord) => {
    try {
      await updateAtividade(rec.id, {
        revisado_gestor: true,
        revisado_em: new Date().toISOString(),
        revisado_por: user.name,
      } as any)

      toast({
        title: 'Revisão Concluída',
        description: `Pendência da atividade "${rec.titulo}" revisada pelo gestor.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao registrar aprovação.',
        variant: 'destructive',
      })
    }
  }

  // Reagendar com 1 toque
  const handleAbrirReagendar = (rec: AtividadeRecord) => {
    setSelectedParaReagendar(rec)
    setModalReagendarOpen(true)
  }

  const handleConfirmarReagendar = async (novaData: string, observacao: string) => {
    if (!selectedParaReagendar) return
    const isoDate = `${novaData}T08:00:00.000Z`
    try {
      await updateAtividade(selectedParaReagendar.id, {
        data: isoDate,
        status: 'reagendada',
        revisado_gestor: true,
      } as any)

      await transicionarStatusAtividade({
        atividadeId: selectedParaReagendar.id,
        statusNovo: 'reagendada',
        statusAnterior: selectedParaReagendar.status,
        usuarioNome: user.name,
        detalhes: `Reagendado pelo gestor para ${novaData}. ${observacao}`,
      })

      toast({
        title: 'Atividade Reagendada!',
        description: `Nova data: ${new Date(isoDate).toLocaleDateString('pt-BR')}.`,
      })
      loadData()
    } catch (err) {
      console.warn('Erro ao reagendar no gestor:', err)
    }
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Atividades da Semana (Controle do
              Gestor)
            </CardTitle>
            <CardDescription className="text-xs">
              Visibilidade operacional em tempo real: realizadas vs. planejadas, pendências e
              alertas de execução.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <Link to="/calendario">
              Ver Calendário Completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Barra de Progresso e Métricas Gerais com Semáforo de Meta */}
        <div
          className={`space-y-2.5 p-4 rounded-xl border transition-all ${
            abaixoDaMeta
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Taxa de Conclusão Semanal
              </span>
              <Badge
                variant={abaixoDaMeta ? 'destructive' : 'default'}
                className="text-[10px] font-bold"
              >
                {abaixoDaMeta
                  ? `Abaixo da Meta (${metaConclusaoPct}%)`
                  : `Meta Atingida (≥${metaConclusaoPct}%)`}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Meta:</span>
              <input
                type="number"
                min="50"
                max="100"
                value={metaConclusaoPct}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 90
                  setMetaConclusaoPct(val)
                  localStorage.setItem('gpi_meta_conclusao_semanal', String(val))
                }}
                className="w-14 h-7 text-xs font-mono font-bold bg-background border rounded px-1.5 text-center"
              />
              <span className="text-xs font-mono text-muted-foreground">%</span>
              <span
                className={`font-mono font-black text-lg ${
                  abaixoDaMeta ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {pctConclusao}%
              </span>
            </div>
          </div>
          <Progress
            value={pctConclusao}
            className={`h-2.5 ${abaixoDaMeta ? '[&>div]:bg-rose-600' : '[&>div]:bg-emerald-600'}`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>
                Total: <strong>{totalSemana}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>
                Realizadas: <strong>{concluidasCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>
                Em Andamento: <strong>{emAndamentoCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              <span>
                Não Realizadas: <strong>{naoRealizadasList.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Alertas de Atividades em Andamento há mais de 3 dias */}
        {alertasLongaDuracao.length > 0 && (
          <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Clock className="h-4 w-4 text-amber-600" />
              Alerta ao Gestor: {alertasLongaDuracao.length} atividade(s) em andamento há mais de 3
              dias
            </div>
            <div className="space-y-2 pt-1">
              {alertasLongaDuracao.map((al) => (
                <div
                  key={al.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2.5 rounded-lg bg-background border text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground">{al.titulo}</span>
                    <span className="text-muted-foreground ml-2">
                      (Responsável: <strong>{al.responsavel_id}</strong> • Frente:{' '}
                      {getFrenteLabel(al.frente)})
                    </span>
                    {al.progresso_observacoes && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Progresso: {al.progresso_observacoes}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-amber-500 text-amber-700 hover:bg-amber-500/10 shrink-0"
                    onClick={() => handleAbrirReagendar(al)}
                  >
                    Reavaliar / Reagendar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Não Realizadas com Motivo e Pendência de Revisão do Gestor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" />
              Atividades Não Realizadas & Pendências do Gestor
            </h4>
            <Badge variant="outline" className="text-[11px]">
              {naoRealizadasList.length} ocorrência(s)
            </Badge>
          </div>

          {naoRealizadasList.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground">
              Nenhuma atividade marcada como não realizada nesta semana. Operação 100% alinhada.
            </div>
          ) : (
            <div className="space-y-2.5">
              {naoRealizadasList.map((nr) => {
                const temImpacto = temImpactoEstoqueOuSanidade(nr)
                const pendenteRevisao = !nr.revisado_gestor

                return (
                  <div
                    key={nr.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      pendenteRevisao && temImpacto
                        ? 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          style={{ backgroundColor: tipoCores[nr.tipo], color: '#fff' }}
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {tipoLabel(nr.tipo)}
                        </Badge>
                        <span className="font-bold text-sm text-foreground">{nr.titulo}</span>
                        {temImpacto && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1.5 py-0 h-4 bg-rose-600 text-white gap-1"
                          >
                            <ShieldAlert className="h-2.5 w-2.5" /> Impacto em{' '}
                            {nr.tipo === 'sanidade' ? 'Sanidade' : 'Estoque'}
                          </Badge>
                        )}
                        {nr.revisado_gestor ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-500"
                          >
                            ✓ Revisado pelo gestor
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-700"
                          >
                            Revisão pendente
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground font-mono">
                        Data: {new Date(nr.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="text-xs bg-background/80 p-2.5 rounded-lg border text-foreground/90 space-y-1">
                      <div>
                        <strong>Motivo apontado:</strong>{' '}
                        <span className="text-rose-600 font-semibold">
                          {getMotivoLabel(nr.motivo_nao_realizada)}
                        </span>
                        {nr.detalhes_motivo && ` — "${nr.detalhes_motivo}"`}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>
                          Responsável: <strong>{nr.responsavel_id}</strong>
                        </span>
                        <span>Frente: {getFrenteLabel(nr.frente)}</span>
                        {nr.setor && <span>Local: {nr.setor}</span>}
                      </div>
                      {nr.insumos && nr.insumos.length > 0 && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                          <Package className="h-3 w-3" /> Insumos previstos não consumidos:{' '}
                          {nr.insumos
                            .map((i) => `${i.quantidade} ${i.unidade || ''} ${i.item}`)
                            .join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-2.5 pt-1.5 border-t border-dashed">
                      {pendenteRevisao && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-emerald-700 hover:bg-emerald-500/10"
                          onClick={() => handleAprovarRevisao(nr)}
                        >
                          ✓ Registrar Ciência / Aprovar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleAbrirReagendar(nr)}
                      >
                        <RotateCw className="h-3.5 w-3.5" /> Reagendar (+1 dia útil)
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <ModalReagendarAtividade
        open={modalReagendarOpen}
        onOpenChange={setModalReagendarOpen}
        atividade={selectedParaReagendar}
        onConfirm={handleConfirmarReagendar}
      />
    </Card>
  )
}
