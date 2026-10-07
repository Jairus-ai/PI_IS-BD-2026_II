// src/router/AppRouter.tsx
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import App from '../App';
import LogIn from '../modules/auth/pages/LogIn';
import RequireSession from '../components/common/RequireSession';
import { WORKER_ROLES } from '../context/SessionContext';

const router = createHashRouter([
  {
    path: '/',
    Component: App,
  },
  {
    path: '/register',
    Component: ClientSignUp,
  },
  {
    path: '/login',
    Component: LogIn,
  },
  {
    element: (
      <RequireSession allowedRoles={WORKER_ROLES}>
        <DashboardLayout />
      </RequireSession>
    ),
    children: [
      {
        path: '/movies',
        Component: MovieList,
      },
      {
        path: '/discounts',
        Component: DiscountList,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

