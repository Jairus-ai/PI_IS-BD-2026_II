// src/router/AppRouter.tsx
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import DiscountList from '../modules/discounts/pages/DiscountList';
import Mainpage from '../pages/Mainpage';
import DiscountShow from '../modules/discounts/pages/DiscountShow';

const router = createHashRouter([
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
      { 
        path: '/discounts/:discountId', 
        Component: DiscountShow 
      },
      {
        path: '*',
        Component: Mainpage //to simulate in the meanwhile. Obviously this has to be changed
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}