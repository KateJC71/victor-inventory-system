
import React from 'react';
import { TabId } from '../types';
import { Search, List, Grid, UploadCloud, Settings, Filter } from 'lucide-react';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'single', label: '単品', icon: <Search size={18} /> },
    { id: 'model', label: 'Model', icon: <List size={18} /> },
    { id: 'category', label: 'カテゴリ', icon: <Grid size={18} /> },
    { id: 'filter', label: '条件', icon: <Filter size={18} /> },
    { id: 'manage', label: '管理', icon: <Settings size={18} /> },
    { id: 'upload', label: '更新', icon: <UploadCloud size={18} /> },
  ];

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center pt-2 pb-1">
          <button
            onClick={() => onTabChange('category')}
            className="text-xl font-bold tracking-tighter text-blue-900 hover:text-blue-700 transition-colors"
          >
            Victor 在庫検索システム
          </button>
        </div>
        <div className="flex w-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-3 min-w-[70px] outline-none transition-colors duration-200 relative
                ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
              `}
            >
              <div className="mb-1">{tab.icon}</div>
              <span className="text-sm font-medium leading-none uppercase tracking-wide">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
