import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Client errors (404, 401…) won't fix themselves: don't retry them.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

/**
 * Everything derived from note contents: to refresh after any note change.
 * The queries of a deleted note are skipped: refetching them could only 404.
 */
export function invalidateKnowledge(deletedNoteId?: string): Promise<void> {
  const keys = new Set(['vaults', 'vault', 'notes', 'backlinks', 'links', 'graph', 'localGraph', 'tags']);
  return queryClient.invalidateQueries({
    predicate: (q) =>
      typeof q.queryKey[0] === 'string' &&
      keys.has(q.queryKey[0]) &&
      (deletedNoteId === undefined || q.queryKey[1] !== deletedNoteId),
  });
}
