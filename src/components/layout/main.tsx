import React from 'react'
import { cn } from '@/lib/utils'

interface MainProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Main = ({ fixed, className, ...props }: MainProps) => {
  return (
    <main
      className={cn(
        'peer-[.header-fixed]/header:mt-10',
        'px-2 py-2 sm:px-2 sm:py-4 md:px-2 md:py-6 lg:px-2 lg:py-6 xl:px-2 xl:py-8',
        'w-full max-w-full overflow-x-hidden no-scrollbar',
        'min-h-0 flex-1',
        fixed && 'fixed-main flex grow flex-col overflow-hidden',
        className
      )}
      {...props}
    />
  )
}

Main.displayName = 'Main'
