import { useEffect } from 'react';
import { isAxiosError } from 'axios';
import { api } from '../../services/api';
import useNotifications from '../../hooks/useNotifications';

const CONNECTION_ERROR_MESSAGE = 'Ocurrió un error de conexión. Revise su conexión de red y vuelva a intentar más tarde';
const CONNECTION_ERROR_KEY = 'connection-error';

function isConnectionError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

export default function ConnectionErrorNotifier() {
  const notifications = useNotifications();

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (isConnectionError(error)) {
          notifications.show(CONNECTION_ERROR_MESSAGE, {
            key: CONNECTION_ERROR_KEY,
            severity: 'warning',
            autoHideDuration: 5000
          });
        }

        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, [notifications]);

  return null;
}
