import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  CheckCircle2,
  Hourglass,
  XCircle,
  Phone,
  RefreshCw,
  Beef,
  MapPin,
  Calendar,
  AlertCircle,
  Clock,
  Shield,
  Layers,
} from 'lucide-react'
import { MembroEquipeRecord, PERFIS_LABELS, getEquipe } from '@/services/equipe'
import {
  AtividadeRecord,
  getAtividades,
  expandAtividades,
  isAtividadeVencida,
  getStatusLabel,
  tipoLabel,
  tipoCores,
} from '@/services/atividades'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { Link } from 'react-router-dom'

export default function MinhaEquipe() {
  const { user } = useAuth()
  const [equipe, setEquipe] = useState<MembroEquipeRecord[]>([])
  const [atividades, setAtividades] = useState<AtividadeRecord[]>([])
  const [loading, setLoading] = useState(true)

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      const [equipeRes, ativRes] = await Promise.all([getEquipe('ativo'), getAtividades()])
      setEquipe(equipeRes)
      setAtividades(ativRes)
    } catch (err) {
      console.warn('Erro ao carregar visão do capataz:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  useRealtime('equipe', () => carregarDados())
  useRealtime('atividades', () => carregarDados())

  // Filtrar apenas vaqueiros e serventes sob supervisão do capataz
  const subordinados = useMemo(() => {
    return equipe.filter((m) => m.perfil === 'vaqueiro' || m.perfil === 'servente')
  }, [equipe])

  // Atividades do dia de hoje
  const hoje = useMemo(() => new Date(), [])
  const atividadesHoje = useMemo(() => {
    const inicioHoje = new Date(hoje)
    inicioHoje.setHours(0, 0, 0, 0)
    const fimHoje = new Date(hoje)
    fimHoje.setHours(23, 59, 59, 999)

    return expandAtividades(atividades, inicioHoje, fimHoje)
  }, [atividades, hoje])

  // Cruzamento: para cada membro, associar suas tarefas de hoje
  const membrosComTarefas = useMemo(() => {
    return subordinados.map((membro) => {
      const nomeMembroLower = membro.nome.toLowerCase()

      // Encontrar tarefas atribuídas ao membro pelo nome ou pelos lotes de responsabilidade dele
      const tarefasMembro = atividadesHoje.filter((occ) => {
        const respLower = (occ.record.responsavel_id || '').toLowerCase()
        const matchNome =
          respLower.includes(nomeMembroLower) ||
          nomeMembroLower.split(' ')[0].toLowerCase().includes(respLower)

        // Ou se a tarefa pertence a um dos lotes sob responsabilidade dele
        const lotesMembro = membro.lotes_responsabilidade || []
        const matchLote =
          occ.record.lote_ids && occ.record.lote_ids.some((lId) => lotesMembro.includes(lId))

        return matchNome || matchLote
      })

      const concluidas = tarefasMembro.filter(
        (t) => t.record.status === 'realizada' || t.record.status === 'concluida',
      ).length
      const emAndamento = tarefasMembro.filter((t) => t.record.status === 'em_andamento').length
      const naoRealizadas = tarefasMembro.filter((t) => t.record.status === 'nao_realizada').length
      const pendentes = tarefasMembro.length - concluidas - emAndamento - naoRealizadas

      return {
        membro,
        tarefas: tarefasMembro,
        resumo: {
          total: tarefasMembro.length,
          concluidas,
          emAndamento,
          naoRealizadas,
          pendentes: Math.max(0, pendentes),
        },
      }
    })
  }, [subordinados, atividadesHoje])

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" /> Minha Equipe de Campo
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-purple-500/10 text-purple-700 border-purple-300"
            >
              Supervisão do Capataz
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Supervisão e acompanhamento das tarefas do dia dos vaqueiros e serventes da operação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            <Link to="/campo">Ir para Modo Campo</Link>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo da Supervisão */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Vaqueiros & Serventes
          </span>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">
            {subordinados.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Em campo hoje</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold uppercase">
            Tarefas Concluídas
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {membrosComTarefas.reduce((acc, curr) => acc + curr.resumo.concluidas, 0)}
          </div>
          <span className="text-[11px] text-muted-foreground">Realizadas hoje</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-amber-700 font-semibold uppercase">Em Andamento</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {membrosComTarefas.reduce((acc, curr) => acc + curr.resumo.emAndamento, 0)}
          </div>
          <span className="text-[11px] text-muted-foreground">Manejos iniciados</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-rose-700 font-semibold uppercase">Não Realizadas</span>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {membrosComTarefas.reduce((acc, curr) => acc + curr.resumo.naoRealizadas, 0)}
          </div>
          <span className="text-[11px] text-muted-foreground">Requerem supervisão</span>
        </Card>
      </div>

      {/* Lista de Membros e Suas Tarefas do Dia */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Colaboradores sob Sua Supervisão
        </h2>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Carregando supervisão de equipe...
          </div>
        ) : membrosComTarefas.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground">
              Nenhum vaqueiro ou servente cadastrado ativo no momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {membrosComTarefas.map(({ membro, tarefas, resumo }) => {
              const perfilInfo = PERFIS_LABELS[membro.perfil] || {
                label: membro.perfil,
                cor: 'bg-muted text-foreground',
              }

              return (
                <Card
                  key={membro.id}
                  className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {membro.foto ? (
                          <img
                            src={`https://gestao-pecuaria-integrada-96d74.shrd00.internal.goskip.dev/api/files/equipe/${membro.id}/${membro.foto}`}
                            alt={membro.nome}
                            className="h-12 w-12 rounded-full object-cover border-2 border-primary/30"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                            {membro.nome.charAt(0)}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            {membro.nome}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[10px] px-1.5 py-0 ${perfilInfo.cor}`}>
                              {perfilInfo.label}
                            </Badge>
                            {membro.funcao_especifica && (
                              <span className="text-xs text-muted-foreground">
                                • {membro.funcao_especifica}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/55${membro.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>

                    {/* Lotes de responsabilidade */}
                    {membro.lotes_responsabilidade && membro.lotes_responsabilidade.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground flex-wrap">
                        <Beef className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">Lotes:</span>
                        {membro.lotes_responsabilidade.map((lote) => (
                          <Badge key={lote} variant="secondary" className="text-[10px] px-1 py-0">
                            {lote}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    {/* Status das Tarefas do Dia */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Tarefas de Hoje ({resumo.total})
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-emerald-600 font-bold">{resumo.concluidas}✓</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-amber-600 font-bold">{resumo.emAndamento}⏳</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-rose-600 font-bold">{resumo.naoRealizadas}✗</span>
                        </div>
                      </div>

                      {tarefas.length === 0 ? (
                        <div className="p-3 bg-muted/20 rounded-lg text-center text-xs text-muted-foreground">
                          Nenhuma tarefa agendada para hoje.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {tarefas.map((occ) => {
                            const rec = occ.record
                            const isRealizada =
                              rec.status === 'realizada' || rec.status === 'concluida'
                            const isEmAndamento = rec.status === 'em_andamento'
                            const isNaoRealizada = rec.status === 'nao_realizada'
                            const isVencida = isAtividadeVencida(rec)

                            return (
                              <div
                                key={occ.virtualId}
                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                  isRealizada
                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-muted-foreground line-through'
                                    : isEmAndamento
                                      ? 'bg-amber-500/10 border-amber-500/30 font-medium'
                                      : isNaoRealizada
                                        ? 'bg-rose-500/10 border-rose-500/30'
                                        : 'bg-card border-border'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <Badge
                                    style={{
                                      backgroundColor: tipoCores[rec.tipo],
                                      color: '#fff',
                                    }}
                                    className="text-[9px] px-1 py-0 shrink-0"
                                  >
                                    {tipoLabel(rec.tipo)}
                                  </Badge>
                                  <span className="truncate">{rec.titulo}</span>
                                </div>

                                <div className="shrink-0 flex items-center gap-1">
                                  {isRealizada && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  )}
                                  {isEmAndamento && (
                                    <Hourglass className="h-4 w-4 text-amber-600 animate-pulse" />
                                  )}
                                  {isNaoRealizada && <XCircle className="h-4 w-4 text-rose-600" />}
                                  {!isRealizada && !isEmAndamento && !isNaoRealizada && (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t text-[11px] text-muted-foreground flex justify-between items-center">
                      <span>Contato: {membro.telefone}</span>
                      <span className="font-mono">{membro.cpf}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
