import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-9xl font-extrabold text-gray-900">404</h1>
          <p className="text-2xl font-medium text-gray-600 mt-4">Page Not Found</p>
          <p className="text-gray-500 mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="mt-6">
          <Link 
            to="/dashboard" 
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 