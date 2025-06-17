import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

interface FormData {
  fullName: string;
  email: string;
  password: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const registerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Send exactly the fields required by backend DTO - no roles during registration
      return await authApi.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        // Remove roles from registration - they'll be set during profile setup
      });
    },
    onSuccess: (data) => {
      console.log('Registration response:', data);
      
      // Store both tokens properly
      if (data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      } else {
        console.error('Missing tokens in registration response:', data);
      }
      
      // Set user data
      if (data.user) {
        setUser(data.user);
      }
      
      navigate('/profile-setup');
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || error.response?.data?.message || 'Registration failed');
      setIsSubmitting(false);
      console.error('Registration error:', error.response?.data);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormError('');
    if (!validatePassword()) {
      return;
    }
    setIsSubmitting(true);
    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePassword = () => {
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-blue-50 dark:bg-black transition-colors duration-200">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Logo size="sm" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Local Clubhouse</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-300">Already have an account?</span>
              <Link to="/login" className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex items-center justify-center py-12 w-full">
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
              Or{' '}
              <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
                sign in to your existing account
              </Link>
            </p>
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 p-4 mt-6 backdrop-blur-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          <form className="mt-8 space-y-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-8 rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="fullName" className="sr-only">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="fullName"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Personal or Business Name"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 px-1">
                  Examples: "Logan May" or "Traveling Chess Club"
                </p>
              </div>
              <div className="mt-3">
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {formError && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400 px-1">{formError}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By registering, you agree to our{' '}
                <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <footer className="bg-gray-100 dark:bg-gray-900 py-6 w-full transition-colors duration-200">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-300">
          <p>&copy; {new Date().getFullYear()} Local Clubhouse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage; 