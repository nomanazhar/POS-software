import { ArrowLeftIcon } from "lucide-react"
import { useLocation, useRouter } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface BackButtonProps {
  to?: string;
  className?: string;
}

export const BackButton = ({ to, className }: BackButtonProps) => {
  const router = useRouter()
  const location = useLocation()
  const [isMounted, setIsMounted] = useState(false)
  
  // Only enable the button after mount to ensure router context is available
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const isOnNavigationPage = location.pathname.startsWith('/navigations')

  const handleGoBack = () => {
    if (!isMounted) return
    
    try {
      if (to) {
        router.navigate({ to })
      } else {
        router.history.back()
      }
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  if (isOnNavigationPage || !isMounted) {
    return null
  }

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleGoBack}
      className={cn("h-8 w-8 p-0 flex items-center justify-center", className)}
      aria-label="Go back to navigation"
    >
      <ArrowLeftIcon className="h-4 w-4 " />
    </Button>
  )
}