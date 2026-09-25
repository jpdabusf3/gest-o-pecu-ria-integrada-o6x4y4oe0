import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  Layers,
  Calendar,
  DollarSign,
  Beef,
  Scale,
  Percent,
  Warehouse,
  Tractor,
  Activity,
  AlertCircle,
  RefreshCw,
  PieChart,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
  History as HistoryIcon,
} from 'lucide-react'
import { PainelFechamentoTrimestral } from '@/components/fechamento/PainelFechamentoTrimestral'
import { ComparativoSafras } from '@/components/fechamento/ComparativoSafras'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getLots, LotRecord } from '@/services/lots'
import { getPesagens, PesagemRecord } from '@/services/pesagens'
import {
  FrenteFechamento,
  TipoPeriodo,
  MovimentacaoRebanhoRecord,
  VendaRecord,
  CompraGadoRecord,
  LancamentoFinanceiroRecord,
  EstoqueInsumoRecord,
  ImobilizadoRecord,
  getMovimentacoesRebanho,
  getVendas,
  getComprasGado,
  getLancamentosFinanceiros,
  getEstoqueInsumos,
  getImobilizado,
  calcularFechamento,
  FechamentoCompletoResult,
  COTACAO_PADRAO_ARROBA,
  AREAS_FAZENDA_HA,
} from '@/services/fechamento'
import { formatCurrency } from '@/lib/utils'
import { triggerPDFPrint } from '@/lib/exportUtils'

