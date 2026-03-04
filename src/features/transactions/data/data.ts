import { TransactionRow } from './schema'

export async function getAllTransactions(): Promise<TransactionRow[]> {
  try {
    if (!window.electronAPI) {
      console.warn('Electron API not available')
      return []
    }
    
    console.log('Calling transactions:getAll...')
    const response = await window.electronAPI.invoke('transactions:getAll')
    console.log('Backend response:', response)
    
    // Handle new backend response format
    if (response && response.success) {
      const transactionsData = response.data || []
      console.log('Transactions data:', transactionsData)
      
      // Transform and validate data
      const transformedTransactions = (Array.isArray(transactionsData) ? transactionsData : []).map((transaction: any) => ({
        transaction_id: Number(transaction.transaction_id || 0),
        transaction_unique_id: String(transaction.transaction_unique_id || ''),
        account_unique_id: String(transaction.account_unique_id || ''),
        full_name: String(transaction.full_name || ''),
        order_no: String(transaction.order_no || ''),
        order_type: transaction.order_type as 'bill' | 'purchase' | 'quotation',
        total_amount: Number(transaction.total_amount || 0),
        credit: Number(transaction.credit || 0),
        debit: Number(transaction.debit || 0),
        payment_type: transaction.payment_type as 'credit' | 'debit',
        payment_method: transaction.payment_method as 'cash' | 'card' | 'ledger',
        added_by: String(transaction.added_by || ''),
        company_id: String(transaction.company_id || ''),
        branch_id: String(transaction.branch_id || ''),
        created_at: String(transaction.created_at || ''),
        updated_at: String(transaction.updated_at || '')
      }))
      
      console.log('Transformed transactions:', transformedTransactions.length)
      return transformedTransactions
    } else {
      console.error('Failed to load transactions:', response?.error || 'Unknown error')
      return []
    }
  } catch (err) {
    console.error('Failed to load transactions:', err)
    return []
  }
}

export async function getTransactionsByAccount(accountUniqueId: string): Promise<TransactionRow[]> {
  try {
    if (!window.electronAPI) return []
    
    const response = await window.electronAPI.invoke('transactions:getByAccount', accountUniqueId)
    
    // Handle new backend response format
    const transactionsData = response && response.success ? response.data : response
    
    // Transform and validate data
    const transformedTransactions = (Array.isArray(transactionsData) ? transactionsData : []).map((transaction: any) => ({
      transaction_id: Number(transaction.transaction_id || 0),
      transaction_unique_id: String(transaction.transaction_unique_id || ''),
      account_unique_id: String(transaction.account_unique_id || ''),
      full_name: String(transaction.full_name || ''),
      order_no: String(transaction.order_no || ''),
      order_type: transaction.order_type as 'bill' | 'purchase' | 'quotation',
      total_amount: Number(transaction.total_amount || 0),
      credit: Number(transaction.credit || 0),
      debit: Number(transaction.debit || 0),
      payment_type: transaction.payment_type as 'credit' | 'debit',
      payment_method: transaction.payment_method as 'cash' | 'card' | 'ledger',
      added_by: String(transaction.added_by || ''),
      company_id: String(transaction.company_id || ''),
      branch_id: String(transaction.branch_id || ''),
      created_at: String(transaction.created_at || ''),
      updated_at: String(transaction.updated_at || '')
    }))
    
    return transformedTransactions
  } catch (err) {
    console.error('Failed to load transactions by account:', err)
    return []
  }
}

export async function addTransaction(transaction: Omit<TransactionRow, 'transaction_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    if (!window.electronAPI) {
      return { success: false, error: 'Electron API not available' }
    }
    
    const result = await window.electronAPI.invoke('transactions:add', transaction)
    
    // Handle new backend response format
    if (result && result.success) {
      return { success: true }
    } else {
      return { success: false, error: result?.error || 'Failed to add transaction' }
    }
  } catch (error) {
    console.error('Error adding transaction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// New function to get transactions including central account (for admin purposes)
export async function getAllTransactionsIncludingCentral(): Promise<TransactionRow[]> {
  try {
    if (!window.electronAPI) return []
    
    // This would need a new backend endpoint that doesn't filter out central transactions
    const response = await window.electronAPI.invoke('transactions:getAllIncludingCentral')
    
    const transactionsData = response && response.success ? response.data : response
    
    const transformedTransactions = (Array.isArray(transactionsData) ? transactionsData : []).map((transaction: any) => ({
      transaction_id: Number(transaction.transaction_id || 0),
      transaction_unique_id: String(transaction.transaction_unique_id || ''),
      account_unique_id: String(transaction.account_unique_id || ''),
      order_no: String(transaction.order_no || ''),
      order_type: transaction.order_type as 'bill' | 'purchase' | 'quotation',
      total_amount: Number(transaction.total_amount || 0),
      credit: Number(transaction.credit || 0),
      debit: Number(transaction.debit || 0),
      payment_type: transaction.payment_type as 'credit' | 'debit',
      payment_method: transaction.payment_method as 'cash' | 'card' | 'ledger',
      added_by: String(transaction.added_by || ''),
      company_id: String(transaction.company_id || ''),
      branch_id: String(transaction.branch_id || ''),
      created_at: String(transaction.created_at || ''),
      updated_at: String(transaction.updated_at || '')
    }))
    
    return transformedTransactions
  } catch (err) {
    console.error('Failed to load all transactions including central:', err)
    return []
  }
}


