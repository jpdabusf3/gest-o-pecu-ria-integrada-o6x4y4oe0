import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Webhook, Bot, CheckCircle2, XCircle } from 'lucide-react'
import useFeedMillStore from '@/stores/useFeedMillStore'
import { useFarm } from '@/contexts/FarmContext'
import useFinanceStore from '@/stores/useFinanceStore'
import { useToast } from '@/hooks/use-toast'
import { formatWeight } from '@/lib/utils'

export function IntegrationTab() {
  const { formulas, addProduction, integrationLogs, addIntegrationLog } = useFeedMillStore()
  const { inventory, updateInventoryItem } = useFarm()
  const { addEntry } = useFinanceStore()
  const { toast } = useToast()
  const [isSimulating, setIsSimulating] = useState(false)

  const webhookUrl = 'https://api.gestao-pecuaria.com/v1/webhooks/production/WHK-987654'

  const simulateWebhook = () => {
    if (formulas.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Nenhuma fórmula cadastrada para simular.',
        variant: 'destructive',
      })
      return
    }

    setIsSimulating(true)
    setTimeout(() => {
      const formula = formulas[Math.floor(Math.random() * formulas.length)]
      const amountKg = [500, 1000, 2000, 5000][Math.floor(Math.random() * 4)]

      let totalCost = 0
      let hasShortage = false
      const itemsToUpdate: { id: string; newQtd: number }[] = []

      // Analyze requirements and availability
      for (const ing of formula.ingredients) {
        const invItem = inventory.find((i) => i.id === ing.inventoryId)
        const reqQty = (amountKg * ing.percentage) / 100

        if (!invItem || invItem.qtd < reqQty) {
          hasShortage = true
        } else {
          totalCost += reqQty * (invItem.custoUnitario || 0)
          itemsToUpdate.push({ id: ing.inventoryId, newQtd: invItem.qtd - reqQty })
        }
      }

      if (hasShortage) {
        addIntegrationLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          formulaName: formula.name,
          amountKg,
          status: 'Erro - Estoque Insuficiente',
          message: 'Processamento falhou devido à falta de ingredientes no estoque físico.',
        })
        toast({
          title: 'Erro de Automação',
          description: `Falha na produção de ${formatWeight(amountKg)} de ${formula.name}. Estoque insuficiente.`,
          variant: 'destructive',
        })
        setIsSimulating(false)
        return
      }

      // Execute deductions
      itemsToUpdate.forEach((item) => updateInventoryItem(item.id, { qtd: item.newQtd }))

      // Update Output Inventory
      const outItem = inventory.find((i) => i.id === formula.outputInventoryId)
      if (outItem) {
        const newQtd = outItem.qtd + amountKg
        const currentTotalValue = outItem.qtd * (outItem.custoUnitario || 0)
        const newCustoUnitario = newQtd > 0 ? (currentTotalValue + totalCost) / newQtd : 0
        updateInventoryItem(formula.outputInventoryId, {
          qtd: newQtd,
          custoUnitario: newCustoUnitario,
        })
      }

      const costPerKg = amountKg > 0 ? totalCost / amountKg : 0

      // Register Production
      addProduction({
        formulaId: formula.id,
        formulaName: formula.name,
        amountProducedKg: amountKg,
        totalCost,
        costPerKg,
        destination: 'Estoque',
      })

      // Sync with Finance
      addEntry({
        description: `Produção Automatizada: ${formula.name}`,
        category: 'Nutrição',
        amount: totalCost,
        type: 'expense',
      })

      // Log success
      addIntegrationLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        formulaName: formula.name,
        amountKg,
        status: 'Processado',
        message: 'Dedução de estoque e registro financeiro efetuados com sucesso.',
      })

      toast({
        title: 'Produção Automatizada',
        description: `${formatWeight(amountKg)} de ${formula.name} processados e registrados.`,
      })
      setIsSimulating(false)
    }, 800)
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Integração de Automação (API / WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure endpoints para receber registros de produção de ração diretamente da fábrica
            ou balança através de bots (ex: WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL Exclusiva</label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono bg-muted text-muted-foreground"
              />
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
                Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Envie um POST para esta URL com o payload da produção para que o sistema debite os
              ingredientes automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="space-y-1">
              <h4 className="font-semibold text-primary flex items-center gap-2">
                <Bot className="h-4 w-4" /> Ambiente de Testes
              </h4>
              <p className="text-sm text-muted-foreground">
                Gere um evento simulado de recebimento de produção externa para testar as regras de
                dedução de estoque e alertas críticos.
              </p>
            </div>
            <Button onClick={simulateWebhook} disabled={isSimulating} className="gap-2 shrink-0">
              {isSimulating ? 'Processando...' : 'Simular Mensagem do Bot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log de Produções Recebidas</CardTitle>
          <CardDescription>
            Histórico de chamadas processadas pela integração automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Fórmula Identificada</TableHead>
                  <TableHead className="text-right">Volume (Kg)</TableHead>
                  <TableHead>Status da Operação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrationLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {log.formulaName}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                      {formatWeight(log.amountKg, 'kg')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {log.status === 'Processado' ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 border-emerald-600 bg-emerald-50 gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Processado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" /> Estoque Insuficiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground truncate max-w-[200px]"
                      title={log.message}
                    >
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))}
                {integrationLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro recebido via integração até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
