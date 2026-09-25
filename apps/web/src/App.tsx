import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { setUnauthorizedHandler } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { GraphPage } from '@/features/graph/GraphPage';
import { VaultLayout } from '@/features/layout/VaultLayout';
import { NotePage, VaultHome } from '@/features/notes/NotePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { lastVaultId } from '@/features/vaults/useVaults';
import { VaultsPage } from '@/features/vaults/VaultsPage';

// Session expired: drop every cached query; RequireAuth then sends the user
// to /login, remembering the current URL.
setUnauthorizedHandler(() => {
  queryClient.clear();
  queryClient.setQueryData(['me'], null);
});

/** Entry point once signed in: reopen the last vault, else the vault list. */
function Home() {
  const id = lastVaultId();
  return <Navigate to={id ? `/vaults/${id}` : '/vaults'} replace />;
}

// A data router is required by useBlocker (unsaved-changes guard in NotePage).
const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/vaults', element: <VaultsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      {
        path: '/vaults/:vaultId',
        element: <VaultLayout />,
        children: [
          { index: true, element: <VaultHome /> },
          { path: 'notes/:noteId', element: <NotePage /> },
          { path: 'graph', element: <GraphPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
