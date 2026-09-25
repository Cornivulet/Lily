import { Link, useNavigate } from 'react-router';
import { AuthLayout } from './AuthLayout';
import { AuthForm } from './AuthForm';
import { useRegister } from './useAuth';

export function RegisterPage() {
  const register = useRegister();
  const navigate = useNavigate();

  return (
    <AuthLayout title="Créer un compte">
      <AuthForm
        submitLabel="Créer mon compte"
        confirmPassword
        onSubmit={async (credentials) => {
          const { defaultVaultId } = await register.mutateAsync(credentials);
          navigate(`/vaults/${defaultVaultId}`, { replace: true });
        }}
        footer={
          <>
            Déjà un compte ?{' '}
            <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </>
        }
      />
    </AuthLayout>
  );
}
