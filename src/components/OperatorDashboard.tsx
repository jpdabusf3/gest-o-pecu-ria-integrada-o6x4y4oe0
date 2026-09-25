import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, Smartphone, Syringe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function OperatorDashboard() {
  const { user } = useAuth()
  return (
    <div className="space-y-6 animate-fade-in-up pb-20 sm:pb-6 max-w-4xl mx-auto">
      <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-sm mb-6 mt-2">
        <h2 className="text-3xl font-bold tracking-tight">Olá, {user.name.split(' ')[0]}</h2>
        <p className="text-primary-foreground/80 mt-1 text-sm md:text-base">
          Bem-vindo ao seu painel de operações diárias.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <CheckSquare className="h-5 w-5" /> Minhas Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Veja as atividades operacionais atribuídas a você.
            </p>
            <Button asChild className="w-full shadow-sm">
              <Link to="/tarefas">Acessar Tarefas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-border transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" /> App de Campo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Registre movimentações, contagens de lotes e abates.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/campo">Abrir Operações</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-border transition-colors shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-500" /> Registro Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Pesagens na balança e controle sanitário offline no pasto.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/campo">Ir para Campo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
