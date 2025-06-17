import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8', 
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { resolvedTheme } = useTheme();
  
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <img
        src="/images/LogoImage.svg"
        alt="Local Clubhouse Logo"
        className={`w-full h-full object-contain transition-all duration-200 ${
          resolvedTheme === 'dark' 
            ? 'brightness-0 invert' // Makes black logo white in dark mode
            : 'brightness-100' // Keeps logo black in light mode
        }`}
      />
    </div>
  );
};

export default Logo; 