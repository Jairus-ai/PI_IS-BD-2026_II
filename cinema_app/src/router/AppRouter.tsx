// src/router/AppRouter.tsx
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import Mainpage from '../pages/Mainpage';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';
import DiscountList from '../modules/discounts/pages/DiscountList';
import App from '../App';
import DiscountShow from '../modules/discounts/pages/DiscountShow';

const router = createHashRouter([
  {
    path: '/',
    Component: Mainpage,
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
        path: '*',
        Component: MovieList,
      },
      { 
        path: '/discounts/:discountId', 
        Component: DiscountShow 
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
