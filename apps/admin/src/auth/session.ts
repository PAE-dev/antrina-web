import { ADMIN_AUTH_ROUTES, type AdminMeDto } from '@antrina/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isUnauthorized } from '../lib/api';

export const ME_QUERY_KEY = ['admin', 'me'] as const;

/** `null` = sin sesión completa (falta login o 2FA). */
export function useCurrentAdmin() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async (): Promise<AdminMeDto | null> => {
      try {
        return await api<AdminMeDto>('GET', ADMIN_AUTH_ROUTES.me);
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('POST', ADMIN_AUTH_ROUTES.logout),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
}
