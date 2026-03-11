'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface SummaryCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
  loading?: boolean;
}

const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(
  ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = 'blue', 
    loading = false,
    className = '',
    ...props 
  }, ref) => {
    const colorStyles = {
      blue: 'bg-blue-50 text-blue-700',
      green: 'bg-green-50 text-green-700',
      purple: 'bg-purple-50 text-purple-700',
      orange: 'bg-orange-50 text-orange-700',
      red: 'bg-red-50 text-red-700',
      teal: 'bg-teal-50 text-teal-700',
    };

    const iconColorStyles = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      teal: 'bg-teal-100 text-teal-600',
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl shadow-sm border border-gray-100 p-6 bg-white ${className}`}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="mt-2 h-8 w-20 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className={`mt-2 text-3xl font-bold ${colorStyles[color].split(' ')[1]}`}>
                {value}
              </p>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`p-3 rounded-lg ${iconColorStyles[color]}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

SummaryCard.displayName = 'SummaryCard';

export default SummaryCard;
