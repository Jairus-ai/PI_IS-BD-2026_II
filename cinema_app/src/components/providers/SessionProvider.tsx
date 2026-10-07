import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SessionContext, { type SessionUser } from '../../context/SessionContext';
import { getCurrentUser } from '../../modules/auth/services/authService';

export default function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const startSession = useCallback((sessionUser: SessionUser) => {
    setUser(sessionUser);
  }, []);

  const endSession = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then(({ data }) => isActive && startSession(data))
      .catch(() => isActive && endSession())
      .finally(() => isActive && setIsCheckingSession(false));

    return () => {
      isActive = false;
    };
  }, [startSession, endSession]);

  const value = useMemo(
    () => ({ user, isLoggedIn: user !== null, isCheckingSession, startSession, endSession }),
    [user, isCheckingSession, startSession, endSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
