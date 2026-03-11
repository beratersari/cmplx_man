'use client';

import { ReactNode } from 'react';

interface LoginTemplateProps {
  children: ReactNode;
}

const LoginTemplate: React.FC<LoginTemplateProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Apartment Management
          </h1>
          <h2 className="mt-2 text-xl text-gray-600">
            Admin Portal
          </h2>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Apartment Management System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginTemplate;
