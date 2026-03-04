import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { useDashboard } from '../context/dashboard-context'

export function Overview() {
  const { stats, timePeriod, setTimePeriod, bills } = useDashboard()

  const getChartData = () => {
    // Use the same bills data that's used for totalSale calculation
    // bills comes from context and contains all bills data
    
    switch (timePeriod) {
      case 'daily':
        return getDailyData(bills)
      case 'weekly':
        return getWeeklyData(bills)
      case 'monthly':
        return getMonthlyData(bills)
      default:
        return getMonthlyData(bills)
    }
  }

  // Helper function to get daily data from bills
  const getDailyData = (bills: any[]) => {
    const today = new Date()
    const currentDay = today.getDay()
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - mondayOffset)
    
    const dailyData: Array<{ name: string; total: number; date: Date }> = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dailyData.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total: 0,
        date: date
      })
    }
    
    // Process bills for current week
    bills.forEach(bill => {
      const billDate = new Date(bill.billDate || bill.bill_date)
      if (!isNaN(billDate.getTime())) {
        const billDay = billDate.getDay()
        const billMondayOffset = billDay === 0 ? 6 : billDay - 1
        const billMonday = new Date(billDate)
        billMonday.setDate(billDate.getDate() - billMondayOffset)
        
        if (billMonday.getTime() === monday.getTime()) {
          const dayIndex = billDay === 0 ? 6 : billDay - 1
          const amount = Number(bill.totalAmount || bill.total_amount || 0)
          dailyData[dayIndex].total += amount
        }
      }
    })
    
    return dailyData
  }

  // Helper function to get weekly data from bills
  const getWeeklyData = (bills: any[]) => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    
    const weeklyData: Array<{ name: string; total: number; startDate: Date; endDate: Date }> = []
    let weekStart = new Date(firstDayOfMonth)
    let weekNumber = 1
    
    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      if (weekEnd > lastDayOfMonth) {
        weekEnd.setTime(lastDayOfMonth.getTime())
      }
      
      weeklyData.push({
        name: `Week ${weekNumber}`,
        total: 0,
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd)
      })
      
      weekStart.setDate(weekStart.getDate() + 7)
      weekNumber++
    }
    
    // Process bills for current month
    bills.forEach(bill => {
      const billDate = new Date(bill.billDate || bill.bill_date)
      if (!isNaN(billDate.getTime())) {
        if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
          const weekData = weeklyData.find(week => 
            billDate >= week.startDate && billDate <= week.endDate
          )
          if (weekData) {
            const amount = Number(bill.totalAmount || bill.total_amount || 0)
            weekData.total += amount
          }
        }
      }
    })
    
    return weeklyData
  }

  // Helper function to get monthly data from bills
  const getMonthlyData = (bills: any[]) => {
    const monthlyData = [
      { name: 'Jan', total: 0 },
      { name: 'Feb', total: 0 },
      { name: 'Mar', total: 0 },
      { name: 'Apr', total: 0 },
      { name: 'May', total: 0 },
      { name: 'Jun', total: 0 },
      { name: 'Jul', total: 0 },
      { name: 'Aug', total: 0 },
      { name: 'Sep', total: 0 },
      { name: 'Oct', total: 0 },
      { name: 'Nov', total: 0 },
      { name: 'Dec', total: 0 },
    ]
    
    // Process bills for all months
    bills.forEach(bill => {
      const billDate = new Date(bill.billDate || bill.bill_date)
      if (!isNaN(billDate.getTime())) {
        const month = billDate.getMonth()
        const amount = Number(bill.totalAmount || bill.total_amount || 0)
        monthlyData[month].total += amount
      }
    })
    
    return monthlyData
  }

  const getChartTitle = () => {
    switch (timePeriod) {
      case 'daily':
        return 'Daily Revenue (Current Week)'
      case 'weekly':
        return 'Weekly Revenue (Current Month)'
      case 'monthly':
        return 'Monthly Revenue (Year)'
      default:
        return 'Monthly Revenue (Year)'
      }
    }


  const chartData = getChartData()

  // Debug logging
  console.log('=== CHART DEBUG ===')
  console.log('Time period:', timePeriod)
  console.log('Chart data:', chartData)
  console.log('Chart data length:', chartData.length)
  console.log('Chart data totals:', chartData.map(item => ({ name: item.name, total: item.total })))
  console.log('Max value:', Math.max(...chartData.map(item => item.total || 0)))
  console.log('Stats total sale:', stats.totalSale)

  // Use only real data
  const displayData = chartData


  // Calculate dynamic domain for Y-axis
  const maxValue = Math.max(...displayData.map(item => item.total || 0))
  const yDomain = maxValue > 0 ? [0, Math.ceil(maxValue * 1.2)] : [0, 1000]


  return (
    <div className="space-y-2 h-[100%]">
      {/* Header with Title and Time Period Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{getChartTitle()}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>Total Revenue: <span className="font-medium text-foreground">${stats.totalSale.toLocaleString()}</span></span>
            <span>Peak: <span className="font-medium text-foreground">${maxValue.toLocaleString()}</span></span>
            {/* <span className="text-xs bg-muted px-2 py-1 rounded-md border border-border">
              Live Data
            </span> */}
          </div>
        </div>
        
        {/* Time Period Toggle Buttons */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg transition-colors duration-200">
          <Button
            variant={timePeriod === 'daily' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimePeriod('daily')}
            className="text-xs px-3 py-1 h-7 transition-colors duration-200"
          >
            Daily
          </Button>
          <Button
            variant={timePeriod === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimePeriod('weekly')}
            className="text-xs px-3 py-1 h-7 transition-colors duration-200"
          >
            Weekly
          </Button>
          <Button
            variant={timePeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimePeriod('monthly')}
            className="text-xs px-3 py-1 h-7 transition-colors duration-200"
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="w-full h-[40vh]  rounded-lg  shadow-sm transition-colors duration-200">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--muted-foreground))" 
              opacity={0.2}
              className="transition-colors duration-200"
            />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              className="transition-colors duration-200"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              className="transition-colors duration-200"
            />
            <Bar
              dataKey="total"
              fill="hsl(var(--foreground))"
              radius={[6, 6, 0, 0]}
              stroke="hsl(var(--foreground))"
              strokeWidth={0}
              className="drop-shadow-sm transition-colors duration-200"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
