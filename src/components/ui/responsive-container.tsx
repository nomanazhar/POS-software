import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
  ...props
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  }

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2 sm:px-3 sm:py-3',
    md: 'px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6',
    lg: 'px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8',
  }

  return (
    <div
      className={cn(
        'w-full overflow-hidden',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        'mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

ResponsiveContainer.displayName = 'ResponsiveContainer' 