import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnimalRegistrationModal } from '@/components/animais/AnimalRegistrationModal'
import useAnimalStore from '@/stores/useAnimalStore'
import useFazendaStore from '@/stores/useFazendaStore'
import useAnimalTargetsStore from '@/stores/useAnimalTargetsStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Beef, Settings, AlertTriangle } from 'lucide-react'
import { ExportMenu } from '@/components/ExportMenu'
import { downloadCSV, triggerPDFPrint } from '@/lib/exportUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

function TargetsConfigDialog() {
  const { targets, updateTargets } = useAnimalTargetsStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    updateTargets({
      pesoAlvoCorte: Number(fd.get('pesoAlvoCorte')),
      idadeAlvoMesesCorte: Number(fd.get('idadeAlvoMesesCorte')),
    })
    toast({ title: 'Sucesso', description: 'Metas e alertas atualizados com sucesso.' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" /> Alertas de Abate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Metas de Abate (Corte)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Peso Alvo (kg)</Label>
            <Input
              name="pesoAlvoCorte"
              type="number"
              defaultValue={targets.pesoAlvoCorte}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Idade Alvo (Meses)</Label>
            <Input
              name="idadeAlvoMesesCorte"
              type="number"
              defaultValue={targets.idadeAlvoMesesCorte}
              required
            />
          </div>
          <Button type="submit" className="w-full mt-2">
            Salvar Configurações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Animais() {
  const { animais } = useAnimalStore()
  const { fazendas } = useFazendaStore()
  const { targets } = useAnimalTargetsStore()

  const getFazendaNome = (id: string) => fazendas.find((f) => f.id === id)?.nome || 'Desconhecida'

  const handleExportCSV = () => {
    const dataToExport = animais.map((a) => ({
      ID: a.id,
      DataRegistro: format(new Date(a.dataRegistro), 'dd/MM/yyyy'),
      Fazenda: getFazendaNome(a.fazendaDestinoId),
      Tipo: a.tipoRegistro,
      Categoria: a.categoria,
      Origem: a.origem,
      Raca: a.raca,
      Sexo: a.sexo,
      IdadeMeses: a.idadeMeses || '-',
      PesoMedio: a.pesoMedio,
      Quantidade: a.quantidade,
      CustoCabeca: a.custoTotalPorCabeca,
      CustoTotal: a.custoTotalLote,
    }))
    downloadCSV(dataToExport, 'rebanho_export')
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Animais</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as entradas de animais na propriedade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TargetsConfigDialog />
          <ExportMenu
            onExportCSV={handleExportCSV}
            onExportPDF={triggerPDFPrint}
            label="Exportar"
          />
          <AnimalRegistrationModal />
        </div>
      </div>

      {animais.length === 0 ? (
        <Card className="border-dashed shadow-none bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Beef className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum registro encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Você ainda não registrou entradas de animais. Clique em "Registrar Entrada" para
              começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {animais.map((animal) => {
            const isReady =
              animal.categoria === 'Corte' &&
              (animal.pesoMedio >= targets.pesoAlvoCorte ||
                (animal.idadeMeses && animal.idadeMeses >= targets.idadeAlvoMesesCorte))

            return (
              <Card
                key={animal.id}
                className={cn(
                  'overflow-hidden hover:border-primary/50 transition-colors',
                  isReady && 'border-amber-500 shadow-amber-500/20',
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="bg-muted p-4 flex sm:w-48 flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r">
                    <Badge
                      variant={animal.tipoRegistro === 'lote' ? 'default' : 'outline'}
                      className="mb-2"
                    >
                      {animal.tipoRegistro === 'lote' ? 'Lote' : 'Individual'}
                    </Badge>
                    <span className="text-3xl font-bold text-primary">{animal.quantidade}</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                      Cabeça(s)
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold flex items-center gap-2">
                            {animal.raca}{' '}
                            <span className="text-muted-foreground text-sm font-normal">
                              • {animal.categoria}
                            </span>
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 font-medium">
                            {getFazendaNome(animal.fazendaDestinoId)} • {animal.sexo} •{' '}
                            {animal.idadeMeses ? `${animal.idadeMeses} meses` : animal.faixaEtaria}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="px-3 py-1 bg-secondary/50">
                            {animal.origem}
                          </Badge>
                          {isReady && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 gap-1">
                              <AlertTriangle className="w-3 h-3" /> Apto p/ Abate
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Peso Médio
                          </p>
                          <p className="font-semibold text-foreground">{animal.pesoMedio} kg</p>
                        </div>
                        {animal.origem === 'Compra' && (
                          <>
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Vendedor
                              </p>
                              <p className="font-semibold text-foreground line-clamp-1">
                                {animal.nomeVendedor || '-'}
                              </p>
                            </div>
                            <div className="bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                              <p className="text-xs font-medium text-destructive/80 mb-1">
                                Custo/Cab.
                              </p>
                              <p className="font-semibold text-destructive">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(animal.custoTotalPorCabeca)}
                              </p>
                            </div>
                            <div className="bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                              <p className="text-xs font-medium text-destructive/80 mb-1">
                                Custo Total
                              </p>
                              <p className="font-semibold text-destructive">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(animal.custoTotalLote)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t text-xs font-medium text-muted-foreground/70 flex justify-between">
                      <span>
                        Registro em:{' '}
                        {format(new Date(animal.dataRegistro), "dd MMM yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      <span className="uppercase tracking-wider">
                        ID: {animal.id.split('-')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
