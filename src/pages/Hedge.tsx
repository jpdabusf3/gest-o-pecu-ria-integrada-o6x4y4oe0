import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import useHedgeStore from '@/stores/useHedgeStore'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Shield, TrendingUp, CandlestickChart, Plus } from 'lucide-react'
import { RegisterHedgeModal } from '@/components/forms/RegisterHedgeModal'
import { HedgeSimulator } from '@/components/HedgeSimulator'
import { useMarket } from '@/contexts/MarketContext'

export default function Hedge() {
  const { positions } = useHedgeStore()
  const { getPrice } = useMarket()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [prefillData, setPrefillData] = useState<any>(null)

  const handleOpenModal = (data: any = null) => {
    setPrefillData(data)
    setIsModalOpen(true)
  }

  // Simplified protected price estimate
  const getProtectedPrice = (pos: any) => {
    if (pos.type === 'Put') return pos.strikePrice - pos.premiumPaid + pos.basisLocal
    if (pos.type === 'Collar') return pos.strikePrice - pos.premiumPaid + pos.basisLocal // simplification
    return pos.strikePrice + pos.basisLocal
  }

  // Calculate Mark-to-Market P&L
  const getMarkToMarket = (pos: any) => {
    if (pos.status === 'Encerrado') return 0
    const currentPrice = getPrice('boi-gordo-mt') || 265.5 // Example fallback to datagro

    if (pos.type === 'Futuro') {
      return (pos.strikePrice - currentPrice) * pos.quantityArrobas
    }
    if (pos.type === 'Put') {
      return (
        Math.max(0, pos.strikePrice - currentPrice) * pos.quantityArrobas -
        pos.premiumPaid * pos.quantityArrobas
      )
    }
    if (pos.type === 'Call') {
      return (
        Math.max(0, currentPrice - pos.strikePrice) * pos.quantityArrobas -
        pos.premiumPaid * pos.quantityArrobas
      )
    }
    if (pos.type === 'Collar') {
      // Rough simulation for MTM collar
      const putVal = Math.max(0, pos.strikePrice - currentPrice)
      return putVal * pos.quantityArrobas - pos.premiumPaid * pos.quantityArrobas
    }
    return 0
  }

  const activePositions = positions.filter((p) => p.status === 'Aberto')
  const totalProtectedRevenue = activePositions.reduce(
    (acc, pos) => acc + getProtectedPrice(pos) * pos.quantityArrobas,
    0,
  )
  const totalArrobasProtected = activePositions.reduce((acc, pos) => acc + pos.quantityArrobas, 0)
  const averageProtectedPrice =
    totalArrobasProtected > 0 ? totalProtectedRevenue / totalArrobasProtected : 0

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Hedge & Gestão de Risco B3
          </h2>
          <p className="text-muted-foreground mt-1">
            Módulo avançado de registro de opções, MTM (Mark-to-Market) e simulação de proteção.
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" /> Registrar Operação B3
        </Button>
      </div>

      <RegisterHedgeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        prefillData={prefillData}
      />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard & Carteira B3</TabsTrigger>
          <TabsTrigger value="simulator">Calculadora de Cenários</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-0">
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
                  Arrobas Protegidas Totais
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
                  Piso de Receita Garantida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700">
                  {formatCurrency(totalProtectedRevenue)}
                </div>
                <p className="text-xs text-emerald-700/70 mt-1">Baseado na proteção ativa atual.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CandlestickChart className="h-5 w-5" /> Carteira de Posições (Mark-to-Market)
              </CardTitle>
              <CardDescription>
                Acompanhamento de P&L em tempo real baseando-se nas cotações correntes do DATAGRO.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Volume (@)</TableHead>
                    <TableHead className="text-right">Strike</TableHead>
                    <TableHead className="text-right">Prêmio Pago</TableHead>
                    <TableHead className="text-right text-emerald-600 font-bold">
                      Preço Protegido
                    </TableHead>
                    <TableHead className="text-right bg-muted/30 font-bold">
                      P&L Atual (MTM)
                    </TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => {
                    const pnl = getMarkToMarket(pos)
                    return (
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
                        <TableCell className="text-right font-mono">
                          {formatNumber(pos.quantityArrobas, 0)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(pos.strikePrice)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-destructive">
                          {pos.premiumPaid > 0 ? `- ${formatCurrency(pos.premiumPaid)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 whitespace-nowrap">
                          {formatCurrency(getProtectedPrice(pos))}
                        </TableCell>
                        <TableCell className="text-right bg-muted/10 font-bold whitespace-nowrap">
                          <span className={pnl >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                            {pnl > 0 ? '+' : ''}
                            {formatCurrency(pnl)}
                          </span>
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
                    )
                  })}
                  {positions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        Nenhuma operação de hedge registrada no portfólio.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="mt-0">
          <HedgeSimulator onConvertToReal={handleOpenModal} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
