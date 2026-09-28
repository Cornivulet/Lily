import { Link, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from './AuthLayout';
import { AuthForm } from './AuthForm';
import { useLogin } from './useAuth';

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  return (
    <AuthLayout title="Connexion">
      <AuthForm
        submitLabel="Se connecter"
        onSubmit={async (credentials) => {
          await login.mutateAsync(credentials);
          navigate(from, { replace: true });
        }}
        footer={
          <>
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </>
        }
      />
    </AuthLayout>
  );
}
