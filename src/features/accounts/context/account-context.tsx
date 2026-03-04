import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Account, NewAccount } from '../data/schema'
import { addAccount as addAccountApi, updateAccount as updateAccountApi, deleteAccount as deleteAccountApi, getAccounts as getAccountsApi } from '../data/data'

type AccountDialogType = 'create' | 'update' | 'view' | 'report'

interface AccountContextType {
  accounts: Account[]
  selectedAccount: Account | null
  setSelectedAccount: React.Dispatch<React.SetStateAction<Account | null>>
  dialogState: { open: boolean; type: AccountDialogType | null }
  isLoading: boolean
  error: string | null
  openCreateDialog: () => void
  openUpdateDialog: (account: Account) => void
  openViewDialog: (account: Account) => void
  closeDialog: () => void
  fetchAccounts: () => Promise<void>
  addAccount: (account: NewAccount) => Promise<{ success: boolean; error?: string }>
  updateAccount: (account: Partial<Account> & { account_id: number }) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (account_id: number) => Promise<{ success: boolean; error?: string }>
  clearError: () => void
  openReportDialog: () => void
  closeReportDialog: () => void
  isReportDialogOpen: boolean
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogState, setDialogState] = useState<{ open: boolean; type: AccountDialogType | null }>({ open: false, type: null })
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const openCreateDialog = useCallback(() => {
    setSelectedAccount(null)
    setDialogState({ open: true, type: 'create' })
  }, [])

  const openUpdateDialog = useCallback((account: Account) => {
    setSelectedAccount(account)
    setDialogState({ open: true, type: 'update' })
  }, [])

  const openViewDialog = useCallback((account: Account) => {
    setSelectedAccount(account)
    setDialogState({ open: true, type: 'view' })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({ open: false, type: null })
  }, [])

  const openReportDialog = useCallback(() => {
    setIsReportDialogOpen(true)
  }, [])

  const closeReportDialog = useCallback(() => {
    setIsReportDialogOpen(false)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('[AccountContext] Fetching accounts...')
      const data = await getAccountsApi()
      console.log('[AccountContext] Accounts data received:', data?.length || 0, 'records')
      setAccounts(Array.isArray(data) ? data : [])
      if (!Array.isArray(data) || data.length === 0) {
        setError('No accounts found. Try adding some accounts first.')
      }
    } catch (e) {
      console.error('[AccountContext] Error fetching accounts:', e)
      setError(e instanceof Error ? e.message : 'Failed to fetch accounts')
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addAccount = useCallback(async (payload: NewAccount) => {
    setError(null)
    console.log('[AccountContext] Adding account with payload:', payload)
    const result = await addAccountApi(payload)
    console.log('[AccountContext] Add account result:', result)
    if (result.success) {
      console.log('[AccountContext] Account added successfully, refreshing...')
      await fetchAccounts()
    } else {
      setError(result.error || 'Failed to add account')
    }
    return result
  }, [fetchAccounts])

  const updateAccount = useCallback(async (payload: Partial<Account> & { account_id: number }) => {
    setError(null)
    console.log('[AccountContext] Updating account:', payload.account_id)
    const result = await updateAccountApi(payload)
    if (result.success) {
      console.log('[AccountContext] Account updated successfully, refreshing...')
      await fetchAccounts()
    } else {
      setError(result.error || 'Failed to update account')
    }
    return result
  }, [fetchAccounts])

  const deleteAccount = useCallback(async (account_id: number) => {
    setError(null)
    console.log('[AccountContext] Deleting account:', account_id)
    const result = await deleteAccountApi(account_id)
    if (result.success) {
      console.log('[AccountContext] Account deleted successfully, refreshing...')
      await fetchAccounts()
    } else {
      setError(result.error || 'Failed to delete account')
    }
    return result
  }, [fetchAccounts])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const value = useMemo(() => ({
    accounts,
    selectedAccount,
    setSelectedAccount,
    dialogState,
    isLoading,
    error,
    openCreateDialog,
    openUpdateDialog,
    openViewDialog,
    closeDialog,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    clearError,
    openReportDialog,
    closeReportDialog,
    isReportDialogOpen,
  }), [
    accounts,
    selectedAccount,
    dialogState,
    isLoading,
    error,
    isReportDialogOpen,
    openCreateDialog,
    openUpdateDialog,
    openViewDialog,
    closeDialog,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    clearError,
    openReportDialog,
    closeReportDialog,
  ])

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccountContext() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider')
  }
  return context
}


