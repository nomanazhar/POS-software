import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { AccountProvider, useAccountContext } from '@/features/accounts/context/account-context'
import { DataTable } from '@/features/accounts/components/data-table'
import { columns } from '@/features/accounts/components/columns'
import { AccountDialogs } from '@/features/accounts/components/account-dialogs'
import { AccountPrimaryButtons } from '@/features/accounts/components/account-primary-buttons'
import { DebugAccountData } from '@/components/debug-account-data'
import { AccountReportDialog } from '@/features/accounts/components/account-report-dialog'

export const Route = createFileRoute('/_authenticated/accounts')({
  component: AccountsPage,
})

function AccountsContent() {
  const { 
    accounts, 
    isLoading, 
    error, 
    clearError, 
    isReportDialogOpen, 
    closeReportDialog 
  } = useAccountContext()

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>  
      </Header>
      <Main >
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Accounts</h2>
            <p className='text-muted-foreground'>
              View and manage all your users, customers, and suppliers.
            </p>
          </div>
          <AccountPrimaryButtons />
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-600 mr-2">⚠️</div>
                <p className="text-red-800">{error}</p>
              </div>
              <button 
                onClick={clearError}
                className="text-red-600 hover:text-red-800 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading accounts...</p>
              </div>
            </div>
          ) : accounts.length === 0 && !error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No accounts found</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first account</p>
                <AccountPrimaryButtons />
              </div>
            </div>
          ) : (
            <DataTable data={accounts as any} columns={columns as any} />
          )}
        </div>
        <DebugAccountData />
        <AccountDialogs />
        <AccountReportDialog 
          open={isReportDialogOpen}
          onOpenChange={closeReportDialog}
        />
      </Main>
    </>
  )
}

function AccountsPage() {
  return (
    <AccountProvider>
      <AccountsContent />
    </AccountProvider>
  )
}
