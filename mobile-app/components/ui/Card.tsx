import { View, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface CardProps extends ViewProps {
  variant?: 'default' | 'outline';
  children: React.ReactNode;
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-lg p-4',
        variant === 'default' && 'bg-white shadow-sm dark:bg-gray-900',
        variant === 'outline' && 'border border-gray-200 dark:border-gray-800',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}