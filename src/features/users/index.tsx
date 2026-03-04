// In src/features/users/index.tsx
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { ThemeSwitch } from '@/components/theme-switch';
import { UsersProvider, useUsersContext } from './context/users-context';
import { DataTable } from './components/users-table';
import { columns } from './components/users-columns';
import { UsersPrimaryButtons } from './components/users-primary-buttons';
import { UsersDialogs } from './components/users-dialogs';
import { useRouter } from '@tanstack/react-router';
import { UsersDeleteDialog } from './components/users-delete-dialog';

function UsersPage() {
  const { users, refresh } = useUsersContext();
  const { auth: { user } } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.navigate({ to: '/sign-in' });
    } else {
      refresh();
    }
  }, [user, router, refresh]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const canAddUsers = ['admin', 'manager'].includes(user.role);

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {user.role === 'cashier' ? 'My Account' : 'User Management'}
            </h2>
            <p className='text-muted-foreground'>
              {user.role === 'admin' 
                ? 'Manage all users and their roles' 
                : user.role === 'manager'
                  ? 'Manage your cashiers and account'
                  : 'View your account details'}
            </p>
          </div>
          {canAddUsers && <UsersPrimaryButtons />}
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg'>
          <DataTable data={users} columns={columns} />
        </div>
      </Main>
      <UsersDialogs />
      <UsersDeleteDialog />
    </>
  );
}

export function Users() {
  return (
    <UsersProvider>
      <UsersPage />
    </UsersProvider>
  );
}