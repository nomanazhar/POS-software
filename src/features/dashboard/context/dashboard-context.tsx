import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'

type TimePeriod = 'daily' | 'weekly' | 'monthly'

interface DashboardStats {
  totalRevenue: number
  monthlySales: number
  totalProducts: number
  itemsInStock: number
  totalCustomers: number
  // New stats
  totalSale: number
  totalPurchaseOrders: number
  totalPurchaseAmount: number
  totalSaleOrders: number
  profitMargin: number
  totalStock: number
  totalStockValue: number
  totalSaleReturn: number
  totalPurchaseReturn: number
  totalPurchases: number
  totalQuotations: number
  recentBills: Array<{
    billNumber: string
    customerName: string
    totalAmount: number
    paymentStatus: string
    billDate: string
  }>
  monthlyRevenueData: Array<{
    name: string
    total: number
  }>
  dailyRevenueData: Array<{
    name: string
    total: number
    date: Date
  }>
  weeklyRevenueData: Array<{
    name: string
    total: number
    startDate: Date
    endDate: Date
  }>
}

interface DashboardContextType {
  stats: DashboardStats
  loading: boolean
  error: string | null
  timePeriod: TimePeriod
  setTimePeriod: (period: TimePeriod) => void
  refreshData: () => Promise<void>
  bills: any[]
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly')
  const [bills, setBills] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [, setLastUpdateTime] = useState<Date>(new Date())
  const [isLiveMode, 
    // setIsLiveMode
  ] = useState(true)
  const [lastTotalSales, setLastTotalSales] = useState<number>(0)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI) {
        console.log('Fetching dashboard data from Electron API...')
        
        // Fetch all data from database
        const [billsData, purchasesData, productsData, inventoryData, accountsCustomers, quotationsData] = await Promise.all([
          window.electronAPI.invoke('bills:getAll'),
          window.electronAPI.invoke('purchases:getAll'),
          window.electronAPI.invoke('products:getAll'),
          window.electronAPI.invoke('inventory:getAll'),
          window.electronAPI.invoke('accounts:getByType', 'customer'),
          window.electronAPI.invoke('quotations:getAll'),
        ])

        console.log('Raw data from Electron API:', {
          bills: billsData,
          purchases: purchasesData,
          products: productsData,
          inventory: inventoryData,
          customers: accountsCustomers,
          quotations: quotationsData,
        })

        console.log('Dashboard data fetched:', {
          bills: billsData?.length || 0,
          purchases: purchasesData?.length || 0,
          products: productsData?.length || 0,
          inventory: inventoryData?.length || 0,
          customers: accountsCustomers?.length || 0,
          quotations: quotationsData?.length || 0,
        })

        // Process bills data - handle both direct array and wrapped response formats
        let processedBills = [];
        if (Array.isArray(billsData)) {
          processedBills = billsData;
        } else if (billsData && typeof billsData === 'object' && billsData.success && Array.isArray(billsData.data)) {
          processedBills = billsData.data;
        }
        
        console.log('Processed bills data:', {
          original: billsData,
          processed: processedBills,
          count: processedBills.length,
          sample: processedBills[0],
          fieldNames: processedBills[0] ? Object.keys(processedBills[0]) : [],
          totalAmountFields: processedBills[0] ? {
            total_amount: processedBills[0].total_amount,
            totalAmount: processedBills[0].totalAmount,
            amount: processedBills[0].amount,
            total: processedBills[0].total
          } : {}
        });
        
        setBills(processedBills)
        
        // Process purchases data - handle both direct array and wrapped response formats
        let processedPurchases = [];
        if (Array.isArray(purchasesData)) {
          processedPurchases = purchasesData;
        } else if (purchasesData && typeof purchasesData === 'object' && purchasesData.success && Array.isArray(purchasesData.data)) {
          processedPurchases = purchasesData.data;
        }
        
        console.log('Processed purchases data:', {
          original: purchasesData,
          processed: processedPurchases,
          count: processedPurchases.length,
          sample: processedPurchases[0],
          fieldNames: processedPurchases[0] ? Object.keys(processedPurchases[0]) : [],
          totalAmountFields: processedPurchases[0] ? {
            total_amount: processedPurchases[0].total_amount,
            totalAmount: processedPurchases[0].totalAmount,
            amount: processedPurchases[0].amount,
            total: processedPurchases[0].total
          } : {}
        });
        
        setPurchases(processedPurchases)
        
        // Process other data sources with the same robust approach
        let processedProducts = Array.isArray(productsData) ? productsData : [];
        let processedInventory = Array.isArray(inventoryData) ? inventoryData : [];
        let processedCustomers = Array.isArray(accountsCustomers) ? accountsCustomers : [];
        let processedQuotations = Array.isArray(quotationsData) ? quotationsData : [];
        
        // Handle wrapped response formats for other data sources
        if (productsData && typeof productsData === 'object' && productsData.success && Array.isArray(productsData.data)) {
          processedProducts = productsData.data;
        }
        if (inventoryData && typeof inventoryData === 'object' && inventoryData.success && Array.isArray(inventoryData.data)) {
          processedInventory = inventoryData.data;
        }
        if (accountsCustomers && typeof accountsCustomers === 'object' && accountsCustomers.success && Array.isArray(accountsCustomers.data)) {
          processedCustomers = accountsCustomers.data;
        }
        if (quotationsData && typeof quotationsData === 'object' && quotationsData.success && Array.isArray(quotationsData.data)) {
          processedQuotations = quotationsData.data;
        }
        
        setProducts(processedProducts)
        setInventory(processedInventory)
        setCustomers(processedCustomers)
        setQuotations(processedQuotations)
        
        // Update last update time
        setLastUpdateTime(new Date())
      } else {
        console.warn('Electron API not available')
        setError('Database connection not available')
        // Set empty arrays to ensure zero values
        setBills([])
        setPurchases([])
        setProducts([])
        setInventory([])
        setCustomers([])
        setQuotations([])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Quick data refresh for real-time updates (only fetches bills and purchases for speed)
  const quickRefresh = async () => {
    if (!window.electronAPI) return
    
    try {
      const [billsData, purchasesData] = await Promise.all([
        window.electronAPI.invoke('bills:getAll'),
        window.electronAPI.invoke('purchases:getAll'),
      ])
      
      // Process bills data
      let processedBills = [];
      if (Array.isArray(billsData)) {
        processedBills = billsData;
      } else if (billsData && typeof billsData === 'object' && billsData.success && Array.isArray(billsData.data)) {
        processedBills = billsData.data;
      }
      
      // Process purchases data
      let processedPurchases = [];
      if (Array.isArray(purchasesData)) {
        processedPurchases = purchasesData;
      } else if (purchasesData && typeof purchasesData === 'object' && purchasesData.success && Array.isArray(purchasesData.data)) {
        processedPurchases = purchasesData.data;
      }
      
      setBills(processedBills)
      setPurchases(processedPurchases)
      setLastUpdateTime(new Date())
      
      console.log('Quick refresh completed at:', new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Quick refresh failed:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Monitor total sales changes and trigger updates
  useEffect(() => {
    if (!isLiveMode) return
    
    const currentTotalSales = bills.reduce((sum, bill) => {
      const amount = bill.total_amount || bill.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0)
    
    // If total sales has changed, trigger a quick refresh
    if (currentTotalSales !== lastTotalSales && lastTotalSales > 0) {
      console.log('Total sales changed, triggering update...')
      quickRefresh()
    }
    
    setLastTotalSales(currentTotalSales)
  }, [bills, isLiveMode, lastTotalSales])

  // Auto-refresh every 30 seconds to keep data current (full refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Full refresh at:', new Date().toLocaleTimeString())
      fetchData()
    }, 60000) // 60 seconds
    
    return () => clearInterval(interval)
  }, [])

  const refreshData = async () => {
    console.log('Manual refresh requested...');
    await fetchData()
  }

  // const toggleLiveMode = () => {
  //   setIsLiveMode(!isLiveMode)
  //   console.log('Live mode:', !isLiveMode ? 'enabled' : 'disabled')
  // }

  const stats = useMemo(() => {
    // Helper functions for consistent return status checking
    const isReturnBill = (bill: any) => {
      return bill.isreturned === 1 || bill.is_returned === 1 || bill.isReturned === true || bill.isReturned === 1
    }
    
    const isReturnPurchase = (purchase: any) => {
      return purchase.isreturned === 1 || purchase.isReturned === true || purchase.isReturned === 1
    }
    
    // Calculate total revenue from all bills
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.totalAmount || bill.total_amount || 0), 0)
    
    // Calculate monthly sales (current month)
    const currentMonthForSales = new Date().getMonth()
    const currentYearForSales = new Date().getFullYear()
    const monthlySales = bills.filter(bill => {
      const billDate = new Date(bill.bill_date || bill.billDate)
      return billDate.getMonth() === currentMonthForSales && billDate.getFullYear() === currentYearForSales
    }).length
    
    // Total products
    const totalProducts = products.length
    
    // Items in stock (sum of all inventory quantities)
    const itemsInStock = inventory.reduce((sum, item) => sum + (item.stock || 0), 0)
    
    // Total customers
    const totalCustomers = customers.length

    // New calculations
    // Total Sale (total amount from all bills)
    const totalSale = bills.reduce((sum, bill) => {
      // Handle different field name variations for total amount
      const amount = bill.total_amount || bill.totalAmount || bill.totalAmount || 0;
      const numericAmount = Number(amount) || 0;
      
      // Debug logging for first few bills
      if (sum === 0) {
        console.log('First bill in totalSale calculation:', {
          bill,
          total_amount: bill.total_amount,
          totalAmount: bill.totalAmount,
          amount,
          numericAmount
        });
      }
      
      return sum + numericAmount;
    }, 0)
    
    console.log('Total Sale calculation:', {
      billsCount: bills.length,
      totalSale,
      sampleBills: bills.slice(0, 3).map(bill => ({
        id: bill.bill_id || bill.bill_unique_id,
        total_amount: bill.total_amount,
        totalAmount: bill.totalAmount
      }))
    });

    // Total Purchase Orders (count and amount)
    const totalPurchaseOrders = purchases.length
    const totalPurchaseAmount = purchases.reduce((sum, purchase) => {
      // Handle different field name variations for total amount
      const amount = purchase.total_amount || purchase.totalAmount || purchase.totalAmount || 0;
      const numericAmount = Number(amount) || 0;
      
      // Debug logging for first few purchases
      if (sum === 0) {
        console.log('First purchase in totalPurchaseAmount calculation:', {
          purchase,
          total_amount: purchase.total_amount,
          totalAmount: purchase.totalAmount,
          amount,
          numericAmount
        });
      }
      
      return sum + numericAmount;
    }, 0)
    
    console.log('Total Purchase calculation:', {
      purchasesCount: purchases.length,
      totalPurchaseAmount,
      samplePurchases: purchases.slice(0, 3).map(purchase => ({
        id: purchase.purchase_id || purchase.purchase_unique_id,
        total_amount: purchase.total_amount,
        totalAmount: purchase.totalAmount
      }))
    });

    // Total Sale Orders (count of bills)
    const totalSaleOrders = bills.length

    // Profit Margin: join inventory with products to access retail and purchase prices
    const productByUnique: Record<string, any> = {}
    products.forEach((p: any) => { if (p && p.product_unique_id) productByUnique[p.product_unique_id] = p })
    const profitMargin = inventory.reduce((sum, item) => {
      const prod = productByUnique[item.product_unique_id]
      const retailPrice = prod?.retail_price ?? item.price ?? 0
      const purchasePrice = prod?.purchase_price ?? item.purchaseprice ?? 0
      const stock = item.stock || 0
      const profitPerUnit = Number(retailPrice) - Number(purchasePrice)
      return sum + (profitPerUnit * stock)
    }, 0)

    // Total Stock (quantity and value)
    const totalStock = inventory.reduce((sum, item) => sum + (item.stock || 0), 0)
    const totalStockValue = inventory.reduce((sum, item) => {
      const prod = productByUnique[item.product_unique_id]
      const price = prod?.retail_price ?? item.price ?? 0
      const stock = item.stock || 0
      return sum + (Number(price) * stock)
    }, 0)

    // Total Sale Return (from bills with isreturned = 1)
    const totalSaleReturn = bills
      .filter(isReturnBill)
      .reduce((sum, bill) => sum + (bill.totalAmount || bill.total_amount || 0), 0)

    // Total Purchase Return (from purchases with isreturned = 1)
    const totalPurchaseReturn = purchases
      .filter(isReturnPurchase)
      .reduce((sum, purchase) => {
        const amount = purchase.total_amount || purchase.totalAmount || 0;
        return sum + (Number(amount) || 0);
      }, 0)

    // Total Purchases (total amount from all purchases)
    const totalPurchases = purchases.reduce((sum, purchase) => {
      const amount = purchase.total_amount || purchase.totalAmount || 0;
      return sum + (Number(amount) || 0);
    }, 0)

    // Total Quotations (count of quotations)
    const totalQuotations = quotations.length
    
    // Recent bills (last 5)
    const recentBills = bills
      .sort((a, b) => {
        const dateA = new Date(a.bill_date || a.billDate || 0)
        const dateB = new Date(b.bill_date || b.billDate || 0)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 5)
      .map(bill => ({
        billNumber: bill.bill_number || bill.billNumber || '',
        customerName: bill.customer_name || bill.customerName || 'Walk-in Customer',
        totalAmount: bill.totalAmount || bill.total_amount || 0,
        paymentStatus: bill.payment_status || bill.paymentStatus || 'pending',
        billDate: bill.bill_date || bill.billDate || '',
      }))

    console.log('Recent bills data:', {
      totalBills: bills.length,
      recentBillsCount: recentBills.length,
      recentBills: recentBills.map(bill => ({
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        totalAmount: bill.totalAmount,
        paymentStatus: bill.paymentStatus,
        billDate: bill.billDate,
      }))
    })
    
    // Monthly revenue data for the chart
    const monthlyRevenueData = [
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
    
    // Calculate monthly revenue
    bills.forEach(bill => {
      const billDate = new Date(bill.bill_date || bill.billDate)
      if (!isNaN(billDate.getTime())) {
        const month = billDate.getMonth()
        const amount = Number(bill.totalAmount || bill.total_amount || 0)
        monthlyRevenueData[month].total += amount
      }
    })

    // Add some sample data if no real data exists (for testing)
    if (bills.length === 0) {
      console.log('No bills found, adding sample data for chart testing')
      const currentMonth = new Date().getMonth()
      monthlyRevenueData[currentMonth].total = 5000
      monthlyRevenueData[currentMonth - 1 >= 0 ? currentMonth - 1 : 11].total = 3000
      monthlyRevenueData[currentMonth - 2 >= 0 ? currentMonth - 2 : 10].total = 7000
    } else {
      // Check if we have any revenue data, if not add some sample data
      const hasAnyRevenue = monthlyRevenueData.some(item => item.total > 0)
      if (!hasAnyRevenue) {
        console.log('Bills exist but no revenue data, adding sample data')
        const currentMonth = new Date().getMonth()
        monthlyRevenueData[currentMonth].total = 2500
        monthlyRevenueData[currentMonth - 1 >= 0 ? currentMonth - 1 : 11].total = 1800
        monthlyRevenueData[currentMonth - 2 >= 0 ? currentMonth - 2 : 10].total = 3200
      }
    }

    // Daily revenue data for the chart (days of current week)
    const dailyRevenueData: Array<{
      name: string
      total: number
      date: Date
    }> = []
    
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1 // Adjust for Monday start
    
    // Get Monday of current week
    const monday = new Date(today)
    monday.setDate(today.getDate() - mondayOffset)
    
    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dailyRevenueData.push({
        name: date.toLocaleDateString('en-US', { weekday: 'long' }),
        total: 0,
        date: date
      })
    }
    
    // Calculate daily revenue for current week
    bills.forEach(bill => {
      const billDate = new Date(bill.bill_date || bill.billDate)
      if (!isNaN(billDate.getTime())) {
        // Check if bill is within current week
        const billDay = billDate.getDay()
        const billMondayOffset = billDay === 0 ? 6 : billDay - 1
        const billMonday = new Date(billDate)
        billMonday.setDate(billDate.getDate() - billMondayOffset)
        
        // If bill is from current week, add to daily data
        if (billMonday.getTime() === monday.getTime()) {
          const dayIndex = billDay === 0 ? 6 : billDay - 1 // Sunday becomes index 6
          const amount = Number(bill.totalAmount || bill.total_amount || 0)
          dailyRevenueData[dayIndex].total += amount
        }
      }
    })

    // Add some sample data if no real data exists (for testing)
    if (bills.length === 0) {
      console.log('No bills found, adding sample daily data for chart testing')
      // Add sample data for a few days
      dailyRevenueData[1].total = 1200 // Tuesday
      dailyRevenueData[2].total = 800  // Wednesday
      dailyRevenueData[3].total = 1500 // Thursday
      dailyRevenueData[4].total = 2000 // Friday
    } else {
      // Check if we have any daily revenue data, if not add some sample data
      const hasAnyDailyRevenue = dailyRevenueData.some(item => item.total > 0)
      if (!hasAnyDailyRevenue) {
        console.log('Bills exist but no daily revenue data, adding sample data')
        dailyRevenueData[1].total = 600 // Tuesday
        dailyRevenueData[2].total = 400  // Wednesday
        dailyRevenueData[3].total = 750 // Thursday
        dailyRevenueData[4].total = 1000 // Friday
      }
    }

    // Weekly revenue data for the chart (weeks of current month)
    const weeklyRevenueData: Array<{
      name: string
      total: number
      startDate: Date
      endDate: Date
    }> = []
    
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    
    // Calculate weeks in current month
    let weekStart = new Date(firstDayOfMonth)
    let weekNumber = 1
    
    while (weekStart <= lastDayOfMonth) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      // Adjust week end to not exceed month end
      if (weekEnd > lastDayOfMonth) {
        weekEnd.setTime(lastDayOfMonth.getTime())
      }
      
      weeklyRevenueData.push({
        name: `Week ${weekNumber}`,
        total: 0,
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd)
      })
      
      weekStart.setDate(weekStart.getDate() + 7)
      weekNumber++
    }
    
    // Calculate weekly revenue for current month
    bills.forEach(bill => {
      const billDate = new Date(bill.bill_date || bill.billDate)
      if (!isNaN(billDate.getTime())) {
        // Check if bill is from current month
        if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
          const weekData = weeklyRevenueData.find(week => 
            billDate >= week.startDate && billDate <= week.endDate
          )
          if (weekData) {
            const amount = Number(bill.totalAmount || bill.total_amount || 0)
            weekData.total += amount
          }
        }
      }
    })


    const calculatedStats = {
      totalRevenue,
      monthlySales,
      totalProducts,
      itemsInStock,
      totalCustomers,
      totalSale,
      totalPurchaseOrders,
      totalPurchaseAmount,
      totalSaleOrders,
      profitMargin,
      totalStock,
      totalStockValue,
      totalSaleReturn,
      totalPurchaseReturn,
      totalPurchases,
      totalQuotations,
      recentBills,
      monthlyRevenueData,
      dailyRevenueData,
      weeklyRevenueData,
    }

    console.log('Dashboard stats calculated:', {
      totalRevenue,
      totalSale,
      totalPurchaseOrders,
      totalSaleOrders,
      profitMargin,
      totalProducts,
      totalStock,
      totalStockValue,
      totalSaleReturn,
      totalPurchaseReturn,
      totalPurchases,
      totalQuotations,
      billsCount: bills.length,
      purchasesCount: purchases.length,
      productsCount: products.length,
      inventoryCount: inventory.length,
      customersCount: customers.length,
      quotationsCount: quotations.length,
    })

    
    return calculatedStats
  }, [bills, purchases, products, inventory, customers, quotations])

  return (
    <DashboardContext.Provider value={{ 
      stats: { 
        ...stats, 
        recentBills: stats.recentBills.map(bill => ({ 
          ...bill, 
          paymentStatus: String(bill.paymentStatus ?? '') 
        })) 
      },
      loading,
      error,
      timePeriod,
      setTimePeriod,
      refreshData,
      bills
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
} 