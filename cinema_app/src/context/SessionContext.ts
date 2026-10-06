import { createContext } from 'react';

export const ROLES = {
  CLIENT: 'CLIENT',
  SUPERUSER: 'SUPERUSER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  EMPLOYEE: 'EMPLOYEE'
} as const;

export const WORKER_ROLES = [ROLES.SUPERUSER, ROLES.ADMINISTRATOR, ROLES.EMPLOYEE];

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface SessionUser {
  id: number;
  role: Role;
  email: string;
  firstName: string;
  firstSurname: string;
}

export interface SessionContextValue {
  user: SessionUser | null;
  isLoggedIn: boolean;
  isCheckingSession: boolean;
  startSession: (user: SessionUser) => void;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export default SessionContext;
