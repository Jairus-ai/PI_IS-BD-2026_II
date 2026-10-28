// src/router/AppRouter.tsx
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import App from '../App';
import LogIn from '../modules/auth/pages/LogIn';
import RequireSession from '../components/common/RequireSession';
import { MANAGER_ROLES, WORKER_ROLES } from '../context/SessionContext';
import UserList from '../modules/users/pages/UserList.jsx';
import FeeList from '../modules/fees/pages/FeeList';

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
      {
        path: '/users',
        Component: UserList,
      },
      {
        path: '/fees',
        element: (
          <RequireSession allowedRoles={MANAGER_ROLES}>
            <FeeList />
          </RequireSession>
        ),
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

