import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { QuickAddModal } from './QuickAddModal'
import { Bell } from 'lucide-react'
import { Button } from './ui/button'

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6 bg-card sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <div className="hidden md:flex flex-col">
          <span className="font-semibold text-lg leading-tight text-primary">AgroGestão</span>
          <span className="text-xs text-muted-foreground">Fazenda Boa Esperança</span>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-2 border-card"></span>
        </Button>
        <QuickAddModal />
        <div className="h-8 w-px bg-border hidden sm:block"></div>
        <Avatar className="h-9 w-9 border-2 border-primary/20 cursor-pointer transition-transform hover:scale-105">
          <AvatarImage
            src="https://img.usecurling.com/ppl/thumbnail?gender=male&seed=42"
            alt="Avatar do Usuário"
          />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
