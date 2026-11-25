import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import { getRoomDashboardFilters } from '../services/roomDashboardService';
import type { RoomDashboardFilters } from '../types/roomDashboard';

export const ROOM_DASHBOARD_FILTERS_QUERY_KEY = ['room-dashboard', 'filters'];

interface Selection {
  locationId: number | '';
  roomId: number | '';
  date: Dayjs | null; //null means today
}

const EMPTY_SELECTION: Selection = { locationId: '', roomId: '', date: null };
const EMPTY_FILTERS: RoomDashboardFilters = { locations: [], rooms: [] };

export const useRoomDashboardFilters = () => {
  const filtersQuery = useQuery<RoomDashboardFilters>({
    queryKey: ROOM_DASHBOARD_FILTERS_QUERY_KEY,
    queryFn: getRoomDashboardFilters
  });
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);

  const { locations, rooms } = filtersQuery.data ?? EMPTY_FILTERS;

  const locationId = locations.some((location) => location.id === selection.locationId)
    ? selection.locationId
    : (locations[0]?.id ?? '');
  const roomsOfLocation = rooms.filter((room) => room.locationId === locationId);
  const roomId = roomsOfLocation.some((room) => room.id === selection.roomId)
    ? selection.roomId
    : (roomsOfLocation[0]?.id ?? '');

  return {
    locations,
    rooms: roomsOfLocation,
    locationId,
    roomId,
    date: selection.date,
    isLoadingFilters: filtersQuery.isLoading,
    filtersError: filtersQuery.error,
    refetchFilters: filtersQuery.refetch,
    selectLocation: (id: number) => setSelection((previous) => ({ ...previous, locationId: id, roomId: '' })),
    selectRoom: (id: number) => setSelection((previous) => ({ ...previous, roomId: id })),
    selectDate: (date: Dayjs | null) => setSelection((previous) => ({ ...previous, date })),
    clearFilters: () => setSelection(EMPTY_SELECTION)
  };
};