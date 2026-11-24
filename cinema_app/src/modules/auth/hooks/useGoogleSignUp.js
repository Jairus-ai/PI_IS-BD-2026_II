import { useMutation, useQuery } from '@tanstack/react-query';
import { completeGoogleSignUp, getGooglePendingProfile } from '../services/authService';

export const useGooglePendingProfile = () => {
  const query = useQuery({
    queryKey: ['google-pending-profile'],
    queryFn: getGooglePendingProfile,
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

export const useCompleteGoogleSignUp = () => {
  const mutation = useMutation({ mutationFn: completeGoogleSignUp });

  return {
    completeSignUp: mutation.mutate,
    isCompleting: mutation.isPending
  };
};