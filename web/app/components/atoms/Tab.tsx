'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ children, active = false, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${active 
            ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }
          ${className}
        `}
        role="tab"
        aria-selected={active}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Tab.displayName = 'Tab';

export default Tab;
