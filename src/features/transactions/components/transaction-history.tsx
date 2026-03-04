import  { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, 
  // CardDescription, CardHeader, CardTitle
 } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Calendar, 
  // DollarSign 
} from 'lucide-react';
import { transactionService } from '@/lib/transaction-service';
import { format } from 'date-fns';
import { useCurrency } from '@/context/currency-context';

interface TransactionHistoryProps {
  accountId?: string;
  limit?: number;
  showFilters?: boolean;
}

interface Transaction {
  transaction_id: string;
  account_unique_id: string;
  order_no: string;
  order_type: string;
  total_amount: number;
  credit: number;
  debit: number;
  payment_type: string;
  payment_method: string;
  created_at: string;
}

export function TransactionHistory({ 
  accountId, 
  limit = 50, 
  showFilters = true 
}: TransactionHistoryProps) {
  const { formatAmount } = useCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Memoized filtered transactions to prevent unnecessary re-renders
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.order_type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || transaction.order_type === filterType;
      const matchesMethod = filterMethod === 'all' || transaction.payment_method === filterMethod;
      
      return matchesSearch && matchesType && matchesMethod;
    });
  }, [transactions, searchTerm, filterType, filterMethod]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, limit]);

  // Convert TransactionHistoryItem to Transaction format
  const convertToTransaction = (item: any): Transaction => ({
    transaction_id: String(item.transaction_id),
    account_unique_id: item.account_unique_id,
    order_no: item.order_no,
    order_type: item.order_type,
    total_amount: item.total_amount,
    credit: item.credit,
    debit: item.debit,
    payment_type: item.payment_type,
    payment_method: item.payment_method,
    created_at: item.created_at
  });

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const history = await transactionService.getTransactionHistory(accountId || '', limit * 2);
      const convertedTransactions = history.map(convertToTransaction);
      setTransactions(convertedTransactions);
      setTotalPages(Math.ceil(convertedTransactions.length / limit));
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, limit]);

  // Load transactions on mount and when accountId changes
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterMethod]);

  // Format amount with proper sign
  const formatAmountWithSign = (amount: number, type: string) => {
    const sign = type === 'credit' ? '+' : '-';
    return `${sign}${formatAmount(Math.abs(amount))}`;
  };

  // Get payment method badge color
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'ledger': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get transaction type badge color
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'bill': return 'bg-purple-100 text-purple-800';
      case 'purchase': return 'bg-red-100 text-red-800';
      case 'settlement': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Clear filters
  // const clearFilters = () => {
  //   setSearchTerm('');
  //   setFilterType('all');
  //   setFilterMethod('all');
  //   setCurrentPage(1);
  // };

  return (
    <Card className="w-full h-full p-2 ">
      
      <CardContent className="space-y-2 w-full h-full  ">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bill">Sales</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="settlement">Settlements</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="ledger">Credit</SelectItem>
              </SelectContent>
            </Select>
            
            
          </div>
        )}

        {/* Transaction Table */}
        <div className="h-[67%] border rounded-lg ">
          <Table className='h-full w-full  rounded-lg'>
            <TableHeader className='px-4 sticky top-0 z-10 bg-background rounded-lg'>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='overflow-y-auto'>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No transactions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTransactionTypeColor(transaction.order_type)}>
                        {transaction.order_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.order_no}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentMethodColor(transaction.payment_method)}>
                        {transaction.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.credit > 0 ? formatAmountWithSign(transaction.credit, 'credit') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {transaction.debit > 0 ? formatAmountWithSign(transaction.debit, 'debit') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatAmount(transaction.total_amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

       

        {/* Summary */}
        <div className="h-[13%] grid grid-cols-1 md:grid-cols-3 gap-4 pt-2  ">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(filteredTransactions.reduce((sum, t) => sum + t.credit, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Credits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {formatAmount(filteredTransactions.reduce((sum, t) => sum + t.debit, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Total Debits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatAmount(filteredTransactions.reduce((sum, t) => sum + t.credit, 0) - 
                 filteredTransactions.reduce((sum, t) => sum + t.debit, 0))}
            </p>
            <p className="text-sm text-muted-foreground">Net Balance</p>
          </div>
        </div>

         {/* Pagination */}
         {totalPages > 1 && (
          <div className="w-[8%] flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
