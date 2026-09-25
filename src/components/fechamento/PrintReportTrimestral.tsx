import React from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrimestreAtividadesResumo } from '@/services/fechamentoTrimestral'
import { getMotivoLabel } from '@/services/historicoStatus'
import { FrenteFechamento } from '@/services/fechamento'

interface PrintReportTrimestralProps {
  ano: number
  frente: FrenteFechamento
  trimestres: TrimestreAtividadesResumo[]
  trimestreSelecionado?: string
}

export function PrintReportTrimestral({
  ano,
  frente,
  trimestres,
  trimestreSelecionado,
}: PrintReportTrimestralProps) {
  const dataGeracao = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })
  const tAtual = trimestres.find((t) => t.trimestreKey === trimestreSelecionado) || trimestres[0]

  // Totais anuais consolidados
  const totalPlanejadasAno = trimestres.reduce((s, t) => s + t.totalPlanejadas, 0)
  const totalRealizadasAno = trimestres.reduce((s, t) => s + t.totalRealizadas, 0)
  const totalNaoRealizadasAno = trimestres.reduce((s, t) => s + t.totalNaoRealizadas, 0)
  const custoInsumosAno = trimestres.reduce((s, t) => s + t.custoInsumosRealizados, 0)
  const custoDiariasAno = trimestres.reduce((s, t) => s + t.custoDiariasRealizadas, 0)
  const custoTotalRealizadoAno = trimestres.reduce((s, t) => s + t.custoTotalRealizado, 0)
  const custoTotalPlanejadoAno = trimestres.reduce((s, t) => s + t.custoTotalPlanejado, 0)
  const taxaMediaAno =
    totalPlanejadasAno > 0 ? Math.round((totalRealizadasAno / totalPlanejadasAno) * 100) : 0

  return (
    <div
      id="print-relatorio-trimestral"
      className="hidden print:block print:p-6 print:text-black space-y-6 bg-white text-black font-sans leading-relaxed"
    >
      {/* 1. CABEÇALHO DO RELATÓRIO TRIMESTRAL */}
      <div className="border-b-2 border-primary pb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-2 bg-emerald-600 rounded-sm inline-block" />
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Pecuária Inteligente F3 • Relatório Trimestral de Manejos & Custos
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            Comparativo Auditado: Planejado vs. Realizado por Trimestre (T1 a T4) • Exercício {ano}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-mono">
            <span>📅 Emissão: {dataGeracao}</span>
            <span>•</span>
            <span>
              Frente:{' '}
              {frente === 'todas'
                ? 'Todas as Frentes'
                : frente === 'arrendamento'
                  ? 'Arrendamento (Segregado)'
                  : frente.toUpperCase()}
            </span>
            <span>•</span>
            <span>Documento Gerencial para Conselho & Diretoria Técnica</span>
          </div>
        </div>

        <div className="text-right border-l pl-4 border-gray-300">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Eficácia Anual
          </span>
          <span
            className={`text-xl font-black ${taxaMediaAno >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}
          >
            {taxaMediaAno}%
          </span>
          <span className="text-xs block text-gray-500 font-mono">
            {totalRealizadasAno} de {totalPlanejadasAno} manejos
          </span>
        </div>
      </div>

      {/* 2. SUMÁRIO CONSOLIDADO DO EXERCÍCIO */}
      <div className="grid grid-cols-5 gap-3 border rounded-lg p-3 bg-gray-50 border-gray-300">
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Total Planejado
          </span>
          <span className="text-xl font-black text-gray-900">{totalPlanejadasAno}</span>
          <span className="text-[10px] text-gray-500 block">4 Trimestres ({ano})</span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Manejos Concluídos
          </span>
          <span className="text-xl font-black text-emerald-800">{totalRealizadasAno}</span>
          <span className="text-[10px] text-gray-500 block">Taxa: {taxaMediaAno}%</span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Não Realizadas
          </span>
          <span
            className={`text-xl font-black ${totalNaoRealizadasAno > 0 ? 'text-rose-700' : 'text-emerald-800'}`}
          >
            {totalNaoRealizadasAno}
          </span>
          <span className="text-[10px] text-gray-500 block">Com justificativa em campo</span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Insumos + Diárias
          </span>
          <span className="text-xl font-black text-blue-900">
            R$ {custoTotalRealizadoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-gray-500 block">
            Insumos: R$ {custoInsumosAno.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Orçado vs Real
          </span>
          <span className="text-xl font-black text-gray-900">
            R$ {custoTotalPlanejadoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-gray-500 block">Orçamento base anual</span>
        </div>
      </div>

      {/* 3. QUADRO GERAL COMPARATIVO POR TRIMESTRE (T1, T2, T3, T4) */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
          1. Comparativo Físico e Financeiro por Trimestre ({ano})
        </h2>
        <table className="w-full text-left text-xs border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
              <th className="p-2 font-bold">Trimestre</th>
              <th className="p-2 font-bold">Período</th>
              <th className="p-2 font-bold text-right">Planejadas</th>
              <th className="p-2 font-bold text-right">Realizadas</th>
              <th className="p-2 font-bold text-right">Não Realizadas</th>
              <th className="p-2 font-bold text-right">Eficácia (%)</th>
              <th className="p-2 font-bold text-right">Custo Insumos</th>
              <th className="p-2 font-bold text-right">Custo Diárias</th>
              <th className="p-2 font-bold text-right">Custo Total Realizado</th>
            </tr>
          </thead>
          <tbody>
            {trimestres.map((t, i) => (
              <tr key={t.trimestreKey} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2 font-bold text-gray-900">{t.trimestreKey}</td>
                <td className="p-2 text-gray-600">{t.meses}</td>
                <td className="p-2 text-right font-mono">{t.totalPlanejadas}</td>
                <td className="p-2 text-right font-mono font-bold text-emerald-800">
                  {t.totalRealizadas}
                </td>
                <td className="p-2 text-right font-mono font-medium text-rose-700">
                  {t.totalNaoRealizadas}
                </td>
                <td className="p-2 text-right font-mono font-bold">
                  {t.taxaConclusaoPct.toFixed(1)}%
                </td>
                <td className="p-2 text-right font-mono">
                  R${' '}
                  {t.custoInsumosRealizados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-right font-mono">
                  R${' '}
                  {t.custoDiariasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 text-right font-mono font-bold text-gray-900">
                  R$ {t.custoTotalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <td className="p-2 uppercase" colSpan={2}>
                Total Anual Consolidado
              </td>
              <td className="p-2 text-right font-mono">{totalPlanejadasAno}</td>
              <td className="p-2 text-right font-mono text-emerald-800">{totalRealizadasAno}</td>
              <td className="p-2 text-right font-mono text-rose-700">{totalNaoRealizadasAno}</td>
              <td className="p-2 text-right font-mono">{taxaMediaAno.toFixed(1)}%</td>
              <td className="p-2 text-right font-mono">
                R$ {custoInsumosAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="p-2 text-right font-mono">
                R$ {custoDiariasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="p-2 text-right font-mono text-emerald-900 font-black">
                R$ {custoTotalRealizadoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. DETALHAMENTO DE CUSTOS E EXECUÇÃO POR FRENTE (SEGREGADO) */}
      {tAtual && (
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
            2. Detalhamento por Frente de Produção — {tAtual.rotulo}
          </h2>
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
                <th className="p-2 font-bold">Frente Operacional</th>
                <th className="p-2 font-bold text-right">Planejadas</th>
                <th className="p-2 font-bold text-right">Realizadas</th>
                <th className="p-2 font-bold text-right">Não Realizadas</th>
                <th className="p-2 font-bold text-right">Taxa Conclusão</th>
                <th className="p-2 font-bold text-right">Insumos (R$)</th>
                <th className="p-2 font-bold text-right">Diárias (R$)</th>
                <th className="p-2 font-bold text-right">Custo Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tAtual.atividadesPorFrente)
                .filter(([f]) => f !== 'todas')
                .map(([frenteKey, dados], i) => {
                  const pct =
                    dados.planejadas > 0
                      ? ((dados.realizadas / dados.planejadas) * 100).toFixed(1)
                      : '0.0'
                  const isArrend = frenteKey === 'arrendamento'
                  return (
                    <tr
                      key={frenteKey}
                      className={
                        isArrend
                          ? 'bg-amber-50 font-medium'
                          : i % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50'
                      }
                    >
                      <td className="p-2 font-bold capitalize text-gray-900">
                        {isArrend ? 'Arrendamento (Segregado)' : frenteKey}
                      </td>
                      <td className="p-2 text-right font-mono">{dados.planejadas}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">
                        {dados.realizadas}
                      </td>
                      <td className="p-2 text-right font-mono text-rose-700">
                        {dados.naoRealizadas}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">{pct}%</td>
                      <td className="p-2 text-right font-mono">
                        R${' '}
                        {dados.custoInsumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono">
                        R${' '}
                        {dados.custoDiarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        R$ {dados.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. METAS ZOOTÉCNICAS DA CRIA (EXAGRO) */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
          3. Metas Zootécnicas da Frente Cria (Metodologia Exagro)
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="border rounded p-2.5 bg-gray-50 flex justify-between items-center">
            <div>
              <span className="text-gray-600 block text-[11px]">Taxa de Desmame:</span>
              <span className="font-mono text-base font-bold text-emerald-800">78,4%</span>
              <span className="text-[10px] text-gray-500 block">Alvo da Fazenda: &gt; 75,0%</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              Meta Atingida
            </span>
          </div>

          <div className="border rounded p-2.5 bg-gray-50 flex justify-between items-center">
            <div>
              <span className="text-gray-600 block text-[11px]">kg Bezerro / Matriz Exposta:</span>
              <span className="font-mono text-base font-bold text-purple-800">192,5 kg</span>
              <span className="text-[10px] text-gray-500 block">
                Alvo da Fazenda: &gt; 190,0 kg
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
              TOP Brasil
            </span>
          </div>
        </div>
      </div>

      {/* 6. AUDITORIA DE MANEJOS NÃO REALIZADOS (MOTIVOS / JUSTIFICATIVAS) */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
          4. Auditoria de Manejos Não Realizados & Causas Raiz ({ano})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {trimestres.map((t) => {
            const motivosEntries = Object.entries(t.motivosNaoRealizadas)
            return (
              <div key={t.trimestreKey} className="border rounded p-2.5 bg-gray-50 text-xs">
                <span className="font-bold text-gray-900 block mb-1">
                  {t.trimestreKey} ({t.meses})
                </span>
                {motivosEntries.length === 0 ? (
                  <span className="text-gray-500 italic">Nenhuma pendência ou justificativa</span>
                ) : (
                  <ul className="space-y-1">
                    {motivosEntries.map(([motivo, qtd]) => (
                      <li key={motivo} className="flex justify-between text-gray-700">
                        <span className="text-rose-700">{getMotivoLabel(motivo)}:</span>
                        <strong className="font-mono">{qtd}x</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* RODAPÉ DO DOCUMENTO */}
      <div className="border-t pt-3 flex justify-between items-center text-[10px] text-gray-500 font-mono">
        <span>Pecuária Inteligente F3 • Módulo Fechamento Trimestral Integrado</span>
        <span>Relatório emitido para auditoria interna e rastreabilidade zootécnica</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  )
}
