import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomePath } from '../utils';

export default function PrivateRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children;
}
