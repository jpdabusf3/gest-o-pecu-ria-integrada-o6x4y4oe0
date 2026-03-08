import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { pasturesData, sectorData } from '@/data/mock'
import { MapPin, Beef, Info, X } from 'lucide-react'

export default function MapaPropriedade() {
  const [selectedPasto, setSelectedPasto] = useState<number | null>(null)

  const allLotes = [
    ...sectorData.cria.lotes.map((l) => ({ ...l, setor: 'Cria' })),
    ...sectorData.recria.lotes.map((l) => ({ ...l, setor: 'Recria' })),
    ...sectorData.engorda.lotes.map((l) => ({ ...l, setor: 'Engorda' })),
  ]

  // Represents relative positioning and sizing of farm paddocks
  const mapLayout = [
    { id: 1, top: '5%', left: '5%', width: '40%', height: '40%' },
    { id: 2, top: '5%', left: '50%', width: '45%', height: '55%' },
    { id: 3, top: '50%', left: '5%', width: '30%', height: '45%' },
    { id: 4, top: '65%', left: '40%', width: '35%', height: '30%' },
    { id: 5, top: '40%', left: '80%', width: '15%', height: '55%' },
  ]

  const activePastoData = pasturesData.find((p) => p.id === selectedPasto)
  const activeOccupant = activePastoData
    ? allLotes.find((l) => l.id === activePastoData.ocupanteAtual)
    : null

  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mapa da Propriedade</h2>
        <p className="text-muted-foreground mt-1">
          Visualização espacial interativa da fazenda e distribuição do rebanho.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Layout Agronômico
            </CardTitle>
            <CardDescription>Clique nas divisões de pasto para ver detalhes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full aspect-video min-h-[300px] bg-emerald-50/50 rounded-xl border-2 border-emerald-100 overflow-hidden shadow-inner">
              {mapLayout.map((pos) => {
                const pasto = pasturesData.find((p) => p.id === pos.id)
                if (!pasto) return null
                const occupant = allLotes.find((l) => l.id === pasto.ocupanteAtual)
                const isSelected = selectedPasto === pos.id

                return (
                  <div
                    key={pos.id}
                    onClick={() => setSelectedPasto(pos.id)}
                    className={`absolute border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-2 rounded-lg shadow-sm
                      ${isSelected ? 'ring-4 ring-primary ring-offset-2 z-10 scale-[1.02]' : 'hover:scale-[1.01] hover:z-10'}
                      ${
                        pasto.status === 'Bom'
                          ? 'bg-emerald-400/40 border-emerald-500'
                          : pasto.status === 'Alerta'
                            ? 'bg-amber-400/40 border-amber-500'
                            : 'bg-slate-400/40 border-slate-500'
                      }
                    `}
                    style={{
                      top: pos.top,
                      left: pos.left,
                      width: pos.width,
                      height: pos.height,
                    }}
                  >
                    <span className="font-bold text-emerald-950 text-xs sm:text-sm md:text-base text-center leading-tight drop-shadow-md">
                      {pasto.nome.split('-')[0].trim()}
                    </span>
                    {occupant && (
                      <Badge
                        variant="secondary"
                        className="mt-1 md:mt-2 flex items-center gap-1 bg-white/90 text-emerald-900 border-emerald-200"
                      >
                        <Beef className="h-3 w-3 hidden sm:block" /> {occupant.cabecas} cab
                      </Badge>
                    )}
                    {!occupant && pasto.status === 'Vedado' && (
                      <Badge
                        variant="outline"
                        className="mt-1 md:mt-2 bg-white/60 text-[10px] md:text-xs"
                      >
                        Vedado
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> Detalhes da Divisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activePastoData ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 text-center animate-pulse">
                <MapPin className="h-12 w-12 mb-4 opacity-20" />
                <p>Selecione um pasto no mapa para ver informações detalhadas.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{activePastoData.nome}</h3>
                    <p className="text-sm text-muted-foreground">{activePastoData.area} hectares</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPasto(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Status Agronômico</span>
                    <Badge
                      variant={activePastoData.status === 'Alerta' ? 'destructive' : 'default'}
                      className={activePastoData.status === 'Bom' ? 'bg-emerald-500' : ''}
                    >
                      {activePastoData.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Cultivar</span>
                    <span className="font-medium text-right">{activePastoData.cultivar}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Altura Atual</span>
                    <span className="font-medium">{activePastoData.alturaAtual} cm</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Beef className="h-4 w-4" /> Rebanho Alocado
                  </h4>
                  {activeOccupant ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lote</span>
                        <span className="font-bold">{activeOccupant.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria</span>
                        <span className="font-medium text-right">{activeOccupant.categoria}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cabeças</span>
                        <span className="font-medium">{activeOccupant.cabecas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Setor</span>
                        <span className="font-medium">{activeOccupant.setor}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-2">
                      Área atualmente sem animais.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
