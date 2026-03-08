import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { QuickAddModal } from './QuickAddModal'
import { ScannerModal } from './ScannerModal'
import { Bell, Trophy, CheckSquare, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth, mockUsers } from '@/contexts/AuthContext'
import { useAppNotifications } from '@/contexts/NotificationContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAppNotifications()

  const handleUserSwitch = (newUser: (typeof mockUsers)[0]) => {
    setUser(newUser)
    toast({
      title: 'Perfil Alterado',
      description: `Você agora está logado como ${newUser.name}.`,
    })
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6 bg-card sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <div className="hidden md:flex flex-col">
          <span className="font-semibold text-lg leading-tight text-primary">AgroGestão</span>
          <span className="text-xs text-muted-foreground">Fazenda Boa Esperança</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <ScannerModal />

        {user.role === 'admin' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card animate-pulse"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex justify-between items-center py-2">
                <span>Notificações Sistema</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-auto p-0 text-xs font-normal"
                  >
                    Marcar lidas
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Você não possui novas notificações.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 cursor-pointer',
                        n.read ? 'opacity-60' : 'bg-muted/50',
                      )}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {n.type === 'goal' ? (
                          <Trophy className="h-4 w-4 text-amber-500" />
                        ) : n.type === 'task' ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-semibold text-sm flex-1">{n.title}</span>
                        {!n.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {n.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {user.role === 'admin' && <QuickAddModal />}

        <div className="h-8 w-px bg-border hidden sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 border-2 border-primary/20 cursor-pointer transition-transform hover:scale-105 hidden sm:flex">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Alternar Acesso (Demo RBAC)
            </DropdownMenuLabel>
            {mockUsers.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => handleUserSwitch(u)}
                className={`cursor-pointer ${user.id === u.id ? 'bg-muted' : ''}`}
              >
                {u.name} {u.role === 'admin' && '(Admin)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
