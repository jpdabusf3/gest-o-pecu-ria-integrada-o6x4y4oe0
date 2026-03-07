import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Plus } from 'lucide-react'
import { financialData } from '@/data/mock'

export default function Financeiro() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão Financeira</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhamento de fluxo de caixa e centro de custos.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2">
            <Download className="h-4 w-4" /> Relatório
          </Button>
          <Button className="flex-1 sm:flex-none gap-2">
            <Plus className="h-4 w-4" /> Lançamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Receitas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R$ 335.000,00</div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R$ 87.700,00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Líquido Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 247.300,00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialData.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{tx.data}</TableCell>
                    <TableCell className="font-medium">{tx.descricao}</TableCell>
                    <TableCell>{tx.categoria}</TableCell>
                    <TableCell
                      className={`text-right font-mono font-medium whitespace-nowrap ${tx.tipo === 'entrada' ? 'text-primary' : 'text-destructive'}`}
                    >
                      {tx.tipo === 'entrada' ? '+ ' : '- '}
                      {tx.valor}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-muted-foreground">
                        Efetivado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
