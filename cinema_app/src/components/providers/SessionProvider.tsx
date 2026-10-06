import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SessionContext, { type SessionUser } from '../../context/SessionContext';
import { getCurrentUser } from '../../modules/auth/services/authService';

const SESSION_USER_KEY = 'session_user';

function readStoredUser(): SessionUser | null {
  try {
    const storedUser = sessionStorage.getItem(SESSION_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredUser);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const startSession = useCallback((sessionUser: SessionUser) => {
    setUser(sessionUser);
    try {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
    } catch {
      // The session still works for this page even if the browser blocks storage
    }
  }, []);

  const endSession = useCallback(() => {
    setUser(null);
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // Nothing to clean if the browser blocks storage
    }
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
