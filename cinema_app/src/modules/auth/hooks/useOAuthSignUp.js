import { useMutation, useQuery } from '@tanstack/react-query';
import { completeOAuthSignUp, getOAuthPendingProfile } from '../services/authService';

export const useOAuthPendingProfile = (provider) => {
  const query = useQuery({
    queryKey: ['oauth-pending-profile', provider],
    queryFn: () => getOAuthPendingProfile(provider),
    select: (response) => response.data,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  return {
    profile: query.data,
    isLoadingProfile: query.isPending,
    isProfileError: query.isError
  };
};

export const useCompleteOAuthSignUp = (provider) => {
  const mutation = useMutation({
    /** @param {Record<string, string>} profile */
    mutationFn: (profile) => completeOAuthSignUp(provider, profile)
  });

  return {
    completeSignUp: mutation.mutate,
    isCompleting: mutation.isPending
  };
};