import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import cinemaTheme from './shared-theme/cinemaTheme';
import NotificationsProvider from './components/providers/NotificationsProvider';
import DialogsProvider from './components/providers/DialogsProvider';
import SessionProvider from './components/providers/SessionProvider';
import AppRouter from './router/AppRouter';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={cinemaTheme}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <NotificationsProvider>
            <DialogsProvider>
              <AppRouter />
            </DialogsProvider>
          </NotificationsProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
