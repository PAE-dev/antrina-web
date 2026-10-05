import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles.css';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AdminLayout } from './components/AdminLayout';
import { isUnauthorized } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { ProductDrawer } from './pages/ProductDrawer';
import { ProductsPage } from './pages/ProductsPage';
import { SetupMfaPage } from './pages/SetupMfaPage';
import { VerifyMfaPage } from './pages/VerifyMfaPage';
import { ME_QUERY_KEY } from './auth/session';

/** Si la sesión caduca a mitad de una acción, el layout redirige al login. */
const onSessionLost = (error: unknown) => {
  if (isUnauthorized(error)) queryClient.setQueryData(ME_QUERY_KEY, null);
};

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onSessionLost }),
  mutationCache: new MutationCache({ onError: onSessionLost }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/login/verificar', element: <VerifyMfaPage /> },
  { path: '/configurar-2fa', element: <SetupMfaPage /> },
  {
    element: <AdminLayout />,
    children: [
      {
        path: '/productos',
        element: <ProductsPage />,
        children: [{ path: ':id', element: <ProductDrawer /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/productos" replace /> },
]);

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
