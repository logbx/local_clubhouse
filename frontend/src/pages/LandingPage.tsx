import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black transition-colors duration-200">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Logo size="sm" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Clubhouse®</span>
            </div>
            <div className="flex items-center">
              <Link 
                to="/login" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                    Sign In
                  </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col">
        <div className="container mx-auto px-4 max-w-7xl py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8">
              Every community is unique.
              </h1>
            <h2 className="text-4xl md:text-5xl font-normal text-gray-500 dark:text-gray-400 mb-12">
              Your platform should be too.
            </h2>
            <Link 
              to="/register" 
              className="inline-block bg-black dark:bg-white text-white dark:text-black text-lg px-8 py-4 rounded-full font-medium hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
            >
              Start your community
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-8 md:px-16 lg:px-24 max-w-7xl py-8">
          {/* First Feature */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-16">
            <div className="md:w-[450px] md:pr-16">
              <h3 className="text-4xl font-bold text-white mb-4">
                Adaptive features
              </h3>
              <p className="text-lg text-[#71717A]">
                Tools created for your community—chess clubs, fitness, hobby groups, and more.
              </p>
            </div>
            <div className="md:w-[450px] mt-12 md:mt-0">
              <div className="bg-[#1a1b1e] rounded-3xl aspect-square w-full overflow-hidden p-6">
                <div className="bg-[#25262b] rounded-xl p-6 h-full">
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <h4 className="text-white text-xl font-semibold mb-1">Swiss 13 Tournament</h4>
                      <p className="text-gray-400 text-sm">Swiss Tournament Management</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#2c2d31] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-2">Players</p>
                        <p className="text-white text-xl font-semibold">8 / 8</p>
                      </div>
                      <div className="bg-[#2c2d31] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-2">Status</p>
                        <p className="text-white text-xl font-semibold">Finished</p>
                      </div>
                      <div className="bg-[#2c2d31] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-2">Current Round</p>
                        <p className="text-white text-xl font-semibold">3 / 3</p>
                      </div>
                    </div>
                    <div className="bg-[#2c2d31] rounded-lg p-6 text-center flex-grow">
                      <div className="flex items-center justify-center mb-4">
                        <span className="text-4xl">🏆</span>
                      </div>
                      <h5 className="text-[#4aed88] text-xl font-semibold mb-2">TOURNAMENT COMPLETE</h5>
                      <p className="text-gray-400 text-sm">Finished • 8 Players • 12 Matches</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Feature */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-16">
            <div className="md:w-[450px] mt-12 md:mt-0">
              <div className="rounded-[32px] aspect-square w-full overflow-hidden">
                <img 
                  src="/images/chess-community.jpg" 
                  alt="Chess community event at Jo Malone store" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:w-[450px] md:pl-16">
              <h3 className="text-4xl font-bold text-white mb-4">
                Connect locally
              </h3>
              <p className="text-lg text-[#71717A]">
                Find and join communities in your area. Connect with local businesses that want to work with you.
              </p>
            </div>
          </div>

          {/* Third Feature */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-16">
            <div className="md:w-[450px] md:pr-16">
              <h3 className="text-4xl font-bold text-white mb-4">
                Scale your impact
              </h3>
              <p className="text-lg text-[#71717A]">
                Grow membership, boost engagement, and expand your reach with smart analytics and proven growth strategies.
              </p>
            </div>
            <div className="md:w-[450px] mt-12 md:mt-0">
              <div className="rounded-[32px] aspect-square w-full overflow-hidden">
                <img 
                  src="/images/run-community.jpg" 
                  alt="Running community group" 
                  className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

          {/* Additional Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pt-24 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-900 dark:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Easy event planning</h4>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-900 dark:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Custom community page</h4>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-900 dark:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Get sponsored</h4>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-900 dark:text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Custom tools</h4>
            </div>
          </div>

          {/* Your community, your way section */}
          <div className="text-center mt-32 mb-24">
            <h2 className="text-5xl font-bold text-white mb-6">
              Your community, your way
            </h2>
            <p className="text-xl text-[#71717A] max-w-2xl mx-auto mb-12">
              Build, join, and grow unique local groups. Simple.
              <br />
              Adaptable. Inclusive.
            </p>
            <Link 
              to="/register" 
              className="inline-block bg-black text-white text-lg px-8 py-4 rounded-full font-medium border border-white/10 hover:bg-white hover:text-black transition-colors"
            >
              Find your people
            </Link>
        </div>
      
      {/* Footer */}
          <div className="border-t border-gray-800">
            <div className="container mx-auto px-8 py-12">
              <div className="flex flex-col md:flex-row justify-between items-start">
                {/* Logo and Company Name */}
                <div className="flex items-center space-x-2 mb-8 md:mb-0">
                  <Logo size="sm" />
                  <span className="text-lg text-white">Local Clubhouse LLC</span>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col md:flex-row gap-12">
                  {/* Platform Column */}
            <div>
                    <h3 className="text-white font-medium mb-4">Platform</h3>
                    <div className="flex flex-col space-y-3">
                      <Link to="/features" className="text-[#71717A] hover:text-white transition-colors">
                        Features
                      </Link>
                      <Link to="/about" className="text-[#71717A] hover:text-white transition-colors">
                        About
                      </Link>
              </div>
            </div>

                  {/* Resources Column */}
            <div>
                    <h3 className="text-white font-medium mb-4">Resources</h3>
                    <div className="flex flex-col space-y-3">
                      <Link to="/support" className="text-[#71717A] hover:text-white transition-colors">
                        Support
                      </Link>
                      <Link to="/faq" className="text-[#71717A] hover:text-white transition-colors">
                        FAQ
                      </Link>
                    </div>
                  </div>
            </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 