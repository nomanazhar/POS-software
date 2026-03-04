import { useMemo } from 'react'
import { useTransactionContext } from '../context/transaction-context'
import { DataTable } from './data-table'
import { columns } from './columns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'

export function TransactionsTableNew() {
  const { transactions, loading, error, refreshTransactions, clearError, lastUpdated } = useTransactionContext()

  const memoizedColumns = useMemo(() => columns, [])
  const memoizedData = useMemo(() => transactions, [transactions])

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading transactions:</strong> {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center">
            <Button onClick={clearError} variant="outline">
              Clear Error
            </Button>
            <Button onClick={refreshTransactions}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-lg font-medium text-muted-foreground mb-2">No transactions found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Transactions will appear here when you create bills, purchases, or process payments.
          </p>
          <Button onClick={refreshTransactions} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 h-[90%] ">
      {/* Header with transaction count and last updated */}
      <div className="h-[10%] flex items-center justify-between ">
        <div>
          <h3 className="text-lg font-medium">Transaction History</h3>
          <p className="text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
            {lastUpdated && (
              <span className="ml-2">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button onClick={refreshTransactions} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Transaction table */}
      <DataTable columns={memoizedColumns} data={memoizedData} />
    </div>
  )
}
