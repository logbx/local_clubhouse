import React, { useEffect } from 'react';
import { Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { UserRole } from '../types/user';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles = [], children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      console.log('No user found, redirecting to login');
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  // Update this condition to check for profileCompleted === false
  if (location.pathname !== '/profile-setup' && user.profileCompleted === false) {
    console.log('Redirecting to profile setup. Current user:', user);
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  // If roles are required, check if user has at least one of the required roles
  if (requiredRoles.length > 0 && (!user.roles || !requiredRoles.some(role => user.roles.includes(role)))) {
    console.log('User lacks required roles. Current roles:', user.roles);
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // If on profile setup page but profile is already completed, redirect to dashboard
  if (location.pathname === '/profile-setup' && user.profileCompleted) {
    console.log('User already completed profile setup, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Log the current state before rendering
  console.log('Rendering protected route:', {
    path: location.pathname,
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      profileCompleted: user.profileCompleted
    }
  });

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute; 