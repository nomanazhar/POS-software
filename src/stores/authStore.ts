import Cookies from 'js-cookie'
import { create } from 'zustand'

const ACCESS_TOKEN = 'access_token'
const REFRESH_TOKEN = 'refresh_token'
const TOKEN_EXPIRY = 'token_expiry'
const USER_KEY = 'user_info';

interface AuthState {
  auth: {
    user: any
    setUser: (user: any) => void
    accessToken: string
    setAccessToken: (accessToken: string, expiry?: number, refreshToken?: string) => void
    refreshToken: string
    tokenExpiry: number | null
    setTokenExpiry: (expiry: number) => void
    setRefreshToken: (refreshToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieToken = Cookies.get(ACCESS_TOKEN)
  const cookieRefresh = Cookies.get(REFRESH_TOKEN)
  const cookieExpiry = Cookies.get(TOKEN_EXPIRY)
  const initToken = cookieToken ? JSON.parse(cookieToken) : ''
  const initRefresh = cookieRefresh ? JSON.parse(cookieRefresh) : ''
  const initExpiry = cookieExpiry ? Number(cookieExpiry) : null
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
  return {
    auth: {
      user: storedUser ? JSON.parse(storedUser) : null,
      setUser: (user) => {
        if (typeof window !== 'undefined') {
          if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
          else localStorage.removeItem(USER_KEY);
        }
        set((state) => ({ ...state, auth: { ...state.auth, user } }));
      },
      accessToken: initToken,
      setAccessToken: (accessToken, expiry, refreshToken) =>
        set((state) => {
          Cookies.set(ACCESS_TOKEN, JSON.stringify(accessToken))
          if (expiry) {
            Cookies.set(TOKEN_EXPIRY, expiry.toString())
          }
          if (refreshToken) {
            Cookies.set(REFRESH_TOKEN, JSON.stringify(refreshToken))
          }
          return {
            ...state,
            auth: {
              ...state.auth,
              accessToken,
              tokenExpiry: expiry ?? state.auth.tokenExpiry,
              refreshToken: refreshToken ?? state.auth.refreshToken,
            },
          }
        }),
      refreshToken: initRefresh,
      tokenExpiry: initExpiry,
      setTokenExpiry: (expiry) =>
        set((state) => {
          Cookies.set(TOKEN_EXPIRY, expiry.toString())
          return { ...state, auth: { ...state.auth, tokenExpiry: expiry } }
        }),
      setRefreshToken: (refreshToken) =>
        set((state) => {
          Cookies.set(REFRESH_TOKEN, JSON.stringify(refreshToken))
          return { ...state, auth: { ...state.auth, refreshToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN)
          Cookies.remove(TOKEN_EXPIRY)
          Cookies.remove(REFRESH_TOKEN)
          if (typeof window !== 'undefined') localStorage.removeItem(USER_KEY);
          return { ...state, auth: { ...state.auth, accessToken: '', tokenExpiry: null, refreshToken: '' } }
        }),
      reset: () =>
        set((state) => {
          Cookies.remove(ACCESS_TOKEN)
          Cookies.remove(TOKEN_EXPIRY)
          Cookies.remove(REFRESH_TOKEN)
          if (typeof window !== 'undefined') localStorage.removeItem(USER_KEY);
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '', tokenExpiry: null, refreshToken: '' },
          }
        }),
    },
  }
})

// Helper to rehydrate user from DB/API if needed
export async function rehydrateUserIfNeeded(fetchUser: () => Promise<any>) {
  const { auth } = useAuthStore.getState();
  if (auth.accessToken && !auth.user) {
    try {
      const user = await fetchUser();
      if (user) {
        useAuthStore.getState().auth.setUser(user);
      }
    } catch (e) {
      // Optionally handle error
    }
  }
}
