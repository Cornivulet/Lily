import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { errorMessage } from '@/lib/api';
import { useChangePassword } from '@/features/auth/useAuth';

type Errors = { newPassword?: string; confirmation?: string; form?: string };

export function PasswordForm() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (newPassword.length < 8) nextErrors.newPassword = 'Au moins 8 caractères';
    else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'Le nouveau mot de passe doit être différent de l’actuel';
    }
    if (newPassword !== confirmation)
      nextErrors.confirmation = 'Les mots de passe ne correspondent pas';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmation('');
          toast.success('Mot de passe modifié');
        },
        onError: (error) => setErrors({ form: errorMessage(error) }),
      },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormField
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <FormField
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={errors.newPassword}
      />
      <FormField
        label="Confirmer le nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        required
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        error={errors.confirmation}
      />
      {errors.form && (
        <p role="alert" className="text-sm whitespace-pre-line text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" className="justify-self-start" disabled={changePassword.isPending}>
        Changer le mot de passe
      </Button>
    </form>
  );
}
