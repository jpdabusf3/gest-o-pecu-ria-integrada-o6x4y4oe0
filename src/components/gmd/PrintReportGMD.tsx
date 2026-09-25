import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, ShieldAlert, Award, Calendar, CheckCircle2 } from 'lucide-react'
import { LoteGMDAnalise, AlertaGMDRecord, labelFaixaPermanencia } from '@/services/gmdAlertas'

interface PrintReportGmdProps {
  kpisGerais: {
    totalLotes: number
    cabTotal: number
    gmdMedioPonderadoG: number
    gmdMetaMedioG: number
    gdcMedioPonderadoG: number | null
    desvioMedio: number
    emAlerta: number
  }
  lotesMachos: LoteGMDAnalise[]
  lotesFemeas: LoteGMDAnalise[]
  lotesOutros: LoteGMDAnalise[]
  recortesFaixa: Array<{
    faixa: string
    label: string
    statsGeral: {
      totalLotes: number
      cabTotal: number
      gmdMedioPonderadoG: number
      desvioMedio: number
      emAlerta: number
    }
    statsMachos: { gmdMedioPonderadoG: number }
    statsFemeas: { gmdMedioPonderadoG: number }
  }>
  recortesFrente: Array<{
    frente: string
    label: string
    isArrendamento: boolean
    stats: {
      totalLotes: number
      cabTotal: number
      gmdMetaMedioG: number
      gmdMedioPonderadoG: number
      gdcMedioPonderadoG: number | null
      desvioMedio: number
      emAlerta: number
    }
  }>
  alertasComCausas: Array<
    AlertaGMDRecord & {
      loteNome: string
      loteSetor: string
    }
  >
}

