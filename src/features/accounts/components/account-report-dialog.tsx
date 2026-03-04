import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Search, FileText, Loader2, User, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TransactionDetail {
  account_fullname: string;
  order_no: string | null;
  credit: number;
  debit: number;
}

interface Account {
  id: string;
  name: string;
  account_type: 'customer' | 'supplier' | 'user';
  balance: number;
  account_status: string;
}

interface AccountReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AccountTypeFilter = '' | 'customer' | 'supplier'

export function AccountReportDialog({ open, onOpenChange }: AccountReportDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<TransactionDetail[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountTypeFilter>('')
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (isOpen) {
        // If dropdown is open and an account is selected
        if (selectedAccountIndex >= 0 && filteredAccounts[selectedAccountIndex]) {
          handleAccountSelect(filteredAccounts[selectedAccountIndex]);
        } else if (filteredAccounts.length > 0) {
          // If no account is selected but there are accounts, select the first one
          handleAccountSelect(filteredAccounts[0]);
        }
      } else if (selectedAccount) {
        // If dropdown is closed but an account is already selected, regenerate report
        handleGenerateReport();
      } else {
        // If no account is selected, open the dropdown
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedAccountIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = selectedAccountIndex < filteredAccounts.length - 1 ? selectedAccountIndex + 1 : 0;
      setSelectedAccountIndex(nextIndex);
      if (!isOpen) setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = selectedAccountIndex > 0 ? selectedAccountIndex - 1 : filteredAccounts.length - 1;
      setSelectedAccountIndex(prevIndex);
      if (!isOpen) setIsOpen(true);
    }
  };

  // Load accounts based on current filter
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      
      if (!window.electronAPI) {
        throw new Error('Electron API is not available');
      }
      
      console.log('Loading accounts with filter:', accountTypeFilter);
      const response = await window.electronAPI.invoke('accounts:search', { 
        searchTerm: '',
        accountType: accountTypeFilter || undefined
      });
      
      console.log('Accounts response:', response);
      
      if (response && response.success) {
        const accounts = (response.accounts || []).map((account: any) => ({
          id: account.account_unique_id, // Use account_unique_id as the primary ID
          name: account.fullname || `Account ${account.account_unique_id}`,
          account_type: account.account_type || 'customer',
          balance: parseFloat(account.balance) || 0,
          account_status: account.account_status || 'active',
          // Include the full account data for debugging
          _raw: account
        }));
        
        console.log('Processed accounts:', accounts);
        
        console.log('Processed accounts:', accounts);
        setFilteredAccounts(accounts);
        // Keep dropdown closed until user clicks the search bar
        setSelectedAccountIndex(-1);
      } else {
        throw new Error(response?.error || 'Failed to load accounts');
      }
    } catch (error: unknown) {
      console.error('Error loading accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load accounts';
      toast.error(errorMessage);
      setFilteredAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load accounts when filter changes or dialog opens
  useEffect(() => {
    if (open) {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        loadAccounts();
      } else {
        console.error('Electron API is not available');
        toast.error('This feature requires the desktop application. Please use the desktop version.');
        onOpenChange(false); // Close the dialog
      }
    }
  }, [accountTypeFilter, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTransactions([])
      setSelectedAccount(null)
      setAccountId('')
      setFilteredAccounts([])
      setIsOpen(false)
      setSelectedAccountIndex(-1)
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAccountSelect = (account: Account) => {
    console.log('Account selected:', account);
    if (!account || !account.id) {
      console.error('Invalid account selected:', account);
      toast.error('Please select a valid account');
      return;
    }
    
    setSelectedAccount(account);
    setAccountId(account.id);
    setIsOpen(false);
    setSelectedAccountIndex(-1);
    
    // Generate report immediately when an account is selected
    // Use a small timeout to ensure state updates are processed
    setTimeout(() => {
      if (account.id) {
        handleGenerateReport();
      } else {
        console.error('Account ID is missing after selection');
        toast.error('Failed to load account details. Please try again.');
      }
    }, 50);
  }

  const handleGenerateReport = async () => {
    if (!accountId || !selectedAccount) {
      toast.error('Please select an account');
      setIsOpen(true);
      return;
    }

    try {
      setIsGenerating(true);
      
      if (!window.electronAPI) {
        throw new Error('Electron API is not available');
      }
      
      console.log('Fetching transactions for account:', selectedAccount.id);
      const response = await window.electronAPI.invoke('transactions:getByAccount', selectedAccount.id);
      console.log('Transactions response:', response);
      
      if (response && response.success) {
        // Transform the response to match the TransactionDetail interface
        const transactions = (response.data || []).map((tx: any) => ({
          account_fullname: tx.account_fullname || tx.account_name || selectedAccount.name,
          order_no: tx.order_no || null,
          credit: Number(tx.credit || 0),
          debit: Number(tx.debit || 0)
        }));
        
        // Update selected account with latest balance from backend
        if (response.account) {
          setSelectedAccount(prev => ({
            ...prev!,
            balance: response.account.balance,
            account_status: response.account.account_status
          }));
        }
        
        setTransactions(transactions);
        
        if (transactions.length === 0) {
          toast.info('No transactions found for this account');
        }
      } else {
        setTransactions([]);
        toast.error(response?.error || 'Failed to fetch transactions for this account');
      }
    } catch (error: unknown) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate account report';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };


  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0)
  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0)
  const currentBalance = selectedAccount?.balance || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" w-[50vw] h-[80vh] p-4 flex flex-col">
        <DialogHeader className=" h-[8%] w-[100%]">
          <DialogTitle>Account Transaction Report</DialogTitle>
          <DialogDescription>
            View detailed transaction history for the selected account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 flex flex-col h-[92%] w-[100%]">
          {/* Account Type Filter Buttons */}
          <div className="flex gap-2 h-[7%] w-[100%]">
            <Button
              variant={accountTypeFilter === 'customer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAccountTypeFilter('customer')}
              className={cn(
                'flex-1',
                accountTypeFilter === 'customer' && 'bg-blue-500/10 text-blue-600'
              )}
            >
              <User className="mr-2 h-4 w-4" />
              Customers
            </Button>
            <Button
              variant={accountTypeFilter === 'supplier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAccountTypeFilter('supplier')}
              className={cn(
                'flex-1',
                accountTypeFilter === 'supplier' && 'bg-green-500/10 text-green-600'
              )}
            >
              <User className="mr-2 h-4 w-4" />
              Suppliers
            </Button>
          </div>
          {/* Account Selection and Report Generation */}
          <div className="relative h-[7%] w-[100%]">
            <div className="flex gap-2">
              <div className="relative w-full" ref={dropdownRef}>
                <div className="relative w-full">
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search accounts..."
                    value={accountId ? `${selectedAccount?.name || ''} (${selectedAccount?.account_type || ''})` : ''}
                    onClick={() => setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    readOnly
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-8"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                
                {isOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account, index) => (
                        <div
                          key={account.id}
                          className={`p-2 cursor-pointer hover:bg-muted/50 ${
                            index === selectedAccountIndex ? 'bg-muted' : ''
                          }`}
                          onMouseDown={() => handleAccountSelect(account)}
                          onMouseEnter={() => setSelectedAccountIndex(index)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {account.account_type} • {account.id}
                              </div>
                            </div>
                            <span className={`text-sm font-medium ml-4 whitespace-nowrap ${
                              account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {account.balance >= 0 ? '₹' : '-₹'}{Math.abs(account.balance).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No accounts available
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                onClick={async () => {
                  if (accountId) {
                    await handleGenerateReport();
                  } else if (isOpen && selectedAccountIndex >= 0 && filteredAccounts[selectedAccountIndex]) {
                    // If dropdown is open and an account is selected with keyboard
                    handleAccountSelect(filteredAccounts[selectedAccountIndex]);
                  } else {
                    // Toggle dropdown if no account is selected
                    setIsOpen(!isOpen);
                  }
                }}
                disabled={isLoading || isGenerating}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : accountId ? (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    View Report
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Select Account
                  </>
                )}
              </Button>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="border rounded-md overflow-hidden flex-1 flex flex-col h-[86%] ">
            <div className="p-2 border-b bg-muted/50 h-[15%] w-[100%]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{selectedAccount?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAccount?.account_type === 'customer' ? 'Customer' : 'Supplier'} • {accountId}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentBalance >= 0 ? '₹' : '-₹'}{Math.abs(currentBalance).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col h-[85%] w-full">
              <div className="flex-1 overflow-auto">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr]:h-[10%]">
                    {transactions.map((txn, index) => (
                      <TableRow key={index}>
                        <TableCell className="whitespace-nowrap">
                          {txn.order_no ? `#${txn.order_no}` : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {txn.account_fullname}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {txn.credit > 0 ? `₹${txn.credit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {txn.debit > 0 ? `₹${txn.debit.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totals Row - Fixed at bottom */}
              <div className="sticky bottom-0 bg-background border-t">
                <Table>
                  <TableBody>
                    <TableRow className="h-12 bg-muted/50 flex gap-[7%] justify-end items-center">
                      <TableCell colSpan={2} className="text-right font-medium">Total</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {totalCredit > 0 ? `₹${totalCredit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {totalDebit > 0 ? `₹${totalDebit.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
