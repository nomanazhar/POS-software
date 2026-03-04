import { memo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Account } from '../data/schema'
import { useCurrency } from '@/context/currency-context'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
}

export const AccountViewDialog = memo(function AccountViewDialog({ open, onOpenChange, account }: Props) {
  const { formatAmount } = useCurrency()
  
  if (!account) return null

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-800'
      case 'customer': return 'bg-green-100 text-green-800'
      case 'supplier': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Details</DialogTitle>
          <DialogDescription>
            View detailed information about this account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                <p className="text-sm">{account.account_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unique ID</label>
                <p className="text-sm font-mono">{account.account_unique_id}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-lg font-medium">{account.fullname}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <div className="mt-1">
                  <Badge className={getAccountTypeColor(account.account_type)}>
                    {account.account_type}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(account.account_status)}>
                    {account.account_status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{account.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm">{account.phone_no || '-'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Primary Address</label>
              <p className="text-sm">{account.address || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Secondary Address</label>
                <p className="text-sm">{account.second_address || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">City</label>
                <p className="text-sm">{account.city || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Information</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Credit Limit</label>
                <p className="text-sm font-medium">{formatAmount(account.account_limit || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Credit</label>
                <p className="text-sm font-medium text-green-600">{formatAmount(account.total_credit || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Debit</label>
                <p className="text-sm font-medium text-red-600">{formatAmount(account.total_debit || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Balance</label>
                <p className={`text-sm font-medium ${
                  account.account_type === 'customer'
                    ? ((account.balance || 0) > 0 ? 'text-green-600' : (account.balance || 0) < 0 ? 'text-red-600' : 'text-gray-600')
                    : ((account.balance || 0) > 0 ? 'text-red-600' : (account.balance || 0) < 0 ? 'text-green-600' : 'text-gray-600')
                }`}>
                  {formatAmount(account.balance || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Loyalty Points</label>
                <p className="text-sm font-medium">{account.loyality_points || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Discount Rate</label>
                <p className="text-sm font-medium">{account.discount_rate ? `${account.discount_rate}%` : '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Remarks</label>
              <p className="text-sm">{account.remarks || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Added By</label>
                <p className="text-sm">{account.added_by}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company ID</label>
                <p className="text-sm">{account.company_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch ID</label>
                <p className="text-sm">{account.branch_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm">{formatDate(account.created_at || '')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                <p className="text-sm">{formatDate(account.updated_at || '')}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
