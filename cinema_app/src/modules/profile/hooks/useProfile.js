import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useSession from '../../../hooks/useSession';
import { getProfile, updateProfile } from '../services/profileService';

export const PROFILE_QUERY_KEY = ['profile'];

export const useProfile = () => {
  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile
  });

  return {
    profile: profileQuery.data ?? null,
    isLoadingProfile: profileQuery.isLoading,
    profileError: profileQuery.error,
    refetchProfile: profileQuery.refetch
  };
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, startSession } = useSession();

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      if (user) {
        startSession({ ...user, firstName: profile.firstName, firstSurname: profile.firstSurname });
      }
    }
  });

  return {
    saveProfile: updateMutation.mutateAsync,
    isSavingProfile: updateMutation.isPending
  };
};
