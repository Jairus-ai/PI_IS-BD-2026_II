// src/router/AppRouter.tsx
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import Mainpage from '../pages/Mainpage';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import App from '../App';

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
    Component: DashboardLayout,
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
  { // TODO(any): set up a page to handle an unknown route
    path: '*',
    Component: MovieList,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

