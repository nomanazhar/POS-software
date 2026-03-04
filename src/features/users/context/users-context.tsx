// In src/features/users/context/users-context.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { User, userSchema } from '../data/schema';
import useDialogState from '@/hooks/use-dialog-state';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type UsersDialogType = 'create' | 'update' | 'delete' | 'invite';

interface UsersContextType {
  open: UsersDialogType | null;
  setOpen: (str: UsersDialogType | null) => void;
  currentRow: User | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  allUsers: User[];
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
}

interface Props {
  children: React.ReactNode;
}

const UsersContext = React.createContext<UsersContextType | undefined>(undefined);

// Helper function to validate and transform database data
const validateUserData = (data: any[]): User[] => {
  if (!Array.isArray(data)) {
    console.error('Database returned non-array data:', data);
    return [];
  }
  
  return data
    .map((item) => {
      try {
        if (!item || typeof item !== 'object') {
          console.error('Invalid item:', item);
          return null;
        }
        
        // Create user data object without password if it doesn't exist
        const userData: any = {
          id: String(item.id || generateId('USER', `${item.companyId || item.company_id || 'company'}_${item.branchId || item.branch_id || 'branch'}`)),
          companyId: item.companyId ?? item.company_id ?? null,
          branchId: item.branchId ?? item.branch_id ?? null,
          addedBy: item.addedBy ?? item.added_by ?? null,
          name: String(item.name || ''),
          email: String(item.email || ''),
          phone_no: item.phoneNumber ?? item.phone_no ?? '',
          plan: item.plan ?? null,
          plan_duration: item.planDuration ?? item.plan_duration ?? null,
          plan_started_at: item.planStartedAt ?? item.plan_started_at ?? null,
          plan_ended_at: item.planEndedAt ?? item.plan_ended_at ?? null,
          status: String(item.status ?? ''),
          userDetails: item.userDetails ?? item.user_details ?? null,
          role: String(item.role ?? ''),
          created_at: new Date(item.createdAt ?? item.created_at ?? Date.now()).toISOString(),
          updated_at: new Date(item.updatedAt ?? item.updated_at ?? Date.now()).toISOString(),
        };

        // Only include password if it exists
        if (item.password) {
          userData.password = String(item.password);
        }

        // Validate against schema
        return userSchema.parse(userData);
      } catch (error) {
        console.error('Error validating user item:', item, error);
        return null;
      }
    })
    .filter((item): item is User => item !== null);
};

export function UsersProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<UsersDialogType>(null);
  const [currentRow, setCurrentRow] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const currentUser = useAuthStore(state => state.auth.user);

  // Filter users based on current user's role
  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    
    // Admin sees all users
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
      return allUsers;
    }
    
    // Manager sees themselves and their cashiers
    if (currentUser.role === 'manager') {
      return allUsers.filter(user => 
        user.id === currentUser.id || 
        (user.role === 'cashier' && user.addedBy === currentUser.id)
      );
    }
    
    // Cashier only sees themselves
    if (currentUser.role === 'cashier') {
      return allUsers.filter(user => user.id === currentUser.id);
    }
    
    return [];
  }, [allUsers, currentUser]);

  // Track if we're already fetching to prevent multiple simultaneous fetches
  const isFetchingRef = React.useRef(false);

  // Fetch all users with optimization
  const fetchUsers = React.useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    console.log('Fetching users...');
    isFetchingRef.current = true;

    try {
      if (!window.electronAPI) {
        console.warn('Electron API not available, using empty users');
        setAllUsers([]);
        return;
      }

      const data = await window.electronAPI.invoke('users:getAll');
      console.log('Raw users data from API received');
      
      // Handle different response formats
      const usersData = data?.success ? data.data : Array.isArray(data) ? data : [];
      
      const validatedData = validateUserData(usersData);
      
      // Only update state if the data has actually changed
      setAllUsers(prevUsers => {
        const prevIds = new Set(prevUsers.map(u => u.id));
        const newIds = new Set(validatedData.map(u => u.id));
        
        // Check if the data is actually different
        if (prevUsers.length !== validatedData.length || 
            ![...prevIds].every(id => newIds.has(id))) {
          console.log('Users data changed, updating state');
          return validatedData;
        }
        console.log('Users data unchanged, skipping state update');
        return prevUsers;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users. Please try refreshing the page.');
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Helper function to hash password if it's a new password
  const prepareUserData = async (user: User): Promise<User> => {
    // If password is empty or undefined, remove it from the user object
    if (!user.password) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    
    // If password exists and is not already hashed (not starting with $2a$ or $2b$)
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      try {
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        return { ...user, password: hashedPassword };
      } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to secure password');
      }
    }
    
    // If password is already hashed or empty, return as is
    return user;
  };

  const addUser = async (user: User) => {
    try {
      if (!window.electronAPI) {
        console.error('Electron API not available');
        toast.error('Application error: Electron API not available');
        return;
      }

      console.log('Preparing user data...');
      const userData = await prepareUserData(user);
      console.log('Adding user:', { ...userData, password: '***' }); // Don't log actual password
      
      const result = await window.electronAPI.invoke('users:add', userData);
      
      console.log('Add user result:', result);
      
      if (result && result.success) {
        toast.success('User added successfully');
        await fetchUsers();
      } else {
        const errorMsg = result?.error || 'Failed to add user';
        console.error('Failed to add user:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add user';
      toast.error(errorMsg);
    }
  };

  const updateUser = async (user: User) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      console.log('Preparing user data for update...');
      const userData = await prepareUserData(user);
      console.log('Updating user:', { ...userData, password: '***' }); // Don't log actual password

      const result = await window.electronAPI.invoke('users:update', userData);
      
      if (result.success) {
        toast.success('User updated successfully');
        await fetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      const result = await window.electronAPI.invoke('users:delete', userId);
      
      if (result.success) {
        await fetchUsers(); // Refresh the users list
        return result;
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const approveUser = async (userId: string) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      const result = await window.electronAPI.invoke('users:updateStatus', { 
        userId, 
        status: 'active' 
      });
      
      if (result.success) {
        toast.success('User approved successfully');
        await fetchUsers();
      } else {
        toast.error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve user');
    }
  };

  const value = {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    users: filteredUsers,
    allUsers,
    addUser,
    updateUser,
    deleteUser,
    refresh: fetchUsers,
    approveUser,
  };

  // Initial data fetch with dependency on currentUser.id to prevent unnecessary re-fetches
  useEffect(() => {
    if (currentUser?.id && allUsers.length === 0) {
      console.log('Initial users fetch triggered');
      fetchUsers();
    }
  }, [currentUser?.id]); // Only depend on currentUser.id

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsersContext() {
  const context = React.useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsersContext must be used within a UsersProvider');
  }
  return context;
}