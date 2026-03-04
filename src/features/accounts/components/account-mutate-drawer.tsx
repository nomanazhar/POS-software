import { memo, useCallback, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { accountSchema, Account } from '../data/schema'
import { useAccountContext } from '../context/account-context'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit: boolean
  currentAccount?: Account | null
  onAccountCreated?: (account: Account) => void
}

export const AccountMutateDrawer = memo(function AccountMutateDrawer({ open, onOpenChange, isEdit, currentAccount, onAccountCreated }: Props) {
  const { addAccount, updateAccount } = useAccountContext()
  const user = useAuthStore((s) => s.auth.user)
  
  const form = useForm<any>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      account_unique_id: '',
      fullname: '',
      email: '',
      phone_no: '',
      address: '',
      second_address: '',
      city: '',
      account_type: 'customer',
      account_status: 'active',
      account_limit: 0,
      total_credit: 0,
      total_debit: 0,
      balance: 0,
      loyality_points: 0,
      discount_rate: 0,
      remarks: '',
      added_by: user?.name || user?.email || 'admin',
      company_id: user?.companyId || user?.company_id || '1',
      branch_id: user?.branchId || user?.branch_id || '1',
    },
  })

  const resetForm = useCallback(() => {
    if (isEdit && currentAccount) {
      form.reset({
        account_unique_id: currentAccount.account_unique_id,
        fullname: currentAccount.fullname,
        email: currentAccount.email || '',
        phone_no: currentAccount.phone_no || '',
        address: currentAccount.address || '',
        second_address: currentAccount.second_address || '',
        city: currentAccount.city || '',
        account_type: currentAccount.account_type as any,
        account_status: currentAccount.account_status as any,
        account_limit: currentAccount.account_limit,
        total_credit: currentAccount.total_credit,
        total_debit: currentAccount.total_debit,
        balance: currentAccount.balance,
        loyality_points: currentAccount.loyality_points,
        discount_rate: currentAccount.discount_rate,
        remarks: currentAccount.remarks || '',
        added_by: currentAccount.added_by,
        company_id: currentAccount.company_id,
        branch_id: currentAccount.branch_id,
      })
    } else {
      form.reset({
        account_unique_id: '',
        fullname: '',
        email: '',
        phone_no: '',
        address: '',
        second_address: '',
        city: '',
        account_type: 'customer',
        account_status: 'active',
        account_limit: 0,
        total_credit: 0,
        total_debit: 0,
        balance: 0,
        loyality_points: 0,
        discount_rate: 0,
        remarks: '',
        added_by: user?.name || user?.email || 'admin',
        company_id: user?.companyId || user?.company_id || '1',
        branch_id: user?.branchId || user?.branch_id || '1',
      })
    }
  }, [isEdit, currentAccount, form, user])

  useEffect(() => { resetForm() }, [resetForm])

  const onSubmit = useCallback(async (data: any) => {
    try {
      console.log('Form data being submitted:', data);
      
      const payload = { 
        ...data, 
        account_unique_id: data.account_unique_id || `${user?.companyId || user?.company_id || '1'}_${user?.branchId || user?.branch_id || '1'}_${Date.now()}`,
        added_by: user?.name || user?.email || 'admin',
        company_id: user?.companyId || user?.company_id || '1',
        branch_id: user?.branchId || user?.branch_id || '1',
        // Convert empty strings to null for optional fields
        email: data.email || null,
        phone_no: data.phone_no || null,
        address: data.address || null,
        second_address: data.second_address || null,
        city: data.city || null,
        remarks: data.remarks || null,
        // Ensure numeric fields are properly converted
        account_limit: Number(data.account_limit || 0),
        total_credit: Number(data.total_credit || 0),
        total_debit: Number(data.total_debit || 0),
        balance: Number(data.balance || 0),
        loyality_points: Number(data.loyality_points || 0),
        discount_rate: Number(data.discount_rate || 0),
      };
  
      console.log('Processed payload:', payload);
  
      if (isEdit && currentAccount) {
        const result = await updateAccount({ ...payload, account_id: currentAccount.account_id });
        if (result.success) {
          toast.success('Account updated successfully');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Failed to update account');
        }
      } else {
        const result = await addAccount(payload);
        if (result.success) {
          toast.success('Account added successfully');
          if (onAccountCreated) {
            onAccountCreated(payload as Account);
          }
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Failed to add account');
        }
      }
    } catch (e) {
      console.error('Error in form submission:', e);
      toast.error('An error occurred while processing the form');
    }
  }, [isEdit, currentAccount, updateAccount, addAccount, onOpenChange, user, onAccountCreated]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto w-[30vw] p-4">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Account' : 'Add Account'}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form 
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            // Show all validation errors
            Object.values(errors).forEach((error) => {
              if (error?.message) {
                toast.error(error.message as string);
              }
            });
          })} 
          className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              
              <FormField name="fullname" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl><Input placeholder="Enter full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="account_type" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="account_status" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>


            {/* Contact Information */}
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="Email address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="phone_no" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField name="address" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Address</FormLabel>
                  <FormControl><Textarea placeholder="Primary address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="second_address" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Address</FormLabel>
                    <FormControl><Input placeholder="Secondary address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="city" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="City" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

        

            {/* Financial Information */}
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField name="account_limit" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={field.value?.toString() ?? '0'} 
                        onChange={(e) => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="discount_rate" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        max="100"
                        placeholder="0.00" 
                        value={field.value?.toString() ?? '0'} 
                        onChange={(e) => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="loyality_points" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loyalty Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={field.value?.toString() ?? '0'} 
                        onChange={(e) => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField name="total_credit" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Credit (Read-only)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={field.value?.toString() ?? '0'} 
                          disabled
                          className="bg-gray-50 text-gray-600"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Calculated from transactions</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="total_debit" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Debit (Read-only)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={field.value?.toString() ?? '0'} 
                          disabled
                          className="bg-gray-50 text-gray-600"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Calculated from transactions</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="balance" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance (Read-only)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={field.value?.toString() ?? '0'} 
                          disabled
                          className="bg-gray-50 text-gray-600"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Calculated from transactions</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </div>


            {/* Additional Information */}
            <div className="space-y-4">

              
              <FormField name="remarks" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes or remarks" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <SheetFooter className='flex justify-end'>
              <Button type="submit" className='w-[31%]'>{isEdit ? 'Update' : 'Add'} Account</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
})


