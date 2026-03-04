'use client'

import { Button } from '@/components/ui/button'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Force a hard refresh of the page
    window.location.reload()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label="Refresh page"
      title="Refresh page (Ctrl+Shift+R)"
      className="relative flex items-center justify-center"
    >
      <RotateCw 
        className={`h-4 w-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} 
      />
    </Button>
  )
}
