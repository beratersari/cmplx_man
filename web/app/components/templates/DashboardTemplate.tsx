'use client';

import { ReactNode } from 'react';
import Header from '../organisms/Header';

interface Tab {
  id: string;
  label: string;
}

interface DashboardTemplateProps {
  children: ReactNode;
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  children,
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardTemplate;
