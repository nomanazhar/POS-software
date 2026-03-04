// import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Quotation } from '../data/schema'

interface QuotationViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: Quotation | null
}

export function QuotationViewDialog({ open, onOpenChange, quotation }: QuotationViewDialogProps) {
  if (!quotation) return null

  const items = quotation.quotation_items || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quotation Details</DialogTitle>
          <DialogDescription>
            View quotation information and items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Quotation Number</h3>
              <p className="text-lg font-medium">{quotation.quotationno}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Customer ID</h3>
              <p className="text-sm">{quotation.account_unique_id}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Sale Type</h3>
              <Badge variant={quotation.sale_type === 'retail' ? 'default' : 'outline'}>
                {quotation.sale_type}
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Created By</h3>
              <p className="text-sm">{quotation.added_by}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Created Date</h3>
              <p className="text-sm">
                {quotation.created_at ? new Date(quotation.created_at).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Item Count</h3>
              <p className="text-sm">{quotation.item_count} items</p>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h3 className="font-semibold mb-4">Quotation Items</h3>
            {items.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Retail Price</TableHead>
                      <TableHead>Wholesale Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm text-muted-foreground">
                            {item.product_unique_id}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${Number(item.retail_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.wholesale_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.total_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.discount).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.tax).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No items in this quotation
              </div>
            )}
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal:</span>
              <span className="text-sm">
                ${(quotation.total_amount - quotation.tax_amount + quotation.discount_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tax Amount:</span>
              <span className="text-sm">${Number(quotation.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Discount Amount:</span>
              <span className="text-sm">-${Number(quotation.discount_amount).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>${Number(quotation.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Paid Amount:</span>
              <span className="text-sm">${Number(quotation.paid_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
