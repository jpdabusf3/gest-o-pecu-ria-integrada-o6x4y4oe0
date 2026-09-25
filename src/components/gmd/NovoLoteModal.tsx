import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Layers, Sparkles, Info } from 'lucide-react'
import { createLot, FaseLote, FrenteLote, LotRecord } from '@/services/lots'
import {
  getConfigBenchmarks,
  ConfigBenchmarkRecord,
  getGmdAlvoPadraoFase,
} from '@/services/configBenchmark'
import { useToast } from '@/hooks/use-toast'

interface NovoLoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newLote: LotRecord) => void
}

export function NovoLoteModal({ open, onOpenChange, onSuccess }: NovoLoteModalProps) {
  const { toast } = useToast()
  const [benchmarks, setBenchmarks] = useState<ConfigBenchmarkRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Formulário
  const [name, setName] = useState('')
  const [faseAtual, setFaseAtual] = useState<FaseLote>('engorda')
  const [frente, setFrente] = useState<FrenteLote>('engorda')
  const [currentPaddock, setCurrentPaddock] = useState('')
  const [currentHeadcount, setCurrentHeadcount] = useState('50')
  const [gmdAlvoKg, setGmdAlvoKg] = useState('1.30')
  const [rendimentoCarcase, setRendimentoCarcase] = useState('54.0')
  const [sexo, setSexo] = useState<'macho' | 'femea' | 'misto'>('macho')
  const [categoria, setCategoria] = useState('Boi Gordo')
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0])

  // Metas de cria
  const [taxaDesmameAlvo, setTaxaDesmameAlvo] = useState('85.0')
  const [kgBezerroMatrizAlvo, setKgBezerroMatrizAlvo] = useState('165.0')

  useEffect(() => {
    if (open) {
      getConfigBenchmarks().then((data) => {
        setBenchmarks(data)
        const info = getGmdAlvoPadraoFase('engorda', data)
        if (info.gmdKgDia !== null) {
          setGmdAlvoKg(info.gmdKgDia.toFixed(2))
        }
      })
    }
  }, [open])

  // Ao mudar a fase, sincronizar o GMD alvo pré-preenchido via benchmarking Exagro
  const handleFaseChange = (newFase: FaseLote) => {
    setFaseAtual(newFase)

    // Ajustar frente compatível por padrão
    if (newFase === 'cria') setFrente('cria')
    else if (newFase === 'recria') setFrente('recria')
    else if (newFase === 'engorda' || newFase === 'tip_rip' || newFase === 'confinamento') {
      setFrente('engorda')
    }

    const info = getGmdAlvoPadraoFase(newFase, benchmarks)
    if (info.isCria) {
      setGmdAlvoKg('')
    } else if (info.gmdKgDia !== null) {
      setGmdAlvoKg(info.gmdKgDia.toFixed(2))
    }
  }

  const isCria = faseAtual === 'cria'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe a identificação do lote.',
        variant: 'destructive',
      })
      return
    }

    const gmdNum = isCria ? null : parseFloat(gmdAlvoKg)
    if (!isCria && (isNaN(gmdNum!) || gmdNum! <= 0)) {
      toast({
        title: 'GMD alvo inválido',
        description: 'Informe um valor válido de GMD em kg/dia (ex: 1,30).',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload: Omit<LotRecord, 'id' | 'created' | 'updated'> = {
        name: name.trim(),
        sector: (faseAtual === 'confinamento' || faseAtual === 'tip_rip'
          ? 'engorda'
          : faseAtual) as any,
        sex: sexo === 'femea' ? 'femea' : 'macho',
        category: categoria || 'Bovinos',
        initial_weight: 350,
        final_weight: 0,
        entry_date: dataEntrada,
        exit_date: '',
        value_per_animal: 0,
        status: 'active',
        headcount: parseInt(currentHeadcount, 10) || 1,
        pasto_atual: currentPaddock.trim() || 'Pasto 01',
        fase_atual: faseAtual,
        frente: frente,
        is_arrendamento: frente === 'arrendamento',
        // Mantém consistência com banco (salvo como kg/dia)
        gmd_alvo_g_dia: isCria ? 0 : gmdNum!,
        rendimento_carcaca_pct: parseFloat(rendimentoCarcase) || 54.0,
        data_entrada: dataEntrada,
      }

      const created = await createLot(payload)
      toast({
        title: 'Lote cadastrado com sucesso!',
        description: `Lote "${created.name}" cadastrado com GMD alvo calibrado pelo benchmarking Exagro.`,
      })
      onSuccess(created)
      onOpenChange(false)
      // Reset
      setName('')
      setCurrentHeadcount('50')
    } catch (err: any) {
      console.error('Erro ao cadastrar lote:', err)
      toast({
        title: 'Erro ao cadastrar lote',
        description: err?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <DialogTitle>Novo Lote de Animais</DialogTitle>
          </div>
          <DialogDescription>
            Cadastre um novo lote com GMD alvo calibrado pelo benchmarking Exagro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="nome-lote">Identificação do Lote *</Label>
              <Input
                id="nome-lote"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: LOTE-2026-ENG-01"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fase Atual</Label>
              <Select value={faseAtual} onValueChange={(val) => handleFaseChange(val as FaseLote)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cria">Cria (Matrizes/Bezerros)</SelectItem>
                  <SelectItem value="recria">Recria a Pasto (RIP)</SelectItem>
                  <SelectItem value="engorda">Engorda a Pasto</SelectItem>
                  <SelectItem value="tip_rip">TIP (Terminação Intensiva Pasto)</SelectItem>
                  <SelectItem value="confinamento">Confinamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Frente de Gestão</Label>
              <Select value={frente} onValueChange={(val) => setFrente(val as FrenteLote)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cria">Cria</SelectItem>
                  <SelectItem value="recria">Recria</SelectItem>
                  <SelectItem value="engorda">Engorda</SelectItem>
                  <SelectItem value="arrendamento">Arrendamento (Segregado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Piquete / Pasto Atual</Label>
              <Input
                value={currentPaddock}
                onChange={(e) => setCurrentPaddock(e.target.value)}
                placeholder="Ex.: Piquete 04"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Quantidade de Cabeças</Label>
              <Input
                type="number"
                min="1"
                value={currentHeadcount}
                onChange={(e) => setCurrentHeadcount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={sexo} onValueChange={(val) => setSexo(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Machos</SelectItem>
                  <SelectItem value="femea">Fêmeas</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data de Entrada</Label>
              <Input
                type="date"
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
              />
            </div>
          </div>

          {/* Seção Exagro: GMD Alvo / Metas de Cria */}
          <div className="rounded-lg border p-3.5 bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Calibração Benchmarking Exagro</span>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {isCria ? 'Cria: Sem GMD Alvo' : `${gmdAlvoKg || '--'} kg/dia`}
              </Badge>
            </div>

            {isCria ? (
              <div className="space-y-2.5">
                <Alert className="py-2 text-xs border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription>
                    Pela metodologia Exagro, a fase de <strong>Cria</strong> não é avaliada por GMD,
                    mas por <strong>taxa de desmame (%)</strong> e{' '}
                    <strong>kg de bezerro desmamado por matriz exposta</strong>.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-xs">Taxa Desmame Alvo (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={taxaDesmameAlvo}
                      onChange={(e) => setTaxaDesmameAlvo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">kg Bezerro / Matriz</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={kgBezerroMatrizAlvo}
                      onChange={(e) => setKgBezerroMatrizAlvo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="gmd-alvo" className="text-xs font-medium">
                    GMD Alvo (kg/dia) — editável a cada revisão de suplemento
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="gmd-alvo"
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="3.0"
                      value={gmdAlvoKg}
                      onChange={(e) => setGmdAlvoKg(e.target.value)}
                      className="font-mono text-base font-bold"
                    />
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      kg/dia
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground bg-background/80 p-2 rounded border space-y-1">
                  <div className="flex justify-between">
                    <span>Benchmark Engorda/TIP:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      1,30 kg/dia
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Benchmark Recria a pasto (RIP):</span>
                    <strong className="font-mono text-amber-600 dark:text-amber-400">
                      0,50 kg/dia
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Rendimento de Carcaça Estimado (%) — para cálculo de GDC
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={rendimentoCarcase}
                      onChange={(e) => setRendimentoCarcase(e.target.value)}
                      className="font-mono"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Salvando...' : 'Cadastrar Lote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
