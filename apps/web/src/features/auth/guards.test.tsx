import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { mockFetch, renderWithQuery } from '@/test/utils';
import { RequireAuth } from './guards';

function LoginProbe() {
  const location = useLocation();
  return <p>login, from {(location.state as { from: string }).from}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginProbe /> },
      { element: <RequireAuth />, children: [{ path: '/vaults', element: <p>vaults</p> }] },
    ],
    { initialEntries: [path] },
  );
  renderWithQuery(<RouterProvider router={router} />);
}

describe('RequireAuth', () => {
  it('redirects to /login and remembers the requested URL when signed out', async () => {
    mockFetch(401, { message: 'Unauthorized', statusCode: 401 });
    renderAt('/vaults?x=1');
    expect(await screen.findByText('login, from /vaults?x=1')).toBeInTheDocument();
  });

  it('renders the page for a signed-in user', async () => {
    mockFetch(200, { id: '1', email: 'a@b.dev', createdAt: '2026-01-01T00:00:00Z' });
    renderAt('/vaults');
    expect(await screen.findByText('vaults')).toBeInTheDocument();
  });
});
