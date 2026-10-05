import { createContext } from 'react';

export interface SessionUser {
  idClient: number;
  email: string;
  firstName: string;
  firstSurname: string;
}

export interface SessionContextValue {
  user: SessionUser | null;
  isLoggedIn: boolean;
  startSession: (user: SessionUser) => void;
  endSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export default SessionContext;
