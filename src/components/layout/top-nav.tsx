import { Link } from '@tanstack/react-router'
import { IconMenu } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  links: {
    title: string
    href: string
    isActive: boolean
    disabled?: boolean
  }[]
}

export function TopNav({ className, links, ...props }: TopNavProps) {
  return (
    <>
      <div className='sm:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='outline' className='h-8 w-8'>
              <IconMenu className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start' className='w-48'>
            {links.map(({ title, href, isActive, disabled }) => (
              <DropdownMenuItem key={`${title}-${href}`} asChild>
                <Link
                  to={href}
                  className={cn(
                    'w-full',
                    !isActive ? 'text-muted-foreground' : 'text-foreground'
                  )}
                  disabled={disabled}
                >
                  {title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav
        className={cn(
          'hidden items-center space-x-3 sm:flex md:space-x-4 lg:space-x-6',
          'flex-shrink-0',
          className
        )}
        {...props}
      >
        {links.map(({ title, href, isActive, disabled }) => (
          <Link
            key={`${title}-${href}`}
            to={href}
            disabled={disabled}
            className={cn(
              'hover:text-primary text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {title}
          </Link>
        ))}
      </nav>
    </>
  )
}
