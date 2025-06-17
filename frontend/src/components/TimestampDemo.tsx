import React from 'react';
import { formatMessageTimestamp, formatConversationTimestamp, formatSimpleTime } from '../utils/formatTimestamp';

const TimestampDemo: React.FC = () => {
  const now = new Date();
  
  // Create sample timestamps
  const samples = [
    {
      label: 'Right now',
      timestamp: now.toISOString(),
    },
    {
      label: '2 hours ago',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: 'Yesterday evening',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: '3 days ago',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: '1 week ago',
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      label: '2 months ago',
      timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Smart Timestamp Formatting Demo
      </h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Message Timestamps */}
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Message Timestamps
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Smart formatting for message displays in chat windows
          </p>
          <div className="space-y-3">
            {samples.map((sample, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {sample.label}
                </span>
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  {formatMessageTimestamp(sample.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation List Timestamps */}
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Conversation List Timestamps
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Compact relative time for conversation lists
          </p>
          <div className="space-y-3">
            {samples.map((sample, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {sample.label}
                </span>
                <span className="text-sm font-mono text-green-600 dark:text-green-400">
                  {formatConversationTimestamp(sample.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Format Examples */}
      <div className="mt-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200/50 dark:border-gray-700/50">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Format Examples
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Today</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">13:42</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Yesterday</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Yesterday 09:11</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">2–7 days ago</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sun 10:11</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">More than 7 days ago</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">3 Jun 2025, 09:43</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Conversation list</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">2h, 1d, 3d, etc.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Simple time</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">14:30</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimestampDemo; 