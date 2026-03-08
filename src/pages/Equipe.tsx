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
import { ShieldCheck, UserCircle, History, Smartphone } from 'lucide-react'
import { teamMembers, managementHistory } from '@/data/mock'

export default function Equipe() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Controle de Acessos & Equipe
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestão de permissões baseada em papéis (RBAC) e log de auditoria de operações.
          </p>
        </div>
        <Button className="gap-2">
          <UserCircle className="h-4 w-4" /> Convidar Colaborador
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Painel de Colaboradores</CardTitle>
            <CardDescription>
              Acesso total para <b>Administradores</b>, acesso restrito ao módulo de apontamentos
              para <b>Operadores de Campo</b>.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status / Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'Admin' ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {m.role === 'Operador' && <Smartphone className="h-3 w-3" />}
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <div
                          className={`h-2 w-2 rounded-full ${m.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                        />
                        {m.lastActive}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Auditoria de Campo Recente
            </CardTitle>
            <CardDescription>
              Ações rastreadas e vinculadas ao perfil de cada operador e administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {managementHistory.slice(0, 6).map((h) => (
                <div
                  key={h.id}
                  className="flex justify-between items-start border-b pb-3 last:border-0 hover:bg-muted/30 p-2 rounded-md transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm leading-tight text-foreground">
                      {h.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Alvo: <span className="font-medium text-primary">{h.alvo}</span> • {h.tipo}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <Badge variant="outline" className="text-[10px] px-1.5 mb-1 bg-background">
                      {h.responsavel}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground font-mono">{h.data}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-sm text-primary">
              Ver Relatório Completo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
