import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { QuotationProvider, useQuotationContext } from './context/quotation-context'
import { DataTable } from './components/data-table'
import { columns } from './components/columns'
import { QuotationViewDialog } from './components/quotation-view-dialog'
import React, { useState } from 'react'
import type { Quotation } from './data/schema'

// Extend Window interface for global function
declare global {
  interface Window {
    quotationViewDialog?: (quotation: Quotation) => void
  }
}


function QuotationsContent() {
  const { quotations, isLoading, error } = useQuotationContext()
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Set up global function for view dialog
  React.useEffect(() => {
    window.quotationViewDialog = (quotation: Quotation) => {
      setSelectedQuotation(quotation)
      setViewDialogOpen(true)
    }
    
    return () => {
      delete window.quotationViewDialog
    }
  }, [])

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>  
      </Header>
      <Main className='no-scrollbar'>
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight underline'>Quotations</h2>
            <p className='text-muted-foreground'>Read-only list of saved quotations.</p>
          </div>
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading quotations...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading quotations</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={quotations} />
          )}
        </div>
        <QuotationViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          quotation={selectedQuotation}
        />
      </Main>
    </>
  )
}

export default function QuotationsPage() {
  return (
    <QuotationProvider>
      <QuotationsContent />
    </QuotationProvider>
  )
}


