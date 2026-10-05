import { createHashRouter, RouterProvider } from 'react-router';

import App from '../App.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.tsx';
import UserList from '../modules/users/pages/UserList.jsx';

const router = createHashRouter([
  {
    path: '/',
    Component: App,
  },
  {
    Component: DashboardLayout,
    children: [
      {
        path: '/users',
        Component: UserList,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}