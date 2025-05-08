import { ReactNode } from 'react';
import Navbar from './Navbar';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-600 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Local Clubhouse. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-gray-600 hover:text-primary-600">Privacy Policy</a>
              <a href="/terms" className="text-gray-600 hover:text-primary-600">Terms of Service</a>
              <a href="/contact" className="text-gray-600 hover:text-primary-600">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 