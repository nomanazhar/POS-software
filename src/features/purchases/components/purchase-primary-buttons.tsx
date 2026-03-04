import { Button } from '@/components/ui/button'
import { usePurchaseContext } from '../context/purchase-context'
import { IconPlus } from '@tabler/icons-react'
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

export function PurchasePrimaryButtons({
  onTimeFilterChange,
  onPurchaseReportClick,
  selectedTimeFilter,
}: {
  onTimeFilterChange?: (value: string) => void
  onPurchaseReportClick?: () => void
  selectedTimeFilter?: string
}) {
  const { setOpen } = usePurchaseContext()

  return (
    <div className='flex items-center gap-2'>
      <Select
        value={selectedTimeFilter || 'all'}
        onValueChange={(value) => onTimeFilterChange?.(value)}
      >
        <SelectTrigger className="w-[125px] ">
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
      <Button 
        variant="outline"
        onClick={() => onPurchaseReportClick?.()}
        className='gap-2'
      >
        <Download className="mr-2 h-4 w-4" />
        Purchase Report
      </Button>
      <Button 
        onClick={() => setOpen('create')}
        className='gap-2'
      >
        <IconPlus size={16} />
        Add Purchase
      </Button>
    </div>
  )
} 