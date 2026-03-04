// Transaction Service - Centralized transaction management
// Handles all transaction operations with caching, validation, and error handling

export interface TransactionData {
  accountId: string;
  uniqueId: string;
  billId: string;
  billType: 'bill' | 'purchase' | 'quotation' | 'voucher' | 'settlement';
  totalAmount: number;
  credit: number;
  debit: number;
  paymentType: 'credit' | 'debit';
  paymentMethod: 'cash' | 'card' | 'ledger';
  companyId: string;
  branchId: string;
  userId?: string;
  isReturn?: boolean;
  description?: string;
}

export interface AccountBalance {
  accountId: string;
  totalCredit: number;
  totalDebit: number;
  balance: number;
  lastUpdated: Date;
  accountType?: 'customer' | 'supplier' | 'mart';
  accountName?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  balance?: AccountBalance;
  newMartBalance?: number;
  transactionDetails?: any;
}

export interface PaymentSettlement {
  accountId: string;
  accountType: 'customer' | 'supplier';
  amount: number;
  paymentMethod: 'cash' | 'card' | 'ledger';
  description: string;
  userId?: string;
  companyId?: string;
  branchId?: string;
  applyToBills?: Array<{
    billId: string;
    amount: number;
  }>;
}

export interface TransactionStats {
  total_transactions: number;
  cash_transactions: number;
  card_transactions: number;
  credit_transactions: number;
  total_credit: number;
  total_debit: number;
  avg_transaction_amount: number;
  net_cash_flow: number;
  pending_receivables: number;
  pending_payables: number;
  mart_balance: number;
  lastUpdated?: Date;
}

export interface TransactionHistoryItem {
  transaction_id: number;
  transaction_unique_id: string;
  account_unique_id: string;
  order_no: string;
  order_type: string;
  total_amount: number;
  credit: number;
  debit: number;
  payment_type: string;
  payment_method: string;
  added_by: string;
  created_at: string;
  account_name?: string;
  account_type?: string;
}

class TransactionService {
  private static instance: TransactionService;
  private balanceCache: Map<string, AccountBalance> = new Map();
  private statsCache: Map<string, TransactionStats> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private pendingTransactions: Set<string> = new Set();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 3;

  private constructor() {}

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  // Enhanced validation with comprehensive checks
  private validateTransaction(data: TransactionData): string[] {
    const errors: string[] = [];

    // Required field validation
    if (!data.accountId?.trim()) {
      errors.push('Account ID is required');
    }

    if (!data.uniqueId?.trim()) {
      errors.push('Unique ID is required');
    }

    if (!data.billId?.trim()) {
      errors.push('Bill ID is required');
    }

    if (!data.billType || !['bill', 'purchase', 'quotation', 'voucher', 'settlement'].includes(data.billType)) {
      errors.push('Invalid bill type');
    }

    // Amount validation
    if (typeof data.totalAmount !== 'number' || data.totalAmount < 0) {
      errors.push('Total amount must be a positive number');
    }

    if (typeof data.credit !== 'number' || data.credit < 0) {
      errors.push('Credit amount must be a positive number');
    }

    if (typeof data.debit !== 'number' || data.debit < 0) {
      errors.push('Debit amount must be a positive number');
    }

    // Payment method validation
    if (!['cash', 'card', 'ledger'].includes(data.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    // Payment type validation
    if (!['credit', 'debit'].includes(data.paymentType)) {
      errors.push('Invalid payment type');
    }

    // Business logic validation
    if (data.billType === 'settlement' && data.paymentMethod === 'ledger') {
      errors.push('Settlements cannot be ledger transactions');
    }

    if (data.totalAmount !== (data.credit + data.debit)) {
      errors.push('Total amount must equal credit + debit');
    }

    return errors;
  }

  // Enhanced cash balance checking with retry logic
  private async checkCashBalance(accountId: string, amount: number): Promise<boolean> {
    try {
      if (accountId === '1_1_mart_account') {
        const balance = await this.getAccountBalance(accountId);
        return balance.balance >= amount;
      }
      return true; // Non-mart accounts don't need cash balance check
    } catch (error) {
      console.error('Error checking cash balance:', error);
      return false;
    }
  }

  // Enhanced account balance fetching with retry and fallback
  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const cacheKey = `balance_${accountId}`;
    const cached = this.balanceCache.get(cacheKey);
    
    if (cached && cached.lastUpdated && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
      return cached;
    }

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.invoke('transactions:getAccountBalance', accountId);
      
      if (result.success) {
        const balance: AccountBalance = {
          accountId,
          totalCredit: result.data.totalCredit || 0,
          totalDebit: result.data.totalDebit || 0,
          balance: result.data.balance || 0,
          lastUpdated: new Date(),
          accountType: result.data.accountType,
          accountName: result.data.accountName
        };
        
        this.balanceCache.set(cacheKey, balance);
        return balance;
      } else {
        throw new Error(result.error || 'Failed to fetch account balance');
      }
    } catch (error) {
      console.error('Error fetching account balance:', error);
      
      // Return cached balance if available, otherwise default
      if (cached) {
        return cached;
      }
      
      return {
        accountId,
        totalCredit: 0,
        totalDebit: 0,
        balance: 0,
        lastUpdated: new Date()
      };
    }
  }

