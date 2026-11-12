import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Canton, Province } from '../types/locations';
import {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocations,
  getLocationsCount,
  getLocationById,
  getCantons,
  getProvinces
} from '../services/locationService';

export const useLocations = (
  page: number = 1,
  locationId: number | null | undefined = null,
  provinceId: number | null | undefined = null,
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

  const locationCantonsQuery = useQuery({
    queryKey: ['locationCantons', provinceId],
    queryFn: () => getCantons(provinceId),
    enabled: provinceId != null,
  }) 

   const locationProvincesQuery = useQuery({
    queryKey: ['locationProvinces'],
    queryFn: () => getProvinces(),
  }) 

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

    locationProvinces: (locationProvincesQuery.data?.data?? []) as Province[],
    isLoadingProvinces: locationProvincesQuery.isLoading,

    locationDetail: locationDetailQuery.data?.data ?? null,
    locationCantons: (locationCantonsQuery.data?.data?? []) as Canton[],
    isLoadingDetail: locationDetailQuery.isLoading,
    isLoadingCantons: locationCantonsQuery.isLoading,

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