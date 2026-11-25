import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addScreen, getScreenLocations, getScreens } from '../services/screenService';

export const SCREENS_QUERY_KEY = ['screens'];
const SCREEN_LOCATIONS_QUERY_KEY = ['screen-locations'];

export const useScreens = () => {
  const screensQuery = useQuery({
    queryKey: SCREENS_QUERY_KEY,
    queryFn: getScreens
  });

  return {
    screens: Array.isArray(screensQuery.data) ? screensQuery.data : [],
    isLoadingScreens: screensQuery.isLoading,
    screensError: screensQuery.error,
    refetchScreens: screensQuery.refetch
  };
};

export const useScreenLocations = (enabled = true) => {
  const locationsQuery = useQuery({
    queryKey: SCREEN_LOCATIONS_QUERY_KEY,
    queryFn: getScreenLocations,
    enabled
  });

  return {
    locations: Array.isArray(locationsQuery.data) ? locationsQuery.data : [],
    isLoadingLocations: locationsQuery.isLoading,
    locationsError: locationsQuery.error
  };
};

export const useCreateScreen = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addScreen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCREENS_QUERY_KEY })
  });

  return {
    createScreen: mutation.mutateAsync,
    isCreatingScreen: mutation.isPending
  };
};
