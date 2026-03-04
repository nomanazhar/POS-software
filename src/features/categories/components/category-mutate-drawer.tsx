import { useEffect, useCallback, memo, useMemo } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategoryContext } from '../context/category-context'
import { Category, categorySchema } from '../data/schema'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit: boolean
  currentCategory?: Category | null
}

export const CategoryMutateDrawer = memo(function CategoryMutateDrawer({ 
  open, 
  onOpenChange, 
  isEdit, 
  currentCategory 
}: Props) {
  const { addCategory, updateCategory } = useCategoryContext()
  const user = useAuthStore((s) => s.auth.user)

  // Get user data for auto-population - memoized to prevent infinite re-renders
  const userData = useMemo(() => {
    if (user) {
      return {
        added_by: user.name || user.email || 'admin',
        company_id: user.companyId || user.company_id || '1',
        branch_id: user.branchId || user.branch_id || '1',
      }
    }
    return {
      added_by: 'admin',
      company_id: '1',
      branch_id: '1',
    }
  }, [user])

  const form = useForm<any>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      category_name: '',
      description: '',
      status: 'active',
      icon: '',
      added_by: userData.added_by,
      company_id: userData.company_id,
      branch_id: userData.branch_id,
    },
  })

  const resetForm = useCallback(() => {
    if (isEdit && currentCategory) {
      form.reset({
        category_name: currentCategory.category_name,
        description: currentCategory.description || '',
        status: currentCategory.status,
        icon: currentCategory.icon || '',
        added_by: currentCategory.added_by,
        company_id: currentCategory.company_id,
        branch_id: currentCategory.branch_id,
      })
    } else {
      form.reset({
        category_name: '',
        description: '',
        status: 'active' as const,
        icon: '',
        added_by: userData.added_by,
        company_id: userData.company_id,
        branch_id: userData.branch_id,
      })
    }
  }, [isEdit, currentCategory, form, userData])

  useEffect(() => {
    resetForm()
  }, [resetForm])

  const onSubmit = useCallback(async (data: any) => {
    try {
      const categoryToSave = {
        ...data,
        category_unique_id: data.category_unique_id || `${data.company_id}_${data.branch_id}_${Date.now()}`,
      }

      if (isEdit && currentCategory) {
        const categoryWithId = { ...categoryToSave, category_id: currentCategory.category_id }
        const result = await updateCategory(categoryWithId)
        if (result.success) {
          toast.success('Category updated successfully')
          onOpenChange(false)
        } else {
          toast.error(result.error || 'Failed to update category')
        }
      } else {
        const result = await addCategory(categoryToSave)
        if (result.success) {
          toast.success('Category added successfully')
          onOpenChange(false)
        } else {
          toast.error(result.error || 'Failed to add category')
        }
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }, [isEdit, currentCategory, updateCategory, addCategory, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[270px] p-2 z-999">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Category' : 'Add Category'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Edit the category details below.' : 'Add a new category to your system.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 ">
            <FormField
              control={form.control}
              name="category_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter category description" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter icon name" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Hidden fields for auto-populated data */}
            <FormField
              control={form.control}
              name="added_by"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button type="submit">{isEdit ? 'Update' : 'Add'} Category</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}) 