import dayjs from 'dayjs';
import { ROLES, type Role } from '../../../context/SessionContext';

export interface ProfileLocation {
  id: number;
  name: string;
}

export interface Profile {
  email: string;
  identificationType: 'C' | 'P' | 'D';
  identificationNumber: string;
  phoneNumber: string;
  firstName: string;
  middleName: string;
  firstSurname: string;
  lastSurname: string;
  birthdate: string;
  role: Role;
  locations: ProfileLocation[] | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.CLIENT]: 'Cliente',
  [ROLES.EMPLOYEE]: 'Empleado',
  [ROLES.ADMINISTRATOR]: 'Administrador',
  [ROLES.SUPERUSER]: 'Superusuario'
};

export const IDENTIFICATION_LABELS: Record<Profile['identificationType'], string> = {
  C: 'Cédula',
  P: 'Pasaporte',
  D: 'DIMEX'
};

export const NO_LOCATIONS_MESSAGE = 'No tiene sucursales asignadas';

export function formatBirthdate(birthdate: string): string {
  return dayjs(birthdate).format('DD/MM/YYYY');
}

export function getLocationsLabel(profile: Profile): string {
  const locations = profile.locations ?? [];
  return locations.length > 0 ? locations.map((location) => location.name).join(', ') : NO_LOCATIONS_MESSAGE;
}
