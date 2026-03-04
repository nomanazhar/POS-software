import { usePurchaseContext } from '../context/purchase-context'
import { PurchaseMutateDrawer } from './purchase-mutate-drawer'
import { ConfirmDialog } from './confirm-dialog'

export function PurchaseDialogs() {
  const { open, setOpen, currentPurchase, deletePurchase } = usePurchaseContext()

  const handleDelete = async () => {
    if (currentPurchase) {
      try {
        await deletePurchase(currentPurchase.purchase_billno || currentPurchase.purchase_unique_id || '')
        setOpen(null)
      } catch (error) {
        console.error('Error deleting purchase:', error)
      }
    }
  }

  return (
    <>
      {(open === 'create' || open === 'update') && (
        <PurchaseMutateDrawer
          open={open === 'create' || open === 'update'}
          onOpenChange={() => setOpen(null)}
          currentPurchase={open === 'update' ? currentPurchase ?? undefined : undefined}
        />
      )}
      
      {open === 'delete' && currentPurchase && (
        <ConfirmDialog
          open={open === 'delete'}
          onOpenChange={() => setOpen(null)}
          title="Delete Purchase"
          description={`Are you sure you want to delete purchase "${currentPurchase.purchase_billno}"? This action cannot be undone and will:
          
• Remove the purchase record
• Reverse inventory stock changes
• Delete associated transaction
• Remove unused products
• Update account balances`}
          confirmText="Delete Purchase"
          cancelText="Cancel"
          onConfirm={handleDelete}
          variant="destructive"
        />
      )}
    </>
  )
} 