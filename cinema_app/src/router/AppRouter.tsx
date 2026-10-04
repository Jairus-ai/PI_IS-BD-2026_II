// src/router/AppRouter.tsx
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import DiscountList from '../modules/discounts/pages/DiscountList';

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
        path: '*',
        Component: MovieList,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
