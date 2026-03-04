import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getAllTransactions } from '../data/data'
import { TransactionRow } from '../data/schema'

export function TransactionsTable() {
  const { data: transactions = [], isLoading, refetch } = useQuery<TransactionRow[]>({
    queryKey: ['transactions'],
    queryFn: getAllTransactions,
    staleTime: 15000,
  })

  const typeColor = (type: TransactionRow['order_type']) =>
    type === 'bill' ? 'bg-blue-100 text-blue-800' : type === 'purchase' ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-800'
  const payTypeColor = (t: TransactionRow['payment_type']) =>
    t === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <button className="text-sm underline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Order No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Credit (Paid)</TableHead>
                <TableHead>Debit (Due)</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Account Ref</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-6">Loading...</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-6">No transactions</TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={`${t.transaction_id}`}> 
                    <TableCell className="font-mono text-xs">{t.transaction_id}</TableCell>
                    <TableCell className="font-mono text-xs">{t.order_no ?? '-'}</TableCell>
                    <TableCell><Badge className={typeColor(t.order_type)}>{t.order_type}</Badge></TableCell>
                    <TableCell className="text-right">{Number(t.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-700">{Number(t.credit ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-700">{Number(t.debit ?? 0).toFixed(2)}</TableCell>
                    <TableCell><Badge className={payTypeColor(t.payment_type)}>{t.payment_type}</Badge></TableCell>
                    <TableCell>{t.payment_method}</TableCell>
                    <TableCell className="font-mono text-xs">{t.account_unique_id ?? '-'}</TableCell>
                    <TableCell>{t.company_id}</TableCell>
                    <TableCell>{t.branch_id}</TableCell>
                    <TableCell className="font-mono text-xs">{t.added_by ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">{transactions.length} records</div>
      </CardContent>
    </Card>
  )
}


