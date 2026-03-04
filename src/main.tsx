import { StrictMode, Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AxiosError } from 'axios';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { handleServerError } from '@/utils/handle-server-error';
import { FontProvider } from './context/font-context';
import { ThemeProvider } from './context/theme-context';
import { CurrencyProvider } from './context/currency-context';
import { TaxProvider } from './context/tax-context';
import { KeyboardShortcutsProvider } from './context/keyboard-shortcuts-context';
import './index.css';
import { routeTree } from './routeTree.gen';
import BillProvider from './features/bills/context/bill-context';
import { SalesProvider } from './features/sales/context/sales-context';
import InventoryProvider  from './features/inventory/context/inventory-context';
import  ProductProvider  from './features/products/context/product-context';
// import { CustomerProvider } from './features/customers/context/customer-context';
// import { SupplierProvider } from './features/suppliers/context/supplier-context';
import  PurchaseProvider  from './features/purchases/context/purchase-context';
import { UsersProvider } from './features/users/context/users-context';
import { rehydrateUserIfNeeded } from '@/stores/authStore';
import { getUserFromDBOrAPI, checkCachedCredentials } from '@/api/auth';

function GlobalAuthRehydrator() {
  useEffect(() => {
    // Check for cached credentials on startup
    const checkCachedLogin = async () => {
      try {
        const cachedResponse = await checkCachedCredentials();
        if (cachedResponse && cachedResponse.success) {
          // Set user and token from cached login
          const { auth } = useAuthStore.getState();
          if (cachedResponse.data?.user) {
            auth.setUser(cachedResponse.data.user);
          }
          if (cachedResponse.token) {
            auth.setAccessToken(cachedResponse.token);
          }
          console.log('[Startup] Successfully logged in with cached credentials');
        }
      } catch (error) {
        console.error('[Startup] Error checking cached credentials:', error);
      }
    };

    // Check cached credentials on startup
    checkCachedLogin();

    // On window focus, re-fetch user if needed
    const handleFocus = () => {
      rehydrateUserIfNeeded(getUserFromDBOrAPI);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (import.meta.env.DEV) console.log({ failureCount, error });
        if (failureCount >= 0 && import.meta.env.DEV) return false;
        if (failureCount > 2 && import.meta.env.PROD) return false;
        
        // Don't retry on 401/403 errors
        if (error instanceof AxiosError) {
          const status = AxiosError?.response?.status;
          if (status === 401 || status === 403) {
            return false;
          }
        }
        return true;
      },
      refetchOnWindowFocus: false, // Disable in production for Electron apps
      staleTime: 30 * 1000, // Increased to 30s to reduce frequent queries
    },
    mutations: {
      onError: (error) => {
        if (error instanceof AxiosError) {
          const status = AxiosError?.response?.status;
          
          switch (status) {
            case 304:
              toast.error('Content not modified!', { duration: 2000 });
              break;
            case 401:
              toast.error('Session expired!', { duration: 2000 });
              useAuthStore.getState().auth.reset();
              const redirect = `${router.history.location.href}`;
              router.navigate({ to: '/sign-in', search: { redirect } });
              break;
            case 403:
              toast.error('Forbidden access!', { duration: 2000 });
              router.navigate({ to: '/403', replace: true });
              break;
            case 404:
              toast.error('Resource not found!', { duration: 2000 });
              router.navigate({ to: '/404' });
              break;
            case 500:
              toast.error('Internal Server Error!', { duration: 2000 });
              router.navigate({ to: '/500' });
              break;
            default:
              handleServerError(error);
              break;
          }
        } else {
          // Handle non-Axios errors
          handleServerError(error);
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        const status = AxiosError?.response?.status;
        
        switch (status) {
          case 401:
            toast.error('Session expired!', { duration: 2000 });
            useAuthStore.getState().auth.reset();
            const redirect = `${router.history.location.href}`;
            router.navigate({ to: '/sign-in', search: { redirect } });
            break;
          case 403:
            toast.error('Forbidden access!', { duration: 2000 });
            router.navigate({ to: '/403', replace: true });
            break;
          case 404:
            toast.error('Resource not found!', { duration: 2000 });
            router.navigate({ to: '/404' });
            break;
          case 500:
            toast.error('Internal Server Error!', { duration: 2000 });
            router.navigate({ to: '/500' });
            break;
          default:
            handleServerError(error);
            break;
        }
      } else {
        // Handle non-Axios errors
        handleServerError(error);
      }
    },
  }),
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  // Add Suspense fallback for lazy-loaded routes
  defaultPendingComponent: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <CurrencyProvider defaultCurrency="PKR" storageKey="vite-ui-currency">
            <TaxProvider defaultTaxRate={0} storageKey="vite-ui-tax-rate">
              <FontProvider>
            <KeyboardShortcutsProvider>
              <UsersProvider>
                <BillProvider>
                  <InventoryProvider>
                    <ProductProvider>
                      <PurchaseProvider>
                        <SalesProvider>
                          <Suspense fallback={<div className="flex items-center justify-center h-screen w-full overflow-hidden">Loading...</div>}>
                            <GlobalAuthRehydrator />
                            <RouterProvider router={router} />
                          </Suspense>
                        </SalesProvider>
                      </PurchaseProvider>
                    </ProductProvider>
                  </InventoryProvider>
                </BillProvider>
              </UsersProvider>
            </KeyboardShortcutsProvider>
              </FontProvider>
            </TaxProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}