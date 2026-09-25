import { useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Smartphone,
  CheckSquare,
  Beef,
  Scale,
  Activity,
  Layers,
  MapPin,
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Sparkles,
  Leaf,
  BarChart3,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function AppSidebar() {
  const location = useLocation()
  const { user, isGestor, isCapataz, isOperador } = useAuth()
  const [gestaoAvancadaOpen, setGestaoAvancadaOpen] = useState(
    location.pathname === '/hedge' ||
      location.pathname === '/pdf-studio' ||
      location.pathname === '/sustentabilidade' ||
      location.pathname === '/bi',
  )

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg flex items-center justify-center font-bold">
            F3
          </div>
          <div>
            <span className="font-bold text-base leading-none block">Pecuária F3</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isGestor ? 'Gestor Geral' : isCapataz ? 'Capataz' : 'Vaqueiro / Campo'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* PERFIL VAQUEIRO (OPERADOR): Apenas Modo Campo e Tarefas do Dia */}
        {isOperador && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Operações de Campo
            </div>
            <div className="space-y-1">
              <Link
                to="/campo"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/campo')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="flex-1">Modo Campo (Offline)</span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/20"
                >
                  Vaqueiro
                </Badge>
              </Link>

              <Link
                to="/tarefas"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/tarefas')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                <span>Tarefas do Dia</span>
              </Link>
            </div>
          </div>
        )}

        {/* PERFIL CAPATAZ: Modo Campo, Tarefas, Pastos, Sanidade e Aprovações */}
        {isCapataz && (
          <>
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Liderança de Campo
              </div>
              <div className="space-y-1">
                <Link
                  to="/campo"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/campo')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>Modo Campo</span>
                </Link>

                <Link
                  to="/calendario"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/calendario')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendário de Atividades</span>
                </Link>

                <Link
                  to="/tarefas"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/tarefas')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Tarefas & Aprovações</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Manejo & Pastoreio
              </div>
              <div className="space-y-1">
                <Link
                  to="/pastos"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/pastos')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Pastos & Rotação</span>
                </Link>

                <Link
                  to="/sanidade"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/sanidade')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Sanidade & Protocolos</span>
                </Link>

                <Link
                  to="/pesagens"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/pesagens')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Scale className="h-4 w-4" />
                  <span>Pesagens & Lotes</span>
                </Link>

                <Link
                  to="/estoque"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/estoque')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span>Estoque & Insumos</span>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* PERFIL GESTOR: Tudo, incluindo Fechamento em destaque e submenu Gestão Avançada */}
        {isGestor && (
          <>
            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Painel Estratégico
              </div>
              <div className="space-y-1">
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard Consolidado</span>
                </Link>

                {/* DESTAQUE FECHAMENTO E RESULTADO */}
                <Link
                  to="/fechamento"
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    isActive('/fechamento')
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-primary/10 text-primary hover:bg-primary/15'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span className="flex-1">Fechamento & Resultado</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    DRE / Custo
                  </Badge>
                </Link>

                <Link
                  to="/fechamento?tab=benchmarking"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/fechamento' &&
                    location.search.includes('tab=benchmarking')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Scale className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1">Comparativo Exagro</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-mono tracking-wider border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  >
                    TOP Brasil
                  </Badge>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Manejo & Produção
              </div>
              <div className="space-y-1">
                <Link
                  to="/calendario"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/calendario')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendário de Atividades</span>
                </Link>

                <Link
                  to="/pesagens"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/pesagens')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Scale className="h-4 w-4" />
                  <span>Pesagens & GMD</span>
                </Link>

                <Link
                  to="/animais"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/animais')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Beef className="h-4 w-4" />
                  <span>Rebanho & Lotes</span>
                </Link>

                <Link
                  to="/pastos"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/pastos')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Pastos & Lotação</span>
                </Link>

                <Link
                  to="/sanidade"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/sanidade')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Sanidade & IATF</span>
                </Link>

                <Link
                  to="/estoque"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/estoque')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span>Estoque & Nutrição</span>
                </Link>

                <Link
                  to="/campo"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/campo')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Modo Campo (Offline)</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Finanças & Operações
              </div>
              <div className="space-y-1">
                <Link
                  to="/financeiro"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/financeiro')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Financeiro & Fluxo</span>
                </Link>

                <Link
                  to="/frota"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/frota')
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Frota & Máquinas</span>
                </Link>
              </div>
            </div>

            {/* SUBMENU: Gestão Avançada (Hedge, PdfStudio, Sustentabilidade, BI) */}
            <div className="pt-1">
              <Collapsible
                open={gestaoAvancadaOpen}
                onOpenChange={setGestaoAvancadaOpen}
                className="space-y-1"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Gestão Avançada
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      gestaoAvancadaOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-2 border-l border-border/50 ml-3">
                  <Link
                    to="/hedge"
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive('/hedge')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                    <span>Hedge & Mercado B3</span>
                  </Link>

                  <Link
                    to="/pdf-studio"
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive('/pdf-studio')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                    <span>PdfStudio & Exportação</span>
                  </Link>

                  <Link
                    to="/sustentabilidade"
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive('/sustentabilidade')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Sustentabilidade & ESG</span>
                  </Link>

                  <Link
                    to="/bi"
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive('/bi')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
                    <span>BI & Relatórios Dinâmicos</span>
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}
      </div>

      {/* Footer Info & Configurações */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Configurações</span>
        </Link>
      </div>
    </div>
  )
}
