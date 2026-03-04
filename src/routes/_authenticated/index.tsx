// routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/')({
  component: () => {
    const accessToken = useAuthStore((s) => s.auth.accessToken)
    const navigate = useNavigate()

    useEffect(() => {
      if (accessToken) {
        navigate({ to: '/dashboard', replace: true }) // Redirect to dashboard
      } else {
        navigate({ to: '/sign-in', replace: true })
      }
    }, [accessToken, navigate])

    return null
  },
})
