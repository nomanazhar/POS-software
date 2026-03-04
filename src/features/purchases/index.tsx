import { columns } from './components/columns'
import { DataTable } from './components/data-table'
import PurchaseProvider, { usePurchaseContext } from './context/purchase-context'
import { PurchasePrimaryButtons } from './components/purchase-primary-buttons'
import { PurchaseDialogs } from './components/purchase-dialogs'
// import { SupplierProvider } from '../suppliers/context/supplier-context'
import { useMemo, useState } from 'react'
import { ReceiptDialog } from '../sales/components/receipt-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'


function PurchasesContent() {
  const { purchases, loading, error } = usePurchaseContext()
  const [timeFilter, setTimeFilter] = useState('all')
  const [purchaseReportOpen, setPurchaseReportOpen] = useState(false)

  // Helper to filter purchases by time
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter(purchase => {
      if (timeFilter === 'all') return true;
      const purchaseDate = new Date(purchase.created_at || '');
      switch (timeFilter) {
                case 'yesterday': {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          return purchaseDate.toDateString() === yesterday.toDateString();
        }
        case 'today':
          return purchaseDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return purchaseDate >= weekAgo && purchaseDate <= now;
        }
        case 'month': {
          return purchaseDate.getMonth() === now.getMonth() && purchaseDate.getFullYear() === now.getFullYear();
        }
        case 'year':
          return purchaseDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [purchases, timeFilter]);

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          {/* <BackButton /> */}
          <ProfileDropdown />
        </div>  
      </Header>
      <Main className='no-scrollbar'>
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight underline'>Purchases</h2>
            <p className='text-muted-foreground'>Manage your purchase orders and track inventory.</p>
          </div>
          <PurchasePrimaryButtons
            onTimeFilterChange={setTimeFilter}
            onPurchaseReportClick={() => setPurchaseReportOpen(true)}
            selectedTimeFilter={timeFilter}
          />
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading purchases...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading purchases</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredPurchases} />
          )}
        </div>
        <PurchaseDialogs />
        {/* Purchase Report Dialog (reusing ReceiptDialog for purchase-report mode) */}
        {purchaseReportOpen && (
          <ReceiptDialog
            onClose={() => setPurchaseReportOpen(false)}
            purchaseReportMode={true}
            purchases={filteredPurchases.map(p => ({
              purchase_unique_id: p.purchase_unique_id || '',
              purchase_id: p.purchase_id,
              purchase_billno: p.purchase_billno,
              supplier_name: p.account_unique_id,
              total_amount: Number(p.total_amount) || 0,
              isreturned: p.isreturned,
            }))}
          />
        )}
      </Main>
    </>
  )
} 

export default function PurchasesPage() {
  return (
    <PurchaseProvider>
      <PurchasesContent />
    </PurchaseProvider>
  )
}
