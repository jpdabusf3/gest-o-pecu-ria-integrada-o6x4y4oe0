import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import useHedgeStore from '@/stores/useHedgeStore'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Shield, TrendingUp, CandlestickChart } from 'lucide-react'
import { RegisterHedgeModal } from '@/components/forms/RegisterHedgeModal'

export default function Hedge() {
  const { positions } = useHedgeStore()

  const getProtectedPrice = (pos: any) => {
    if (pos.type === 'Put') return pos.strikePrice - pos.premiumPaid + pos.basisLocal
    if (pos.type === 'Call') return pos.strikePrice + pos.premiumPaid + pos.basisLocal
    return pos.strikePrice + pos.basisLocal
  }

  const getProjectedRevenue = (pos: any) => getProtectedPrice(pos) * pos.quantity * 330

  const activePositions = positions.filter((p) => p.status === 'Aberto')
  const totalProtectedRevenue = activePositions.reduce(
    (acc, pos) => acc + getProjectedRevenue(pos),
    0,
  )
  const totalArrobasProtected = activePositions.reduce((acc, pos) => acc + pos.quantity * 330, 0)
  const averageProtectedPrice =
    totalArrobasProtected > 0 ? totalProtectedRevenue / totalArrobasProtected : 0

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Hedge & Risco B3
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de posições em mercado futuro e opções para proteção de preço.
          </p>
        </div>
        <RegisterHedgeModal />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Preço Médio Protegido (@)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(averageProtectedPrice)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Considera Strike, Prêmio e Basis Local.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Arrobas Protegidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />{' '}
              {formatNumber(totalArrobasProtected, 0)} @
            </div>
            <p className="text-xs text-muted-foreground mt-1">Volume físico garantido na B3.</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              Receita Projetada Garantida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">
              {formatCurrency(totalProtectedRevenue)}
            </div>
            <p className="text-xs text-emerald-700/70 mt-1">Piso de receita líquida estimada.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CandlestickChart className="h-5 w-5" /> Posições Ativas B3
          </CardTitle>
          <CardDescription>
            Contratos derivativos operados para mitigação de risco da operação de engorda.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade (Ct)</TableHead>
                <TableHead className="text-right">Strike</TableHead>
                <TableHead className="text-right">Prêmio</TableHead>
                <TableHead className="text-right">Basis Local</TableHead>
                <TableHead className="text-right text-emerald-600 font-bold">
                  Preço Protegido
                </TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((pos) => (
                <TableRow
                  key={pos.id}
                  className={pos.status === 'Encerrado' ? 'opacity-50 bg-muted/20' : ''}
                >
                  <TableCell className="font-bold text-primary whitespace-nowrap">
                    {pos.contractCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-background">
                      {pos.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{pos.quantity}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(pos.strikePrice)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-destructive">
                    {pos.premiumPaid > 0 ? `- ${formatCurrency(pos.premiumPaid)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(pos.basisLocal)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 whitespace-nowrap">
                    {formatCurrency(getProtectedPrice(pos))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(pos.expiryDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pos.status === 'Aberto' ? 'default' : 'secondary'}>
                      {pos.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {positions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    Nenhuma posição registrada.
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
