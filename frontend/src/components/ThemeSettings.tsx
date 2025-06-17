import React from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: Array<{ value: Theme; label: string; icon: React.ReactNode; description: string }> = [
    {
      value: 'light',
      label: 'Light',
      icon: <SunIcon className="h-5 w-5" />,
      description: 'Light theme'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <MoonIcon className="h-5 w-5" />,
      description: 'Dark theme'
    },
    {
      value: 'system',
      label: 'System',
      icon: <ComputerDesktopIcon className="h-5 w-5" />,
      description: 'Use system preference'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Theme</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose your preferred theme or use your system setting
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`
              relative flex items-center space-x-3 rounded-lg border px-4 py-3 shadow-sm transition-all duration-200
              ${
                theme === themeOption.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
          >
            <div className={`
              flex-shrink-0 
              ${theme === themeOption.value 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-400 dark:text-gray-500'
              }
            `}>
              {themeOption.icon}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className={`
                text-sm font-medium 
                ${theme === themeOption.value 
                  ? 'text-primary-900 dark:text-primary-100' 
                  : 'text-gray-900 dark:text-gray-100'
                }
              `}>
                {themeOption.label}
              </div>
              <div className={`
                text-xs 
                ${theme === themeOption.value 
                  ? 'text-primary-700 dark:text-primary-300' 
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {themeOption.description}
              </div>
            </div>
            {theme === themeOption.value && (
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSettings; 