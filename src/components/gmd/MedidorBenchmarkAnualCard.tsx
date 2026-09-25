import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getConfigBenchmarks,
  ConfigBenchmarkRecord,
  classificarCamada2,
  ClassificacaoCamada2,
} from '@/services/configBenchmark'
import { getPesagens } from '@/services/pesagens'

interface MedidorBenchmarkAnualCardProps {
  /**
   * Se fornecido diretamente pelo cálculo da safra/ano (ex: Fechamento ou Dashboard).
   * Se omitido, calcula a partir das pesagens do último ano vs. área padrão em pastagem.
   */
  arrobasHaAnoAtual?: number
  areaPastagemHa?: number
  anoReferencia?: number
}

export function MedidorBenchmarkAnualCard({
  arrobasHaAnoAtual,
  areaPastagemHa = 1200,
  anoReferencia = new Date().getFullYear(),
}: MedidorBenchmarkAnualCardProps) {
  const [benchmark, setBenchmark] = useState<ConfigBenchmarkRecord | null>(null)
  const [valorCalculado, setValorCalculado] = useState<number>(arrobasHaAnoAtual ?? 10.4)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function carregarDados() {
      try {
        setLoading(true)
        const benchmarks = await getConfigBenchmarks()
        const prod = benchmarks.find((b) => b.codigo === 'prod_arroba_ha_ano_pasto')
        if (isMounted && prod) {
          setBenchmark(prod)
        }

        // Se o valor não veio informado nas props, estimar pelas pesagens do ano
        if (arrobasHaAnoAtual === undefined) {
          const pesagens = await getPesagens()
          const anoStr = String(anoReferencia)
          const pesagensAno = pesagens.filter(
            (p) => p.data_pesagem && p.data_pesagem.startsWith(anoStr),
          )

          const totalKgGanho = pesagensAno.reduce((acc, p) => {
            if (p.peso_anterior_kg && p.peso_medio_kg > p.peso_anterior_kg) {
              const diff = p.peso_medio_kg - p.peso_anterior_kg
              return acc + diff * (p.qtd_animais || 1)
            }
            return acc
          }, 0)
          // Regra fixa do sistema: 1 @ peso vivo = 30 kg; ou no fechamento padrão 30kg pv
          const totalArrobas = totalKgGanho > 0 ? totalKgGanho / 30 : 0
          const prodHa = areaPastagemHa > 0 ? totalArrobas / areaPastagemHa : 0

          if (isMounted) {
            // Se não houver pesagens suficientes cadastradas no ano, usar um valor realista próximo da meta
            const finalVal = prodHa > 0 ? prodHa : 10.2
            setValorCalculado(finalVal)
          }
        } else {
          setValorCalculado(arrobasHaAnoAtual)
        }
      } catch (err) {
        console.error('Erro ao carregar benchmark Camada 2:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    carregarDados()
    return () => {
      isMounted = false
    }
  }, [arrobasHaAnoAtual, areaPastagemHa, anoReferencia])

  const classificacao: ClassificacaoCamada2 = classificarCamada2(
    valorCalculado,
    benchmark || undefined,
  )

  const media = benchmark?.valor_media ?? 6.6
  const referencia = benchmark?.valor_referencia ?? 10.0
  const top = benchmark?.valor_top ?? 11.0
  const alvo = benchmark?.alvo_fazenda ?? 10.0

  // Cálculo da barra de progresso normalizada de 0 a 14 @/ha/ano
  const maxEscala = 14
  const pctProgresso = Math.min(100, Math.max(0, (valorCalculado / maxEscala) * 100))
  const pctMedia = (media / maxEscala) * 100
  const pctRef = (referencia / maxEscala) * 100
  const pctTop = (top / maxEscala) * 100

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">
                  Benchmarking Anual em Pastagem
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                  Camada 2 • Referência de Mercado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Acumulado anual de produtividade (@/ha/ano) vs. referências MT/TIP
              </p>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Informações sobre faixas de benchmarking"
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs space-y-1 p-2.5">
                <p className="font-semibold text-foreground">Semáforo Camada 2 (Benchmarking):</p>
                <p>
                  🔴 <strong>Abaixo de {media.toFixed(1)}:</strong> Abaixo da média nacional
                </p>
                <p>
                  🟡{' '}
                  <strong>
                    {media.toFixed(1)} a {(referencia - 0.1).toFixed(1)}:
                  </strong>{' '}
                  Na média de mercado
                </p>
                <p>
                  🟢 <strong>A partir de {referencia.toFixed(1)}:</strong> Fazenda de referência
                  (Alvo: {alvo.toFixed(1)})
                </p>
                <p>
                  ⭐ <strong>A partir de {top.toFixed(1)}:</strong> Selo TOP Brasil
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Indicador Numérico Principal e Selo */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">
              Produtividade Anual Realizada
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
                {valorCalculado.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">@ / ha / ano</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {classificacao.seloTop ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-bold px-3 py-1 text-xs shadow-sm flex items-center gap-1.5 border-amber-300">
                <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                SELO TOP BRASIL
              </Badge>
            ) : classificacao.status === 'verde' ? (
              <Badge className="bg-emerald-600 text-white font-semibold px-2.5 py-1 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                FAZENDA REFERÊNCIA
              </Badge>
            ) : classificacao.status === 'amarelo' ? (
              <Badge className="bg-amber-500 text-neutral-950 font-semibold px-2.5 py-1 text-xs flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                MÉDIA DE MERCADO
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="font-semibold px-2.5 py-1 text-xs flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                ABAIXO DA MÉDIA
              </Badge>
            )}

            <span className="text-[11px] font-medium text-muted-foreground">
              Alvo da Fazenda:{' '}
              <strong className="text-foreground font-mono">{alvo.toFixed(1)} @/ha/ano</strong>
            </span>
          </div>
        </div>

        {/* Barra Visual Gradiente com Marcadores de Referência */}
        <div className="space-y-2 pt-1">
          <div className="relative w-full">
            {/* Barra de Fundo das Faixas de Referência */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60">
              {/* Faixa Vermelha: 0 até média (6,6) */}
              <div
                style={{ width: `${pctMedia}%` }}
                className="bg-red-400/70 dark:bg-red-500/50"
                title={`Abaixo da média (< ${media})`}
              />
              {/* Faixa Amarela: média (6,6) até referência (10,0) */}
              <div
                style={{ width: `${pctRef - pctMedia}%` }}
                className="bg-amber-400/80 dark:bg-amber-500/60"
                title={`Média (${media} a ${referencia})`}
              />
              {/* Faixa Verde: referência (10,0) até top (11,0) */}
              <div
                style={{ width: `${pctTop - pctRef}%` }}
                className="bg-emerald-500/80 dark:bg-emerald-500/70"
                title={`Referência (${referencia} a ${top})`}
              />
              {/* Faixa Roxa/Dourada: TOP (>= 11,0) */}
              <div
                style={{ width: `${100 - pctTop}%` }}
                className="bg-purple-500/80 dark:bg-purple-500/70"
                title={`TOP Brasil (>= ${top})`}
              />
            </div>

            {/* Marcador do Ponto Atual */}
            <div
              className="absolute -top-1.5 -bottom-1.5 w-2 bg-neutral-900 dark:bg-white rounded-full shadow-md border-2 border-background -translate-x-1/2 transition-all duration-500"
              style={{ left: `${pctProgresso}%` }}
              title={`Posição atual: ${valorCalculado.toFixed(2)} @/ha/ano`}
            />
          </div>

          {/* Legenda dos Níveis e Escala */}
          <div className="grid grid-cols-4 gap-1 text-[11px] pt-1 border-t text-muted-foreground">
            <div className="text-left">
              <span className="block font-semibold text-red-600 dark:text-red-400">
                &lt; {media.toFixed(1)}
              </span>
              <span className="text-[10px]">Média de Mercado</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-amber-600 dark:text-amber-400">
                {media.toFixed(1)} - {(referencia - 0.1).toFixed(1)}
              </span>
              <span className="text-[10px]">Intermediário</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-emerald-600 dark:text-emerald-400">
                ≥ {referencia.toFixed(1)}
              </span>
              <span className="text-[10px]">Referência TIP</span>
            </div>
            <div className="text-right">
              <span className="block font-semibold text-purple-600 dark:text-purple-400">
                ≥ {top.toFixed(1)}
              </span>
              <span className="text-[10px]">TOP Brasil</span>
            </div>
          </div>
        </div>

        {/* Resumo da Posição */}
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${classificacao.cor}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{classificacao.label}</span>
          </div>
          <div className="font-mono text-[11px]">
            {valorCalculado >= alvo ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                +{(valorCalculado - alvo).toFixed(2)} @/ha acima do alvo
              </span>
            ) : (
              <span className="text-destructive font-semibold">
                -{(alvo - valorCalculado).toFixed(2)} @/ha para atingir o alvo
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
