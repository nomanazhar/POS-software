import { Bill } from '../data/schema'
import { useCurrency } from '@/context/currency-context'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

interface BillViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: Bill | null
  saleReportMode?: boolean
  bills?: Bill[]
}

export function BillViewDialog({
  open,
  onOpenChange,
  bill,
  saleReportMode = false,
  bills = [],
}: BillViewDialogProps) {
  const { formatAmount } = useCurrency()
  if (!open) return null

  if (saleReportMode) {
    // Sale Report Printout
    const grandTotal = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Report</DialogTitle>
            <DialogDescription>
              Print summary of bills for selected period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b, idx) => (
                    <TableRow key={b.bill_id || idx}>
                      <TableCell>{b.bill_id}</TableCell>
                      <TableCell>{b.payment_method ? b.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</TableCell>
                      <TableCell>{formatAmount(b.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <span className="text-lg font-bold">Grand Total: {formatAmount(grandTotal)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Details - {bill.billno}</DialogTitle>
          <DialogDescription>
            View complete bill information and line items
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Bill Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Bill Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Bill ID:</span> {bill.bill_id}</p>
                <p><span className="font-medium">Bill Number:</span> {bill.billno}</p>
                <p><span className="font-medium">Bill Date:</span> {bill.created_at}</p>
                <p><span className="font-medium">Customer:</span> {bill.account_unique_id || 'Walk-in Customer'}</p>
                <p><span className="font-medium">Sale Type:</span> 
                  <Badge className="ml-2" variant={bill.sale_type === 'retail' ? 'default' : 'secondary'}>
                    {bill.sale_type}
                  </Badge>
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Payment Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Payment Method:</span> 
                  <Badge className="ml-2" variant="outline">
                    {bill.payment_method || 'N/A'}
                  </Badge>
                </p>
                <p><span className="font-medium">Payment Status:</span> 
                  <Badge className="ml-2" variant={
                    bill.payment_status === 'paid' ? 'default' : 
                    bill.payment_status === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {bill.payment_status}
                  </Badge>
                </p>
                <p><span className="font-medium">Total Amount:</span> {formatAmount(bill.total_amount)}</p>
                <p><span className="font-medium">Paid Amount:</span> {formatAmount(bill.paid_amount)}</p>
                <p><span className="font-medium">Balance:</span> {formatAmount(bill.balance)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill Items */}
          <div>
            <h3 className="font-semibold mb-4">Bill Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.bill_items && bill.bill_items.length > 0 ? (
                    bill.bill_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">{item.product_unique_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.item_qty}</TableCell>
                        <TableCell>{formatAmount(item.retail_price)}</TableCell>
                        <TableCell>{formatAmount(item.total_price)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatAmount(bill.total_amount - (bill.total_tax || 0) + (bill.total_discount || 0))}</span>
              </div>
              {bill.total_discount && bill.total_discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatAmount(bill.total_discount)}</span>
                </div>
              )}
              {bill.total_tax && bill.total_tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatAmount(bill.total_tax)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatAmount(bill.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="text-green-600">{formatAmount(bill.paid_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className={bill.balance > 0 ? 'text-red-600' : bill.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                  {formatAmount(bill.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Additional Information</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Items Count:</span> {bill.item_count}</p>
                <p><span className="font-medium">Added By:</span> {bill.added_by}</p>
                <p><span className="font-medium">Company ID:</span> {bill.company_id}</p>
                <p><span className="font-medium">Branch ID:</span> {bill.branch_id}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Timestamps</h3>
              <div className="space-y-1">
                <p><span className="font-medium">Created:</span> {bill.created_at}</p>
                <p><span className="font-medium">Updated:</span> {bill.updated_at}</p>
                {bill.isreturned && (
                  <p><span className="font-medium">Status:</span> 
                    <Badge className="ml-2" variant="destructive">Returned</Badge>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 