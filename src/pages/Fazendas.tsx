import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FarmFormModal } from '@/components/fazendas/FarmFormModal'
import useFazendaStore from '@/stores/useFazendaStore'
import { MapPin, Users, Edit2, Trash2 } from 'lucide-react'

export default function Fazendas() {
  const { fazendas, addFazenda, updateFazenda, deleteFazenda } = useFazendaStore()

  const totalRebanho = fazendas.reduce((acc, f) => acc + (f.rebanho || 0), 0)
  const totalArea = fazendas.reduce((acc, f) => acc + (f.area || 0), 0)
  const mediaGeral = totalArea > 0 ? (totalRebanho / totalArea).toFixed(2) : '0.00'

  return (
    <div className="space-y-6 pb-20 sm:pb-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Cadastro de Fazendas
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as propriedades, lotações e perfis operacionais do grupo.
          </p>
        </div>
        <FarmFormModal onSave={addFazenda} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Lotação Média Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {mediaGeral} <span className="text-sm font-normal text-muted-foreground">cab/ha</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Área Total Gerenciada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalArea.toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-normal text-muted-foreground">ha</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rebanho Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalRebanho.toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-normal text-muted-foreground">cab</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fazendas.map((f) => (
          <Card key={f.id} className="hover:border-primary/50 transition-colors shadow-sm group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-primary">{f.nome}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {f.localizacao}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {f.arrendamento && (
                    <Badge variant="secondary" className="mr-2">
                      Arrendamento
                    </Badge>
                  )}
                  <FarmFormModal
                    fazenda={f}
                    onSave={(updated) => updateFazenda(updated.id, updated)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteFazenda(f.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Área Total
                  </span>
                  <span className="font-semibold">{f.area} ha</span>
                </div>
                <div className="flex flex-col bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Rebanho
                  </span>
                  <span className="font-semibold">{f.rebanho} cab</span>
                </div>
                <div className="flex flex-col bg-primary/5 p-2 rounded-md border-primary/20 border">
                  <span className="text-primary/70 text-[10px] uppercase font-bold">Lotação</span>
                  <span className="font-semibold text-primary">
                    {(f.rebanho / (f.area || 1)).toFixed(2)} /ha
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> Proprietário:{' '}
                  <span className="text-foreground font-medium">{f.proprietario}</span>
                </div>
                {(f.sistemas.length > 0 || f.atividades.length > 0) && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {f.sistemas.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {s}
                      </Badge>
                    ))}
                    {f.atividades.map((a) => (
                      <Badge key={a} variant="outline">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
