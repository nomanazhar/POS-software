import React from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { BackButton } from '@/components/backbutton'
import { RefreshButton } from '@/components/refresh-button'
import { ZoomControls } from '@/components/zoom-controls'

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Header = ({
  className,
  fixed,
  children,
  ...props
}: HeaderProps) => {
  const [offset, setOffset] = React.useState(0)

  React.useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'bg-background flex h-16 items-center justify-between gap-3 py-4 px-8  sm:gap-4',
        fixed && 'header-fixed peer/header fixed z-50 w-[inherit] rounded-md',
        offset > 10 && fixed ? 'shadow-sm' : 'shadow-none',
        className
      )}
      {...props}
    >
      <div className='flex items-center gap-2'>
        <BackButton to="/navigations/" className="-ml-2" />
        <SidebarTrigger variant='outline' className='scale-125 sm:scale-100 flex justify-center items-center' />
        <div className='flex items-center gap-2'>
        <RefreshButton />
        <ZoomControls />
      </div>
        <Separator orientation='vertical' className='h-6' />
      </div> 
      <div className='flex-1 min-w-0 overflow-hidden'>
        {children}
      </div>
      
    </header>
  )
}

Header.displayName = 'Header'
