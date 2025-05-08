import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { UserRole } from '../types/user';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles = [], children }) => {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const token = localStorage.getItem('accessToken');

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs to complete profile setup
  if (location.pathname !== '/profile-setup' && !user.profileCompleted) {
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