import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Database } from 'lucide-react';

export function TestTransaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState({
    accountId: '1_1_cust_001',
    amount: 100,
    orderType: 'bill',
    paymentMethod: 'cash'
  });

  const createTestTransaction = async () => {
    setIsLoading(true);
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Create a test transaction
      const testTransaction = {
        transaction_unique_id: `test_${Date.now()}`,
        account_unique_id: testData.accountId,
        order_no: `TEST-${Date.now()}`,
        order_type: testData.orderType,
        total_amount: testData.amount,
        credit: testData.amount,
        debit: 0,
        payment_type: 'credit',
        payment_method: testData.paymentMethod,
        added_by: 'admin',
        company_id: '1',
        branch_id: '1'
      };

      console.log('Creating test transaction:', testTransaction);

      const result = await window.electronAPI.invoke('transactions:add', testTransaction);
      
      if (result && result.success) {
        toast.success('Test transaction created successfully!');
        console.log('Test transaction result:', result);
      } else {
        toast.error('Failed to create test transaction: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating test transaction:', error);
      toast.error('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const checkTransactionTable = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.invoke('debug:checkTransactionTable');
      console.log('Transaction table check result:', result);
      
      if (result && result.success) {
        toast.success(`Transaction Table Status:
          Total: ${result.totalTransactions}
          Regular: ${result.regularTransactions}
          Central: ${result.centralTransactions}`);
      } else {
        toast.error('Failed to check transaction table');
      }
    } catch (error) {
      console.error('Error checking transaction table:', error);
      toast.error('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Transaction
        </CardTitle>
        <CardDescription>
          Create a test transaction to verify the system is working
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountId">Account ID</Label>
          <Input
            id="accountId"
            value={testData.accountId}
            onChange={(e) => setTestData(prev => ({ ...prev, accountId: e.target.value }))}
            placeholder="Enter account ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            value={testData.amount}
            onChange={(e) => setTestData(prev => ({ ...prev, amount: Number(e.target.value) }))}
            placeholder="Enter amount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Select
            value={testData.orderType}
            onValueChange={(value) => setTestData(prev => ({ ...prev, orderType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select order type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bill">Bill</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="quotation">Quotation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select
            value={testData.paymentMethod}
            onValueChange={(value) => setTestData(prev => ({ ...prev, paymentMethod: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="ledger">Ledger</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={createTestTransaction}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Test Transaction
              </>
            )}
          </Button>
          <Button
            onClick={checkTransactionTable}
            variant="outline"
            size="sm"
          >
            Check Table
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
