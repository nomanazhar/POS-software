import { Link, useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { logout } from '@/api/auth'
import { toast } from 'sonner'
import { companies, branches } from '@/features/users/data/data'

export function ProfileDropdown() {
  const reset = useAuthStore((s) => s.auth.reset)
  const user = useAuthStore((s) => s.auth.user)
  const navigate = useNavigate()

  // Prefer user.companyName/branchName from API, then resolve from static data, then fallback to ID
  let companyDisplay = 'N/A';
  if (user?.companyName) {
    companyDisplay = user.companyName;
  } else if (user?.companyId) {
    const found = companies.find(c => c.id === user.companyId);
    companyDisplay = found?.name || user.companyId;
  }

  let branchDisplay = 'N/A';
  if (user?.branchName) {
    branchDisplay = user.branchName;
  } else if (user?.branchId) {
    const found = branches.find(b => b.id === user.branchId);
    branchDisplay = found?.name || user.branchId;
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err: any) {
      toast.error('Logout failed on server, but local session cleared.')
    } finally {
      reset()
      navigate({ to: '/sign-in' })
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full flex item-center justify-center'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={user?.avatar || '/avatars/01.png'} alt={user?.name || '@user'} />
            <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>{user?.name || 'User'}</p>
            <p className='text-muted-foreground text-xs leading-none'>
              {user?.email || 'user@email.com'}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              Company: {companyDisplay}
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              Branch: {branchDisplay}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to='/settings'>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className='bg-red-700'>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
