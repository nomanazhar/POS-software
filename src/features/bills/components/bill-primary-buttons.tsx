import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIME_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'All', value: 'all' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
]

export function BillPrimaryButtons({
  onTimeFilterChange,
  onSaleReportClick,
  selectedTimeFilter,
}: {
  onTimeFilterChange: (value: string) => void
  onSaleReportClick: () => void
  selectedTimeFilter: string
}) {
  return (
    <div className="flex gap-2 items-center">
      {/* Add Bill removed: bills are created from Sales */}
      <Select
        value={selectedTimeFilter}
        onValueChange={(value) => onTimeFilterChange?.(value)}
      >
        <SelectTrigger className="w-[125px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {TIME_FILTERS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onSaleReportClick}>
        <Download className="mr-2 h-4 w-4" />
        Sale Report
      </Button>
    </div>
  )
} 
          