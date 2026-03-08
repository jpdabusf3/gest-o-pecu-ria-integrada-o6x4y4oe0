import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FarmFormModal } from '@/components/fazendas/FarmFormModal'
import { Fazenda } from '@/types/fazenda'
import { MapPin, Users } from 'lucide-react'

export default function Fazendas() {
  const [fazendas, setFazendas] = useState<Fazenda[]>(() => {
    const saved = localStorage.getItem('f3_fazendas')
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: '1',
            nome: 'Fazenda Boa Esperança',
            proprietario: 'Grupo Agro F3',
            localizacao: 'Ribeirão Preto, SP',
            area: 1500,
            rebanho: 3450,
            sistemas: ['ILP'],
            arrendamento: false,
            atividades: ['Ciclo Completo', 'Produção de Genética'],
          },
        ]
  })

  useEffect(() => {
    localStorage.setItem('f3_fazendas', JSON.stringify(fazendas))
  }, [fazendas])

  const handleAdd = (novaFazenda: Fazenda) => {
    setFazendas((prev) => [...prev, novaFazenda])
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Cadastro de Fazendas
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as propriedades e perfis operacionais do grupo.
          </p>
        </div>
        <FarmFormModal onSave={handleAdd} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fazendas.map((f) => (
          <Card key={f.id} className="hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-primary">{f.nome}</CardTitle>
                {f.arrendamento && <Badge variant="secondary">Arrendamento</Badge>}
              </div>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {f.localizacao}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground text-xs uppercase">Área Total</span>
                  <span className="font-semibold">{f.area} ha</span>
                </div>
                <div className="flex flex-col bg-muted/50 p-2 rounded-md">
                  <span className="text-muted-foreground text-xs uppercase">Rebanho</span>
                  <span className="font-semibold">{f.rebanho} cab</span>
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
