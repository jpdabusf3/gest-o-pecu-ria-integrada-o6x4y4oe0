import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'

interface ExportMenuProps {
  onExportCSV: () => void
  onExportPDF: () => void
  className?: string
  label?: string
}

export function ExportMenu({
  onExportCSV,
  onExportPDF,
  className,
  label = 'Exportar',
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Download className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4 text-rose-500" />
          Exportar para PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV} className="cursor-pointer">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
          Exportar para Excel (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
