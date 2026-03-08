import { SectorCalendarTab } from '@/components/sector/SectorCalendarTab'

export default function Calendario() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendário Operacional Mestre</h2>
        <p className="text-muted-foreground mt-1">
          Gestão centralizada de todas as atividades e eventos da fazenda.
        </p>
      </div>
      <SectorCalendarTab sectorId="all" />
    </div>
  )
}
