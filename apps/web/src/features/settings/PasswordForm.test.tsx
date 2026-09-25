import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockFetch, renderWithQuery } from '@/test/utils';
import { PasswordForm } from './PasswordForm';

async function fill(current: string, next: string, confirmation = next) {
  const user = userEvent.setup();
  renderWithQuery(<PasswordForm />);
  await user.type(screen.getByLabelText('Mot de passe actuel'), current);
  await user.type(screen.getByLabelText('Nouveau mot de passe'), next);
  await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), confirmation);
  await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
}

describe('PasswordForm', () => {
  it('sends the change and clears the fields', async () => {
    const fetchMock = mockFetch(204);
    await fill('oldpass123', 'newpass123');

    await waitFor(() => expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue(''));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/password');
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(init.body)).toEqual({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    });
  });

  it('rejects a new password identical to the current one without calling the API', async () => {
    const fetchMock = mockFetch(204);
    await fill('samepass123', 'samepass123');
    expect(screen.getByLabelText('Nouveau mot de passe')).toHaveAccessibleDescription(
      'Le nouveau mot de passe doit être différent de l’actuel',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match', async () => {
    const fetchMock = mockFetch(204);
    await fill('oldpass123', 'newpass123', 'newpass124');
    expect(screen.getByLabelText('Confirmer le nouveau mot de passe')).toHaveAccessibleDescription(
      'Les mots de passe ne correspondent pas',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a wrong current password and keeps the fields', async () => {
    mockFetch(401, { message: 'Mot de passe actuel incorrect', statusCode: 401 });
    await fill('wrongpass1', 'newpass123');
    expect(await screen.findByRole('alert')).toHaveTextContent('Mot de passe actuel incorrect');
    expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('wrongpass1');
  });
});
