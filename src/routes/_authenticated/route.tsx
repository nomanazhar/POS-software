import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Loading component for auth check
function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated')({
  component: () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const accessToken = useAuthStore((s) => s.auth.accessToken)
    const navigate = useNavigate()
    
    useEffect(() => {
      // Small delay to prevent flash of content
      const timer = setTimeout(() => {
        setIsCheckingAuth(false)
      }, 100)
      
      return () => clearTimeout(timer)
    }, [])
    
    useEffect(() => {
      if (!isCheckingAuth && !accessToken) {
        navigate({ to: '/sign-in', replace: true })
      }
    }, [accessToken, navigate, isCheckingAuth])
    
    // Show loading while checking auth
    if (isCheckingAuth) {
      return <AuthLoading />
    }
    
    // Only show layout if we have an access token
    if (accessToken) {
      return <AuthenticatedLayout />
    }
    
    // This will be briefly shown before navigation to sign-in
    return <AuthLoading />
  },
})
