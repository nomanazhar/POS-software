import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
          asChild
        >
          <Link to="/dashboard">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Link>
        </Button>
        <Card className='gap-4'>
          <CardHeader>
            <CardTitle className='text-lg tracking-tight'>
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your registered email and <br /> we will send you a link to
              reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
          <CardFooter>
            <p className='text-muted-foreground px-8 text-center text-sm'>
              Don't have an account?{' '}
              <Link
                to='/sign-up'
                className='hover:text-primary underline underline-offset-4'
              >
                Sign up
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </AuthLayout>
  )
}
