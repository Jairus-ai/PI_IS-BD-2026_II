// src/router/AppRouter.tsx
import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import MovieList from '../modules/movies/pages/MovieList';
import Mainpage from '../pages/Mainpage';
import ClientSignUp from '../modules/clients/pages/ClientSignUp';

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
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
