import { Account, NewAccount } from './schema'

// Get accounts
export async function getAccounts(): Promise<Account[]> {
  try {
    if (!window.electronAPI) {
      console.warn('Electron API not available')
      return []
    }
    
    const response = await window.electronAPI.invoke('accounts:getAll')
    console.log('[Frontend] Raw accounts response from backend:', response)
    
    if (!response.success) {
      console.error('[Frontend] Failed to fetch accounts:', response.error)
      return []
    }
    
    // Transform backend data to match frontend schema
    const transformedAccounts = (response.data || []).map((account: any) => ({
      account_id: account.account_id,
      account_unique_id: account.account_unique_id,
      fullname: account.fullname,
      email: account.email,
      phone_no: account.phone_no,
      address: account.address,
      second_address: account.second_address,
      city: account.city,
      account_type: account.account_type,
      account_status: account.account_status,
      account_limit: Number(account.account_limit || 0),
      total_credit: Number(account.total_credit || 0),
      total_debit: Number(account.total_debit || 0),
      balance: Number(account.balance || 0),
      loyality_points: Number(account.loyality_points || 0),
      discount_rate: Number(account.discount_rate || 0),
      remarks: account.remarks,
      added_by: account.added_by,
      company_id: account.company_id,
      branch_id: account.branch_id,
      created_at: account.created_at,
      updated_at: account.updated_at,
    }))
    
    console.log('[Frontend] Transformed accounts:', transformedAccounts.length, 'records')
    return transformedAccounts
  } catch (error) {
    console.error('[Frontend] Error fetching accounts:', error)
    return []
  }
}

// Add account
export async function addAccount(payload: NewAccount): Promise<{ success: boolean; account_id?: number; error?: string }>{
  try {
    if (!window.electronAPI) return { success: false, error: 'Electron API not available' }
    console.log('Sending payload to backend:', payload)
    const result = await window.electronAPI.invoke('accounts:add', payload)
    console.log('Backend response:', result)
    
    // Handle new backend response format
    if (result.success) {
      return { success: true, account_id: result.data?.account_id }
    } else {
      return { success: false, error: result.error || 'Failed to add account' }
    }
  } catch (error: any) {
    console.error('Error adding account:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// Update account
export async function updateAccount(payload: Partial<Account> & { account_id: number }): Promise<{ success: boolean; error?: string }>{
  try {
    if (!window.electronAPI) return { success: false, error: 'Electron API not available' }
    const result = await window.electronAPI.invoke('accounts:update', payload)
    
    // Handle new backend response format
    if (result.success) {
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Failed to update account' }
    }
  } catch (error: any) {
    console.error('Error updating account:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// Delete account
export async function deleteAccount(account_id: number): Promise<{ success: boolean; error?: string }>{
  try {
    if (!window.electronAPI) return { success: false, error: 'Electron API not available' }
    const result = await window.electronAPI.invoke('accounts:delete', account_id)
    
    // Handle new backend response format
    if (result.success) {
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Failed to delete account' }
    }
  } catch (error: any) {
    console.error('Error deleting account:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// Get accounts with filters (server-side)
export async function getAccountsWithFilters(filters: {
  account_type?: string
  account_status?: string
  search?: string
}): Promise<Account[]> {
  try {
    if (!window.electronAPI) {
      console.warn('Electron API not available')
      return []
    }
    
    const response = await window.electronAPI.invoke('accounts:getWithFilters', filters)
    console.log('[Frontend] Accounts with filters response:', response)
    
    if (!response.success) {
      console.error('[Frontend] Failed to fetch accounts with filters:', response.error)
      return []
    }
    
    // Transform the data similar to getAccounts
    const transformedAccounts = (response.data || []).map((account: any) => ({
      account_id: account.account_id,
      account_unique_id: account.account_unique_id,
      fullname: account.fullname,
      email: account.email,
      phone_no: account.phone_no,
      address: account.address,
      second_address: account.second_address,
      city: account.city,
      account_type: account.account_type,
      account_status: account.account_status,
      account_limit: Number(account.account_limit || 0),
      total_credit: Number(account.total_credit || 0),
      total_debit: Number(account.total_debit || 0),
      balance: Number(account.balance || 0),
      loyality_points: Number(account.loyality_points || 0),
      discount_rate: Number(account.discount_rate || 0),
      remarks: account.remarks,
      added_by: account.added_by,
      company_id: account.company_id,
      branch_id: account.branch_id,
      created_at: account.created_at,
      updated_at: account.updated_at,
    }))
    
    return transformedAccounts
  } catch (error) {
    console.error('[Frontend] Error fetching accounts with filters:', error)
    return []
  }
}

// Recalculate account balances from transactions
export async function recalculateAccountBalances(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!window.electronAPI) {
      console.warn('Electron API not available')
      return { success: false, error: 'Electron API not available' }
    }
    
    const response = await window.electronAPI.invoke('accounts:calculateBalances')
    console.log('[Frontend] Recalculate balances response:', response)
    
    if (!response.success) {
      console.error('[Frontend] Failed to recalculate balances:', response.error)
      return { success: false, error: response.error || 'Failed to recalculate balances' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('[Frontend] Error recalculating balances:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
