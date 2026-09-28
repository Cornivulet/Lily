import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import { errorMessage } from '@/lib/api';

type AuthFormProps = {
  submitLabel: string;
  confirmPassword?: boolean;
  onSubmit: (credentials: { email: string; password: string }) => Promise<unknown>;
  footer: ReactNode;
};

export function AuthForm({ submitLabel, confirmPassword, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (confirmPassword && password.length < 8) {
      nextErrors.password = 'Au moins 8 caractères';
    }
    if (confirmPassword && password !== confirmation) {
      nextErrors.confirmation = 'Les mots de passe ne correspondent pas';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await onSubmit({ email, password });
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
      />
      <FormField
        label="Mot de passe"
        type="password"
        autoComplete={confirmPassword ? 'new-password' : 'current-password'}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      {confirmPassword && (
        <FormField
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          error={errors.confirmation}
        />
      )}
      {errors.form && (
        <p role="alert" className="text-sm whitespace-pre-line text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {submitLabel}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </form>
  );
}
