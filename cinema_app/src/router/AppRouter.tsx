import { createHashRouter, RouterProvider } from 'react-router';
import DashboardLayout from '../components/layout/DashboardLayout';
import Mainpage from '../pages/Mainpage';
import DiscountList from '../modules/discounts/pages/DiscountList';

const router = createHashRouter([
  {
    path: '/',
    Component: Mainpage,
  },
  {
    Component: DashboardLayout,
    children: [
      {
        path: '*',
        Component: DiscountList,
      },
      { 
        path: '/discounts/', 
        Component: DiscountList 
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
