import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorState, LoadingState } from '@/components/States';
import { useMe } from './useAuth';

/** Renders child routes only for a signed-in user, otherwise redirects to /login. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} />;
  if (!me.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login and register pages are pointless once signed in. */
export function RedirectIfAuthenticated() {
  const me = useMe();
  if (me.isPending) return <LoadingState />;
  if (me.data) return <Navigate to="/" replace />;
  return <Outlet />;
}
