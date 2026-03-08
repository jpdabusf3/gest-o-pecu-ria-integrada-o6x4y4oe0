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
import ProjecaoVendas from './pages/ProjecaoVendas'
import Equipe from './pages/Equipe'
import Administrativo from './pages/Administrativo'
import Tarefas from './pages/Tarefas'
import Fazendas from './pages/Fazendas'
import BI from './pages/BI'
import NotFound from './pages/NotFound'

const App = () => (
  <AuthProvider>
    <OfflineProvider>
      <TaskProvider>
        <FarmProvider>
          <MarketProvider>
            <NotificationProvider>
              <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route element={<Layout />}>
                      <Route path="/" element={<Index />} />
                      <Route path="/campo" element={<Campo />} />
                      <Route path="/setor/:id" element={<Setor />} />
                      <Route path="/pastos" element={<Pastos />} />
                      <Route path="/confinamento" element={<Confinamento />} />
                      <Route path="/estoque" element={<Estoque />} />
                      <Route path="/frota" element={<Frota />} />
                      <Route path="/financeiro" element={<Financeiro />} />
                      <Route path="/sanidade" element={<Sanidade />} />
                      <Route path="/calendario" element={<Calendario />} />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/bi" element={<BI />} />
                      <Route path="/animal/:id" element={<AnimalProfile />} />
                      <Route path="/projecoes" element={<ProjecaoVendas />} />
                      <Route path="/equipe" element={<Equipe />} />
                      <Route path="/tarefas" element={<Tarefas />} />
                      <Route path="/administrativo" element={<Administrativo />} />
                      <Route path="/fazendas" element={<Fazendas />} />
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
