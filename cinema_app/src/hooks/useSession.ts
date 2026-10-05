import { useContext } from 'react';
import SessionContext, { type SessionContextValue } from '../context/SessionContext';

export default function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('Session context was used without a provider.');
  }
  return session;
}
