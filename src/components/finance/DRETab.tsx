import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/utils'

export function DRETab() {
  const [month, setMonth] = useState('03-2026')

  const dreData = {
    grossRevenue: 450000,
    deductions: 22500,
    variableCosts: {
      nutrition: 120000,
      sanity: 15000,
      management: 8000,
    },
    fixedCosts: {
      labor: 45000,
      infrastructure: 12000,
      administrative: 18000,
    },
    arrobasProduced: 1500,
    headcount: 350,
  }

  const netRevenue = dreData.grossRevenue - dreData.deductions
  const totalVariableCosts = Object.values(dreData.variableCosts).reduce((a, b) => a + b, 0)
  const grossMargin = netRevenue - totalVariableCosts
  const totalFixedCosts = Object.values(dreData.fixedCosts).reduce((a, b) => a + b, 0)
  const operatingMargin = grossMargin - totalFixedCosts

  const grossMarginPct = netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0
  const opMarginPct = netRevenue > 0 ? (operatingMargin / netRevenue) * 100 : 0
  const costPerArroba =
    dreData.arrobasProduced > 0
      ? (totalVariableCosts + totalFixedCosts) / dreData.arrobasProduced
      : 0
  const costPerHead =
    dreData.headcount > 0 ? (totalVariableCosts + totalFixedCosts) / dreData.headcount : 0
  const resultPerArroba =
    dreData.arrobasProduced > 0 ? operatingMargin / dreData.arrobasProduced : 0

  return (
    <div className="grid gap-6 md:grid-cols-12 animate-fade-in">
      <div className="md:col-span-8">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b">
            <div className="space-y-1">
              <CardTitle>DRE Mensal - Fechamento Gerencial</CardTitle>
              <CardDescription>
                Demonstrativo de Resultado do Exercício com alocação zootécnica.
              </CardDescription>
            </div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[160px] mt-2 sm:mt-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01-2026">Jan / 2026</SelectItem>
                <SelectItem value="02-2026">Fev / 2026</SelectItem>
                <SelectItem value="03-2026">Mar / 2026</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="flex justify-between font-bold text-base text-primary">
                <span>Receita Bruta com Vendas</span>
                <span>{formatCurrency(dreData.grossRevenue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pl-4 mt-2">
                <span>(-) Deduções (Impostos, Frete, Comissão)</span>
                <span>{formatCurrency(dreData.deductions)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-3 mt-3">
                <span>(=) Receita Líquida</span>
                <span>{formatCurrency(netRevenue)}</span>
              </div>

              <div className="pt-6 space-y-3">
                <div className="font-semibold text-base">Custos Variáveis Operacionais</div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Nutrição / Insumos</span>
                  <span>{formatCurrency(dreData.variableCosts.nutrition)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Sanidade e Medicamentos</span>
                  <span>{formatCurrency(dreData.variableCosts.sanity)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Manejo de Pastagens</span>
                  <span>{formatCurrency(dreData.variableCosts.management)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2 text-destructive">
                  <span>(-) Total Custos Variáveis</span>
                  <span>{formatCurrency(totalVariableCosts)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-base border-t border-b py-3 bg-muted/20 px-3 rounded mt-4">
                <span>(=) Margem Bruta Operacional</span>
                <span className={grossMargin >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  {formatCurrency(grossMargin)}
                </span>
              </div>

              <div className="pt-6 space-y-3">
                <div className="font-semibold text-base">Custos Fixos / Estruturais</div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Folha de Pagamento</span>
                  <span>{formatCurrency(dreData.fixedCosts.labor)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Manutenção de Infraestrutura</span>
                  <span>{formatCurrency(dreData.fixedCosts.infrastructure)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Despesas Administrativas</span>
                  <span>{formatCurrency(dreData.fixedCosts.administrative)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2 text-destructive">
                  <span>(-) Total Custos Fixos</span>
                  <span>{formatCurrency(totalFixedCosts)}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-lg border-t-2 pt-4 mt-6 text-primary">
                <span>(=) Resultado Operacional Líquido (EBITDA)</span>
                <span className={operatingMargin >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                  {formatCurrency(operatingMargin)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-4 space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Margem Operacional (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatNumber(opMarginPct, 2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem Bruta: {formatNumber(grossMarginPct, 2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo por @ Produzida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costPerArroba)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Base de Rateio: {formatNumber(dreData.arrobasProduced, 0)} @
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo por Cabeça Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costPerHead)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Rebanho Estático: {dreData.headcount} cabeças
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            operatingMargin >= 0
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-destructive/10 border-destructive/20'
          }
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-sm font-medium ${operatingMargin >= 0 ? 'text-emerald-700' : 'text-destructive'}`}
            >
              Resultado Final por @
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${operatingMargin >= 0 ? 'text-emerald-700' : 'text-destructive'}`}
            >
              {formatCurrency(resultPerArroba)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lucro na unidade de medida zootécnica
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