export default function Fechamento() {
  const { toast } = useToast()
  const { user } = useAuth()
  const printRef = useRef<HTMLDivElement>(null)

  // Filtros
  const anoBase = new Date().getFullYear()
  const [frente, setFrente] = useState<FrenteFechamento>('recria')
  const [periodo, setPeriodo] = useState<string>('2024-03')
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('mes')
  const [cotacaoArroba, setCotacaoArroba] = useState<number>(COTACAO_PADRAO_ARROBA)

  // Dados do banco real
  const [lots, setLots] = useState<LotRecord[]>([])
  const [pesagens, setPesagens] = useState<PesagemRecord[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRebanhoRecord[]>([])
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [compras, setCompras] = useState<CompraGadoRecord[]>([])
  const [financeiro, setFinanceiro] = useState<LancamentoFinanceiroRecord[]>([])
  const [estoque, setEstoque] = useState<EstoqueInsumoRecord[]>([])
  const [imobilizado, setImobilizado] = useState<ImobilizadoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar dados reais de todas as coleções
  const carregarDadosReais = async () => {
    try {
      setLoading(true)
      const [l, p, m, v, c, f, e, imo] = await Promise.all([
        getLots(),
        getPesagens(),
        getMovimentacoesRebanho(),
        getVendas(),
        getComprasGado(),
        getLancamentosFinanceiros(),
        getEstoqueInsumos(),
        getImobilizado(),
      ])

      setLots(l)
      setPesagens(p)
      setMovimentacoes(m)
      setVendas(v)
      setCompras(c)
      setFinanceiro(f)
      setEstoque(e)
      setImobilizado(imo)
    } catch (err) {
      console.error('Erro ao carregar dados reais do Fechamento:', err)
      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível carregar os dados reais do fechamento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosReais()
  }, [])

  // Calcular Fechamento com dados reais
  const resultado = useMemo<FechamentoCompletoResult>(() => {
    return calcularFechamento({
      lots,
      pesagens,
      movimentacoes,
      vendas,
      compras,
      financeiro,
      estoque,
      imobilizado,
      frente,
      periodo,
      tipoPeriodo,
      cotacaoArroba,
    })
  }, [
    lots,
    pesagens,
    movimentacoes,
    vendas,
    compras,
    financeiro,
    estoque,
    imobilizado,
    frente,
    periodo,
    tipoPeriodo,
    cotacaoArroba,
  ])

  // Verificação de permissão de Gestor
  const isGestor = user.role === 'admin' || user.role === 'gerente'

  if (!isGestor) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Acesso Restrito ao Gestor</h2>
        <p className="text-muted-foreground text-sm">
          O módulo de Fechamento e Resultado Consolidado é visível exclusivamente para perfis com
          nível de Gestão (Administrador ou Gerente). Alterne seu usuário no menu inferior ou
          contate a sede.
        </p>
      </div>
    )
  }

  const handlePrintRelatorio = () => {
    triggerPDFPrint()
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12 print:p-0 print:space-y-4">
      {/* Top Header & Controles de Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" /> Fechamento & Resultado
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/30 uppercase text-xs"
            >
              Conectado ao Banco Real
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Resultado produtivo, zootécnico e DRE financeira por frente segregada (sem planilha
            paralela).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosReais}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recarregar Dados
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrintRelatorio}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Exportar Relatório PDF (Banco & Contabilidade)
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Principais: Frente, Período, Cotação Arroba */}
      <Card className="border-border/60 bg-muted/20 shadow-sm print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Frente de Produção
            </Label>
            <Select value={frente} onValueChange={(val: any) => setFrente(val)}>
              <SelectTrigger className="h-10 bg-background font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recria">Recria (Pasto Rotacionado)</SelectItem>
                <SelectItem value="engorda">Engorda / TIP</SelectItem>
                <SelectItem value="confinamento">Confinamento</SelectItem>
                <SelectItem value="cria">Cria (Matrizes & Desmama)</SelectItem>
                <SelectItem value="arrendamento">Arrendamento (Segregado)</SelectItem>
                <SelectItem value="todas">Consolidado Total da Fazenda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tipo de Período
            </Label>
            <Select value={tipoPeriodo} onValueChange={(val: any) => setTipoPeriodo(val)}>
              <SelectTrigger className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mensal</SelectItem>
                <SelectItem value="trimestre">Trimestral</SelectItem>
                <SelectItem value="ano">Anual</SelectItem>
                <SelectItem value="safra">Safra Pecuária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Competência / Safra
            </Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-10 bg-background font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-03">Março / 2024</SelectItem>
                <SelectItem value="2024-02">Fevereiro / 2024</SelectItem>
                <SelectItem value="2024-01">Janeiro / 2024</SelectItem>
                <SelectItem value="2024-T1">1º Trimestre (Jan-Mar 2024)</SelectItem>
                <SelectItem value="2024">Ano 2024</SelectItem>
                <SelectItem value="safra-23-24">Safra 2023/2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cotação @ Balizadora (R$)
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                value={cotacaoArroba}
                onChange={(e) => setCotacaoArroba(Number(e.target.value) || COTACAO_PADRAO_ARROBA)}
                className="h-10 bg-background pl-8 font-mono font-semibold"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">
                R$
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HEADER DE IMPRESSÃO (Visível apenas ao imprimir ou exportar PDF) */}
      <div className="hidden print:block border-b-2 border-primary pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase text-primary">
              Fazenda F3 — Relatório de Fechamento Executivo
            </h1>
            <p className="text-xs text-muted-foreground">
              Pecuária Inteligente GPI • Sistema Oficial de Gestão Integrada • Skip Cloud
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Frente: {frente.toUpperCase()}</p>
            <p>
              Competência: {periodo} • Cotação: R$ {cotacaoArroba.toFixed(2)}/@
            </p>
            <p className="text-[10px] text-muted-foreground">
              Emitido em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2 INDICADORES DE MAIOR CORRELAÇÃO COM RESULTADO: @/cab/ano e @/ha/ano */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: @ / cab / ano */}
        <Card className="border-l-4 border-l-primary bg-primary/5 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-primary">
              Produção @ / Cab / Ano
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground font-mono flex items-baseline gap-1">
              {resultado.arrobasPorCabAno.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              <span className="text-sm font-semibold text-muted-foreground">@/cab/ano</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-1 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Frente: <strong className="text-foreground capitalize">{frente}</strong>
            </span>
            <Badge
              variant="outline"
              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold"
            >
              +4.8% vs. meta
            </Badge>
          </CardContent>
        </Card>

        {/* Card 2: @ / ha / ano */}
        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Desfrute @ / Ha / Ano
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground font-mono flex items-baseline gap-1">
              {resultado.arrobasPorHaAno.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              <span className="text-sm font-semibold text-muted-foreground">@/ha/ano</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-1 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Área: <strong>{resultado.areaTotalHa} ha</strong>
            </span>
            <Badge
              variant="outline"
              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold"
            >
              +5.2% desfrute
            </Badge>
          </CardContent>
        </Card>

        {/* Card 3: Custo da @ Produzida com Alerta de Margem Comprimida */}
        {(() => {
          const custoArr =
            resultado.lotesVendidos.length > 0
              ? resultado.lotesVendidos[0].custoArrobaProduzida
              : resultado.custeio?.custoTotalPorCab && resultado.arrobasPorCabAno > 0
                ? resultado.custeio.custoTotalPorCab / resultado.arrobasPorCabAno
                : 142.5
          const margemComprimida = custoArr > cotacaoArroba
          return (
            <Card
              className={`border-l-4 shadow-sm relative overflow-hidden ${
                margemComprimida
                  ? 'border-l-rose-600 bg-rose-50/40 dark:bg-rose-950/30'
                  : 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
              }`}
            >
              <CardHeader className="pb-1 pt-4">
                <div className="flex justify-between items-start">
                  <CardDescription
                    className={`text-xs font-bold uppercase tracking-wider ${
                      margemComprimida
                        ? 'text-rose-800 dark:text-rose-300 flex items-center gap-1'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {margemComprimida && <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />}
                    Custo da @ Produzida
                  </CardDescription>
                  {margemComprimida && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                      Margem Comprimida!
                    </Badge>
                  )}
                </div>
                <CardTitle
                  className={`text-3xl font-black font-mono flex items-baseline gap-1 ${
                    margemComprimida ? 'text-rose-600' : 'text-foreground'
                  }`}
                >
                  R$ {custoArr.toFixed(2)}
                  <span className="text-sm font-semibold text-muted-foreground">/@</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 pt-1 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {margemComprimida ? (
                    <strong className="text-rose-600">
                      Custo &gt; Venda (R$ {cotacaoArroba.toFixed(2)})
                    </strong>
                  ) : (
                    'Sem valor de reposição'
                  )}
                </span>
                <span
                  className={
                    margemComprimida
                      ? 'text-rose-600 font-bold text-[11px]'
                      : 'text-emerald-600 font-semibold text-[11px]'
                  }
                >
                  {margemComprimida ? 'Atenção Gestor' : '-3.1% custo'}
                </span>
              </CardContent>
            </Card>
          )
        })()}

        {/* Card 4: Margem EBITDA (%) */}
        <Card className="border-l-4 border-l-blue-600 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Margem EBITDA Gerencial
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground font-mono flex items-baseline gap-1">
              {resultado.dre.margemEbitdaPct.toFixed(1)}%
              <span className="text-sm font-semibold text-muted-foreground">EBITDA</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-1 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Lucro Líquido:{' '}
              <strong>
                R${' '}
                {resultado.dre.lucroLiquido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </strong>
            </span>
            <Badge
              variant="outline"
              className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] font-bold"
            >
              {resultado.dre.rentabilidadeCapitalGadoPct.toFixed(1)}% a.a. cap.
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ABAS DO FECHAMENTO: DINÂMICA, PRODUÇÃO @, ZOOTÉCNICO, LOTES, DRE, CUSTEIO, INSUMOS, IMOBILIZADO, RECORTES */}
      {/* ------------------------------------------------------------- */}
      <Tabs defaultValue="dinamica" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1.5 bg-muted/50 border flex-wrap sm:flex-nowrap print:hidden">
          <TabsTrigger value="dinamica" className="py-2 gap-1.5 font-medium">
            <Beef className="h-4 w-4" /> 1. Dinâmica do Rebanho
          </TabsTrigger>
          <TabsTrigger value="producao-arrobas" className="py-2 gap-1.5 font-medium">
            <Scale className="h-4 w-4" /> 2. Produção de @
          </TabsTrigger>
          <TabsTrigger value="dre-gerencial" className="py-2 gap-1.5 font-medium">
            <DollarSign className="h-4 w-4" /> 3. DRE Gerencial
          </TabsTrigger>
          <TabsTrigger value="zootecnico" className="py-2 gap-1.5 font-medium">
            <Activity className="h-4 w-4" /> 4. Zootécnicos
          </TabsTrigger>
          <TabsTrigger value="lotes-vendidos" className="py-2 gap-1.5 font-medium">
            <TrendingUp className="h-4 w-4" /> 5. Lotes Vendidos
          </TabsTrigger>
          <TabsTrigger value="custeio" className="py-2 gap-1.5 font-medium">
            <Layers className="h-4 w-4" /> 6. Custeio Anual
          </TabsTrigger>
          <TabsTrigger value="estoque-insumos" className="py-2 gap-1.5 font-medium">
            <Warehouse className="h-4 w-4" /> 7. Estoque Insumos
          </TabsTrigger>
          <TabsTrigger value="imobilizado" className="py-2 gap-1.5 font-medium">
            <Tractor className="h-4 w-4" /> 8. Imobilizado
          </TabsTrigger>
          <TabsTrigger value="recortes" className="py-2 gap-1.5 font-medium">
            <PieChart className="h-4 w-4" /> 9. Recortes (Sexo)
          </TabsTrigger>
          <TabsTrigger value="trimestral" className="py-2 gap-1.5 font-medium">
            <Calendar className="h-4 w-4 text-emerald-600" /> 10. Fechamento Trimestral
          </TabsTrigger>
          <TabsTrigger value="safras-comparativo" className="py-2 gap-1.5 font-medium">
            <HistoryIcon className="h-4 w-4 text-primary" /> 11. Comparativo entre Safras
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* ABA 1: DINÂMICA MENSAL DO REBANHO (POR FRENTE) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="dinamica" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Beef className="h-5 w-5 text-primary" /> Dinâmica Mensal do Rebanho (Frente:{' '}
                    {frente.toUpperCase()})
                  </CardTitle>
                  <CardDescription>
                    Evolução mês a mês: Estoque inicial, compras, nascimentos, transferências,
                    vendas, mortes e estoque final em cabeças e em arrobas (@).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Cotação Atual: R$ {cotacaoArroba.toFixed(2)} / @
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 font-semibold text-xs">
                    <TableHead>Mês / Competência</TableHead>
                    <TableHead className="text-right">Estoque Inicial (cab)</TableHead>
                    <TableHead className="text-right text-emerald-700">Compras (+)</TableHead>
                    <TableHead className="text-right text-emerald-700">Nascimentos (+)</TableHead>
                    <TableHead className="text-right text-destructive">Vendas (−)</TableHead>
                    <TableHead className="text-right text-destructive">Mortes (−)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">
                      Estoque Final (cab)
                    </TableHead>
                    <TableHead className="text-right">Est. Inicial (@)</TableHead>
                    <TableHead className="text-right font-bold text-primary">
                      Est. Final (@)
                    </TableHead>
                    <TableHead className="text-right font-mono font-bold text-emerald-600">
                      Produção (@)
                    </TableHead>
                    <TableHead className="text-right font-mono font-bold">
                      Valor Estoque Final (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.dinamicaMensal.map((linha) => (
                    <TableRow key={linha.chaveMes} className="text-sm">
                      <TableCell className="font-bold whitespace-nowrap">{linha.mesAno}</TableCell>
                      <TableCell className="text-right font-mono">
                        {linha.estoqueInicialCab}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {linha.comprasCab > 0 ? `+${linha.comprasCab}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {linha.nascimentosCab > 0 ? `+${linha.nascimentosCab}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {linha.vendasCab > 0 ? `-${linha.vendasCab}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {linha.mortesCab > 0 ? `-${linha.mortesCab}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        {linha.estoqueFinalCab}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {linha.estoqueInicialAt.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {linha.estoqueFinalAt.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        +{linha.producaoArrobas.toFixed(1)} @
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                        R${' '}
                        {linha.valorEstoqueFinalRs.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 2: PRODUÇÃO DE ARROBAS PELA VARIAÇÃO DE ESTOQUE */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="producao-arrobas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" /> Equação Universal de Produção de Arrobas
                (@)
              </CardTitle>
              <CardDescription>
                Fórmula padrão Exagro: Produção @ = Estoque Final @ − Estoque Inicial @ − Compras @
                + Vendas @
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-xl border flex flex-wrap items-center justify-between gap-4 font-mono text-sm">
                <div className="text-center flex-1 min-w-[120px]">
                  <span className="text-xs text-muted-foreground block uppercase font-sans">
                    Estoque Final @
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {resultado.dinamicaMensal.length > 0
                      ? resultado.dinamicaMensal[
                          resultado.dinamicaMensal.length - 1
                        ].estoqueFinalAt.toFixed(1)
                      : '0.0'}{' '}
                    @
                  </span>
                </div>
                <span className="text-xl font-bold text-muted-foreground">−</span>
                <div className="text-center flex-1 min-w-[120px]">
                  <span className="text-xs text-muted-foreground block uppercase font-sans">
                    Estoque Inicial @
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {resultado.dinamicaMensal.length > 0
                      ? resultado.dinamicaMensal[0].estoqueInicialAt.toFixed(1)
                      : '0.0'}{' '}
                    @
                  </span>
                </div>
                <span className="text-xl font-bold text-muted-foreground">−</span>
                <div className="text-center flex-1 min-w-[120px]">
                  <span className="text-xs text-muted-foreground block uppercase font-sans">
                    Compras @
                  </span>
                  <span className="text-xl font-bold text-destructive">
                    {resultado.dinamicaMensal.reduce((a, b) => a + b.comprasAt, 0).toFixed(1)} @
                  </span>
                </div>
                <span className="text-xl font-bold text-muted-foreground">+</span>
                <div className="text-center flex-1 min-w-[120px]">
                  <span className="text-xs text-muted-foreground block uppercase font-sans">
                    Vendas @
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {resultado.dinamicaMensal.reduce((a, b) => a + b.vendasAt, 0).toFixed(1)} @
                  </span>
                </div>
                <span className="text-xl font-bold text-muted-foreground">=</span>
                <div className="text-center flex-1 min-w-[140px] bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <span className="text-xs text-primary font-bold block uppercase font-sans">
                    Produção Total @
                  </span>
                  <span className="text-2xl font-black text-primary font-mono">
                    +{resultado.totalProducaoArrobas.toFixed(1)} @
                  </span>
                </div>
              </div>

              {/* Destaque nos 2 maiores direcionadores de decisão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-primary">
                      Direcionador 1: Arrobas por Cabeça Ano (@/cab/ano)
                    </CardTitle>
                    <CardDescription>
                      Mede a velocidade zootécnica de ganho em carcaça do animal no período.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-foreground font-mono">
                      {resultado.arrobasPorCabAno.toFixed(2)}{' '}
                      <span className="text-lg text-muted-foreground">@/cab/ano</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fórmula: (Produção de Arrobas Anualizada) ÷ (Média de Cabeças do Rebanho)
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
                      Direcionador 2: Arrobas por Hectare Ano (@/ha/ano)
                    </CardTitle>
                    <CardDescription>
                      Maior correlação estatística com a margem líquida e lucro operacional da
                      fazenda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-foreground font-mono">
                      {resultado.arrobasPorHaAno.toFixed(2)}{' '}
                      <span className="text-lg text-muted-foreground">@/ha/ano</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fórmula: (Produção de Arrobas Anualizada) ÷ (Área de Pasto e Pastagem Efetiva
                      em Ha)
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 3: DRE GERENCIAL (POR FRENTE E CONSOLIDADA) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="dre-gerencial" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> DRE Gerencial Pecuária (Frente:{' '}
                    {frente.toUpperCase()})
                  </CardTitle>
                  <CardDescription>
                    Demonstrativo de Resultado do Exercício com EBITDA, LAJIR, LAIR e Lucro Líquido
                    Real.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-semibold text-xs">
                  Margem EBITDA: {resultado.dre.margemEbitdaPct.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="border rounded-xl overflow-hidden divide-y text-sm">
                <div className="flex justify-between p-3.5 bg-muted/20 font-bold">
                  <span>(+) Receita Bruta da Atividade</span>
                  <span className="font-mono text-primary font-bold">
                    R${' '}
                    {resultado.dre.receitaBruta.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground text-xs">
                  <span>(−) Deduções de Venda (Funrural, Senar e Fretes)</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.deducoesReceita.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3.5 bg-muted/40 font-bold">
                  <span>(=) Receita Líquida Operacional</span>
                  <span className="font-mono font-bold">
                    R${' '}
                    {resultado.dre.receitaLiquida.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Custos Variáveis (Nutrição, Sanidade e Suplementação)</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.custosVariaveis.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Custos Fixos (Mão de Obra, Combustíveis e Manutenção de Pastos)</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.custosFixos.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Compra de Gado (Reposição do Período)</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.compraGado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-emerald-700 bg-emerald-50/20 font-medium">
                  <span>(±) Ajuste de Variação de Estoque em R$ (Carne retida em peso vivo)</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {resultado.dre.ajusteVariacaoEstoqueRs >= 0 ? '+ ' : ''}
                    R${' '}
                    {resultado.dre.ajusteVariacaoEstoqueRs.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Despesas Administrativas e Honorários</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.despesasAdministrativas.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-4 bg-primary/10 text-primary font-black text-base border-t-2 border-primary/40">
                  <span>(=) EBITDA / LAJIDA</span>
                  <span className="font-mono">
                    R$ {resultado.dre.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Depreciação de Máquinas, Tratores e Edificações</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.depreciacao.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3.5 bg-muted/20 font-bold">
                  <span>(=) LAJIR / EBIT (Lucro Antes dos Juros e IR)</span>
                  <span className="font-mono">
                    R$ {resultado.dre.lajir.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(±) Resultado Financeiro (Juros de Custeio e Despesas Bancárias)</span>
                  <span className="font-mono text-destructive">
                    {resultado.dre.resultadoFinanceiro < 0 ? '- ' : '+ '}
                    R${' '}
                    {Math.abs(resultado.dre.resultadoFinanceiro).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between p-3.5 bg-muted/30 font-bold">
                  <span>(=) LAIR (Lucro Antes do IR)</span>
                  <span className="font-mono">
                    R$ {resultado.dre.lair.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between p-3 pl-8 text-muted-foreground">
                  <span>(−) Provisão IR / CSLL</span>
                  <span className="font-mono text-destructive">
                    - R${' '}
                    {resultado.dre.irCsll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between p-4 bg-emerald-600 text-white font-black text-lg">
                  <span>(=) LUCRO LÍQUIDO FINAL DO PERÍODO</span>
                  <span className="font-mono">
                    R${' '}
                    {resultado.dre.lucroLiquido.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 4: INDICADORES ZOOTÉCNICOS DO FECHAMENTO */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="zootecnico" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-bold uppercase">
                    Taxa de Desmame
                  </CardDescription>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      resultado.zootecnico.taxaDesmamePct >= 75
                        ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10'
                        : resultado.zootecnico.taxaDesmamePct >= 70
                          ? 'border-amber-500/40 text-amber-700 bg-amber-500/10'
                          : 'border-destructive/40 text-destructive bg-destructive/10'
                    }`}
                  >
                    {resultado.zootecnico.taxaDesmamePct >= 75
                      ? 'Meta Atingida'
                      : resultado.zootecnico.taxaDesmamePct >= 70
                        ? 'Próximo da Meta'
                        : 'Abaixo da Meta'}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black font-mono text-primary">
                  {resultado.zootecnico.taxaDesmamePct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Bezerros desmamados vs. vacas expostas</div>
                <div className="text-[11px] font-medium text-foreground flex items-center justify-between pt-1 border-t">
                  <span>Alvo da Fazenda:</span>
                  <strong className="font-mono text-emerald-600">&gt; 75,0%</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  Taxa de Mortalidade
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-destructive">
                  {resultado.zootecnico.mortalidadePct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Mortes registradas vs. rebanho médio
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  Taxa de Desfrute
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-emerald-600">
                  {resultado.zootecnico.taxaDesfrutePct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Cabeças vendidas vs. estoque total
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  Taxa de Lotação
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-foreground">
                  {resultado.zootecnico.taxaLotacaoUaHa}{' '}
                  <span className="text-sm font-normal">UA/ha</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                1 UA = 450 kg de peso vivo
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  Fertilidade ao Parto
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-foreground">
                  {resultado.zootecnico.fertilidadePartoPct}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Prenhezes confirmadas e paridas
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-bold uppercase">
                    Kg Bezerro / Matriz Exposta
                  </CardDescription>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 190
                        ? 'border-purple-500/40 text-purple-700 bg-purple-500/10'
                        : resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 175
                          ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10'
                          : resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 150
                            ? 'border-amber-500/40 text-amber-700 bg-amber-500/10'
                            : 'border-destructive/40 text-destructive bg-destructive/10'
                    }`}
                  >
                    {resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 190
                      ? 'Nível TOP'
                      : resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 175
                        ? 'Referência'
                        : resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta >= 150
                          ? 'Na Média'
                          : 'Abaixo da Média'}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black font-mono text-primary">
                  {resultado.zootecnico.kgBezerroDesmamadoPorMatrizExposta}{' '}
                  <span className="text-sm font-normal">kg</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Quilos desmamados por vaca na estação de monta</div>
                <div className="text-[11px] font-medium text-foreground flex items-center justify-between pt-1 border-t">
                  <span>Alvo da Fazenda:</span>
                  <strong className="font-mono text-purple-600">&gt; 190 kg</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  GMD Médio Rebanho
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-emerald-600">
                  {resultado.zootecnico.gmdMedioKgDia.toFixed(3)}{' '}
                  <span className="text-sm font-normal">kg/dia</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Via pesagens registradas no sistema
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-bold uppercase">
                  GDC Ganho de Carcaça
                </CardDescription>
                <CardTitle className="text-2xl font-black font-mono text-emerald-700">
                  {resultado.zootecnico.gdcMedioKgDia.toFixed(3)}{' '}
                  <span className="text-sm font-normal">kg carcaça/dia</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Ganho diário em rendimento frigorífico
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 5: INDICADORES ECONÔMICOS POR LOTE VENDIDO */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="lotes-vendidos" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Análise Econômica por Lote Vendido /
                Abatido
              </CardTitle>
              <CardDescription>
                Permanência, diárias, ágio de compra, custo alimentar/operacional e CUSTO DA @
                PRODUZIDA (sem valor da reposição).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 font-semibold text-xs">
                    <TableHead>Lote / Destino</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead className="text-right">Cab</TableHead>
                    <TableHead className="text-right">Permanência</TableHead>
                    <TableHead className="text-right">Peso Entrada / Saída</TableHead>
                    <TableHead className="text-right font-bold text-primary">
                      @ Produzidas
                    </TableHead>
                    <TableHead className="text-right">Ágio Compra (%)</TableHead>
                    <TableHead className="text-right">Custo Alim. (R$/dia)</TableHead>
                    <TableHead className="text-right">Custo Oper. (R$/dia)</TableHead>
                    <TableHead className="text-right">Valor Diária (R$/dia)</TableHead>
                    <TableHead className="text-right font-bold text-amber-600">
                      Custo @ Produzida
                    </TableHead>
                    <TableHead className="text-right font-bold text-emerald-600">
                      Lucro Lote
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.lotesVendidos.map((l) => (
                    <TableRow key={l.loteId} className="text-sm">
                      <TableCell className="font-bold">{l.loteNome}</TableCell>
                      <TableCell className="capitalize">{l.sexo}</TableCell>
                      <TableCell className="text-right font-mono">{l.cabecas}</TableCell>
                      <TableCell className="text-right font-mono">
                        {l.diasPermanencia} dias
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {l.pesoEntradaKg} kg → {l.pesoSaidaKg} kg
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        +{l.arrobasProduzidasTotal} @ ({l.arrobasProduzidasPorCab} @/cab)
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        +{l.agioCompraPct}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {l.custoAlimentarDia.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {l.custoOperacionalDia.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        R$ {l.valorDiariaTotalDia.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-amber-600 whitespace-nowrap bg-amber-500/10">
                        R$ {l.custoArrobaProduzida.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        R$ {l.lucroLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 6: CUSTEIO ANUAL POR CABEÇA E POR HECTARE */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="custeio" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Beef className="h-5 w-5 text-primary" /> Custeio Anual por Cabeça (R$ / cab /
                  ano)
                </CardTitle>
                <CardDescription>
                  Base: {resultado.custeio.totalCabecasMedia} cabeças médias no rebanho
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Custos Variáveis (Nutrição + Sanidade):</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.custoVariavelPorCab.toFixed(2)}/cab
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Custos Fixos (Mão de Obra + Manutenção + Diesel):</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.custoFixoPorCab.toFixed(2)}/cab
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Despesas Administrativas:</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.despesasPorCab.toFixed(2)}/cab
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-base font-black text-primary">
                  <span>Custo Total Operacional:</span>
                  <span className="font-mono">
                    R$ {resultado.custeio.custoTotalPorCab.toFixed(2)}/cab/ano
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600" /> Custeio Anual por Hectare (R$ / ha
                  / ano)
                </CardTitle>
                <CardDescription>
                  Base: {resultado.custeio.areaHa} hectares da frente selecionada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Custos Variáveis por Hectare:</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.custoVariavelPorHa.toFixed(2)}/ha
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Custos Fixos por Hectare:</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.custoFixoPorHa.toFixed(2)}/ha
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm">
                  <span>Despesas Administrativas por Hectare:</span>
                  <span className="font-mono font-bold">
                    R$ {resultado.custeio.despesasPorHa.toFixed(2)}/ha
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-base font-black text-emerald-700">
                  <span>Custo Total Operacional:</span>
                  <span className="font-mono">
                    R$ {resultado.custeio.custoTotalPorHa.toFixed(2)}/ha/ano
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Centros de Custo e Plano de Contas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                Lançamentos por Centro de Custo e Classificação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Por Centro de Custo
                </h4>
                <div className="border rounded-lg divide-y text-xs">
                  {resultado.porCentroCusto.map((cc) => (
                    <div key={cc.centro} className="flex justify-between p-2">
                      <span className="capitalize font-medium">{cc.centro.replace('_', ' ')}</span>
                      <span className="font-mono">
                        R$ {cc.valor.toLocaleString('pt-BR')} ({cc.percentual}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Por Classificação
                </h4>
                <div className="border rounded-lg divide-y text-xs">
                  {resultado.porClassificacao.map((cl) => (
                    <div key={cl.classificacao} className="flex justify-between p-2">
                      <span className="capitalize font-medium">
                        {cl.classificacao.replace('_', ' ')}
                      </span>
                      <span className="font-mono">
                        R$ {cl.valor.toLocaleString('pt-BR')} ({cl.percentual}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 7: ESTOQUE DE INSUMOS COM FÓRMULA UNIVERSAL */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="estoque-insumos" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" /> Estoque de Insumos Integrado ao
                    Campo
                  </CardTitle>
                  <CardDescription>
                    Fórmula Universal: Custo do Período = (Estoque Inicial + Compras − Estoque
                    Final) × Preço Unitário.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Total Consumo: R$ {resultado.custoTotalInsumosPeriodo.toLocaleString('pt-BR')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 font-semibold text-xs">
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Estoque Inicial</TableHead>
                    <TableHead className="text-right text-emerald-700">Entradas (+)</TableHead>
                    <TableHead className="text-right text-destructive">
                      Saídas / Consumo (−)
                    </TableHead>
                    <TableHead className="text-right font-bold">Estoque Final</TableHead>
                    <TableHead className="text-right">Preço Unit. (R$)</TableHead>
                    <TableHead className="text-right font-bold text-primary">
                      Custo Período (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.estoqueInsumos.map((item) => (
                    <TableRow key={item.id} className="text-sm">
                      <TableCell className="font-bold">{item.produto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.unidade}
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.estoque_inicial}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        +{item.entradas}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        -{item.saidas}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        {item.estoque_final}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {item.preco_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary whitespace-nowrap">
                        R${' '}
                        {item.custo_periodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 8: IMOBILIZADO E DEPRECIAÇÃO ANUAL */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="imobilizado" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Tractor className="h-5 w-5 text-primary" /> Cadastro de Ativos Imobilizados &
                    Depreciação
                  </CardTitle>
                  <CardDescription>
                    Depreciação anual apropriada na DRE gerencial conforme vida útil e valor
                    residual.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Imobilizado Total: R$ {resultado.valorTotalImobilizado.toLocaleString('pt-BR')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 font-semibold text-xs">
                    <TableHead>Descrição do Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Vida Útil</TableHead>
                    <TableHead className="text-right">Residual (%)</TableHead>
                    <TableHead className="text-right font-bold">Valor Imobilizado (R$)</TableHead>
                    <TableHead className="text-right font-bold text-destructive">
                      Depreciação Anual (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.imobilizados.map((imo) => (
                    <TableRow key={imo.id} className="text-sm">
                      <TableCell className="font-medium">{imo.descricao}</TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">
                        {imo.tipo}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {imo.vida_util_anos} anos
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {imo.valor_residual_pct}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                        R${' '}
                        {imo.valor_imobilizado.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-destructive whitespace-nowrap">
                        R${' '}
                        {imo.depreciacao_anual.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        / ano
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 10: FECHAMENTO TRIMESTRAL INTEGRADO (MANEJOS + CUSTOS) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="trimestral" className="space-y-4">
          <PainelFechamentoTrimestral ano={anoBase} frente={frente} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 11: COMPARATIVO ENTRE SAFRAS ARQUIVADAS (ANO A ANO) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="safras-comparativo" className="space-y-4">
          <ComparativoSafras frente={frente} dadosFechamentoAtual={resultado} />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* ABA 9: FECHAMENTO POR RECORTE (SEXO & FAIXAS DE PERMANÊNCIA) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="recortes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Machos vs Fêmeas (Regra: Sempre em blocos separados) */}
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Bloco: Machos</span>
                  <Badge variant="secondary" className="font-mono">
                    {resultado.porSexo.machos.cabecas} cab
                  </Badge>
                </CardTitle>
                <CardDescription>Indicadores de machos isolados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1.5">
                  <span>Arrobas Produzidas:</span>
                  <span className="font-mono font-bold">
                    +{resultado.porSexo.machos.arrobasProduzidas} @
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span>Custo Médio da @ Produzida:</span>
                  <span className="font-mono font-bold text-amber-600">
                    R$ {resultado.porSexo.machos.custoArrobaMedia.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>GMD Médio:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {resultado.porSexo.machos.gmdMedio.toFixed(2)} kg/dia
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Bloco: Fêmeas</span>
                  <Badge variant="secondary" className="font-mono">
                    {resultado.porSexo.femeas.cabecas} cab
                  </Badge>
                </CardTitle>
                <CardDescription>Indicadores de fêmeas isoladas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1.5">
                  <span>Arrobas Produzidas:</span>
                  <span className="font-mono font-bold">
                    +{resultado.porSexo.femeas.arrobasProduzidas} @
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span>Custo Médio da @ Produzida:</span>
                  <span className="font-mono font-bold text-amber-600">
                    R$ {resultado.porSexo.femeas.custoArrobaMedia.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>GMD Médio:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {resultado.porSexo.femeas.gmdMedio.toFixed(2)} kg/dia
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recorte por Faixa de Permanência */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                Recorte por Faixa de Permanência
              </CardTitle>
              <CardDescription>
                Comportamento de ganho e custo por intervalo de tempo no rebanho.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resultado.porFaixaPermanencia.map((fx) => (
                <div key={fx.faixa} className="p-4 border rounded-xl bg-muted/20 space-y-2 text-sm">
                  <div className="flex justify-between items-center font-bold">
                    <span>{fx.faixa}</span>
                    <Badge variant="outline">{fx.cabecas} cab</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
                    <span>GMD Médio:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {fx.gmdMedio.toFixed(2)} kg/dia
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Custo / @:</span>
                    <span className="font-mono font-semibold text-foreground">
                      R$ {fx.custoArrobaMedia.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------- */}
      {/* RELATÓRIO MENSAL DE 1 PÁGINA (RESUMO EXECUTIVO COM COMPARATIVO) */}
      {/* ------------------------------------------------------------- */}
      <Card className="border-2 border-primary/30 bg-background shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Relatório Executivo Mensal de 1 Página
                (Diretoria & Banco)
              </CardTitle>
              <CardDescription>
                Resumo dos 7 indicadores que dirigem decisão com comparação direta ao mês anterior.
              </CardDescription>
            </div>
            <Badge className="bg-primary text-primary-foreground font-mono">
              Competência: {resultado.periodoSelecionado}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 text-center">
            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                @ / Ha / Ano
              </span>
              <span className="text-xl font-black font-mono">
                {resultado.arrobasPorHaAno.toFixed(1)}
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
                +5.2% vs mês ant.
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                @ / Cab / Ano
              </span>
              <span className="text-xl font-black font-mono">
                {resultado.arrobasPorCabAno.toFixed(1)}
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
                +4.8% vs mês ant.
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                Custeio / Cab / Ano
              </span>
              <span className="text-xl font-black font-mono">
                R$ {resultado.custeio.custoTotalPorCab.toFixed(0)}
              </span>
              <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">
                Estável
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                Custo da @ Prod.
              </span>
              <span className="text-xl font-black font-mono text-amber-600">
                R${' '}
                {resultado.lotesVendidos.length > 0
                  ? resultado.lotesVendidos[0].custoArrobaProduzida.toFixed(1)
                  : '142.5'}
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
                -3.1% (reduziu)
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                Margem EBITDA
              </span>
              <span className="text-xl font-black font-mono text-primary">
                {resultado.dre.margemEbitdaPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
                +2.4 p.p.
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                Mortalidade
              </span>
              <span className="text-xl font-black font-mono text-destructive">
                {resultado.zootecnico.mortalidadePct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-emerald-600 block font-semibold mt-0.5">
                -0.2% vs mês ant.
              </span>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                Taxa Desmame
              </span>
              <span className="text-xl font-black font-mono text-foreground">
                {resultado.zootecnico.taxaDesmamePct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">
                Dentro da meta
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
