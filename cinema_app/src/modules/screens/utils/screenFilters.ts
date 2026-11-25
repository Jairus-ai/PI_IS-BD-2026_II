import { SCREEN_TYPE_LABELS, type Screen, type ScreenType } from '../types/screens';

export interface ScreenFilters {
  name: string;
  locationId: number | '';
  type: ScreenType | '';
}

export interface FilterOption<T> {
  value: T;
  label: string;
}

export const EMPTY_SCREEN_FILTERS: ScreenFilters = { name: '', locationId: '', type: '' };

export const SCREEN_TYPE_OPTIONS: FilterOption<ScreenType>[] = (Object.keys(SCREEN_TYPE_LABELS) as ScreenType[])
  .map((type) => ({ value: type, label: SCREEN_TYPE_LABELS[type] }));

export function matchesScreenFilters(screen: Screen, filters: ScreenFilters): boolean {
  const matchesName = filters.name === '' || screen.SCREEN_NAME === filters.name;
  const matchesLocation = filters.locationId === '' || screen.ID_LOCATION === filters.locationId;
  const matchesType = filters.type === '' || screen.SCREEN_TYPE === filters.type;
  return matchesName && matchesLocation && matchesType;
}

export function getScreenNameOptions(screens: Screen[]): FilterOption<string>[] {
  return [...new Set(screens.map((screen) => screen.SCREEN_NAME))]
    .sort((first, second) => first.localeCompare(second))
    .map((name) => ({ value: name, label: name }));
}

export function getLocationOptions(screens: Screen[]): FilterOption<number>[] {
  const locations = new Map<number, string>();
  for (const screen of screens) {
    locations.set(screen.ID_LOCATION, screen.LOCATION_NAME);
  }
  return [...locations.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label));
}
