'use client'

import { z } from 'zod'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
import { userTypes, companies, branches } from '../data/data'
import { useAuthStore } from '@/stores/authStore'
import { User } from '../data/schema'
import { SubmitHandler } from 'react-hook-form';
import { useUsersContext } from '@/features/users/context/users-context'
import { useEffect } from 'react'

const formSchema = z
  .object({
    name: z.string().min(1, { message: 'Name is required.' }),
    email: z
      .string()
      .min(1, { message: 'Email is required.' })
      .email({ message: 'Email is invalid.' }),
    phoneNumber: z.string().min(1, { message: 'Phone number is required.' }),
    companyId: z.string().min(1, { message: 'Company is required.' }),
    branchId: z.string().min(1, { message: 'Branch is required.' }),
    role: z.string().min(1, { message: 'Role is required.' }),
    password: z.string().transform((pwd) => pwd.trim()),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
  })
  .superRefine(({ isEdit, password, confirmPassword }, ctx) => {
    if (!isEdit || (isEdit && password !== '')) {
      if (password === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password is required.',
          path: ['password'],
        })
      }

      if (password.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 4 characters long.',
          path: ['password'],
        })
      }

      // if (!password.match(/[a-z]/)) {
      //   ctx.addIssue({
      //     code: z.ZodIssueCode.custom,
      //     message: 'Password must contain at least one lowercase letter.',
      //     path: ['password'],
      //   })
      // }

      // if (!password.match(/\d/)) {
      //   ctx.addIssue({
      //     code: z.ZodIssueCode.custom,
      //     message: 'Password must contain at least one number.',
      //     path: ['password'],
      //   })
      // }

      if (password !== confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match.",
          path: ['confirmPassword'],
        })
      }
    }
  })
type UserForm = z.infer<typeof formSchema>

interface Props {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({ currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow
  const authUser = useAuthStore((s) => s.auth.user)
  const { addUser, updateUser, refresh } = useUsersContext()

  // Set your default company and branch IDs here
  const defaultCompanyId = (authUser?.companyId || (authUser as any)?.company_id || '1') as string // Set your default company ID
  const defaultBranchId = (authUser?.branchId || (authUser as any)?.branch_id || '1') as string    // Set your default branch ID
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          companyId: currentRow.companyId ?? '',
          branchId: currentRow.branchId ?? '',
          phoneNumber: currentRow.phoneNumber ?? '',
          password: '',
          confirmPassword: '',
          isEdit,
        }
      : {
          name: '',
          email: '',
          phoneNumber: '',
          companyId: defaultCompanyId,
          branchId: defaultBranchId,
          role: '',
          password: '',
          confirmPassword: '',
          isEdit,
        },
  })

  // Ensure defaults are applied when auth user loads or dialog opens
  useEffect(() => {
    if (!isEdit) {
      if (defaultCompanyId && !form.getValues('companyId')) {
        form.setValue('companyId', defaultCompanyId)
      }
      if (defaultBranchId && !form.getValues('branchId')) {
        form.setValue('branchId', defaultBranchId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, defaultCompanyId, defaultBranchId, open])

  const selectedCompanyId = form.watch('companyId')
  const selectedBranchId = form.watch('branchId')
  const branchOptions = branches
    .filter((b) => !selectedCompanyId || b.companyId === selectedCompanyId)
    .map(({ id, name }) => ({ label: name, value: id }))

  const selectedCompanyName =
    companies.find((c) => c.id === selectedCompanyId)?.name ||
    (authUser?.companyName || (authUser as any)?.company_name || '') ||
    (selectedCompanyId ? String(selectedCompanyId) : '')
  const selectedBranchName =
    branches.find((b) => b.id === selectedBranchId)?.name ||
    (authUser?.branchName || (authUser as any)?.branch_name || '') ||
    (selectedBranchId ? String(selectedBranchId) : '')

  // Filter role options based on logged-in user's role
  const authRole = (authUser?.role || (authUser as any)?.role || '').toString().toLowerCase()
  const roleOptions = (() => {
    if (authRole === 'manager') {
      return userTypes.filter((t) => t.value === 'cashier')
    }
    if (authRole === 'admin') {
      return userTypes.filter((t) => t.value === 'manager' || t.value === 'cashier')
    }
    return userTypes
  })()

  const onSubmit: SubmitHandler<UserForm> = async (values) => {
    const payload: Partial<User> & Record<string, any> = {
      name: values.name,
      email: values.email,
      phoneNumber: values.phoneNumber,
      role: values.role as any,
      password: values.password,
      companyId: values.companyId,
      branchId: values.branchId,
      addedBy: authUser?.id || authUser?.name || authUser?.email || 'admin',
      status: 'active',
    }

    try {
      if (isEdit && currentRow) {
        await updateUser({ ...(currentRow as any), ...(payload as any) })
      } else {
        await addUser(payload as any)
      }
      await refresh()
      form.reset()
      onOpenChange(false)
    } catch (e) {
      // Keep dialog open on error
      console.error('Failed to save user:', e)
    }
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the user here. ' : 'Create new user here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className='-mr-4 h-[26.25rem] w-full overflow-y-auto py-1 pr-4'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit as SubmitHandler<UserForm>)}
              className='space-y-4 p-0.5'
            >
              <FormField<UserForm, 'name'>
                control={form.control as Control<UserForm>}
                name='name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='John Doe'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'email'>
                control={form.control as Control<UserForm>}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john.doe@gmail.com'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'phoneNumber'>
                control={form.control as Control<UserForm>}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='+123456789'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'companyId'>
                control={form.control as Control<UserForm>}
                name='companyId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Company
                    </FormLabel>
                    {isEdit ? (
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={(val) => {
                          field.onChange(val)
                          // Reset branch when company changes if branch no longer matches
                          const stillValid = branchOptions.some((b) => b.value === form.getValues('branchId'))
                          if (!stillValid) {
                            form.setValue('branchId', '')
                          }
                        }}
                        placeholder='Select a company'
                        className='col-span-4'
                        items={companies.map(({ id, name }) => ({ label: name, value: id }))}
                      />
                    ) : (
                      <Input
                        value={selectedCompanyName}
                        readOnly
                        disabled
                        className='col-span-4'
                      />
                    )}
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'branchId'>
                control={form.control as Control<UserForm>}
                name='branchId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Branch
                    </FormLabel>
                    {isEdit ? (
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        placeholder='Select a branch'
                        className='col-span-4'
                        items={branchOptions}
                      />
                    ) : (
                      <Input
                        value={selectedBranchName}
                        readOnly
                        disabled
                        className='col-span-4'
                      />
                    )}
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'role'>
                control={form.control as Control<UserForm>}
                name='role'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Role
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Select a role'
                      className='col-span-4'
                      items={roleOptions.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'password'>
                control={form.control as Control<UserForm>}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField<UserForm, 'confirmPassword'>
                control={form.control as Control<UserForm>}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form'>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
