import useSession from '../../hooks/useSession';
import { ROLES } from '../../context/SessionContext';
import ClientLayout from './ClientLayout';
import DashboardLayout from './DashboardLayout';

//workers see the sidebar, clients do not
export default function RoleLayout() {
  const { user } = useSession();
  return user?.role === ROLES.CLIENT ? <ClientLayout /> : <DashboardLayout />;
}
