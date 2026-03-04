import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, 
  // TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  // DollarSign, 
  // TrendingUp, 
  // TrendingDown, 
  CreditCard, 
  Banknote, 
  FileText,
  // Users,
  // Building,
  Activity,
  // BarChart3
} from 'lucide-react';
import { transactionService } from '@/lib/transaction-service';
// import { TransactionHistory } from './transaction-history';
import { toast } from 'sonner';

interface TransactionStats {
  total_transactions: number;
  cash_transactions: number;
  card_transactions: number;
  credit_transactions: number;
  total_credit: number;
  total_debit: number;
  avg_transaction_amount: number;
}

interface AccountBalance {
  accountId: string;
  totalCredit: number;
  totalDebit: number;
  balance: number;
  lastUpdated: Date;
}

export function TransactionDashboard() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [
    // martBalance, 
    // setMartBalance
  ] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(true);
  // const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Load dashboard data with enhanced error handling
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load transaction statistics with retry logic
      const statsData = await transactionService.getTransactionStats();
      setStats(statsData);

      // Load mart account balance
      // const balance = await transactionService.getAccountBalance('1_1_mart_account');
      // setMartBalance(balance);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Show user-friendly error message
      toast.error('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Calculate derived statistics
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    const netFlow = stats.total_credit - stats.total_debit;
    const cashPercentage = stats.total_transactions > 0 ? (stats.cash_transactions / stats.total_transactions) * 100 : 0;
    const cardPercentage = stats.total_transactions > 0 ? (stats.card_transactions / stats.total_transactions) * 100 : 0;
    const creditPercentage = stats.total_transactions > 0 ? (stats.credit_transactions / stats.total_transactions) * 100 : 0;

    return {
      netFlow,
      cashPercentage,
      cardPercentage,
      creditPercentage,
      isPositiveFlow: netFlow > 0
    };
  }, [stats]);

  // Refresh data
  // const handleRefresh = () => {
  //   loadDashboardData();
  // };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Transaction Dashboard</h2>
          <Button variant="outline" disabled>
            <Activity className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      


<div className='flex flex-row w-[84vw] h-[28vh] gap-4 justify-between '>
      {/* Payment Method Distribution */}
      <div className="grid gap-4 md:grid-row-3 h-[7vh] w-[35%]">
        <Card className='flex flex-row h-[8vh] items-center justify-between p-2 '>
          <CardHeader className='w-[60%] '>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Cash Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className='w-[40%] '>
            <div className="text-3xl font-bold">{stats?.cash_transactions || 0}</div>
            <p className="text-sm text-muted-foreground">
              {derivedStats?.cashPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className='flex flex-row h-[8vh] items-center justify-between p-2 '>
          <CardHeader className='w-[60%] '>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Card Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className='w-[40%] '>
            <div className="text-3xl font-bold">{stats?.card_transactions || 0}</div>
            <p className="text-sm text-muted-foreground">
              {derivedStats?.cardPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className='flex flex-row h-[8vh] items-center justify-between p-2 '>
          <CardHeader className='w-[65%] '>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Credit Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className='w-[35%] '>
            <div className="text-3xl font-bold">{stats?.credit_transactions || 0}</div>
            <p className="text-sm text-muted-foreground">
              {derivedStats?.creditPercentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <div className='w-[60%] h-[30vh] '>
      <Tabs defaultValue="analytics" className="space-y-4 w-[100%]">
       
        <TabsContent value="analytics" className="space-y-4 h-[100%] w-[100%]">
          <div className="grid gap-4 md:grid-cols-2 w-[100%] h-[100%] ">
            {/* Credit vs Debit Analysis */}
            <Card className='p-2 '>
              <CardHeader>
                <CardTitle>Credit vs Debit Analysis</CardTitle>
                <CardDescription>
                  Breakdown of transaction types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Total Credits</span>
                    </div>
                    <span className="font-mono">{stats?.total_credit?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>Total Debits</span>
                    </div>
                    <span className="font-mono">{stats?.total_debit?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between font-medium">
                      <span>Net Ledger Flow</span>
                      <span className={`font-mono {derivedStats?.isPositiveFlow ? 'text-green-600' : 'text-red-600'}`}>
                        {derivedStats?.netFlow.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
      </div>
    </div>  
  );
}
