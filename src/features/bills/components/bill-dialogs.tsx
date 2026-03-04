import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { billSchema, type Bill } from '../data/schema'
import { useBillContext } from '../context/bill-context'
// Removed BillDeleteDialog: bills are read-only
// Removed BillMutateDrawer: bills are created via Sales only
import { BillViewDialog } from './bill-view-dialog'

export function BillDialogs() {
  const { dialogState, closeDialog, selectedBill } = useBillContext()

  const form = useForm<Bill>({
    resolver: zodResolver(billSchema) as any,
    defaultValues: {
      bill_id: '',
      bill_unique_id: '',
      account_unique_id: '',
      billno: '',
      bill_items: [],
      total_tax: 0,
      total_discount: 0,
      total_amount: 0,
      paid_amount: 0,
      balance: 0,
      payment_status: 'pending',
      payment_method: 'cash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company_id: '',
      branch_id: '',
      added_by: '',
      sale_type: 'retail',
      item_count: 0,
      isreturned: 0,
      extracharges: 0,
      // Add any other required fields from Bill schema
    },
  })

  

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog()
      form.reset()
    }
  }
  return (
    <>
      <BillViewDialog
        open={dialogState.type === 'view'}
        onOpenChange={handleOpenChange}
        bill={selectedBill}
      />
      {/* Removed BillDeleteDialog: bills are read-only */}
    </>
  )
} 