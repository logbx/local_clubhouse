import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow sticky top-0 z-50 transition-colors duration-200">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link to={user ? "/dashboard" : "/"} className="-m-1.5 p-1.5 flex items-center space-x-2">
            <Logo size="md" />
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400 transition-colors duration-200">
              Local Clubhouse
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
          {/* Navigation links removed as requested */}
        </div>

        {/* Desktop user menu */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              {/* Notification Dropdown */}
              <NotificationDropdown />
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username || user.fullName || user.email} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  )}
                  <span>{user.username || user.fullName || user.email}</span>
                </button>

                {/* Desktop dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 transition-colors duration-200">
                    <Link
                      to="/social"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Social
                    </Link>
                    <Link
                      to="/clubs"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Clubs
                    </Link>
                    <Link
                      to="/events"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Events
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-900 transition-colors duration-200">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {/* Navigation links removed as requested */}
          </div>

          {user ? (
            <div className="border-t border-gray-200 dark:border-gray-700 pb-3 pt-4 transition-colors duration-200">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.username || user.fullName || user.email} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800 dark:text-gray-200">{user.username || user.fullName || user.email}</div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
                {/* Mobile Notification */}
                <NotificationDropdown />
              </div>
              <div className="mt-3 space-y-1 px-2">
                <Link
                  to="/social"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Social
                </Link>
                <Link
                  to="/clubs"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Clubs
                </Link>
                <Link
                  to="/events"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Events
                </Link>
                <Link
                  to="/profile"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-700 py-4 px-4 space-y-3 transition-colors duration-200">
              <Link
                to="/login"
                className="block w-full text-center btn btn-secondary dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="block w-full text-center btn btn-primary"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
} 