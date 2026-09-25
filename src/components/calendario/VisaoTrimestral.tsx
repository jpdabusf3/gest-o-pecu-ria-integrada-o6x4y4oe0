import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, Clock, DollarSign, CalendarCheck } from 'lucide-react'
import { AtividadeRecord, tipoLabel, getFrenteLabel } from '@/services/atividades'

interface VisaoTrimestralProps {
  atividades: AtividadeRecord[]
  ano: number
}

type TrimestreKey = 'T1' | 'T2' | 'T3' | 'T4'

const TRIMESTRES: {
  key: TrimestreKey
  label: string
  meses: string
  startMonth: number
  endMonth: number
}[] = [
  {
    key: 'T1',
    label: '1º Trimestre (Jan - Mar)',
    meses: 'Janeiro a Março',
    startMonth: 0,
    endMonth: 2,
  },
  {
    key: 'T2',
    label: '2º Trimestre (Abr - Jun)',
    meses: 'Abril a Junho',
    startMonth: 3,
    endMonth: 5,
  },
  {
    key: 'T3',
    label: '3º Trimestre (Jul - Set)',
    meses: 'Julho a Setembro',
    startMonth: 6,
    endMonth: 8,
  },
  {
    key: 'T4',
    label: '4º Trimestre (Out - Dez)',
    meses: 'Outubro a Dezembro',
    startMonth: 9,
    endMonth: 11,
  },
]

export function VisaoTrimestral({ atividades, ano }: VisaoTrimestralProps) {
  // Filtrar pelo ano
  const doAno = atividades.filter((a) => {
    const d = new Date(a.data)
    return d.getFullYear() === ano
  })

  const getStatsTrimestre = (startMonth: number, endMonth: number) => {
    const itens = doAno.filter((a) => {
      const m = new Date(a.data).getMonth()
      return m >= startMonth && m <= endMonth
    })

    const planejadas = itens.length
    const concluidas = itens.filter((a) => a.status === 'concluida').length
    const pendentes = itens.filter(
      (a) => a.status !== 'concluida' && a.status !== 'cancelada',
    ).length
    const custoPlanejado = itens.reduce((acc, curr) => acc + (curr.custo_previsto || 0), 0)
    const custoRealizado = itens
      .filter((a) => a.status === 'concluida')
      .reduce((acc, curr) => acc + (curr.custo_previsto || 0), 0)
    const taxaExecucao = planejadas > 0 ? (concluidas / planejadas) * 100 : 0

    // Segregação Arrendamento vs Própria
    const arrendamentoItens = itens.filter((a) => a.is_arrendamento)
    const custoArrendamento = arrendamentoItens.reduce(
      (acc, curr) => acc + (curr.custo_previsto || 0),
      0,
    )

    return {
      itens,
      planejadas,
      concluidas,
      pendentes,
      custoPlanejado,
      custoRealizado,
      taxaExecucao,
      custoArrendamento,
      arrendamentoCount: arrendamentoItens.length,
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Conferência Trimestral de Fechamento de Safra — Ano {ano}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mapeamento gerencial de manejos planejados vs. realizados em ciclos trimestrais para
            auditoria e fechamento zootécnico.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs bg-background">
            Ano Fiscal: {ano}
          </Badge>
          <Badge className="text-xs bg-emerald-600 text-white">
            Padrão de Referência / Gestão Ativa
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TRIMESTRES.map((trim) => {
          const stats = getStatsTrimestre(trim.startMonth, trim.endMonth)
          return (
            <Card key={trim.key} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  backgroundColor:
                    stats.taxaExecucao >= 80
                      ? '#10b981'
                      : stats.taxaExecucao >= 50
                        ? '#f59e0b'
                        : '#3b82f6',
                }}
              />
              <CardHeader className="pb-2 pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-bold">{trim.label}</CardTitle>
                    <p className="text-[11px] text-muted-foreground">{trim.meses}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stats.concluidas}/{stats.planejadas}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div>
                  <div className="flex justify-between mb-1 text-[11px] text-muted-foreground">
                    <span>Execução Operacional</span>
                    <span className="font-semibold text-foreground">
                      {stats.taxaExecucao.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={stats.taxaExecucao} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-muted/40 p-2 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Realizadas</span>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {stats.concluidas}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-2 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Pendentes</span>
                    <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {stats.pendentes}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Custo Previsto:</span>
                    <span className="font-mono font-medium">
                      R${' '}
                      {stats.custoPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Custo Executado:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      R${' '}
                      {stats.custoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  {stats.custoArrendamento > 0 && (
                    <div className="flex justify-between text-[11px] text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded">
                      <span>Arrendamento Segregado:</span>
                      <span className="font-mono font-semibold">
                        R${' '}
                        {stats.custoArrendamento.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabela de Fechamento Detalhada do Trimestre Vigente */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base font-bold">
            Detalhamento de Atividades Registradas no Ano {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Data</TableHead>
                  <TableHead>Atividade / Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Frente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doAno.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhuma atividade encontrada para o ano de {ano}.
                    </TableCell>
                  </TableRow>
                ) : (
                  doAno.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(item.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{item.titulo}</div>
                        {item.setor && (
                          <div className="text-[10px] text-muted-foreground">{item.setor}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {tipoLabel(item.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.is_arrendamento ? 'outline' : 'secondary'}
                          className={`text-[10px] ${item.is_arrendamento ? 'border-amber-400 text-amber-700 bg-amber-500/10' : ''}`}
                        >
                          {getFrenteLabel(item.frente)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.responsavel_id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            item.status === 'concluida'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        R${' '}
                        {(item.custo_previsto || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
