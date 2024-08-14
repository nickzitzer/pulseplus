import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Check if the user is an admin
  /*React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return <div>Access Denied</div>;
  }*/

  return <AdminDashboard />;
};

export default AdminPage;
