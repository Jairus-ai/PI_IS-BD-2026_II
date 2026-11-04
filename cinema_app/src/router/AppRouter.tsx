// src/router/AppRouter.tsx
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import App from '../App';
import LogIn from '../modules/auth/pages/LogIn';
import {RequireSession} from '../components/common/RequireSession';
import { CLIENT_ROLES, MANAGER_ROLES, WORKER_ROLES } from '../context/SessionContext';
import UserList from '../modules/users/pages/UserList.jsx';
import ChangePassword from '../modules/auth/pages/ChangePassword';
import PasswordRecovery from '../modules/auth/pages/PasswordRecovery';
import FeeList from '../modules/fees/pages/FeeList';
import UserCreate from '../modules/users/pages/UserCreate';
import ShowSeats from '../modules/selectSeats/pages/selectSeats';
import ClientLayout from '../components/layout/ClientLayout';
import PurchaseHistory from '../modules/purchases/pages/PurchaseHistory';
import EmailConfirmation from '../modules/ticketBill/pages/EmailConfirmation.js'

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
  path: '/password-recovery',
    Component: PasswordRecovery,
  },
  {
    element: (
      <DashboardLayout />
    ),
    children: [
      {
        path:'/seats/:screeningId',
        Component: ShowSeats,
      }
    ],
  },
  {
    element: (
      <DashboardLayout />
    ),
    children: [
      {
        path:'/seats/:screeningId',
        Component: ShowSeats,
      }
    ],
  },
  {
  path: '/password-recovery',
    Component: PasswordRecovery,
  },
  {
    element: (
      <RequireSession>
        <ChangePassword />
      </RequireSession>
    ),
    path: '/change-password',
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
        path: '/users/create',
        Component: UserCreate,
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
    element: (
      <RequireSession allowedRoles={CLIENT_ROLES}>
        <ClientLayout />
      </RequireSession>
    ),
    children: [
      {
        path: '/purchase-history',
        Component: PurchaseHistory,
      },
      {
        path: '/purchaseConfirmationEmail',
        Component: EmailConfirmation
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