import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import './styles.css';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AdminLayout } from './components/AdminLayout';
import { isUnauthorized } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { ProductEditorPage } from './pages/ProductEditorPage';
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
      { path: '/productos', element: <ProductsPage /> },
      { path: '/productos/nuevo', element: <ProductEditorPage /> },
      { path: '/productos/:id', element: <ProductEditorPage /> },
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
