import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Map as MapIcon,
  Tractor,
  Package,
  Activity,
  CalendarDays,
  LineChart,
  Users,
  Settings,
  Syringe,
  BarChart3,
  Wheat,
  Beef,
  Sprout,
  DollarSign,
  Building2,
  CheckSquare,
  MapPin,
  Leaf,
  Factory,
  Shield,
  FileText,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'

const navItems = {
  admin: [
    { title: 'Dashboard Geral', icon: LayoutDashboard, url: '/' },
    {
      title: 'Gestão de Animais',
      items: [
        { title: 'Rebanho e Entradas', icon: Beef, url: '/animais' },
        { title: 'Setor: Cria', icon: Activity, url: '/setor/cria' },
        { title: 'Setor: Recria', icon: Activity, url: '/setor/recria' },
        { title: 'Setor: Engorda', icon: Activity, url: '/setor/engorda' },
        { title: 'Confinamento & Dietas', icon: Wheat, url: '/confinamento' },
        { title: 'Sanidade & Protocolos', icon: Syringe, url: '/sanidade' },
      ],
    },
    {
      title: 'Operações e Logística',
      items: [
        { title: 'Manejo de Pastagens', icon: Sprout, url: '/pastos' },
        { title: 'Mapa da Propriedade', icon: MapPin, url: '/mapa' },
        { title: 'Tarefas e Pessoal', icon: CheckSquare, url: '/tarefas' },
        { title: 'Frota e Maquinário', icon: Tractor, url: '/frota' },
        { title: 'Estoque de Insumos', icon: Package, url: '/estoque' },
        { title: 'Calendário Integrado', icon: CalendarDays, url: '/calendario' },
      ],
    },
    {
      title: 'Financeiro e Comercial',
      items: [
        { title: 'Controle Financeiro', icon: DollarSign, url: '/financeiro' },
        { title: 'Inteligência de Vendas', icon: LineChart, url: '/projecoes' },
        { title: 'Hedge & Mercado B3', icon: Shield, url: '/hedge' },
        { title: 'Abates & Romaneios', icon: Factory, url: '/abates' },
      ],
    },
    {
      title: 'Inteligência e Relatórios',
      items: [
        { title: 'Relatórios Operacionais', icon: BarChart3, url: '/relatorios' },
        { title: 'Relatórios de Desempenho', icon: Activity, url: '/desempenho' },
        { title: 'BI e Cruzamento Dados', icon: MapIcon, url: '/bi' },
        { title: 'Sustentabilidade (ESG)', icon: Leaf, url: '/sustentabilidade' },
        { title: 'PDF Studio', icon: FileText, url: '/pdf-studio' },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { title: 'Cadastro de Fazendas', icon: Building2, url: '/fazendas' },
        { title: 'Dados Administrativos', icon: Building2, url: '/administrativo' },
        { title: 'Colaboradores', icon: Users, url: '/colaboradores' },
        { title: 'Minhas Configurações', icon: Settings, url: '/configuracoes' },
      ],
    },
  ],
  gerente: [
    { title: 'Visão Geral', icon: LayoutDashboard, url: '/' },
    {
      title: 'Gestão de Produção',
      items: [
        { title: 'Manejo de Pastagens', icon: Sprout, url: '/pastos' },
        { title: 'Confinamento & Dietas', icon: Wheat, url: '/confinamento' },
        { title: 'Sanidade & Protocolos', icon: Syringe, url: '/sanidade' },
        { title: 'Tarefas Diárias', icon: CheckSquare, url: '/tarefas' },
      ],
    },
    {
      title: 'Relatórios',
      items: [
        { title: 'Relatórios Operacionais', icon: BarChart3, url: '/relatorios' },
        { title: 'BI e Dados', icon: MapIcon, url: '/bi' },
        { title: 'PDF Studio', icon: FileText, url: '/pdf-studio' },
      ],
    },
  ],
  operador: [
    { title: 'Minhas Tarefas', icon: CheckSquare, url: '/tarefas' },
    { title: 'Lançamentos de Campo', icon: Sprout, url: '/campo' },
    { title: 'Minhas Configurações', icon: Settings, url: '/configuracoes' },
  ],
}

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()

  const itemsToRender = navItems[user.role as keyof typeof navItems] || navItems.operador

  return (
    <Sidebar className="print:hidden">
      <SidebarHeader className="flex h-16 items-center justify-start px-4 border-b bg-primary">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-primary-foreground">
          <Beef className="h-6 w-6" /> F3 | GPI
        </h1>
      </SidebarHeader>

      <SidebarContent className="bg-background pt-2 custom-scrollbar">
        {itemsToRender.map((group, index) => {
          if (group.items) {
            return (
              <SidebarGroup key={index}>
                <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url}
                          tooltip={item.title}
                          className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium transition-colors"
                        >
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          }

          return (
            <SidebarGroup key={index}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === group.url}
                    tooltip={group.title}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium transition-colors"
                  >
                    <Link to={group.url} className="flex items-center gap-3">
                      {group.icon && <group.icon className="h-4 w-4" />}
                      <span>{group.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <img src={user.avatar} alt="Avatar" className="h-10 w-10 rounded-full border shadow-sm" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
              {user.role}
              <Badge variant="outline" className="text-[9px] px-1 h-4 uppercase bg-background">
                v0.0.59
              </Badge>
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
