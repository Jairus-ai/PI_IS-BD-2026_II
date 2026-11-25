// src/router/AppRouter.tsx
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import LocationList from '../modules/locations/pages/LocationList.js';
import SnackList from '../modules/snacks/pages/SnackList.js';
import App from '../App';
import LogIn from '../modules/auth/pages/LogIn';
import {RequireSession} from '../components/common/RequireSession';
import { CLIENT_ROLES, MANAGER_ROLES, WORKER_ROLES } from '../context/SessionContext';
import UserList from '../modules/users/pages/UserList.jsx';
import ChangePassword from '../modules/auth/pages/ChangePassword';
import PasswordRecovery from '../modules/auth/pages/PasswordRecovery';
import FeeList from '../modules/fees/pages/FeeList';
import ScreenList from '../modules/screens/pages/ScreenList';
import UserCreate from '../modules/users/pages/UserCreate';
import ShowSeats from '../modules/selectSeats/pages/selectSeats';
import ClientLayout from '../components/layout/ClientLayout';
import PurchaseHistory from '../modules/purchases/pages/PurchaseHistory';
import EmailConfirmation from '../modules/ticketBill/pages/EmailConfirmation.js'
import PaymentCheckout from '../modules/payments/pages/PaymentCheckout';
import PaymentResult from '../modules/payments/pages/PaymentResult';
import RoomDashboard from '../modules/roomDashboard/pages/RoomDashboard';
import MovieScreeningsPage from '../modules/screenings/pages/MovieScreeningsPage';
import ProfilePage from '../modules/profile/pages/ProfilePage';
import RoleLayout from '../components/layout/RoleLayout';
import MovieInBillboardList from '../modules/moviesInBillboards/pages/MovieInBillboardList';

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
      <RequireSession allowedRoles={CLIENT_ROLES} allowGuests>
        <ClientLayout />
      </RequireSession>
    ),
    children: [
      {
        path:'/seats/:screeningId',
        Component: ShowSeats,
      },
      {
        path: '/movies/:idMovie',
        Component: MovieScreeningsPage,
      },
    ],
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
        path: '/snacks',
        Component: SnackList,
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
        path: '/locations',
        Component : LocationList,
      },
      {
        path: '/fees',
        element: (
          <RequireSession allowedRoles={MANAGER_ROLES}>
            <FeeList />
          </RequireSession>
        ),
      },
      {
        path: '/screens',
        element: (
          <RequireSession allowedRoles={MANAGER_ROLES}>
            <ScreenList />
          </RequireSession>
        ),
      },
      {
        path: '/movies-in-billboards',
        element: (
          <RequireSession allowedRoles={MANAGER_ROLES}>
            <MovieInBillboardList />
          </RequireSession>
        ),
      },
      {
        path: '/room-dashboard',
        Component: RoomDashboard,
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
      {
        path: '/payment',
        Component: PaymentCheckout
      },
      {
        path: '/payment/success',
        element: <PaymentResult success />
      },
      {
        path: '/payment/cancel',
        element: <PaymentResult success={false} />
      },
    ],
  },
  {
    element: (
      <RequireSession>
        <RoleLayout />
      </RequireSession>
    ),
    children: [
      {
        path: '/profile',
        Component: ProfilePage,
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