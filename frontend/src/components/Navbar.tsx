import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, logout } = useAuth();
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
    <header className="bg-white shadow sticky top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link to={user ? "/dashboard" : "/"} className="-m-1.5 p-1.5">
            <span className="text-2xl font-bold text-primary-600">Local Clubhouse</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
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
          <Link to="/" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
            Home
          </Link>
          <Link to="/features" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
            Features
          </Link>
          <Link to="/friends" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
            Friends
          </Link>
          <Link to="/about" className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600">
            About
          </Link>
        </div>

        {/* Desktop user menu */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-sm font-semibold leading-6 text-gray-900"
              >
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
                <span>{user.fullName}</span>
              </button>

              {/* Desktop dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/friends"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Friends
                  </Link>
                  <Link
                    to="/events"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Events
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  <Link
                    to="/messages"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Messages
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
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
        <div className="lg:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              to="/"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              to="/features"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              Features
            </Link>
            <Link
              to="/friends"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              Friends
            </Link>
            <Link
              to="/about"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
            >
              About
            </Link>
          </div>

          {user ? (
            <div className="border-t border-gray-200 pb-3 pt-4">
              <div className="flex items-center px-4">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                )}
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.fullName}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <Link
                  to="/dashboard"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Dashboard
                </Link>
                <Link
                  to="/friends"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Friends
                </Link>
                <Link
                  to="/events"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Events
                </Link>
                <Link
                  to="/profile"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Settings
                </Link>
                <Link
                  to="/messages"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Messages
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 py-4 px-4 space-y-3">
              <Link
                to="/login"
                className="block w-full text-center btn btn-secondary"
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