export function PrintReportGMD({
  kpisGerais,
  lotesMachos,
  lotesFemeas,
  lotesOutros,
  recortesFaixa,
  recortesFrente,
  alertasComCausas,
}: PrintReportGmdProps) {
  const dataGeracao = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })

  return (
    <div
      id="print-relatorio-gmd"
      className="hidden print:block print:p-6 print:text-black space-y-6 bg-white text-black font-sans leading-relaxed"
    >
      {/* 1. CABEÇALHO EXECUTIVO PADRÃO DE REFERÊNCIA */}
      <div className="border-b-2 border-primary pb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-2 bg-emerald-600 rounded-sm inline-block" />
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Pecuária Inteligente F3 • Relatório Zootécnico GMD
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            Fechamento de Desempenho Ponderado & Controle de Ganho Médio Diário (Metodologia de
            Referência)
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 font-mono">
            <span>📅 Emissão: {dataGeracao}</span>
            <span>•</span>
            <span>Unidade: Fazenda F3 (Propriedade & Arrendamentos)</span>
            <span>•</span>
            <span>Documento Oficial para Reunião de Sócios & Nutricionista</span>
          </div>
        </div>

        <div className="text-right border-l pl-4 border-gray-300">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
            Status Geral
          </span>
          <span
            className={`text-base font-black ${kpisGerais.desvioMedio >= -10 ? 'text-emerald-700' : 'text-amber-700'}`}
          >
            {kpisGerais.desvioMedio >= -10 ? 'EM CONFORMIDADE' : 'ATENÇÃO ZOOTÉCNICA'}
          </span>
          <span className="text-xs block text-gray-500 font-mono">
            {kpisGerais.cabTotal} cabeças avaliadas
          </span>
        </div>
      </div>

      {/* 2. SUMÁRIO EXECUTIVO DE KPIS */}
      <div className="grid grid-cols-5 gap-3 border rounded-lg p-3 bg-gray-50 border-gray-300">
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Rebanho Total</span>
          <span className="text-xl font-black text-gray-900">{kpisGerais.cabTotal} cab</span>
          <span className="text-[10px] text-gray-500 block">
            {kpisGerais.totalLotes} lote(s) ativos
          </span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">GMD Ponderado</span>
          <span className="text-xl font-black text-emerald-800">
            {kpisGerais.gmdMedioPonderadoG} g/d
          </span>
          <span className="text-[10px] text-gray-500 block">
            Meta: {kpisGerais.gmdMetaMedioG} g/d
          </span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Desvio vs Meta
          </span>
          <span
            className={`text-xl font-black ${kpisGerais.desvioMedio >= -10 ? 'text-emerald-800' : 'text-rose-700'}`}
          >
            {kpisGerais.desvioMedio > 0
              ? `+${kpisGerais.desvioMedio}%`
              : `${kpisGerais.desvioMedio}%`}
          </span>
          <span className="text-[10px] text-gray-500 block">Ponderado cab/dia</span>
        </div>
        <div className="border-r pr-2 border-gray-300">
          <span className="text-[10px] uppercase font-bold text-gray-500 block">GDC Carcaça</span>
          <span className="text-xl font-black text-purple-900">
            {kpisGerais.gdcMedioPonderadoG ? `${kpisGerais.gdcMedioPonderadoG} g/d` : '-'}
          </span>
          <span className="text-[10px] text-gray-500 block">Ganho Líquido @</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">
            Lotes Críticos
          </span>
          <span
            className={`text-xl font-black ${kpisGerais.emAlerta > 0 ? 'text-rose-700' : 'text-emerald-800'}`}
          >
            {kpisGerais.emAlerta} lote(s)
          </span>
          <span className="text-[10px] text-gray-500 block">&gt; 20% abaixo da meta</span>
        </div>
      </div>

      {/* 3. RECORTE POR FAIXA DE PERMANÊNCIA (PADRÃO DE REFERÊNCIA) */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1 flex items-center gap-1.5">
          <span>1. Desempenho por Faixa de Permanência (Padrão de Referência)</span>
        </h2>
        <table className="w-full text-left text-xs border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
              <th className="p-2 font-bold">Faixa de Permanência</th>
              <th className="p-2 font-bold text-right">Lotes</th>
              <th className="p-2 font-bold text-right">Cabeças</th>
              <th className="p-2 font-bold text-right">GMD Machos</th>
              <th className="p-2 font-bold text-right">GMD Fêmeas</th>
              <th className="p-2 font-bold text-right">GMD Consolidado</th>
              <th className="p-2 font-bold text-right">Desvio</th>
              <th className="p-2 font-bold text-right">Críticos</th>
            </tr>
          </thead>
          <tbody>
            {recortesFaixa.map((f, i) => (
              <tr key={f.faixa} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2 font-bold text-gray-900">{f.label}</td>
                <td className="p-2 text-right font-mono">{f.statsGeral.totalLotes}</td>
                <td className="p-2 text-right font-mono">{f.statsGeral.cabTotal}</td>
                <td className="p-2 text-right font-mono font-medium text-blue-900">
                  {f.statsMachos.gmdMedioPonderadoG > 0
                    ? `${f.statsMachos.gmdMedioPonderadoG} g/d`
                    : '-'}
                </td>
                <td className="p-2 text-right font-mono font-medium text-rose-900">
                  {f.statsFemeas.gmdMedioPonderadoG > 0
                    ? `${f.statsFemeas.gmdMedioPonderadoG} g/d`
                    : '-'}
                </td>
                <td className="p-2 text-right font-mono font-bold text-emerald-800">
                  {f.statsGeral.gmdMedioPonderadoG > 0
                    ? `${f.statsGeral.gmdMedioPonderadoG} g/d`
                    : '-'}
                </td>
                <td className="p-2 text-right font-mono font-semibold">
                  {f.statsGeral.desvioMedio > 0
                    ? `+${f.statsGeral.desvioMedio}%`
                    : `${f.statsGeral.desvioMedio}%`}
                </td>
                <td className="p-2 text-right font-mono font-bold">
                  {f.statsGeral.emAlerta > 0 ? (
                    <span className="text-rose-700 font-bold">{f.statsGeral.emAlerta}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. RECORTE POR FRENTE OPERACIONAL (ARRENDAMENTO SEGREGADO) */}
      <div className="space-y-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
          <span>2. Segregação por Frente Operacional (Arrendamento vs Própria)</span>
        </h2>
        <table className="w-full text-left text-xs border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
              <th className="p-2 font-bold">Frente Operacional</th>
              <th className="p-2 font-bold text-right">Lotes</th>
              <th className="p-2 font-bold text-right">Cabeças</th>
              <th className="p-2 font-bold text-right">Meta (g/d)</th>
              <th className="p-2 font-bold text-right">GMD Real Ponderado</th>
              <th className="p-2 font-bold text-right">GDC Carcaça</th>
              <th className="p-2 font-bold text-right">Desvio</th>
              <th className="p-2 font-bold text-right">Lotes Críticos</th>
            </tr>
          </thead>
          <tbody>
            {recortesFrente.map((rf, i) => (
              <tr
                key={rf.frente}
                className={
                  rf.isArrendamento
                    ? 'bg-amber-50 font-medium'
                    : i % 2 === 0
                      ? 'bg-white'
                      : 'bg-gray-50'
                }
              >
                <td className="p-2 font-bold text-gray-900">
                  {rf.label} {rf.isArrendamento ? '• [SEGREGADO]' : ''}
                </td>
                <td className="p-2 text-right font-mono">{rf.stats.totalLotes}</td>
                <td className="p-2 text-right font-mono">{rf.stats.cabTotal}</td>
                <td className="p-2 text-right font-mono text-gray-600">
                  {rf.stats.gmdMetaMedioG} g/d
                </td>
                <td className="p-2 text-right font-mono font-bold text-emerald-800">
                  {rf.stats.gmdMedioPonderadoG > 0 ? `${rf.stats.gmdMedioPonderadoG} g/d` : '-'}
                </td>
                <td className="p-2 text-right font-mono text-purple-900">
                  {rf.stats.gdcMedioPonderadoG ? `${rf.stats.gdcMedioPonderadoG} g/d` : '-'}
                </td>
                <td className="p-2 text-right font-mono font-semibold">
                  {rf.stats.desvioMedio > 0
                    ? `+${rf.stats.desvioMedio}%`
                    : `${rf.stats.desvioMedio}%`}
                </td>
                <td className="p-2 text-right font-mono">
                  {rf.stats.emAlerta > 0 ? (
                    <span className="text-rose-700 font-bold">{rf.stats.emAlerta}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. BLOCOS DE LOTES SEPARADOS POR SEXO (MACHOS E FÊMEAS) */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 border-b pb-1">
          <span>3. Detalhamento Individual de Lotes por Sexo</span>
        </h2>

        {/* Machos */}
        <div className="space-y-1">
          <div className="bg-blue-800 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Bloco de Machos ({lotesMachos.length} lotes)</span>
            <span>Total Cab: {lotesMachos.reduce((s, i) => s + (i.lote.headcount || 0), 0)}</span>
          </div>
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
                <th className="p-1.5 font-bold">Lote</th>
                <th className="p-1.5 font-bold">Categoria</th>
                <th className="p-1.5 font-bold">Pasto</th>
                <th className="p-1.5 font-bold text-right">Perm.</th>
                <th className="p-1.5 font-bold text-right">Cab</th>
                <th className="p-1.5 font-bold text-right">Meta</th>
                <th className="p-1.5 font-bold text-right">GMD Real</th>
                <th className="p-1.5 font-bold text-right">Desvio</th>
                <th className="p-1.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {lotesMachos.map((item, i) => (
                <tr key={item.lote.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-1.5 font-bold text-gray-900">{item.lote.name}</td>
                  <td className="p-1.5 text-gray-600">{item.lote.category || '-'}</td>
                  <td className="p-1.5 text-gray-600">{item.lote.pasto_atual || '-'}</td>
                  <td className="p-1.5 text-right font-mono">{item.permanenciaDias} d</td>
                  <td className="p-1.5 text-right font-mono">{item.lote.headcount || 0}</td>
                  <td className="p-1.5 text-right font-mono">{item.gmdAlvoG} g/d</td>
                  <td className="p-1.5 text-right font-mono font-bold text-emerald-800">
                    {item.gmdRealG ? `${item.gmdRealG} g/d` : '-'}
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold">
                    {item.desvioPct !== null ? `${item.desvioPct}%` : '-'}
                  </td>
                  <td className="p-1.5 uppercase text-[10px] font-bold">
                    <span
                      className={
                        item.statusSemaforo === 'verde'
                          ? 'text-emerald-700'
                          : item.statusSemaforo === 'amarelo'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }
                    >
                      {item.statusSemaforo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fêmeas */}
        <div className="space-y-1 pt-2">
          <div className="bg-rose-800 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Bloco de Fêmeas ({lotesFemeas.length} lotes)</span>
            <span>Total Cab: {lotesFemeas.reduce((s, i) => s + (i.lote.headcount || 0), 0)}</span>
          </div>
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-300">
                <th className="p-1.5 font-bold">Lote</th>
                <th className="p-1.5 font-bold">Categoria</th>
                <th className="p-1.5 font-bold">Pasto</th>
                <th className="p-1.5 font-bold text-right">Perm.</th>
                <th className="p-1.5 font-bold text-right">Cab</th>
                <th className="p-1.5 font-bold text-right">Meta</th>
                <th className="p-1.5 font-bold text-right">GMD Real</th>
                <th className="p-1.5 font-bold text-right">Desvio</th>
                <th className="p-1.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {lotesFemeas.map((item, i) => (
                <tr key={item.lote.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-1.5 font-bold text-gray-900">{item.lote.name}</td>
                  <td className="p-1.5 text-gray-600">{item.lote.category || '-'}</td>
                  <td className="p-1.5 text-gray-600">{item.lote.pasto_atual || '-'}</td>
                  <td className="p-1.5 text-right font-mono">{item.permanenciaDias} d</td>
                  <td className="p-1.5 text-right font-mono">{item.lote.headcount || 0}</td>
                  <td className="p-1.5 text-right font-mono">{item.gmdAlvoG} g/d</td>
                  <td className="p-1.5 text-right font-mono font-bold text-emerald-800">
                    {item.gmdRealG ? `${item.gmdRealG} g/d` : '-'}
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold">
                    {item.desvioPct !== null ? `${item.desvioPct}%` : '-'}
                  </td>
                  <td className="p-1.5 uppercase text-[10px] font-bold">
                    <span
                      className={
                        item.statusSemaforo === 'verde'
                          ? 'text-emerald-700'
                          : item.statusSemaforo === 'amarelo'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }
                    >
                      {item.statusSemaforo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LOTES EM ALERTA E CAUSAS DIAGNOSTICADAS (AUDITORIA ZOOTÉCNICA) */}
      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-rose-800 border-b border-rose-300 pb-1 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-rose-700 inline" />
          <span>4. Auditoria de Desvios & Causas Registradas (Ações Corretivas)</span>
        </h2>
        {alertasComCausas.length > 0 ? (
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-rose-50 text-rose-950 border-b border-rose-200">
                <th className="p-1.5 font-bold">Lote</th>
                <th className="p-1.5 font-bold">Data</th>
                <th className="p-1.5 font-bold text-right">Desvio</th>
                <th className="p-1.5 font-bold">Status</th>
                <th className="p-1.5 font-bold">Causa Diagnosticada</th>
                <th className="p-1.5 font-bold">Contramedida Executada</th>
              </tr>
            </thead>
            <tbody>
              {alertasComCausas.map((alerta, i) => (
                <tr key={alerta.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-1.5 font-bold text-gray-900">{alerta.loteNome}</td>
                  <td className="p-1.5 font-mono text-gray-500">
                    {alerta.created ? format(new Date(alerta.created), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold text-rose-700">
                    {alerta.desvio_pct}%
                  </td>
                  <td className="p-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase ${alerta.status === 'aberto' ? 'text-rose-700' : 'text-emerald-700'}`}
                    >
                      {alerta.status}
                    </span>
                  </td>
                  <td className="p-1.5 text-gray-700 font-medium">
                    {alerta.causa || (
                      <span className="text-amber-700 italic">Pendente de diagnóstico</span>
                    )}
                  </td>
                  <td className="p-1.5 text-gray-600">
                    {alerta.contramedida || (
                      <span className="text-amber-700 italic">Pendente de contramedida</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-gray-500 italic p-2 border bg-gray-50 rounded">
            Nenhum lote com alerta zootécnico crítico no período.
          </p>
        )}
      </div>

      {/* 7. ASSINATURAS E VALIDAÇÃO TÉCNICA */}
      <div className="pt-8 border-t-2 border-gray-300 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="border-b border-gray-500 mb-1 w-3/4 mx-auto" />
          <span className="font-bold block">Responsável Técnico / Zootecnista</span>
          <span className="text-gray-500 text-[10px]">CRMV / CRMV-Z</span>
        </div>
        <div>
          <div className="border-b border-gray-500 mb-1 w-3/4 mx-auto" />
          <span className="font-bold block">Consultoria Nutricional</span>
          <span className="text-gray-500 text-[10px]">Parecer Técnico F3</span>
        </div>
        <div>
          <div className="border-b border-gray-500 mb-1 w-3/4 mx-auto" />
          <span className="font-bold block">Diretoria de Operações & Sócios</span>
          <span className="text-gray-500 text-[10px]">Pecuária Inteligente F3</span>
        </div>
      </div>
    </div>
  )
}
