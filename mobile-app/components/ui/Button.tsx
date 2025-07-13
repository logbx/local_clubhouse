import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cn } from '@/utils/cn';
import { forwardRef } from 'react';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<TouchableOpacity, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-600 active:bg-primary-700',
      secondary: 'bg-secondary-600 active:bg-secondary-700',
      outline: 'border border-gray-300 bg-transparent active:bg-gray-50 dark:border-gray-700 dark:active:bg-gray-800',
      ghost: 'bg-transparent active:bg-gray-100 dark:active:bg-gray-800',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    const textColors = {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-gray-900 dark:text-gray-100',
      ghost: 'text-gray-900 dark:text-gray-100',
    };

    return (
      <TouchableOpacity
        ref={ref}
        className={cn(
          'flex-row items-center justify-center rounded-md transition-colors',
          variants[variant],
          sizes[size],
          (disabled || loading) && 'opacity-50',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' || variant === 'secondary' ? '#fff' : '#000'} 
          />
        ) : (
          typeof children === 'string' ? (
            <Text className={cn('font-medium', textColors[variant])}>
              {children}
            </Text>
          ) : children
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';