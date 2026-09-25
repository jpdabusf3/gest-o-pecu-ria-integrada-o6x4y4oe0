import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldCheck,
  History,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  MapPin,
  Clock,
  ArrowRight,
  User,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuditLogRecord, getAuditLogs } from '@/services/auditoria'
import { getLots, LotRecord } from '@/services/lots'
import { downloadCSV } from '@/lib/exportUtils'

export default function Auditoria() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [lotes, setLotes] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroLote, setFiltroLote] = useState<string>('todos')
  const [buscaTermo, setBuscaTermo] = useState('')
  const [logSelecionado, setLogSelecionado] = useState<AuditLogRecord | null>(null)

  const carregarAudit = useCallback(async () => {
    try {
      setLoading(true)
      const [listLogs, listLots] = await Promise.all([
        getAuditLogs({
          tipo_evento: filtroTipo,
          lote_id: filtroLote !== 'todos' ? filtroLote : undefined,
        }),
        getLots(),
      ])
      setLogs(listLogs)
      setLotes(listLots)
    } catch (err) {
      console.warn('Erro ao carregar auditoria:', err)
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroLote])

  useEffect(() => {
    carregarAudit()
  }, [carregarAudit])

  const logsFiltrados = useMemo(() => {
    return logs.filter((l) => {
      if (buscaTermo.trim()) {
        const t = buscaTermo.toLowerCase()
        const matchUser = (l.usuario_nome || '').toLowerCase().includes(t)
        const matchMotivo = (l.motivo || '').toLowerCase().includes(t)
        const matchTipo = (l.tipo_evento || '').toLowerCase().includes(t)
        const matchRef = (l.referencia_id || '').toLowerCase().includes(t)
        if (!matchUser && !matchMotivo && !matchTipo && !matchRef) return false
      }
      return true
    })
  }, [logs, buscaTermo])

  const handleExportarCSV = () => {
    const dados = logsFiltrados.map((l) => ({
      Evento_ID: l.evento_id,
      Tipo_Evento: l.tipo_evento,
      Usuario: l.usuario_nome || l.usuario_id,
      Perfil: l.perfil,
      Data_Hora_Servidor: l.timestamp_servidor,
      Data_Hora_Dispositivo: l.timestamp_dispositivo,
      Origem: l.origem,
      Referencia_Tipo: l.referencia_tipo,
      Referencia_ID: l.referencia_id,
      Motivo: l.motivo || '',
      GPS: l.geolocalizacao ? `${l.geolocalizacao.latitude}, ${l.geolocalizacao.longitude}` : '',
    }))
    downloadCSV(dados, `trilha_auditoria_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" /> Trilha de Auditoria Completa
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-300 gap-1"
            >
              <Lock className="h-3 w-3" /> Imutável • Append-Only
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Registro com 5 dimensões (Quem, Quando nos 2 relógios, Onde, O Quê e Origem). Nenhum
            evento pode ser editado ou excluído.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarAudit}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportarCSV} className="gap-1.5 h-9">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cartões Informativos de Auditoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Total de Eventos
          </span>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">{logs.length}</div>
          <span className="text-[11px] text-muted-foreground">Gravação contínua</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold uppercase">Criações</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {logs.filter((l) => l.tipo_evento === 'criacao').length}
          </div>
          <span className="text-[11px] text-muted-foreground">Lançamentos novos</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-amber-700 font-semibold uppercase">
            Correções Encadeadas
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {logs.filter((l) => l.tipo_evento === 'correcao').length}
          </div>
          <span className="text-[11px] text-muted-foreground">Originais preservados</span>
        </Card>

        <Card className="p-4 bg-card border shadow-xs">
          <span className="text-xs text-rose-700 font-semibold uppercase">
            Cancelamentos Lógicos
          </span>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {logs.filter((l) => l.tipo_evento === 'cancelamento').length}
          </div>
          <span className="text-[11px] text-muted-foreground">Com motivo obrigatório</span>
        </Card>
      </div>

      {/* Filtros */}
      <div className="p-3 bg-muted/40 rounded-xl border flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuário, motivo, ID de referência..."
            className="pl-8 h-9 text-xs"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Tipo de Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Eventos</SelectItem>
              <SelectItem value="criacao">Criação</SelectItem>
              <SelectItem value="correcao">Correção</SelectItem>
              <SelectItem value="cancelamento">Cancelamento</SelectItem>
              <SelectItem value="mudanca_status">Mudança Status</SelectItem>
              <SelectItem value="redefinicao_senha">Redefinição Senha</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroLote} onValueChange={setFiltroLote}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Filtrar por Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Lotes</SelectItem>
              {lotes.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Eventos */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Data/Hora (Servidor)</TableHead>
              <TableHead className="text-xs">Relógio Celular</TableHead>
              <TableHead className="text-xs">Quem (Usuário / Perfil)</TableHead>
              <TableHead className="text-xs">Tipo de Evento</TableHead>
              <TableHead className="text-xs">Origem</TableHead>
              <TableHead className="text-xs">Motivo / Detalhes</TableHead>
              <TableHead className="text-xs text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Carregando trilha imutável...
                </TableCell>
              </TableRow>
            ) : logsFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  Nenhum registro de auditoria encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logsFiltrados.map((log) => {
                const isCorrecao = log.tipo_evento === 'correcao'
                const isCancelamento = log.tipo_evento === 'cancelamento'
                const isSenha = log.tipo_evento === 'redefinicao_senha'

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-foreground">
                      {new Date(log.timestamp_servidor).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {new Date(log.timestamp_dispositivo).toLocaleTimeString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <User className="h-3 w-3 text-primary shrink-0" />
                        <span>{log.usuario_nome || log.usuario_id}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize block pl-4">
                        {log.perfil}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase ${
                          isCorrecao
                            ? 'text-amber-700 border-amber-300 bg-amber-500/10'
                            : isCancelamento
                              ? 'text-rose-700 border-rose-300 bg-rose-500/10'
                              : isSenha
                                ? 'text-purple-700 border-purple-300 bg-purple-500/10'
                                : 'text-emerald-700 border-emerald-300 bg-emerald-500/10'
                        }`}
                      >
                        {log.tipo_evento}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] ${
                          log.origem === 'offline' ? 'bg-amber-100 text-amber-900 font-bold' : ''
                        }`}
                      >
                        {log.origem.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.motivo || log.referencia_tipo || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={() => setLogSelecionado(log)}
                      >
                        Ver Payload
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Painel Lateral / Dialog de Detalhe do Payload (Antes vs Depois) */}
      {logSelecionado && (
        <Card className="border-2 border-primary/30 shadow-md">
          <CardHeader className="p-4 pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Detalhamento do Evento:{' '}
                {logSelecionado.evento_id}
              </CardTitle>
              <CardDescription className="text-xs">
                Ação: {logSelecionado.tipo_evento.toUpperCase()} por {logSelecionado.usuario_nome} •
                Ref: {logSelecionado.referencia_tipo} ({logSelecionado.referencia_id})
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setLogSelecionado(null)}
            >
              Fechar Detalhes
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  Payload Antes:
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border">
                  {logSelecionado.payload_antes
                    ? JSON.stringify(logSelecionado.payload_antes, null, 2)
                    : '// Sem payload anterior (Criação)'}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-700 uppercase">
                  Payload Depois (Vigente):
                </span>
                <pre className="p-3 bg-emerald-500/[0.04] rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-emerald-500/20 text-foreground">
                  {logSelecionado.payload_depois
                    ? JSON.stringify(logSelecionado.payload_depois, null, 2)
                    : '// Sem payload posterior'}
                </pre>
              </div>
            </div>

            {logSelecionado.geolocalizacao && (
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Coordenadas GPS no ato do registro: Lat {logSelecionado.geolocalizacao.latitude},
                Lng {logSelecionado.geolocalizacao.longitude}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
