import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '../context/dashboard-context'

export function RecentSales() {
  const { stats } = useDashboard()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  console.log('RecentSales component - stats.recentBills:', stats.recentBills)

  if (!stats.recentBills || stats.recentBills.length === 0) {
    return (
      <div className='space-y-4 h-[100%]'>
        <div className='text-center text-muted-foreground text-sm py-8'>
          No recent sales found
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4 h-[100%]'>
      {stats.recentBills.map((bill, index) => (
        <div key={index} className='flex items-start gap-4'>
          <Avatar className='h-9 w-9 flex-shrink-0'>
            <AvatarFallback className='text-xs'>
              {getInitials(bill.customerName)}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-col min-w-0'>
            <div className='flex items-start justify-start gap-2'>
              <div className='space-y-1 min-w-0 flex-1'>
                <p className='text-sm leading-none font-medium truncate'>{bill.customerName}</p>
                {/* <p className='text-muted-foreground text-xs'>
                  {bill.billNumber} • {new Date(bill.billDate).toLocaleDateString()}
                </p> */}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getStatusColor(bill.paymentStatus)}`}
                >
                  {bill.paymentStatus}
                </Badge>
              </div>
              <div className='font-medium text-sm flex-shrink-0'>
                {bill.totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
