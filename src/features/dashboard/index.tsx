// import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
// import { Overview } from './components/overview'
// import { RecentSales } from './components/recent-sales'
import { DashboardProvider, useDashboard } from './context/dashboard-context'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw } from 'lucide-react'

function DashboardContent() {
  const { stats, loading, error, refreshData } = useDashboard()

  if (loading) {
    return (
      <>
        <Header >
          <div className='ml-auto flex items-center justify-end space-x-2 sm:space-x-4 flex-shrink-0'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        <Main  >
          <div className=' mb-4 flex items-center justify-start'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight underline'>Dashboard</h1>
          </div>
          
          {/* Loading skeletons */}
          <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'>
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className='p-2 sm:p-3'>
                <CardHeader className='flex flex-row items-center justify-start space-y-2 pb-2'>
                  <Skeleton className='h-4 w-20 sm:w-24' />
                  <Skeleton className='h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-6 sm:h-8 w-16 sm:w-20 mb-2' />
                  <Skeleton className='h-3 w-24 sm:w-32' />
                </CardContent>
              </Card>
            ))}
          </div>
        </Main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header>
          <div className='ml-auto flex items-center justify-end space-x-2 sm:space-x-4 flex-shrink-0'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        <Main>
          <div className='mb-4 flex items-center justify-start'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight underline'>Dashboard</h1>
          </div>
          
          <Alert>
            <RefreshCw className='h-4 w-4' />
            <AlertDescription>
              {error}. <button onClick={refreshData} className='underline'>Click here to retry</button>
            </AlertDescription>
          </Alert>
        </Main>
      </>
    )
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header >
        <div className='ml-auto flex items-center justify-end space-x-2 sm:space-x-4 flex-shrink-0 '>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main className='!space-y-2 !py-0' >

        <div className=' mb-4 flex items-center justify-between  h-[6%] '>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight underline'>Dashboard</h1>
          <button 
            onClick={refreshData}
            className='flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors'
          >
            <RefreshCw className='h-4 w-4' />
            Refresh
          </button>
        </div>
        
        {/* First Row - 5 cards */}
        <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-[17%] '>
          <Card className='p-1 sm:p-3 flex flex-col justify-between '>
            <CardHeader className='flex flex-row items-center justify-start space-y-2 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Sale
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.totalSale.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total revenue from all sales
                {stats.totalSaleOrders === 0 && (
                  <span className='block text-orange-600 mt-1'>No bills found</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Sale Orders
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <rect width='20' height='14' x='2' y='5' rx='2' />
                <path d='M2 10h20' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>{stats.totalSaleOrders}</div>
              <p className='text-muted-foreground text-xs'>
                Total bills processed
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Purchases
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                <circle cx='9' cy='7' r='4' />
                <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.totalPurchases.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total amount of all purchases
                {stats.totalPurchaseOrders === 0 && (
                  <span className='block text-orange-600 mt-1'>No purchases found</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Purchase Orders
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                <circle cx='9' cy='7' r='4' />
                <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>{stats.totalPurchaseOrders}</div>
              <p className='text-muted-foreground text-xs'>
                orders value: {stats.totalPurchaseAmount.toLocaleString()}
                {stats.totalPurchaseOrders === 0 && (
                  <span className='block text-orange-600 mt-1'>No purchase orders found</span>
                )}
              </p>
            </CardContent>
          </Card>

          

          

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Quotations
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' />
                <polyline points='14,2 14,8 20,8' />
                <line x1='16' y1='13' x2='8' y2='13' />
                <line x1='16' y1='17' x2='8' y2='17' />
                <polyline points='10,9 9,9 8,9' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.totalQuotations}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total quotations created
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - 5 cards */}
        <div className='mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-[17%] '>
          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Sale Return
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M3 12h18' />
                <path d='M3 12l6-6' />
                <path d='M3 12l6 6' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.totalSaleReturn.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total returned sales amount
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Purchase Return
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M3 12h18' />
                <path d='M21 12l-6-6' />
                <path d='M21 12l-6 6' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.totalPurchaseReturn.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total returned purchase amount
                {stats.totalPurchaseOrders === 0 && (
                  <span className='block text-orange-600 mt-1'>No purchase returns found</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-2 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Products
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M20.59 13.41l-6.36 6.36a2 2 0 0 1-2.83 0L2 14.82V20a2 2 0 0 0 2 2h5.18l9.41-9.41a2 2 0 0 0 0-2.82z' />
                <line x1='7' y1='7' x2='7.01' y2='7' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>{stats.totalProducts}</div>
              <p className='text-muted-foreground text-xs'>
                Products in inventory
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Stock
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M3 3v18h18' />
                <path d='M18 17V9' />
                <path d='M13 17V5' />
                <path d='M8 17v-3' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>{stats.totalStock}</div>
              <p className='text-muted-foreground text-xs'>
                Value: {stats.totalStockValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className='p-1 sm:p-3 flex flex-col justify-between'>
            <CardHeader className='flex flex-row items-center justify-start space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Profit Margin
              </CardTitle>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='text-muted-foreground h-4 w-4'
              >
                <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
              </svg>
            </CardHeader>
            <CardContent>
              <div className='text-xl sm:text-2xl font-bold'>
                {stats.profitMargin.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                Total profit from inventory
              </p>
            </CardContent>
          </Card>

          
        </div>

        {/* <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-7 h-[55%] overflow-hidden  '>
          <Card className='pt-4 col-span-1 lg:col-span-4 h-[100%]'>
            <CardContent className='pl-2'>
              <Overview />
            </CardContent>
          </Card>
          <Card className='pt-4 col-span-1 lg:col-span-3 h-[100%] overflow-y-auto'>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSales />
            </CardContent>
          </Card>
        </div>  */}
      </Main>
    </>
  )
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
