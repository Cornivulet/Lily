import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { AuthForm } from './AuthForm';

function setup(props: { confirmPassword?: boolean; onSubmit?: () => Promise<unknown> } = {}) {
  const onSubmit = vi.fn(props.onSubmit ?? (() => Promise.resolve()));
  render(
    <AuthForm
      submitLabel="Valider"
      confirmPassword={props.confirmPassword}
      onSubmit={onSubmit}
      footer={null}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('AuthForm', () => {
  it('submits the credentials', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Email'), 'a@b.dev');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.dev', password: 'secret123' });
  });

  it('blocks a registration whose confirmation does not match', async () => {
    const { onSubmit, user } = setup({ confirmPassword: true });
    await user.type(screen.getByLabelText('Email'), 'a@b.dev');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'secret124');
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAccessibleDescription(
      'Les mots de passe ne correspondent pas',
    );
  });

  it('shows the server error', async () => {
    const { user } = setup({
      onSubmit: () => Promise.reject(new ApiError(401, 'Identifiants invalides')),
    });
    await user.type(screen.getByLabelText('Email'), 'a@b.dev');
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides');
  });
});
