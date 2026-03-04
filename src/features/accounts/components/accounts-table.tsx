import { useAccountContext } from '../context/account-context'
import { DataTable } from './data-table'
import { columns } from './columns'

export function AccountsTable() {
  const { accounts, isLoading } = useAccountContext()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 no-scrollbar">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    )
  }
  
  return <DataTable data={accounts as any} columns={columns as any} />
}
