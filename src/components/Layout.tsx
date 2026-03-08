import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { Outlet } from 'react-router-dom'
import { SyncManager } from './SyncManager'

export default function Layout() {
  return (
    <SidebarProvider>
      <SyncManager />
      <AppSidebar />
      <SidebarInset className="bg-muted/30">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in-up">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
