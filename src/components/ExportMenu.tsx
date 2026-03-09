import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, TableProperties } from 'lucide-react'

interface ExportMenuProps {
  onExportCSV?: () => void
  onExportExcel?: () => void
  onExportPDF?: () => void
  className?: string
  label?: string
}

export function ExportMenu({
  onExportCSV,
  onExportExcel,
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Formato do Arquivo</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer gap-2 py-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Exportar para Excel (.xls)</span>
          </DropdownMenuItem>
        )}

        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV} className="cursor-pointer gap-2 py-2">
            <TableProperties className="h-4 w-4 text-blue-500" />
            <span>Exportar para CSV (.csv)</span>
          </DropdownMenuItem>
        )}

        {onExportPDF && (
          <>
            {(onExportExcel || onExportCSV) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer gap-2 py-2">
              <FileText className="h-4 w-4 text-rose-500" />
              <span>Exportar para PDF</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
