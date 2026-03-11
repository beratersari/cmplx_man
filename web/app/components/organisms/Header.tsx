'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Tab {
  id: string;
  label: string;
}

interface HeaderProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ tabs, activeTab, onTabChange }) => {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Apartment Management
            </h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
