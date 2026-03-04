import axios from 'axios'

// Set your API base URL here
const API_BASE_URL = 'http://martpos.tfourplus.com/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  data?: {
    user?: any;
    branch?: any;
    company?: any;
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  try {
    // First try local database if electronAPI is available
    if (window.electronAPI) {
      try {
        const users = await window.electronAPI.invoke('users:getAll');
        
        // Check if users is an array and has items
        if (Array.isArray(users) && users.length > 0) {
          const user = users.find((u: any) => 
            u.email?.toLowerCase() === payload.email?.toLowerCase()
          );
          
          if (user) {
            // In development, you might want to skip password check for testing
            if (process.env.NODE_ENV === 'development' && !user.password) {
              console.warn('Development mode: Bypassing password check');
              return {
                success: true,
                token: 'dev-auth-token',
                data: { user }
              };
            }

            // In production or when password exists, verify it
            if (user.password) {
              try {
                // Use dynamic import for bcrypt to avoid webpack issues
                const bcrypt = await import('bcryptjs');
                const passwordMatch = await bcrypt.compare(
                  String(payload.password || '').trim(),
                  user.password
                );
                
                if (passwordMatch) {
                  return {
                    success: true,
                    token: 'local-auth-token',
                    data: { user }
                  };
                }
              } catch (error) {
                console.error('Password verification error:', error);
                // Fall through to API login
              }
            }
            return { success: false, message: 'Invalid email or password' };
          }
        }
        console.log('No users found in local database, trying API login...');
      } catch (dbError) {
        console.error('Error accessing local database, falling back to API:', dbError);
      }
    }
    
    // Fall back to API if no users found in local DB or electronAPI not available
    console.log('Attempting API login...');
    const response = await axios.post(`${API_BASE_URL}/login`, payload);
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        'Login failed. Please check your credentials.';
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

export async function logout(): Promise<{ success: boolean; message?: string }> {
  try {
    // Clear cached credentials first
    await clearCachedCredentials();
    
    // Then call API logout
    const response = await axios.post(`${API_BASE_URL}/logout`)
    return response.data
  } catch (error) {
    console.error('[Logout] Error during logout:', error);
    // Even if API logout fails, we still want to clear cached credentials
    await clearCachedCredentials();
    return { success: true, message: 'Logged out locally' };
  }
}

// Add a function to get the current user for rehydration
export async function getUserFromDBOrAPI(): Promise<any | null> {
  // Try to get user from local DB (Electron)
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const users = await window.electronAPI.invoke('users:getAll');
      // You may want to filter for the currently logged-in user
      // For now, return the first user (customize as needed)
      if (users && users.length > 0) return users[0];
    } catch (e) {
      // Fallback to API
    }
  }
  // Fallback: try to get user from API using stored token
  try {
    const token = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('access_token') || 'null') : null;
    if (token) {
      const response = await axios.get(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.user) return response.data.user;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Function to check for cached credentials and attempt auto-login
export async function checkCachedCredentials(): Promise<LoginResponse | null> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return null;
  }

  try {
    const users = await window.electronAPI.invoke('users:getAll');
    if (!users || users.length === 0) {
      return null;
    }

    // Get the most recently updated user (assuming it's the last logged in user)
    const sortedUsers = users.sort((a: any, b: any) => 
      new Date(b.updated_at || b.updatedAt).getTime() - new Date(a.updated_at || a.updatedAt).getTime()
    );
    const cachedUser = sortedUsers[0];

    if (!cachedUser || !cachedUser.email || !cachedUser.password) {
      return null;
    }

    // Attempt to login with cached credentials
    console.log('[Cached Login] Attempting login with cached credentials for:', cachedUser.email);
    const response = await login({ 
      email: cachedUser.email, 
      password: cachedUser.password 
    });

    if (response.success) {
      console.log('[Cached Login] Successfully logged in with cached credentials');
      return response;
    } else {
      console.log('[Cached Login] Cached credentials failed, user needs to login manually');
      return null;
    }
  } catch (error) {
    console.error('[Cached Login] Error checking cached credentials:', error);
    return null;
  }
}

// Function to save user credentials after successful API login
export async function saveUserCredentials(user: any, password: string): Promise<void> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    console.warn('Electron API not available, skipping credential save');
    return;
  }

  try {
    // Hash the password before saving
    let hashedPassword = password;
    if (process.env.NODE_ENV !== 'development' || password) {
      const bcrypt = await import('bcryptjs');
      const SALT_ROUNDS = 10;
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const userWithPassword = {
      ...user,
      password: hashedPassword,
    };
    
    await window.electronAPI.invoke('users:add', userWithPassword);
    console.log('[Cached Login] User credentials saved to database');
  } catch (error) {
    console.error('[Cached Login] Error saving user credentials:', error);
  }
}

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  
  try {
    const bcrypt = await import('bcryptjs');
    const SALT_ROUNDS = 10;
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to secure password');
  }
}

// Function to check if there are any cached credentials (without attempting login)
export async function hasCachedCredentials(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return false;
  }

  try {
    const users = await window.electronAPI.invoke('users:getAll');
    if (!users || users.length === 0) {
      return false;
    }

    // Check if any user has a password (cached credentials)
    const hasCredentials = users.some((user: any) => user.password && user.password.trim() !== '');
    return hasCredentials;
  } catch (error) {
    console.error('[Cached Login] Error checking for cached credentials:', error);
    return false;
  }
}

// Function to clear cached credentials (call on logout)
export async function clearCachedCredentials(): Promise<void> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return;
  }

  try {
    // Get all users and remove their passwords
    const users = await window.electronAPI.invoke('users:getAll');
    for (const user of users) {
      const userWithoutPassword = {
        ...user,
        password: '', // Clear the password
      };
      await window.electronAPI.invoke('users:update', userWithoutPassword);
    }
    console.log('[Cached Login] Cached credentials cleared');
  } catch (error) {
    console.error('[Cached Login] Error clearing cached credentials:', error);
  }
}

// You can add more auth-related API calls here, e.g.:
// export async function register(payload: RegisterPayload): Promise<RegisterResponse> { ... } 