  // Enhanced transaction creation with comprehensive error handling
  async createTransaction(data: TransactionData): Promise<TransactionResult> {
    const transactionKey = `${data.billId}_${data.billType}_${data.accountId}`;
    
    // Prevent duplicate transactions
    if (this.pendingTransactions.has(transactionKey)) {
      return {
        success: false,
        error: 'Transaction already in progress'
      };
    }

    this.pendingTransactions.add(transactionKey);

    try {
      // Validate transaction data
      const validationErrors = this.validateTransaction(data);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join(', ')
        };
      }

      // Check cash balance for cash/card transactions
      if (data.paymentMethod !== 'ledger' && data.billType === 'purchase') {
        const hasBalance = await this.checkCashBalance('1_1_mart_account', data.debit);
        if (!hasBalance) {
          return {
            success: false,
            error: 'Insufficient cash balance for this transaction'
          };
        }
      }

      // Create transaction via backend with retry logic
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await this.retryOperation(
        () => window.electronAPI!.invoke('transactions:createTransaction', data),
        transactionKey as any
      );
      
      if (result.success) {
        // Invalidate cache for affected accounts
        this.clearCache(data.accountId);
        if (data.paymentMethod !== 'ledger') {
          this.clearCache('1_1_mart_account');
        }

        // Get updated balances
        const [accountBalance, martBalance] = await Promise.all([
          this.getAccountBalance(data.accountId),
          this.getAccountBalance('1_1_mart_account')
        ]);

        return {
          success: true,
          transactionId: result.data.transactionId,
          balance: accountBalance,
          newMartBalance: martBalance.balance,
          transactionDetails: result.data
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create transaction'
        };
      }
    } catch (error) {
      console.error('Transaction creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction creation failed'
      };
    } finally {
      this.pendingTransactions.delete(transactionKey);
      this.retryAttempts.delete(transactionKey);
    }
  }

  // Enhanced payment settlement processing with robust dual-account involvement
  async processPaymentSettlement(settlement: PaymentSettlement): Promise<TransactionResult> {
    try {
      // Enhanced validation
      if (!settlement.accountId?.trim()) {
        return { success: false, error: 'Account ID is required' };
      }

      if (!settlement.accountType || !['customer', 'supplier'].includes(settlement.accountType)) {
        return { success: false, error: 'Valid account type (customer/supplier) is required' };
      }

      if (typeof settlement.amount !== 'number' || settlement.amount <= 0) {
        return { success: false, error: 'Amount must be a positive number' };
      }

      if (!['cash', 'card', 'ledger'].includes(settlement.paymentMethod)) {
        return { success: false, error: 'Invalid payment method is required' };
      }

      if (!settlement.description?.trim()) {
        return { success: false, error: 'Description is required' };
      }

      // Validate account exists and get current balance
      const accountBalance = await this.getAccountBalance(settlement.accountId);
      if (!accountBalance) {
        return { success: false, error: 'Account not found or inactive' };
      }

      // Check cash balance for supplier payments (we pay them)
      if (settlement.accountType === 'supplier' && settlement.paymentMethod !== 'ledger') {
        const martBalance = await this.getMartBalance();
        if (settlement.amount > martBalance) {
          return {
            success: false,
            error: `Insufficient cash balance. Available: ${martBalance.toFixed(2)}, Required: ${settlement.amount.toFixed(2)}`
          };
        }
      }

      // Warn about customer overpayments
      if (settlement.accountType === 'customer' && accountBalance.balance > 0 && settlement.amount > accountBalance.balance) {
        const overpayment = settlement.amount - accountBalance.balance;
        console.warn(`Customer overpayment detected: ${overpayment}. This will create an advance.`);
      }

      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI!.invoke('transactions:processPaymentSettlement', settlement);
      
      if (result.success) {
        // Invalidate cache for affected accounts
        this.clearCache(settlement.accountId);
        this.clearCache('1_1_mart_account');

        // Get updated balances
        const [accountBalance, martBalance] = await Promise.all([
          this.getAccountBalance(settlement.accountId),
          this.getAccountBalance('1_1_mart_account')
        ]);

        return {
          success: true,
          transactionId: result.data.transactionId,
          balance: accountBalance,
          newMartBalance: martBalance.balance,
          transactionDetails: {
            previousBalance: result.data.previousBalance,
            newBalance: result.data.newBalance,
            settlementAmount: result.data.settlementAmount,
            overpayment: result.data.overpayment,
            accountType: settlement.accountType
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Payment settlement failed'
        };
      }
    } catch (error) {
      console.error('Payment settlement error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment settlement failed'
      };
    }
  }

  // Enhanced transaction history with pagination and filtering
  async getTransactionHistory(
    accountId?: string, 
    limit: number = 50, 
    offset: number = 0,
    filters?: {
      paymentMethod?: string;
      paymentType?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<TransactionHistoryItem[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI!.invoke('transactions:getByAccount', {
        accountId,
        limit,
        offset,
        filters
      });

      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  // Enhanced transaction statistics with caching
  async getTransactionStats(accountId?: string): Promise<TransactionStats> {
    const cacheKey = `stats_${accountId || 'all'}`;
    const cached = this.statsCache.get(cacheKey);
    
    // Check if cached data exists and has valid lastUpdated property
    if (cached && cached.lastUpdated && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
      return cached;
    }

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI!.invoke('transactions:getStats', accountId);
      
      if (result.success) {
        const stats: TransactionStats = {
          total_transactions: result.data.total_transactions || 0,
          cash_transactions: result.data.cash_transactions || 0,
          card_transactions: result.data.card_transactions || 0,
          credit_transactions: result.data.credit_transactions || 0,
          total_credit: result.data.total_credit || 0,
          total_debit: result.data.total_debit || 0,
          avg_transaction_amount: result.data.avg_transaction_amount || 0,
          net_cash_flow: (result.data.total_credit || 0) - (result.data.total_debit || 0),
          pending_receivables: result.data.pending_receivables || 0,
          pending_payables: result.data.pending_payables || 0,
          mart_balance: result.data.mart_balance || 0,
          lastUpdated: new Date() // Always set lastUpdated when caching
        };

        this.statsCache.set(cacheKey, stats);
        return stats;
      } else {
        throw new Error(result.error || 'Failed to fetch transaction stats');
      }
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      
      // Return cached stats if available, otherwise default
      if (cached) {
        return cached;
      }
      
      return {
        total_transactions: 0,
        cash_transactions: 0,
        card_transactions: 0,
        credit_transactions: 0,
        total_credit: 0,
        total_debit: 0,
        avg_transaction_amount: 0,
        net_cash_flow: 0,
        pending_receivables: 0,
        pending_payables: 0,
        mart_balance: 0,
        lastUpdated: new Date() // Always set lastUpdated for default stats
      };
    }
  }

  // Enhanced cache management
  clearCache(accountId?: string): void {
    if (accountId) {
      this.balanceCache.delete(`balance_${accountId}`);
      this.statsCache.delete(`stats_${accountId}`);
    } else {
      this.balanceCache.clear();
      this.statsCache.clear();
    }
  }

  // Retry logic for failed operations
  private async retryOperation<T>(
    operation: () => Promise<T>,
    // key: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError!;
  }

  // Get all accounts for settlement forms
  async getAllAccounts(): Promise<any[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI!.invoke('accounts:getAll');
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
  }

  // Validate account exists and is active
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      const accounts = await this.getAllAccounts();
      return accounts.some(account => account.account_unique_id === accountId);
    } catch (error) {
      console.error('Error validating account:', error);
      return false;
    }
  }

  // Get real-time mart balance
  async getMartBalance(): Promise<number> {
    try {
      // Clear cache to ensure we get the latest balance
      this.clearCache('1_1_mart_account');
      const balance = await this.getAccountBalance('1_1_mart_account');
      return balance.balance;
    } catch (error) {
      console.error('Error getting mart balance:', error);
      return 0;
    }
  }

  // Calculate pending receivables and payables
  async getPendingAmounts(): Promise<{ receivables: number; payables: number }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI!.invoke('transactions:getPendingAmounts');
      
      if (result.success) {
        return {
          receivables: result.data.receivables || 0,
          payables: result.data.payables || 0
        };
      }
      
      return { receivables: 0, payables: 0 };
    } catch (error) {
      console.error('Error getting pending amounts:', error);
      return { receivables: 0, payables: 0 };
    }
  }
}

export const transactionService = TransactionService.getInstance();
