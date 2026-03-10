import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Beef } from 'lucide-react'
import useFazendaStore from '@/stores/useFazendaStore'
import useAnimalStore from '@/stores/useAnimalStore'
import usePastoStore from '@/stores/usePastoStore'
import { useToast } from '@/hooks/use-toast'
import { AnimalRegistro, CategoriaAnimal } from '@/types/animal'

export function AnimalRegistrationModal() {
  const [open, setOpen] = useState(false)
  const { fazendas } = useFazendaStore()
  const { addRegistro } = useAnimalStore()
  const { pastos } = usePastoStore()
  const { toast } = useToast()

  const [tipoRegistro, setTipoRegistro] = useState<'individual' | 'lote'>('lote')
  const [origem, setOrigem] = useState<'Compra' | 'Nativo'>('Compra')
  const [sexo, setSexo] = useState<'Macho' | 'Fêmea'>('Macho')

  const [quantidade, setQuantidade] = useState<number>(10)
  const [precoCompra, setPrecoCompra] = useState<number>(0)
  const [frete, setFrete] = useState<number>(0)
  const [comissao, setComissao] = useState<number>(0)
  const [impostos, setImpostos] = useState<number>(0)

  const qty = tipoRegistro === 'individual' ? 1 : Math.max(1, quantidade)
  const custoTotalLote = origem === 'Compra' ? precoCompra * qty + frete + comissao + impostos : 0
  const custoPorCabeca = origem === 'Compra' ? custoTotalLote / qty : 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    if (!fd.get('fazendaDestinoId')) {
      toast({
        title: 'Erro',
        description: 'Selecione a fazenda de destino.',
        variant: 'destructive',
      })
      return
    }

    const idadeMeses = Number(fd.get('idadeMeses'))
    let faixaEtaria = '0-8 meses'
    if (idadeMeses > 8 && idadeMeses <= 12) faixaEtaria = '8-12 meses'
    else if (idadeMeses > 12 && idadeMeses <= 24) faixaEtaria = '1-2 anos'
    else if (idadeMeses > 24) faixaEtaria = '> 2 anos'

    const pastoIdVal = fd.get('pastoId') as string
    const pastoId = pastoIdVal && pastoIdVal !== 'none' ? pastoIdVal : undefined

    const registro: AnimalRegistro = {
      id: crypto.randomUUID(),
      tipoRegistro,
      quantidade: qty,
      pesoMedio: Number(fd.get('pesoMedio')),
      sexo,
      raca: fd.get('raca') as string,
      categoria: fd.get('categoria') as CategoriaAnimal,
      faixaEtaria,
      idadeMeses,
      origem,
      fazendaDestinoId: fd.get('fazendaDestinoId') as string,
      ...(pastoId && { pastoId }),
      dataRegistro: new Date().toISOString(),
      ...(origem === 'Compra' && {
        precoCompraPorCabeca: precoCompra,
        fazendaOrigem: fd.get('fazendaOrigem') as string,
        nomeVendedor: fd.get('nomeVendedor') as string,
        leiloeiro: fd.get('leiloeiro') as string,
        custoFrete: frete,
        comissao,
        impostos,
      }),
      custoTotalPorCabeca: custoPorCabeca,
      custoTotalLote: custoTotalLote,
    }

    addRegistro(registro)
    toast({ title: 'Sucesso', description: 'Registro salvo com sucesso.' })
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setTipoRegistro('lote')
    setOrigem('Compra')
    setSexo('Macho')
    setQuantidade(10)
    setPrecoCompra(0)
    setFrete(0)
    setComissao(0)
    setImpostos(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Registrar Entrada
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beef className="h-5 w-5 text-primary" /> Entrada de Animais
          </DialogTitle>
          <DialogDescription>
            Registre a entrada de animais individuais ou lotes no rebanho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fazenda de Destino *</Label>
              <Select name="fazendaDestinoId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fazendas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pasto Destino</Label>
              <Select name="pastoId" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pasto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum / Selecionar depois</SelectItem>
                  {pastos.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <RadioGroup
                value={tipoRegistro}
                onValueChange={(val: any) => setTipoRegistro(val)}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="r-ind" />
                  <Label htmlFor="r-ind">Indiv.</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lote" id="r-lote" />
                  <Label htmlFor="r-lote">Em Lote</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
            {tipoRegistro === 'lote' && (
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantidade || ''}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Peso Médio (kg) *</Label>
              <Input
                name="pesoMedio"
                type="number"
                step="0.1"
                min="1"
                required
                placeholder="Ex: 210"
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo *</Label>
              <Select name="sexo" value={sexo} onValueChange={(val: any) => setSexo(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                name="categoria"
                defaultValue={sexo === 'Macho' ? 'Bezerros' : 'Bezerras'}
                key={sexo}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sexo === 'Macho' ? (
                    <>
                      <SelectItem value="Bezerros">Bezerros</SelectItem>
                      <SelectItem value="Garrotes">Garrotes</SelectItem>
                      <SelectItem value="Bois">Bois</SelectItem>
                      <SelectItem value="Touros">Touros</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Bezerras">Bezerras</SelectItem>
                      <SelectItem value="Novilhas">Novilhas</SelectItem>
                      <SelectItem value="Novilhas matrizes">Novilhas matrizes</SelectItem>
                      <SelectItem value="Vacas (Matrizes)">Vacas (Matrizes)</SelectItem>
                      <SelectItem value="Vacas de corte">Vacas de corte</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raça *</Label>
              <Input name="raca" required placeholder="Ex: Nelore" defaultValue="Nelore" />
            </div>
            <div className="space-y-2">
              <Label>Idade (Meses) *</Label>
              <Input
                name="idadeMeses"
                type="number"
                min="0"
                required
                placeholder="Ex: 12"
                defaultValue="12"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold border-b pb-2 block">Origem do Animal</Label>
            <RadioGroup
              value={origem}
              onValueChange={(val: any) => setOrigem(val)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Nativo" id="o-nativo" />
                <Label htmlFor="o-nativo" className="font-medium cursor-pointer">
                  Animal Nativo (Nascido na prop.)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Compra" id="o-compra" />
                <Label htmlFor="o-compra" className="font-medium cursor-pointer">
                  Compra de Terceiros
                </Label>
              </div>
            </RadioGroup>
          </div>

          {origem === 'Compra' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fazenda de Origem</Label>
                  <Input name="fazendaOrigem" placeholder="Nome da propriedade" />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Vendedor</Label>
                  <Input name="nomeVendedor" placeholder="Nome do vendedor" />
                </div>
                <div className="space-y-2">
                  <Label>Leiloeiro / Leilão</Label>
                  <Input name="leiloeiro" placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Preço por Cabeça (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCompra || ''}
                    onChange={(e) => setPrecoCompra(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Frete Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={frete || ''}
                    onChange={(e) => setFrete(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comissão Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={comissao || ''}
                    onChange={(e) => setComissao(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Impostos Totais (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={impostos || ''}
                    onChange={(e) => setImpostos(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-between mt-4 border border-primary/20">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      custoTotalLote,
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Custo por Cabeça</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      custoPorCabeca,
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base mt-6">
            Confirmar Registro
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
