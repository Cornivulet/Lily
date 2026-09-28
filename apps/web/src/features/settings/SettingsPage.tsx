import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout, useMe } from '@/features/auth/useAuth';
import { AppHeader } from '@/features/layout/AppHeader';
import { lastVaultId } from '@/features/vaults/useVaults';
import { PasswordForm } from './PasswordForm';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

/** Account settings: profile, password, sign-out. */
export function SettingsPage() {
  // RequireAuth guarantees a signed-in user here.
  const user = useMe().data!;
  const logout = useLogout();
  const navigate = useNavigate();
  const vaultId = lastVaultId();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto grid max-w-2xl gap-6 px-6 py-10">
        <div>
          <Link
            to={vaultId ? `/vaults/${vaultId}` : '/vaults'}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Retour
          </Link>
          <h1 className="text-2xl font-semibold">Paramètres</h1>
        </div>

        <Section title="Profil">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate">{user.email}</dd>
            <dt className="text-muted-foreground">Membre depuis</dt>
            <dd>{dateFormat.format(new Date(user.createdAt))}</dd>
          </dl>
        </Section>

        <Section title="Mot de passe">
          <PasswordForm />
        </Section>

        <Section title="Session">
          <Button
            variant="outline"
            className="justify-self-start"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
            }
          >
            <LogOut /> Se déconnecter
          </Button>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
