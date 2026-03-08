import { SimulationResult } from '@/stores/useSimulationStore'
import { cn } from '@/lib/utils'

interface SimulationPrintReportProps {
  simulations: SimulationResult[]
}

export function SimulationPrintReport({ simulations }: SimulationPrintReportProps) {
  return (
    <div className="print-report-container hidden print:block bg-white text-black p-8 font-sans w-full max-w-[210mm] mx-auto">
      <div className="border-b-2 border-primary pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório de Simulações de Venda</h1>
          <p className="text-gray-500 mt-1">Gestão Pecuária Integrada</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">Data de Emissão</p>
          <p className="text-base font-bold">
            {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Este relatório apresenta o detalhamento das simulações de vendas gravadas no sistema,
          incluindo os parâmetros de entrada, cotações de mercado da época e a projeção de margens e
          lucro líquido.
        </p>
      </div>

      <div className="space-y-8">
        {simulations.map((sim, idx) => (
          <div
            key={sim.id}
            className="border border-gray-200 rounded-lg p-5 break-inside-avoid shadow-sm"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Cenário #{idx + 1} - {sim.category}
              </h3>
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                {new Date(sim.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                  Parâmetros e Custos
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Peso Vivo Alvo:</span>
                    <span className="font-semibold">{sim.weight} kg</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Rendimento Carcaça:</span>
                    <span className="font-semibold">{sim.arrobas.toFixed(1)} @</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Custo Produção/Cab:</span>
                    <span className="font-semibold text-rose-600">
                      R$ {sim.productionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                  Indicadores de Mercado
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Preço Venda Utilizado:</span>
                    <span className="font-semibold text-blue-600">
                      R$ {sim.salesPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / @
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Receita Bruta Proj:</span>
                    <span className="font-semibold">
                      R$ {sim.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-6 bg-gray-50 p-4 rounded-md">
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-gray-500">Margem (%)</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    sim.margin >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {sim.margin.toFixed(1)}%
                </p>
              </div>
              <div className="text-right border-l border-gray-200 pl-6">
                <p className="text-xs font-bold uppercase text-gray-500">Lucro Líq. / Cab</p>
                <p
                  className={cn(
                    'text-2xl font-bold tracking-tight',
                    sim.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  R$ {sim.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        Este documento é gerado automaticamente pelo sistema Gestão Pecuária Integrada e não possui
        valor fiscal.
      </div>
    </div>
  )
}
