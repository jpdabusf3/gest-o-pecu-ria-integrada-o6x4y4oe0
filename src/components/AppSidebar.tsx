import { useLocation, Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Baby,
  TrendingUp,
  Beef,
  Map,
  Package,
  DollarSign,
  Tractor,
  Wheat,
  Smartphone,
  FileText,
  BrainCircuit,
  Syringe,
  ShieldCheck,
  Building2,
  Truck,
  CheckSquare,
  MapPinned,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { title: 'Painel Principal', icon: LayoutDashboard, url: '/' },
  { title: 'Projeções & AI', icon: BrainCircuit, url: '/projecoes' },
  { title: 'Operações de Campo', icon: Smartphone, url: '/campo' },
  { title: 'Gestão de Tarefas', icon: CheckSquare, url: '/tarefas' },
  { title: 'Gestão de Pastos', icon: Map, url: '/pastos' },
  { title: 'Confinamento', icon: Wheat, url: '/confinamento' },
  { title: 'Sanidade', icon: Syringe, url: '/sanidade' },
  { title: 'Setor: Cria', icon: Baby, url: '/setor/cria' },
  { title: 'Setor: Recria', icon: TrendingUp, url: '/setor/recria' },
  { title: 'Setor: Engorda', icon: Beef, url: '/setor/engorda' },
  { title: 'Estoque & Insumos', icon: Package, url: '/estoque' },
  { title: 'Frota & Maquinário', icon: Truck, url: '/frota' },
  { title: 'Financeiro', icon: DollarSign, url: '/financeiro' },
  { title: 'Relatórios', icon: FileText, url: '/relatorios' },
  { title: 'Equipe & Desempenho', icon: ShieldCheck, url: '/equipe' },
  { title: 'Administrativo', icon: Building2, url: '/administrativo' },
  { title: 'Cadastro de Fazendas', icon: MapPinned, url: '/fazendas' },
]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()

  // RBAC: Restricted view for field operators
  const visibleNavItems = navItems.filter((item) => {
    if (user.role === 'operador') {
      return ['/', '/campo', '/tarefas', '/sanidade'].includes(item.url)
    }
    return true
  })

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 px-2 w-full text-sidebar-primary">
          <Tractor className="h-6 w-6 shrink-0" />
          <span className="font-bold text-lg tracking-tight truncate">Pecuária Inteligente F3</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="pt-4">
            <SidebarMenu>
              {visibleNavItems.map((item) => {
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
      </SidebarContent>
    </Sidebar>
  )
}
