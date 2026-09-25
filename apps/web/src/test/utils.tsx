import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { queryClient } from '@/lib/query-client';

/** Renders with the app's query client, emptied first so tests stay independent. */
export function renderWithQuery(ui: ReactElement) {
  queryClient.clear();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Stubs fetch with a single JSON response and returns the mock to inspect calls. */
export function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
