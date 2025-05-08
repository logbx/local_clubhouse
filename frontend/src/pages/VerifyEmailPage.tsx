import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';

const VerifyEmailPage = () => {
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const verifyEmail = async () => {
      // Extract token from URL query parameters
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (!token) {
        setError('Missing verification token. Please use the link provided in the email.');
        setVerificationStatus('failed');
        return;
      }

      try {
        await api.post('/auth/verify-email', { token });
        setVerificationStatus('success');
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Email verification failed');
        setVerificationStatus('failed');
      }
    };

    verifyEmail();
  }, [location]);

  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verifying your email</h2>
          <div className="mt-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
            <p className="mt-4 text-gray-600">This may take a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Email Verified</h2>
            <div className="mt-2 text-center text-sm text-gray-600">
              Your email has been successfully verified.
            </div>
          </div>
          
          <div className="rounded-md bg-green-50 p-4 mt-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Email verification successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your email has been verified and your account is now fully activated.</p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <Link to="/login" className="mr-3 bg-green-50 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 hover:bg-green-100">
                      Go to login
                    </Link>
                    <Link to="/dashboard" className="bg-green-50 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 hover:bg-green-100">
                      Go to dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification failed
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verification Failed</h2>
          <div className="mt-2 text-center text-sm text-gray-600">
            We encountered a problem verifying your email.
          </div>
        </div>
        
        <div className="rounded-md bg-red-50 p-4 mt-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Email verification failed</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'The verification link may be invalid or expired.'}</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link to="/login" className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100">
                    Return to login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage; 