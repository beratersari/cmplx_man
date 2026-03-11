'use client';

import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ 
  tabs, 
  activeTab,
  onTabChange 
}) => {
  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className="w-full">
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTabContent}
      </div>
    </div>
  );
};

export default DashboardTabs;
