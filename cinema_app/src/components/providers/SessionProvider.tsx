import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import SessionContext, { type SessionUser } from '../../context/SessionContext';
import { getCurrentUser } from '../../modules/auth/services/authService';
import { api } from '../../services/api';
import {
  isSessionExpiredError,
  redirectToLogin
} from '../../services/sessionExpiration';

export default function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const userRef = useRef<SessionUser | null>(null);

  userRef.current = user;

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

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (userRef.current && isSessionExpiredError(error)) {
          userRef.current = null;
          redirectToLogin(error);
        }

        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  const value = useMemo(
    () => ({ user, isLoggedIn: user !== null, isCheckingSession, startSession, endSession }),
    [user, isCheckingSession, startSession, endSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
