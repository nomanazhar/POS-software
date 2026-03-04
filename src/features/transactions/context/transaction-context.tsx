import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TransactionRow } from '../data/schema'
import { getAllTransactions } from '../data/data'
import { toast } from 'sonner'

interface TransactionContextType {
  transactions: TransactionRow[]
  loading: boolean
  error: string | null
  fetchTransactions: () => Promise<void>
  refreshTransactions: () => Promise<void>
  clearError: () => void
  lastUpdated: Date | null
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

interface TransactionProviderProps {
  children: React.ReactNode
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching transactions...')
      const data = await getAllTransactions()
      console.log('Fetched transactions:', data.length)
      setTransactions(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching transactions:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions'
      setError(errorMessage)
      setTransactions([])
      toast.error(`Failed to load transactions: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshTransactions = useCallback(async () => {
    console.log('Refreshing transactions...')
    await fetchTransactions()
    toast.success('Transactions refreshed successfully')
  }, [fetchTransactions])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Removed auto-refresh mechanism - data will only refresh when manually triggered
  // or when the component mounts

  const value = {
    transactions,
    loading,
    error,
    fetchTransactions,
    refreshTransactions,
    clearError,
    lastUpdated,
  }

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactionContext() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error('useTransactionContext must be used within a TransactionProvider')
  }
  return context
}
