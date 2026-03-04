import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { useSearch } from '@tanstack/react-router'
import { Route as ResetPasswordRoute } from '@/routes/(auth)/reset-password'
import axios from 'axios'

type ResetFormProps = HTMLAttributes<HTMLFormElement>

const formSchema = z
  .object({
    password: z
      .string()
      .min(7, { message: 'Password must be at least 7 characters long' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export function ResetPasswordForm({ className, ...props }: ResetFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { token } = useSearch({ from: ResetPasswordRoute.id })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (!token) throw new Error('Invalid or missing token')
      // Replace with your backend API endpoint
      await axios.post('/api/reset-password', { token, password: data.password })
      setSuccess('Password has been reset. You can now log in.')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {success && <div className='text-green-600 text-sm'>{success}</div>}
        {error && <div className='text-destructive text-sm'>{error}</div>}
        <Button className='mt-2' disabled={isLoading} type='submit'>
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </Form>
  )
} 