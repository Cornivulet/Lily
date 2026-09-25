import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import type { User } from '@/types/api';

type Credentials = { email: string; password: string };

/** Current user, or null when there is no valid session. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<User>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: Credentials) => api<User>('/auth/login', { method: 'POST', body }),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: Credentials) =>
      api<User & { defaultVaultId: string }>('/auth/register', { method: 'POST', body }),
    onSuccess: ({ defaultVaultId: _, ...user }) => {
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(['me'], null);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api<void>('/auth/password', { method: 'PATCH', body }),
  });
}
