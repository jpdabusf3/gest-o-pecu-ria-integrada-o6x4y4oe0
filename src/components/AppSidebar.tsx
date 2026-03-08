import { useLocation, Link } from 'react-router-dom'
import { useRef } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Baby,
  TrendingUp,
  Beef,
  Map,
  Package,
  DollarSign,
  Wheat,
  Smartphone,
  FileText,
  BrainCircuit,
  Syringe,
  Building2,
  Truck,
  CheckSquare,
  MapPinned,
  Tags,
  Users,
  Camera,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigationGroups = [
  {
    sector: 'Administrativo',
    items: [
      { title: 'Administrativo', icon: Building2, url: '/administrativo' },
      { title: 'Cadastro de Fazendas', icon: MapPinned, url: '/fazendas' },
      { title: 'Colaboradores', icon: Users, url: '/colaboradores' },
      { title: 'Painel Principal', icon: LayoutDashboard, url: '/' },
      { title: 'Relatórios', icon: FileText, url: '/relatorios' },
    ].sort((a, b) => a.title.localeCompare(b.title)),
  },
  {
    sector: 'Financeiro',
    items: [
      { title: 'Financeiro', icon: DollarSign, url: '/financeiro' },
      { title: 'Projeções & AI', icon: BrainCircuit, url: '/projecoes' },
    ].sort((a, b) => a.title.localeCompare(b.title)),
  },
  {
    sector: 'Operacional',
    items: [
      { title: 'Estoque & Insumos', icon: Package, url: '/estoque' },
      { title: 'Frota & Maquinário', icon: Truck, url: '/frota' },
      { title: 'Gestão de Tarefas', icon: CheckSquare, url: '/tarefas' },
      { title: 'Mapa da Propriedade', icon: MapPinned, url: '/mapa' },
      { title: 'Operações de Campo', icon: Smartphone, url: '/campo' },
    ].sort((a, b) => a.title.localeCompare(b.title)),
  },
  {
    sector: 'Zootécnico',
    items: [
      { title: 'Confinamento', icon: Wheat, url: '/confinamento' },
      { title: 'Gestão de Pastos', icon: Map, url: '/pastos' },
      { title: 'Gestão de Rebanho', icon: Tags, url: '/animais' },
      { title: 'Sanidade', icon: Syringe, url: '/sanidade' },
      { title: 'Setor: Cria', icon: Baby, url: '/setor/cria' },
      { title: 'Setor: Engorda', icon: Beef, url: '/setor/engorda' },
      { title: 'Setor: Recria', icon: TrendingUp, url: '/setor/recria' },
    ].sort((a, b) => a.title.localeCompare(b.title)),
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { user, setUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setUser({ ...user, avatar: url })
    }
  }

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 w-full text-sidebar-primary">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Alterar foto de perfil"
          >
            <Avatar className="h-8 w-8 transition-opacity group-hover:opacity-80">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-full bg-black/40">
              <Camera className="h-3 w-3 text-white" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <span className="font-bold text-lg tracking-tight truncate">GPI F3</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => {
          // RBAC: Restricted view for operators and managers
          const visibleItems = group.items.filter((item) => {
            if (user.role === 'operador') {
              return ['/', '/campo', '/tarefas', '/sanidade', '/mapa'].includes(item.url)
            }
            if (user.role === 'gerente') {
              return !['/administrativo', '/fazendas'].includes(item.url)
            }
            return true
          })

          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.sector}>
              <SidebarGroupLabel>{group.sector}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive =
                      location.pathname === item.url ||
                      (item.url !== '/' && location.pathname.startsWith(item.url))
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}
