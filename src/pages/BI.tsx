import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { biMetricsList, defaultSavedReports } from '@/data/mock'
import { DynamicBIChart } from '@/components/charts/DynamicBIChart'
import { Save, Bookmark } from 'lucide-react'

export default function BI() {
  const [m1, setM1] = useState<string>(biMetricsList[3].id) // Default: Arrobas
  const [m2, setM2] = useState<string>(biMetricsList[1].id) // Default: Combustivel
  const [dateRange, setDateRange] = useState('ultimos_6')
  const [saved, setSaved] = useState(defaultSavedReports)
  const { toast } = useToast()

  const handleSave = () => {
    const metric1Name = biMetricsList.find((m) => m.id === m1)?.name || 'Métrica 1'
    const metric2Name = biMetricsList.find((m) => m.id === m2)?.name || 'Métrica 2'
    const newName = `${metric1Name} vs ${metric2Name}`

    setSaved([{ id: Date.now().toString(), name: newName, m1, m2 }, ...saved])
    toast({
      title: 'Relatório Salvo',
      description: 'Sua configuração foi salva e pode ser acessada posteriormente.',
    })
  }

  const loadSaved = (s: { m1: string; m2: string }) => {
    setM1(s.m1)
    setM2(s.m2)
    toast({
      title: 'Visão Carregada',
      description: 'Os eixos do gráfico foram atualizados.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-20 sm:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            BI & Relatórios Dinâmicos
          </h2>
          <p className="text-muted-foreground mt-1">
            Cruze dados de diferentes módulos para descobrir insights de performance.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" /> Salvar Visão
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Configurar Eixos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Série 1 (Barras)</label>
                <Select value={m1} onValueChange={setM1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {biMetricsList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Série 2 (Linha)</label>
                <Select value={m2} onValueChange={setM2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    {biMetricsList.map((m) => (
                      <SelectItem key={m.id} value={m.id} disabled={m.id === m1}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultimos_6">Últimos 6 Meses</SelectItem>
                    <SelectItem value="este_ano">Este Ano</SelectItem>
                    <SelectItem value="todo_periodo">Todo Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Visões Salvas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {saved.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-3"
                  onClick={() => loadSaved(s)}
                >
                  <Bookmark className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                  <span className="truncate text-sm whitespace-normal break-words">{s.name}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="h-full flex flex-col min-h-[500px]">
            <CardHeader>
              <CardTitle>Gráfico Comparativo</CardTitle>
              <CardDescription>
                Análise temporal cruzada interagindo indicadores de custo e produção.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <DynamicBIChart m1={m1} m2={m2} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
