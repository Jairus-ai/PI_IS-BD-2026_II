import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearRoomStatus, getRoomDashboard, setRoomStatus } from '../services/roomDashboardService';
import type { RoomDashboard } from '../types/roomDashboard';

export const ROOM_DASHBOARD_QUERY_KEY = ['room-dashboard', 'room'];

export const useRoomDashboard = (roomId: number | '', date: string | null) => {
  const dashboardQuery = useQuery<RoomDashboard>({
    queryKey: [...ROOM_DASHBOARD_QUERY_KEY, roomId, date],
    queryFn: () => getRoomDashboard({ roomId, date }),
    enabled: roomId !== '',
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });

  return {
    dashboard: dashboardQuery.data ?? null,
    isLoadingDashboard: dashboardQuery.isLoading,
    isFetchingDashboard: dashboardQuery.isFetching,
    dashboardError: dashboardQuery.error,
    refetchDashboard: dashboardQuery.refetch
  };
};

export const useSetRoomStatus = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: setRoomStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOM_DASHBOARD_QUERY_KEY })
  });

  return {
    setRoomStatus: mutation.mutateAsync,
    isSettingStatus: mutation.isPending
  };
};

export const useClearRoomStatus = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: clearRoomStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOM_DASHBOARD_QUERY_KEY })
  });

  return {
    clearRoomStatus: mutation.mutateAsync,
    isClearingStatus: mutation.isPending
  };
};