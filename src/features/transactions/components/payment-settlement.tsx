import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, User, Building2, AlertCircle } from 'lucide-react';
// import { cn } from '@/lib/utils';
import { transactionService, PaymentSettlement as PaymentSettlementType } from '@/lib/transaction-service';
import { toast } from 'sonner';

const paymentSettlementSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  accountType: z.enum(['customer', 'supplier']),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'card', 'ledger']),
  description: z.string().min(1, 'Description is required'),
});

type PaymentSettlementForm = z.infer<typeof paymentSettlementSchema>;

interface PaymentSettlementProps {
  accountId?: string;
  accountType?: 'customer' | 'supplier';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentSettlement({ 
  accountId, 
  accountType, 
  onSuccess, 
  // onCancel 
}: PaymentSettlementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');


  const form = useForm<PaymentSettlementForm>({
    resolver: zodResolver(paymentSettlementSchema),
    defaultValues: {
      accountId: accountId || '',
      accountType: accountType || 'customer',
      amount: 0,
      paymentMethod: 'cash',
      description: 'maintaing ledger',
    },
  });

  // Memoized account filtering with search and type matching
  const filteredAccounts = useMemo(() => {
    const accountType = form.watch('accountType');
    if (!accounts || accounts.length === 0) return [];
    
    console.log('Filtering accounts. Type:', accountType, 'Total accounts:', accounts.length);
    
    return accounts.filter(account => {
      // Debug log to check account types
      console.log('Account:', {
        id: account.account_id,
        name: account.fullname || account.account_name,
        type: account.account_type,
        status: account.account_status,
        searchable: `${account.fullname || ''} ${account.phone_no || ''} ${account.account_unique_id || ''}`.toLowerCase()
      });
      
      // Match account type (customer/supplier)
      const isCustomer = accountType === 'customer';
      const typeMatch = isCustomer 
        ? (account.account_type === 'customer' || account.account_type === 'Customer')
        : (account.account_type === 'supplier' || account.account_type === 'Supplier');
      
      // Match search query if provided
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        (account.fullname?.toLowerCase().includes(searchLower) ||
         account.phone_no?.toLowerCase().includes(searchLower) ||
         account.account_unique_id?.toLowerCase().includes(searchLower) ||
         (account.account_name?.toLowerCase().includes(searchLower)));
      
      return typeMatch && matchesSearch;
    });
  }, [accounts, form.watch('accountType'), searchQuery]);

  // Load accounts with enhanced error handling and type safety
  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      console.log('Fetching accounts...');
      const response = await window.electronAPI.invoke('accounts:getAll');
      
      // Handle the new response format { success: boolean, data: any[] }
      const accountsData = response?.success === true && Array.isArray(response.data) 
        ? response.data 
        : (Array.isArray(response) ? response : []);
      
      if (!Array.isArray(accountsData)) {
        console.error('Invalid accounts data format:', accountsData);
        throw new Error('Invalid accounts data format');
      }
      
      // Process and validate accounts
      const validAccounts = accountsData
        .filter(acc => {
          // Ensure account has required fields
          const isValid = acc && 
            acc.account_unique_id && 
            (acc.fullname || acc.account_name) &&
            acc.account_type;
            
          if (!isValid) {
            console.warn('Skipping invalid account:', acc);
          }
          
          return isValid;
        })
        .map(acc => ({
          ...acc,
          // Normalize account type to lowercase
          account_type: (acc.account_type || '').toLowerCase(),
          // Ensure fullname is always available
          fullname: acc.fullname || acc.account_name || 'Unnamed Account'
        }))
        .sort((a, b) => (a.fullname || '').localeCompare(b.fullname || ''));
      
      console.log(`Loaded ${validAccounts.length} valid accounts`);
      setAccounts(validAccounts);
      
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error(`Failed to load accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAccounts([]); // Reset accounts on error
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  // Load accounts on mount
  React.useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Update selected account when accountId or accounts change
  React.useEffect(() => {
    if (accountId && accounts.length > 0) {
      console.log('Looking for account with ID:', accountId);
      const account = accounts.find(acc => 
        acc.account_unique_id === accountId || 
        acc.account_id === accountId
      );
      
      console.log('Found account:', account);
      
      if (account) {
        setSelectedAccount(account);
        form.setValue('accountId', account.account_unique_id || accountId);
      } else {
        console.warn(`Account with ID ${accountId} not found in loaded accounts`);
        // Reset the form if the account is not found
        form.setValue('accountId', '');
        setSelectedAccount(null);
      }
    } else if (!accountId) {
      // Reset if no accountId is provided
      form.setValue('accountId', '');
      setSelectedAccount(null);
    }
  }, [accountId, accounts, form]);

  // Handle account selection with validation
  const handleAccountChange = useCallback((value: string) => {
    if (!value) {
      setSelectedAccount(null);
      form.setValue('accountId', '');
      return;
    }
    
    const account = accounts.find(acc => 
      acc.account_unique_id === value || 
      acc.account_id === value
    );
    
    if (!account) {
      console.warn(`Account with ID ${value} not found`);
      toast.error('Selected account not found');
      return;
    }
    
    // Ensure we're using the correct ID field
    const accountId = account.account_unique_id || account.account_id || value;
    
    setSelectedAccount(account);
    form.setValue('accountId', accountId);
    
    // Log for debugging
    console.log('Selected account:', {
      id: accountId,
      name: account.fullname || account.account_name,
      type: account.account_type,
      status: account.account_status
    });
  }, [accounts, form]);

  // Calculate account balance display
  const accountBalance = useMemo(() => {
    if (!selectedAccount) return null;
    
    const balance = selectedAccount.balance || 0;
    const isCustomer = selectedAccount.account_type === 'customer';
    
    return {
      amount: Math.abs(balance),
      type: isCustomer ? (balance > 0 ? 'receivable' : 'payable') : (balance > 0 ? 'payable' : 'receivable'),
      label: isCustomer 
        ? (balance > 0 ? 'Customer owes you' : 'You owe customer')
        : (balance > 0 ? 'You owe supplier' : 'Supplier owes you'),
      color: isCustomer 
        ? (balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600')
        : (balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'),
    };
  }, [selectedAccount]);

  // Handle form submission with enhanced validation and error handling
  const onSubmit = useCallback(async (data: PaymentSettlementForm) => {
    setIsLoading(true);
    
    try {
      // Additional client-side validation
      if (!selectedAccount) {
        toast.error('Please select a valid account');
        return;
      }

      if (data.amount <= 0) {
        toast.error('Amount must be greater than zero');
        return;
      }

      // Check if amount exceeds account balance for customer payments
      if (form.watch('accountType') === 'customer' && accountBalance) {
        const maxAmount = accountBalance.amount;
        if (data.amount > maxAmount) {
          toast.error(`Amount cannot exceed outstanding balance of ${maxAmount.toFixed(2)}`);
          return;
        }
      }

      // Check cash balance for cash/card payments
      if ((data.paymentMethod === 'cash' || data.paymentMethod === 'card') && form.watch('accountType') === 'supplier') {
        const martBalance = await transactionService.getMartBalance();
        if (data.amount > martBalance) {
          toast.error(`Insufficient cash balance. Available: ${martBalance.toFixed(2)}`);
          return;
        }
      }

      const settlement: PaymentSettlementType = {
        accountId: data.accountId,
        accountType: data.accountType,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        description: data.description,
        userId: 'admin', // TODO: Get from auth context
        companyId: '1',
        branchId: '1'
      };

      const result = await transactionService.processPaymentSettlement(settlement);
      
      if (result.success) {
        toast.success('Payment processed successfully');
        
        // Show detailed settlement information
        if (result.transactionDetails) {
          const details = result.transactionDetails;
          
          // Show balance update
          if (details.accountType === 'customer') {
            if (details.previousBalance > 0) {
              toast.success(`Customer debt reduced by ${details.settlementAmount.toFixed(2)}`);
            }
            if (details.overpayment) {
              toast.info(`Customer advance created: ${details.overpayment.toFixed(2)}`);
            }
          } else {
            if (details.previousBalance < 0) {
              toast.success(`Supplier payment made: ${details.settlementAmount.toFixed(2)}`);
            }
            if (details.overpayment) {
              toast.info(`Supplier advance created: ${details.overpayment.toFixed(2)}`);
            }
          }
          
          // Show final balance
          const finalBalance = Math.abs(details.newBalance);
          if (finalBalance > 0) {
            const balanceType = details.accountType === 'customer' 
              ? (details.newBalance > 0 ? 'still owes' : 'advance balance')
              : (details.newBalance > 0 ? 'advance balance' : 'still owed');
            toast.info(`Final balance: ${finalBalance.toFixed(2)} ${balanceType}`);
          } else {
            toast.success('Account balance cleared!');
          }
        }
        
        // Reset form
        form.reset();
        setSelectedAccount(null);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment settlement error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  }, [toast, onSuccess, selectedAccount, form, accountBalance]);

  return (
    <div className="w-full">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Account Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select
              value={form.watch('accountType')}
              onValueChange={(value: 'customer' | 'supplier') => form.setValue('accountType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer (Receive Payment)</SelectItem>
                <SelectItem value="supplier">Supplier (Make Payment)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.accountType && (
              <p className="text-sm text-red-500">{form.formState.errors.accountType.message}</p>
            )}
          </div>

          {/* Account Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="accountId">
              {form.watch('accountType') === 'customer' ? 'Customer' : 'Supplier'}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.watch('accountId')}
              onValueChange={handleAccountChange}
              disabled={isLoadingAccounts}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  isLoadingAccounts 
                    ? 'Loading accounts...' 
                    : `Select ${form.watch('accountType')}`
                } />
              </SelectTrigger>
              <SelectContent className="p-0">
                {/* Search input */}
                <div className="relative px-3 py-2 border-b">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${form.watch('accountType')}s...`}
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Loading state */}
                {isLoadingAccounts ? (
                  <div className="py-6 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading accounts...</p>
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="py-6 text-center">
                    <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery ? 'No matching accounts found' : 'No accounts available'}
                    </p>
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery('');
                        }}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredAccounts.map((account) => (
                      <SelectItem 
                        key={account.account_unique_id} 
                        value={account.account_unique_id}
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          {account.account_type === 'customer' ? (
                            <User className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="truncate">
                            <div className="font-medium">{account.fullname || account.account_name}</div>
                            {account.phone_no && (
                              <div className="text-xs text-muted-foreground">{account.phone_no}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.accountId && (
              <p className="text-sm text-red-500">{form.formState.errors.accountId.message}</p>
            )}
          </div>

          {/* Account Balance Display */}
          {accountBalance && (
            <Alert>
              <AlertDescription>
                <strong className={accountBalance.color}>{accountBalance.label}:</strong> 
                <span className={accountBalance.color}> ${accountBalance.amount.toFixed(2)}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="Enter payment amount"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>

                     {/* Payment Method */}
           <div className="space-y-2">
             <Label htmlFor="paymentMethod">Payment Method</Label>
             <Select
               value={form.watch('paymentMethod')}
               onValueChange={(value: 'cash' | 'card' | 'ledger') => form.setValue('paymentMethod', value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Select payment method" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="cash">Cash</SelectItem>
                 <SelectItem value="card">Card</SelectItem>
                 <SelectItem value="ledger">Ledger (Credit)</SelectItem>
               </SelectContent>
             </Select>
             <span className="text-xs text-muted-foreground">
               {form.watch('paymentMethod') === 'ledger' ? 'Credit settlement - no cash movement' : 'Cash/Card settlement - requires available balance'}
             </span>
           </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Enter payment description"
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Payment'
              )}
            </Button>
          </div>
        </form>
      </div>
  );
}
