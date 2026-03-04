import  { Suspense, lazy, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, History, BarChart3, Users, Building, ArrowLeft } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TransactionProvider, useTransactionContext } from './context/transaction-context';
import { transactionService } from '@/lib/transaction-service';

// Lazy load components for better performance
const TransactionDashboard = lazy(() => import('./components/transaction-dashboard').then(module => ({ default: module.TransactionDashboard })));
// const TransactionHistory = lazy(() => import('./components/transaction-history').then(module => ({ default: module.TransactionHistory })));
const PaymentSettlement = lazy(() => import('./components/payment-settlement').then(module => ({ default: module.PaymentSettlement })));
const TransactionsTableNew = lazy(() => import('./components/transactions-table-new').then(module => ({ default: module.TransactionsTableNew })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Stats Cards Component
function StatsCards() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    cashBalance: 0,
    pendingReceivables: 0,
    pendingPayables: 0
  });
  const [loading, setLoading] = useState(true);
  const { transactions } = useTransactionContext();

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('Loading transaction stats...');
      
      // First try to get stats from the transaction service
      let transactionStats, pendingAmounts;
      
      try {
        [transactionStats, pendingAmounts] = await Promise.all([
          transactionService.getTransactionStats(),
          transactionService.getPendingAmounts()
        ]);
      } catch (error) {
        console.log('Service call failed, retrying with delay...', error);
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          [transactionStats, pendingAmounts] = await Promise.all([
            transactionService.getTransactionStats(),
            transactionService.getPendingAmounts()
          ]);
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          // Set default values if both attempts fail
          transactionStats = {
            total_transactions: 0,
            mart_balance: 0
          };
          pendingAmounts = {
            receivables: 0,
            payables: 0
          };
        }
      }


      // Validate the data before setting it
      if (!transactionStats || typeof transactionStats !== 'object') {
        throw new Error('Invalid transaction stats data received');
      }

      if (!pendingAmounts || typeof pendingAmounts !== 'object') {
        throw new Error('Invalid pending amounts data received');
      }

      // Ensure we have valid numeric values
      const totalTransactions = Number(transactionStats.total_transactions) || 0;
      const cashBalance = Number(transactionStats.mart_balance) || 0;
      const pendingReceivables = Number(pendingAmounts.receivables) || 0;
      const pendingPayables = Number(pendingAmounts.payables) || 0;

      // Debug logging to see what values we're getting
      console.log('Stats data received:', {
        transactionStats,
        pendingAmounts,
        calculated: {
          totalTransactions,
          cashBalance,
          pendingReceivables,
          pendingPayables
        }
      });

      // Only set stats if we have valid data (allow negative cash balance as it might be valid)
      if (totalTransactions >= 0 && !isNaN(cashBalance) && pendingReceivables >= 0 && pendingPayables >= 0) {
        setStats({
          totalTransactions,
          cashBalance,
          pendingReceivables,
          pendingPayables
        });
      } else {
        console.error('Invalid numeric values detected:', {
          totalTransactions,
          cashBalance,
          pendingReceivables,
          pendingPayables,
          isNaN_cashBalance: isNaN(cashBalance)
        });
        throw new Error('Invalid numeric values in stats data');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Don't set fallback data, keep loading state to trigger retry
      setLoading(true);
      throw error; // Re-throw to trigger retry mechanism
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load stats when component mounts with a delay to ensure API is ready
    const loadStatsWithDelay = async () => {
      // Wait a bit for the Electron API to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadStats();
    };
    
    loadStatsWithDelay();

          // Listen for refresh events from payment success
      const handleRefreshStats = () => {
        // Clear any cached data and reload
        transactionService.clearCache();
        loadStats();
      };

    window.addEventListener('refreshStats', handleRefreshStats);

    // Cleanup event listener
    return () => {
      window.removeEventListener('refreshStats', handleRefreshStats);
    };
  }, []);

  // Retry loading stats if they're still zero after a delay
  useEffect(() => {
    if (stats.totalTransactions === 0 && !loading) {
      const retryTimer = setTimeout(() => {
        console.log('Stats are still zero, retrying...');
        loadStats().catch(error => {
          console.error('Retry failed:', error);
          // Schedule another retry
          setTimeout(() => {
            console.log('Scheduling another retry...');
            loadStats().catch(console.error);
          }, 10000);
        });
      }, 60000); // 60 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [stats.totalTransactions, loading]);

  // Also retry if any of the other stats are zero (indicating incomplete data)
  useEffect(() => {
    if ((stats.cashBalance === 0 || stats.pendingReceivables === 0 || stats.pendingPayables === 0) && !loading && stats.totalTransactions > 0) {
      const retryTimer = setTimeout(() => {
        console.log('Some stats are zero, retrying to get complete data...');
        loadStats().catch(error => {
          console.error('Stats retry failed:', error);
        });
      }, 60000); // Retry after 60 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [stats.cashBalance, stats.pendingReceivables, stats.pendingPayables, stats.totalTransactions, loading]);

  // Update total transactions count when transactions context changes
  useEffect(() => {
    if (transactions.length > 0 && !loading) {
      setStats(prev => ({
        ...prev,
        totalTransactions: transactions.length
      }));
    }
  }, [transactions, loading]);

  return (
    <div className="h-[20%] grid gap-4 md:grid-cols-2 lg:grid-cols-4 no-scrollbar">
      <Card className='p-4 flex flex-col justify-between'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '--' : stats.totalTransactions.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            All time transactions
          </p>
        </CardContent>
      </Card>

      <Card className='p-4 flex flex-col justify-between'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '--' : `${stats.cashBalance.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground">
            Available cash
          </p>
        </CardContent>
      </Card>

      <Card className='p-4 flex flex-col justify-between'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '--' : `${stats.pendingReceivables.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground">
            Customer payments due
          </p>
        </CardContent>
      </Card>

      <Card className='p-4 flex flex-col justify-between'>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payables</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '--' : `${stats.pendingPayables.toFixed(2)}`}
          </div>
          <p className="text-xs text-muted-foreground">
            Supplier payments due
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Transactions Page Component
function TransactionsPageContent() {
  const [activeTab, setActiveTab] = useState('history');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'customer' | 'supplier'>('customer');
  const { refreshTransactions } = useTransactionContext();

  const handlePaymentSuccess = async () => {
    setPaymentDialogOpen(false);
    // Refresh transactions and stats without hard reload
    await refreshTransactions();
    // Trigger stats refresh by updating the component
    window.dispatchEvent(new CustomEvent('refreshStats'));
  };

  return (
    <div className="h-[98vh] w-[85vw] px-2 pt-2 space-y-6 rounded-x-md no-scrollbar">
      {/* Header */}
      <div className="h-[5%] mt-4 flex items-center justify-between w-[100%] px-2">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="h-8 px-2 lg:px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          
          </Button>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-[100%] grid-cols-3">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settlements" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Settlements
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Process Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={selectedAccountType === 'customer' ? 'default' : 'outline'}
                    onClick={() => setSelectedAccountType('customer')}
                    className="flex-1"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Customer
                  </Button>
                  <Button
                    variant={selectedAccountType === 'supplier' ? 'default' : 'outline'}
                    onClick={() => setSelectedAccountType('supplier')}
                    className="flex-1"
                  >
                    <Building className="mr-2 h-4 w-4" />
                    Supplier
                  </Button>
                </div>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentSettlement
                    accountType={selectedAccountType}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setPaymentDialogOpen(false)}
                  />
                </Suspense>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <StatsCards />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 h-[67%] p-0">
        <TabsContent value="history" className="space-y-4 h-full p-0">
          <Suspense fallback={<LoadingSpinner />}>
            <TransactionsTableNew />
          </Suspense>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4 h-full">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className='p-4'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Payments
                </CardTitle>
                <CardDescription>
                  Collect payments from customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentSettlement
                    accountType="customer"
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => {}}
                  />
                </Suspense>
              </CardContent>
            </Card>

            <Card className='p-4'>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Supplier Payments
                </CardTitle>
                <CardDescription>
                  Pay outstanding supplier balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentSettlement
                    accountType="supplier"
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => {}}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4 h-full">
          <Suspense fallback={<LoadingSpinner />}>
            <TransactionDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <TransactionProvider>
      <TransactionsPageContent />
    </TransactionProvider>
  );
}
