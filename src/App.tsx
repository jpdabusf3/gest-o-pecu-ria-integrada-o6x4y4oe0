import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/AuthContext'
import { FarmProvider } from './contexts/FarmContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { OfflineProvider } from './contexts/OfflineContext'
import { TaskProvider } from './contexts/TaskContext'
import { MarketProvider } from './contexts/MarketContext'
import Layout from './components/Layout'
import { RoleRoute } from './components/RoleRoute'
import Index from './pages/Index'
import Setor from './pages/Setor'
import Pastos from './pages/Pastos'
import Estoque from './pages/Estoque'
import Frota from './pages/Frota'
import Financeiro from './pages/Financeiro'
import AnimalProfile from './pages/AnimalProfile'
import Sanidade from './pages/Sanidade'
import Calendario from './pages/Calendario'
import Confinamento from './pages/Confinamento'
import Campo from './pages/Campo'
import Relatorios from './pages/Relatorios'
import RelatoriosDesempenho from './pages/RelatoriosDesempenho'
import ProjecaoVendas from './pages/ProjecaoVendas'
import Colaboradores from './pages/Colaboradores'
import MinhaEquipe from './pages/MinhaEquipe'
import Configuracoes from './pages/Configuracoes'
import Administrativo from './pages/Administrativo'
import Tarefas from './pages/Tarefas'
import Fazendas from './pages/Fazendas'
import Animais from './pages/Animais'
import Pesagens from './pages/Pesagens'
import MapaPropriedade from './pages/MapaPropriedade'
import BI from './pages/BI'
import Sustentabilidade from './pages/Sustentabilidade'
import Abates from './pages/Abates'
import Vendas from './pages/Vendas'
import Fechamento from './pages/Fechamento'
import Hedge from './pages/Hedge'
import PdfStudio from './pages/PdfStudio'
import NotFound from './pages/NotFound'
import { InstallPWA } from './components/InstallPWA'

const App = () => (
  <AuthProvider>
    <OfflineProvider>
      <TaskProvider>
        <FarmProvider>
          <MarketProvider>
            <NotificationProvider>
              <BrowserRouter>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <InstallPWA />
                  <Routes>
                    <Route element={<Layout />}>
                      {/* Rota Raiz: Operador vai para /campo via Index ou renderiza Dashboard para Gestor */}
                      <Route path="/" element={<Index />} />

                      {/* Modo Campo & Tarefas: Acessíveis a todos (Vaqueiro, Capataz, Gestor) */}
                      <Route path="/campo" element={<Campo />} />
                      <Route path="/tarefas" element={<Tarefas />} />

                      {/* Rotas de Campo Avançadas: Capataz e Gestor */}
                      <Route
                        path="/pastos"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor']}>
                            <Pastos />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/sanidade"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor']}>
                            <Sanidade />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/calendario"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor']}>
                            <Calendario />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/pesagens"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor']}>
                            <Pesagens />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/estoque"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor']}>
                            <Estoque />
                          </RoleRoute>
                        }
                      />

                      {/* Rotas Estratégicas e Financeiras: Proprietário, Gestor e Sócio */}
                      <Route
                        path="/fechamento"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor', 'socio']}>
                            <Fechamento />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/financeiro"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor', 'socio']}>
                            <Financeiro />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/animais"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <Animais />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/animal/:id"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <AnimalProfile />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/setor/:id"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <Setor />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/confinamento"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <Confinamento />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/frota"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <Frota />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/relatorios"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor', 'socio']}>
                            <Relatorios />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/desempenho"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor', 'socio']}>
                            <RelatoriosDesempenho />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/bi"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor', 'socio']}>
                            <BI />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/sustentabilidade"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Sustentabilidade />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/projecoes"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <ProjecaoVendas />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/colaboradores"
                        element={
                          <RoleRoute allowedRoles={['proprietario', 'gestor']}>
                            <Colaboradores />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/minha-equipe"
                        element={
                          <RoleRoute allowedRoles={['capataz', 'gestor', 'proprietario']}>
                            <MinhaEquipe />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/configuracoes"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz', 'operador']}>
                            <Configuracoes />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/administrativo"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Administrativo />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/fazendas"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Fazendas />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/mapa"
                        element={
                          <RoleRoute allowedRoles={['gestor', 'capataz']}>
                            <MapaPropriedade />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/abates"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Abates />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/vendas"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Vendas />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/hedge"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <Hedge />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/pdf-studio"
                        element={
                          <RoleRoute allowedRoles={['gestor']}>
                            <PdfStudio />
                          </RoleRoute>
                        }
                      />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </BrowserRouter>
            </NotificationProvider>
          </MarketProvider>
        </FarmProvider>
      </TaskProvider>
    </OfflineProvider>
  </AuthProvider>
)

export default App
