import React from 'react';
import { 
  ShieldAlert, 
  Smartphone, 
  Users, 
  History, 
  Settings, 
  Search, 
  Bell, 
  RefreshCw, 
  ChevronDown, 
  CheckCircle2, 
  Layers,
  Menu,
  X,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Brand } from '../types';

export type NavTab = 
  | 'overview' 
  | 'brands' 
  | 'social' 
  | 'apps' 
  | 'threats' 
  | 'history' 
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  brands: Brand[];
  activeBrand: Brand | null;
  onSelectBrand: (brand: Brand) => void;
  onRefresh: () => void;
  backendHealthy: boolean;
  alertCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Navigation({
  activeTab,
  onTabChange,
  brands,
  activeBrand,
  onSelectBrand,
  onRefresh,
  backendHealthy,
  alertCount,
  sidebarOpen,
  setSidebarOpen,
}: NavigationProps) {
  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'brands', label: 'Brand Profiles', icon: ShieldAlert, badge: brands.length },
    { id: 'social', label: 'Social Monitoring', icon: Users },
    { id: 'apps', label: 'App Monitoring', icon: Smartphone },
    { id: 'threats', label: 'Threat Center', icon: ShieldAlert, badge: alertCount },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#DC2626] text-white flex items-center justify-center font-black tracking-wider shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950">RedShield</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#991B1B] px-1.5 py-0.5 rounded">DRP</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Digital Risk Protection</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Brand Target Selector */}
        <div className="p-4 border-b border-slate-100 bg-[#F8FAFC]">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Monitored Brand Scope
          </label>
          <div className="relative">
            <select
              value={activeBrand?.id || ''}
              onChange={(e) => {
                const found = brands.find((b) => b.id === Number(e.target.value));
                if (found) onSelectBrand(found);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.official_assets?.length || 0} assets)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-red-50 text-[#DC2626] border-l-4 border-[#DC2626]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#DC2626]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Engine Status Footer */}
        <div className="p-4 border-t border-slate-200 bg-[#F8FAFC]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detection Engine</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[11px] font-bold text-slate-700">
                {backendHealthy ? 'Online' : 'Mock Mode'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded p-2">
            RapidFuzz • NFKC • dHash v2.1
          </div>
        </div>
      </aside>

      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 lg:ml-64 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Target Scope: <span className="font-semibold text-slate-700">{activeBrand?.name || 'All'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Intelligence Data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sync Feeds</span>
          </button>

          {/* Alert Notification Indicator */}
          <button
            onClick={() => onTabChange('threats')}
            className="relative p-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>

          {/* User/Org Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              RS
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-900">SOC Level-2</div>
              <div className="text-[10px] text-slate-500">Security Analyst</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
