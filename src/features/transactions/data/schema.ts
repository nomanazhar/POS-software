export interface TransactionRow {
  transaction_id: number
  transaction_unique_id: string
  account_unique_id: string | null
  full_name?: string | null
  order_no: string | null
  order_type: 'bill' | 'purchase' | 'quotation' | 'settlement'
  total_amount: number
  credit: number
  debit: number
  payment_type: 'credit' | 'debit'
  payment_method: 'cash' | 'card' | 'ledger'
  added_by: string
  company_id: string
  branch_id: string
  created_at?: string
  updated_at?: string
  description?: string
  reference_bill_id?: string
  account_type?: 'customer' | 'supplier' | 'mart'
}

export interface SettlementRequest {
  accountId: string
  accountType: 'customer' | 'supplier'
  amount: number
  paymentMethod: 'cash' | 'card' | 'ledger'
  description: string
  userId?: string
  companyId?: string
  branchId?: string
  applyToBills?: Array<{
    billId: string
    amount: number
  }>
}

export interface AccountBalance {
  accountId: string
  accountType: 'customer' | 'supplier' | 'mart'
  totalCredit: number
  totalDebit: number
  balance: number
  receivable: number // What they owe us
  payable: number   // What we owe them
  lastUpdated: Date
}

export interface SettlementResult {
  success: boolean
  transactionId?: string
  error?: string
  previousBalance: number
  newBalance: number
  settlementAmount: number
  overpayment?: number
  transactionDetails?: TransactionRow[]
}


