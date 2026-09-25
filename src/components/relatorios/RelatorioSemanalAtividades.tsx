import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Hourglass,
  XCircle,
  Users,
  Layers,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  RotateCw,
  RefreshCw,
} from 'lucide-react'
import {
  AtividadeRecord,
  getAtividades,
  getFrenteLabel,
  tipoLabel,
  tipoCores,
} from '@/services/atividades'
import {
  getAllHistoricoStatus,
  HistoricoStatusRecord,
  getMotivoLabel,
  MOTIVOS_NAO_REALIZADA_OPTIONS,
} from '@/services/historicoStatus'
import { downloadExcel, triggerPDFPrint } from '@/lib/exportUtils'
import { useToast } from '@/hooks/use-toast'

export function RelatorioSemanalAtividades() {
  const { toast } = useToast()
  const [atividades, setAtividades] = useState<AtividadeRecord[]>([])
  const [historico, setHistorico] = useState<HistoricoStatusRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [atividadesData, historicoData] = await Promise.all([
        getAtividades(),
        getAllHistoricoStatus(),
      ])
      setAtividades(atividadesData)
      setHistorico(historicoData)
    } catch (err) {
      console.warn('Erro ao carregar dados do relatório semanal:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Intervalo da Semana Corrente (últimos 7 dias)
  const { estatisticasGerais, porResponsavel, porFrente, motivosContagem, ultimosLogs } =
    useMemo(() => {
      const total = atividades.length
      const concluidas = atividades.filter(
        (a) => a.status === 'realizada' || a.status === 'concluida',
      ).length
      const emAndamento = atividades.filter((a) => a.status === 'em_andamento').length
      const naoRealizadas = atividades.filter((a) => a.status === 'nao_realizada').length
      const reagendadas = atividades.filter((a) => a.status === 'reagendada').length

      const taxaGeral = total > 0 ? Math.round((concluidas / total) * 100) : 0

      // 1. Por Responsável (Vaqueiro / Equipe)
      const respMap: Record<
        string,
        { total: number; concluidas: number; emAndamento: number; naoRealizadas: number }
      > = {}

      atividades.forEach((a) => {
        const resp = a.responsavel_id || 'Não atribuído'
        if (!respMap[resp]) {
          respMap[resp] = { total: 0, concluidas: 0, emAndamento: 0, naoRealizadas: 0 }
        }
        respMap[resp].total++
        if (a.status === 'realizada' || a.status === 'concluida') respMap[resp].concluidas++
        else if (a.status === 'em_andamento') respMap[resp].emAndamento++
        else if (a.status === 'nao_realizada') respMap[resp].naoRealizadas++
      })

      const listaResp = Object.entries(respMap).map(([nome, dados]) => ({
        nome,
        ...dados,
        taxa: dados.total > 0 ? Math.round((dados.concluidas / dados.total) * 100) : 0,
      }))

      // 2. Por Frente de Produção
      const frenteMap: Record<
        string,
        { total: number; concluidas: number; emAndamento: number; naoRealizadas: number }
      > = {}

      atividades.forEach((a) => {
        const fr = a.frente || 'Geral'
        if (!frenteMap[fr]) {
          frenteMap[fr] = { total: 0, concluidas: 0, emAndamento: 0, naoRealizadas: 0 }
        }
        frenteMap[fr].total++
        if (a.status === 'realizada' || a.status === 'concluida') frenteMap[fr].concluidas++
        else if (a.status === 'em_andamento') frenteMap[fr].emAndamento++
        else if (a.status === 'nao_realizada') frenteMap[fr].naoRealizadas++
      })

      const listaFrente = Object.entries(frenteMap).map(([frente, dados]) => ({
        frente,
        label: getFrenteLabel(frente as any),
        ...dados,
        taxa: dados.total > 0 ? Math.round((dados.concluidas / dados.total) * 100) : 0,
      }))

      // 3. Principais Motivos de Não Realização (Ranking)
      const motivosMap: Record<string, number> = {}
      MOTIVOS_NAO_REALIZADA_OPTIONS.forEach((m) => {
        motivosMap[m.id] = 0
      })

      atividades.forEach((a) => {
        if (a.status === 'nao_realizada' && a.motivo_nao_realizada) {
          motivosMap[a.motivo_nao_realizada] = (motivosMap[a.motivo_nao_realizada] || 0) + 1
        }
      })

      const rankingMotivos = Object.entries(motivosMap)
        .map(([id, qtd]) => ({
          id,
          label: getMotivoLabel(id),
          qtd,
          pct: naoRealizadas > 0 ? Math.round((qtd / naoRealizadas) * 100) : 0,
        }))
        .filter((m) => m.qtd > 0)
        .sort((a, b) => b.qtd - a.qtd)

      return {
        estatisticasGerais: {
          total,
          concluidas,
          emAndamento,
          naoRealizadas,
          reagendadas,
          taxaGeral,
        },
        porResponsavel: listaResp,
        porFrente: listaFrente,
        motivosContagem: rankingMotivos,
        ultimosLogs: historico.slice(0, 15),
      }
    }, [atividades, historico])

  const handleExportPDF = () => {
    triggerPDFPrint()
    toast({
      title: 'PDF Gerado',
      description: 'Relatório semanal de atividades pronto para impressão ou salvar.',
    })
  }

  const handleExportExcel = () => {
    const dadosExcel = atividades.map((a) => ({
      ID: a.id,
      Título: a.titulo,
      Tipo: a.tipo,
      Frente: a.frente,
      Responsável: a.responsavel_id,
      Data: a.data,
      Status: a.status,
      'Motivo Não Realizada': a.motivo_nao_realizada || '',
      'Detalhes Motivo': a.detalhes_motivo || '',
      Progresso: a.progresso_observacoes || '',
    }))
    downloadExcel(dadosExcel, 'relatorio_semanal_atividades')
    toast({
      title: 'Excel Gerado',
      description: 'Relatório baixado em formato de planilha com sucesso.',
    })
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        Consolidando indicadores de execução semanal...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight">
              Relatório Semanal de Atividades & Auditoria de Campo
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              Métricas Reais
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Indicadores de conclusão por vaqueiro e por frente de produção, análise de recusas e
            carimbos de auditoria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-9 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Cartões de Indicadores Gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-muted/40">
          <div className="text-[11px] text-muted-foreground font-semibold uppercase">
            Total Planejado
          </div>
          <div className="text-2xl font-bold mt-1">{estatisticasGerais.total}</div>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
          <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Realizadas
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {estatisticasGerais.concluidas}{' '}
            <span className="text-xs font-normal text-muted-foreground font-mono">
              ({estatisticasGerais.taxaGeral}%)
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold uppercase flex items-center gap-1">
            <Hourglass className="h-3.5 w-3.5" /> Em Andamento
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {estatisticasGerais.emAndamento}
          </div>
        </Card>

        <Card className="p-4 bg-rose-500/10 border-rose-500/30">
          <div className="text-[11px] text-rose-800 dark:text-rose-400 font-semibold uppercase flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Não Realizadas
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {estatisticasGerais.naoRealizadas}
          </div>
        </Card>

        <Card className="p-4 bg-blue-500/10 border-blue-500/30 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-blue-800 dark:text-blue-400 font-semibold uppercase flex items-center gap-1">
            <RotateCw className="h-3.5 w-3.5" /> Reagendadas
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {estatisticasGerais.reagendadas}
          </div>
        </Card>
      </div>

      {/* Seção 1: Desempenho por Vaqueiro / Responsável & Desempenho por Frente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Vaqueiros */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Taxa de Conclusão por Vaqueiro / Operador
            </CardTitle>
            <CardDescription className="text-xs">
              Acompanhamento de eficácia operacional e distribuição de carga de trabalho.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-center">Realiz.</TableHead>
                  <TableHead className="text-center">Andam.</TableHead>
                  <TableHead className="text-center">Não Feito</TableHead>
                  <TableHead className="w-[140px] text-right">Taxa Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porResponsavel.map((resp) => (
                  <TableRow key={resp.nome}>
                    <TableCell className="font-semibold text-xs py-3">{resp.nome}</TableCell>
                    <TableCell className="text-center text-xs text-emerald-600 font-bold">
                      {resp.concluidas}
                    </TableCell>
                    <TableCell className="text-center text-xs text-amber-600">
                      {resp.emAndamento}
                    </TableCell>
                    <TableCell className="text-center text-xs text-rose-600 font-bold">
                      {resp.naoRealizadas}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={resp.taxa} className="h-2 w-16" />
                        <span className="font-mono text-xs font-bold w-10 text-right">
                          {resp.taxa}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabela de Frentes de Produção */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Taxa de Conclusão por Frente de Produção
            </CardTitle>
            <CardDescription className="text-xs">
              Gargalos e cumprimento de cronograma segregado por setor pecuário.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frente</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Realiz.</TableHead>
                  <TableHead className="text-center">Pendentes</TableHead>
                  <TableHead className="w-[140px] text-right">Eficácia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porFrente.map((fr) => (
                  <TableRow key={fr.frente}>
                    <TableCell className="font-semibold text-xs py-3">{fr.label}</TableCell>
                    <TableCell className="text-center text-xs">{fr.total}</TableCell>
                    <TableCell className="text-center text-xs text-emerald-600 font-bold">
                      {fr.concluidas}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {fr.emAndamento + fr.naoRealizadas}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={fr.taxa} className="h-2 w-16" />
                        <span className="font-mono text-xs font-bold w-10 text-right">
                          {fr.taxa}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Seção 2: Principais Motivos de Não Realização */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-4 w-4" /> Principais Motivos de Não Realização (Causa Raiz)
          </CardTitle>
          <CardDescription className="text-xs">
            Justificativas obrigatórias preenchidas pelos vaqueiros no campo para replanejamento e
            suprimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {motivosContagem.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
              Nenhuma atividade marcada como não realizada registrada no banco.
            </div>
          ) : (
            <div className="space-y-3">
              {motivosContagem.map((m) => (
                <div key={m.id} className="space-y-1.5 bg-muted/20 p-3 rounded-xl border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">{m.label}</span>
                    <span className="font-mono font-semibold text-muted-foreground">
                      {m.qtd} ocorrência(s) ({m.pct}%)
                    </span>
                  </div>
                  <Progress value={m.pct} className="h-2 bg-muted" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 3: Carimbo de Auditoria em Toda Mudança de Status */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Carimbo de Auditoria de Mudança de
            Status (Coleção historico_status)
          </CardTitle>
          <CardDescription className="text-xs">
            Rastreabilidade integral: quem alterou, data e hora, motivo e indicação de gravação
            offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data e Hora</TableHead>
                <TableHead className="w-[160px]">Usuário</TableHead>
                <TableHead className="w-[160px]">Status Novo</TableHead>
                <TableHead className="min-w-[220px]">Motivo / Detalhes</TableHead>
                <TableHead className="w-[120px] text-right">Conectividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimosLogs.map((log) => {
                const ativ = atividades.find((a) => a.id === log.atividade_id)
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{log.usuario_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold ${
                          log.status_novo === 'realizada'
                            ? 'bg-emerald-600 text-white'
                            : log.status_novo === 'em_andamento'
                              ? 'bg-amber-500 text-white'
                              : log.status_novo === 'nao_realizada'
                                ? 'bg-rose-600 text-white'
                                : 'bg-muted text-foreground'
                        }`}
                      >
                        {log.status_novo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {ativ && (
                        <div className="font-semibold text-foreground/80">{ativ.titulo}</div>
                      )}
                      {log.motivo && (
                        <div className="text-rose-600 font-medium">
                          Motivo: {getMotivoLabel(log.motivo)}
                        </div>
                      )}
                      {log.detalhes && (
                        <div className="text-muted-foreground text-[11px] italic">
                          "{log.detalhes}"
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.offline ? (
                        <Badge
                          variant="destructive"
                          className="text-[9px] bg-amber-600 text-white border-0"
                        >
                          Offline
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] text-emerald-600 border-emerald-300"
                        >
                          Online
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {ultimosLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    Nenhum registro de auditoria gravado ainda. As mudanças de status gerarão os
                    carimbos aqui.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
