import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {  useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {Route as SalesRoute} from "@/routes/_authenticated/sales/index"
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
import { useAuthStore } from '@/stores/authStore'
import { login, saveUserCredentials } from '@/api/auth'
import { useUsersContext } from '@/features/users/context/users-context'

type UserAuthFormProps = HTMLAttributes<HTMLFormElement>

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(1, {
      message: 'Please enter your password',
    })
    .min(7, {
      message: 'Password must be at least 7 characters long',
    }),
})

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.auth.setAccessToken)
  const setUser = useAuthStore((s) => s.auth.setUser)
  const { addUser, refresh } = useUsersContext()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)
    try {
      // Call API for login
      const response = await login({ email: data.email, password: data.password })
      let user = null
      let accessToken = ''
      let company = null
      let branch = null
      let companyName = ''
      let branchName = ''
      if (response.success && response.data) {
        user = response.data.user ?? null
        accessToken = response.token ?? ''
        company = response.data.company?.[0] ?? null
        branch = response.data.branch?.[0] ?? null
        companyName = company?.name || ''
        branchName = branch?.branch_name || ''
      }
      if (!user && 'user' in response) {
        user = (response as any)?.user ?? null
      }
      if (!!accessToken && 'token' in response) {
        accessToken = response.token ?? ''
      }
      console.log('[login] Received accessToken:', accessToken)
      if (response.success && user && accessToken) {
        // Save all user details for future instant login
        const userWithOrg = {
          id: String(user.id),
          companyId: company ? String(company.id) : null,
          branchId: branch ? String(branch.id) : null,
          addedBy: user.added_by ?? user.addedBy ?? null,
          name: user.name || '',
          username: user.username || null, // Save username from API
          email: user.email || '',
          phoneNumber: user.phone_no ?? user.phoneNumber ?? '',
          plan: user.plan ?? null,
          planDuration: user.plan_duration ?? user.planDuration ?? null,
          planStartedAt: user.plan_started_at ?? user.planStartedAt ?? null,
          planEndedAt: user.plan_ended_at ?? user.planEndedAt ?? null,
          status: user.status || '',
          userDetails: user.user_details ?? user.userDetails ?? null,
          role: user.role || '',
          password: data.password, // Save for offline login
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
          updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
          companyName: companyName ? String(companyName) : '',
          branchName: branchName ? String(branchName) : '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        // Save user credentials to database for future cached logins
        await saveUserCredentials(userWithOrg, data.password);
        
        await addUser(userWithOrg)
        await refresh()
        setUser(userWithOrg)
        // Wait for the accessToken to be set before navigating
        await new Promise((resolve) => {
          setAccessToken(accessToken, undefined, undefined)
          // Small delay to ensure state is updated
          setTimeout(resolve, 50)
        })
        console.log('Navigating to sales');
        navigate({ to: SalesRoute.to });
      } else {
        setError(response.message || 'Login failed: Missing user or token')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              {/* <Link
                to='/forgot-password'
                className='text-muted-foreground absolute -top-0.5 right-0 text-sm font-medium hover:opacity-75'
              >
                Forgot password?
              </Link> */}
            </FormItem>
          )}
        />
        {error && <div className='text-destructive text-sm'>{error}</div>}
        <Button className='mt-2 ' disabled={isLoading} type='submit'>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          {/* <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              Or continue with
            </span>
          </div> */}
        </div>
       
      </form>
    </Form>
  )
}
