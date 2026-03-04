import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  items: {
    title: string
    href: string
    icon?: React.ReactNode
  }[]
}

export default function SidebarNav({ items }: SidebarNavProps) {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <nav className="flex flex-col space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
} 