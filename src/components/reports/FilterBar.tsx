import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Search, CalendarIcon, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'

export interface FilterBarProps {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  typeFilter: string
  setTypeFilter: (type: string) => void
  selectedLot: string
  setSelectedLot: (lot: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  uniqueTypes: string[]
  uniqueLots: string[]
}

export function FilterBar({
  dateRange,
  setDateRange,
  typeFilter,
  setTypeFilter,
  selectedLot,
  setSelectedLot,
  searchTerm,
  setSearchTerm,
  uniqueTypes,
  uniqueLots,
}: FilterBarProps) {
  const formatDisplayDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  return (
    <Card className="mb-6 border-muted bg-muted/10 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtros Avançados
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Período</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="truncate">
                        {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to)}
                      </span>
                    ) : (
                      <span>{formatDisplayDate(dateRange.from)}</span>
                    )
                  ) : (
                    <span>Selecione um período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Tipo de Manejo</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Lote / Alvo</label>
            <Select value={selectedLot} onValueChange={setSelectedLot}>
              <SelectTrigger className="truncate">
                <SelectValue placeholder="Todos os alvos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os alvos</SelectItem>
                {uniqueLots.map((lot) => (
                  <SelectItem key={lot} value={lot}>
                    {lot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Busca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Descrição..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
