import { Navigate } from 'react-router-dom';
// EL CAMBIO ESTÁ AQUÍ: Agregamos "type" antes de { ReactNode }
import type { ReactNode } from 'react'; 

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // CAMBIO: Leemos de sessionStorage
  const isAuthenticated = sessionStorage.getItem('isAdmin') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};
export default ProtectedRoute;