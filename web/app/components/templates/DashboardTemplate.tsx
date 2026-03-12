'use client';

import { ReactNode, useState } from 'react';
import Header from '../organisms/Header';
import DashboardSidebar from '../organisms/DashboardSidebar';

interface DashboardTemplateProps {
  children: ReactNode;
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={onTabChange || (() => {})}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardTemplate;
