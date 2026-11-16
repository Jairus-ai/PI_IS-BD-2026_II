import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocations,
  getLocationsCount,
  getLocationById
} from '../services/locationService';

export const useLocations = (
  page: number = 1,
  locationId: number | null | undefined = null,
  filters: any = {},
) => {
  const locationsQuery = useQuery({
    queryKey: ['locations', page, filters],
    queryFn: ()  => getLocations(page, filters),
  });

  const countQuery = useQuery({
    queryKey: ['locationsCount', filters],
    queryFn: () => getLocationsCount(filters),
  });

  const locationDetailQuery = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => getLocationById(locationId),
    enabled: locationId != null,
  });

  const queryClient = useQueryClient();
  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      await queryClient.invalidateQueries({ queryKey: ['locationsCount'] });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, location }: {id: number, location: any}) => updateLocation(id, location),
    onSuccess: async(_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      await queryClient.invalidateQueries({ queryKey: ['location', variables.id] });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: ({ id }: {id: number}) => deleteLocation(id),
    onSuccess: async(_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      await queryClient.invalidateQueries({ queryKey: ['location', variables.id] });
    },
  });

  return {
    locations: locationsQuery.data?.data ?? [],
    totalLocations: countQuery.data?.total ?? 0,
    isLoadingLocations: locationsQuery.isLoading,
    LocationsError: locationsQuery.error,

    locationDetail: locationDetailQuery.data?.data ?? null,
    isLoadingDetail: locationDetailQuery.isLoading,

    createLocation: createLocationMutation.mutateAsync,
    isCreatingLocation: createLocationMutation.isPending,
    createLocationError: createLocationMutation.error,
    updateLocation: (id: number, location: any) => updateLocationMutation.mutateAsync({ id, location }),
    isUpdatingLocation: updateLocationMutation.isPending,
    deleteLocation: deleteLocationMutation.mutateAsync,
    isDeletingLocation: deleteLocationMutation.isPending,
    deleteLocationError: deleteLocationMutation.error,
  };
};