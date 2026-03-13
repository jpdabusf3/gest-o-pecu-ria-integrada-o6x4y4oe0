import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Printer, FileText } from 'lucide-react'
import { dashboardData, herdSummary, productionCostDashboard } from '@/data/mock'

export default function PdfStudio() {
  const [logo, setLogo] = useState<string | null>(null)
  const [reportTitle, setReportTitle] = useState('Relatório Gerencial de Desempenho')
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('pt-BR'))

  const [includeFinancial, setIncludeFinancial] = useState(true)
  const [includeHerd, setIncludeHerd] = useState(true)
  const [includeOperations, setIncludeOperations] = useState(true)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(URL.createObjectURL(file))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8 print:p-0 print:m-0 print:space-y-0 print:bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">PDF Studio</h2>
          <p className="text-muted-foreground mt-1">
            Gerador de relatórios executivos para reuniões de sócios.
          </p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 w-full sm:w-auto">
          <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 print:hidden">
        <Card className="xl:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Configurações do Relatório</CardTitle>
            <CardDescription>Personalize o conteúdo do documento impresso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Relatório</Label>
              <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo da Fazenda</Label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
            </div>
            <div className="pt-4 border-t space-y-3">
              <h4 className="text-sm font-semibold">Módulos a Incluir</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mod-fin"
                  checked={includeFinancial}
                  onCheckedChange={(c) => setIncludeFinancial(!!c)}
                />
                <label
                  htmlFor="mod-fin"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Resumo Financeiro e Custos
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mod-herd"
                  checked={includeHerd}
                  onCheckedChange={(c) => setIncludeHerd(!!c)}
                />
                <label
                  htmlFor="mod-herd"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Movimentação de Rebanho
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mod-ops"
                  checked={includeOperations}
                  onCheckedChange={(c) => setIncludeOperations(!!c)}
                />
                <label
                  htmlFor="mod-ops"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Desempenho Geral
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-3 bg-muted/20 p-2 sm:p-8 rounded-xl border border-dashed flex justify-center overflow-x-auto">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-2xl print:shadow-none print:w-full print:max-w-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
              {logo ? (
                <img src={logo} alt="Logo" className="h-16 object-contain max-w-[200px]" />
              ) : (
                <div className="h-16 w-32 bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-500 rounded font-medium">
                  [Sua Logo Aqui]
                </div>
              )}
              <div className="text-right">
                <h1 className="text-2xl font-bold uppercase text-gray-900 tracking-tight">
                  {reportTitle}
                </h1>
                <p className="text-gray-600 mt-1">Data: {reportDate}</p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-10">
              {includeFinancial && (
                <section>
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Síntese Financeira e Custos de Produção
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                        Custo Médio por @
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        R$ {productionCostDashboard.costPerArroba.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">
                        Arrobas Produzidas
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {productionCostDashboard.totalArrobasProduced.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-y-2 border-gray-300">
                        <th className="text-left py-2 px-3">Categoria de Custo</th>
                        <th className="text-right py-2 px-3">Valor (R$)</th>
                        <th className="text-right py-2 px-3">Representatividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionCostDashboard.costs.map((c, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-2 px-3 font-medium text-gray-800">{c.name}</td>
                          <td className="text-right py-2 px-3">
                            R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right py-2 px-3">
                            {((c.value / productionCostDashboard.totalCost) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {includeHerd && (
                <section>
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Posição e Movimentação de Rebanho
                  </h2>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{herdSummary.entradas}</p>
                      <p className="text-xs text-gray-500 uppercase font-bold mt-1">Entradas</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{herdSummary.saidas}</p>
                      <p className="text-xs text-gray-500 uppercase font-bold mt-1">Saídas</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{herdSummary.nascimentos}</p>
                      <p className="text-xs text-gray-500 uppercase font-bold mt-1">Nascimentos</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{herdSummary.mortalidade}</p>
                      <p className="text-xs text-gray-500 uppercase font-bold mt-1">Mortalidade</p>
                    </div>
                  </div>
                </section>
              )}

              {includeOperations && (
                <section>
                  <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-gray-800 flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Indicadores Operacionais
                  </h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-y-2 border-gray-300">
                        <th className="text-left py-2 px-3">Indicador</th>
                        <th className="text-right py-2 px-3">Valor Atual</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2 px-3 font-medium text-gray-800">
                          Total de Animais na Propriedade
                        </td>
                        <td className="text-right py-2 px-3 font-bold">
                          {dashboardData.kpis.animais.toLocaleString('pt-BR')} cabeças
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2 px-3 font-medium text-gray-800">
                          Valor Estimado do Rebanho
                        </td>
                        <td className="text-right py-2 px-3 font-bold">
                          {dashboardData.kpis.valorTotal}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2 px-3 font-medium text-gray-800">
                          Receita Mês Corrente
                        </td>
                        <td className="text-right py-2 px-3 font-bold text-green-700">
                          {dashboardData.kpis.receitaMes}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2 px-3 font-medium text-gray-800">
                          Despesa Mês Corrente
                        </td>
                        <td className="text-right py-2 px-3 font-bold text-red-700">
                          {dashboardData.kpis.despesasMes}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
              Documento gerado pelo sistema Gestão Pecuária Integrada (GPI) - Uso Interno e
              Executivo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
