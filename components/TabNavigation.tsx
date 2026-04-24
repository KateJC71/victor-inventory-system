import React from 'react';
import { TabId } from '../types';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

type Tab = { id: TabId; label: string; icon: React.ReactNode };

// Simple custom SVG icons (stroke-based, consistent with mockup)
const IconSearch = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
);
const IconModel = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10"/>
  </svg>
);
const IconCategory = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.5"/>
    <rect x="13" y="4" width="7" height="7" rx="1.5"/>
    <rect x="4" y="13" width="7" height="7" rx="1.5"/>
    <rect x="13" y="13" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconFilter = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12M10 18h4"/>
  </svg>
);
const IconManage = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconUpload = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12"/>
  </svg>
);

const TABS: Tab[] = [
  { id: 'single',   label: '検索',     icon: <IconSearch /> },
  { id: 'model',    label: 'Model',    icon: <IconModel /> },
  { id: 'category', label: 'カテゴリ', icon: <IconCategory /> },
  { id: 'filter',   label: '条件',     icon: <IconFilter /> },
  { id: 'manage',   label: '管理',     icon: <IconManage /> },
  { id: 'upload',   label: '更新',     icon: <IconUpload /> },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-10">
          <button onClick={() => onTabChange('single')} className="text-left">
            <div className="text-[11px] tracking-[0.22em] text-stone-500 font-bold">VICTOR</div>
            <div className="text-[20px] font-extrabold tracking-tight leading-none mt-0.5">在庫検索システム</div>
          </button>
          <nav className="flex items-center gap-1" aria-label="メインナビゲーション">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`nav-link ${activeTab === tab.id ? 'nav-link-active' : ''}`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile top title bar (simple, no tabs — tabs go to bottom) */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-100">
        <div className="px-5 py-3">
          <div className="text-[11px] tracking-[0.2em] text-stone-500 text-center font-bold">VICTOR</div>
          <div className="text-[17px] font-extrabold text-center tracking-tight">在庫検索システム</div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-stone-200 bg-white"
        aria-label="メインナビゲーション"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
