import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Index from './pages/Index'
import Setor from './pages/Setor'
import Pastos from './pages/Pastos'
import Estoque from './pages/Estoque'
import Financeiro from './pages/Financeiro'
import AnimalProfile from './pages/AnimalProfile'
import Sanidade from './pages/Sanidade'
import Calendario from './pages/Calendario'
import Confinamento from './pages/Confinamento'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/setor/:id" element={<Setor />} />
          <Route path="/pastos" element={<Pastos />} />
          <Route path="/confinamento" element={<Confinamento />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/sanidade" element={<Sanidade />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/animal/:id" element={<AnimalProfile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
