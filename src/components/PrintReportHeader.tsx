import useFazendaStore from '@/stores/useFazendaStore'

interface PrintReportHeaderProps {
  title: string
  subtitle?: string
}

export function PrintReportHeader({ title, subtitle }: PrintReportHeaderProps) {
  const { fazendas } = useFazendaStore()
  const farmName = fazendas.length > 0 ? fazendas[0].nome : 'Gestão Pecuária Integrada'
  const now = new Date()

  return (
    <div className="hidden print:block mb-8 border-b-2 border-primary pb-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
            {farmName}
          </p>
          <h1 className="text-2xl font-bold mt-1">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Data de Emissão</p>
          <p className="text-base font-bold">
            {now.toLocaleDateString('pt-BR')} {now.toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  )
}
