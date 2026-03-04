import BillProvider, { useBillContext } from './context/bill-context'
import { columns } from './components/columns'
import { DataTable } from './components/data-table'
import { BillDialogs } from './components/bill-dialogs'
import { BillPrimaryButtons } from './components/bill-primary-buttons'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { SalesProvider } from '../sales/context/sales-context'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { useState, useMemo } from 'react'
import { ReceiptDialog } from '../sales/components/receipt-dialog'

function BillsContent() {
  const { bills, loading, error } = useBillContext()
  const [timeFilter, setTimeFilter] = useState('all')
  const [saleReportOpen, setSaleReportOpen] = useState(false)

  // Helper to filter bills by time
  const filteredBills = useMemo(() => {
    const now = new Date();
    return bills.filter(bill => {
      if (timeFilter === 'all') return true;
      const billDate = new Date(bill.created_at || '');
      switch (timeFilter) {
        case 'shift':
          // For demo, treat shift as today (customize as needed)
          return billDate.toDateString() === now.toDateString();
        case 'yesterday': {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          return billDate.toDateString() === yesterday.toDateString();
        }
        case 'today':
          return billDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return billDate >= weekAgo && billDate <= now;
        }
        case 'month': {
          return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
        }
        case 'year':
          return billDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [bills, timeFilter]);

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>  
      </Header>
      <Main  className='no-scrollbar'>
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight underline'>Sale Bills</h2>
            <p className='text-muted-foreground'>Manage all your bills and invoices.</p>
          </div>
          <BillPrimaryButtons
            onTimeFilterChange={setTimeFilter}
            onSaleReportClick={() => setSaleReportOpen(true)}
            selectedTimeFilter={timeFilter}
          />
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading bills...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading bills</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredBills} />
          )}
        </div>
        <SalesProvider><BillDialogs /></SalesProvider>
        {/* Sale Report Dialog (reusing ReceiptDialog for sale-report mode) */}
        {saleReportOpen && (
          <ReceiptDialog
            onClose={() => setSaleReportOpen(false)}
            saleReportMode={true}
            bills={filteredBills.map(b => ({
              bill_unique_id: String(b.bill_id),
              payment_method: b.payment_method || 'cash',
              total_amount: b.total_amount,
            }))}
          />
        )}
      </Main>
    </>
  )
} 

export default function BillsPage() {
  return (
    <BillProvider>
      <BillsContent />
    </BillProvider>
  )
}