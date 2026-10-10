import React from 'react';
import {
  Shield,
  Smartphone,
  Users,
  History,
  Settings,
  Bell,
  RefreshCw,
  ChevronDown,
  Layers,
  Menu,
  X,
  LayoutDashboard,
  Flag,
  LogOut,
  Building2
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
  currentUser?: { organisation_name: string; email: string } | null;
  onLogout?: () => void;
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
  currentUser,
  onLogout,
}: NavigationProps) {
  // Primary navigation items
  const primaryNav: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'brands', label: 'Brand Profile', icon: Building2, badge: brands.length },
    { id: 'social', label: 'Social Monitoring', icon: Users },
    { id: 'apps', label: 'App Monitoring', icon: Smartphone },
    { id: 'threats', label: 'Findings', icon: Flag, badge: alertCount > 0 ? alertCount : undefined },
  ];

  // Secondary navigation
  const secondaryNav: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const NavItem = ({ id, label, icon: Icon, badge }: { id: NavTab; label: string; icon: React.ElementType; badge?: number }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => {
          onTabChange(id);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-[#dcfce7] text-[#166534] border-l-4 border-[#16a34a]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-[#166534]' : 'text-slate-400'}`} />
          <span>{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isActive ? 'bg-[#166534] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">Rakshak</div>
              <div className="text-[10px] text-[#166534] font-semibold leading-none">Digital Brand Protection</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Brand Selector */}
        {brands.length > 0 && (
          <div className="p-4 border-b border-slate-100 bg-[#f8fafb]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Active Brand
            </label>
            <div className="relative">
              <select
                value={activeBrand?.id || ''}
                onChange={(e) => {
                  const found = brands.find((b) => b.id === Number(e.target.value));
                  if (found) onSelectBrand(found);
                }}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]/20"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 mb-2">
            Monitoring
          </div>
          {primaryNav.map((item) => (
            <NavItem key={item.id} {...item} />
          ))}

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3.5 mt-5 mb-2">
            Settings
          </div>
          {secondaryNav.map((item) => (
            <NavItem key={item.id} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-[#f8fafb] space-y-3">
          {/* Engine status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Detection Engine</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-bold text-slate-600">
                {backendHealthy ? 'Online' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* User info + logout */}
          {currentUser && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{currentUser.organisation_name}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-red-50 transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:ml-64 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {[...primaryNav, ...secondaryNav].find((n) => n.id === activeTab)?.label}
            </h1>
            {activeBrand && (
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Monitoring: <span className="font-semibold text-slate-700">{activeBrand.name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Alert bell */}
          <button
            onClick={() => onTabChange('threats')}
            className="relative p-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
            title="View Findings"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#166534] text-white font-bold text-xs flex items-center justify-center">
              {currentUser?.organisation_name?.charAt(0)?.toUpperCase() || 'R'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-900 max-w-[120px] truncate">
                {currentUser?.organisation_name || 'Rakshak'}
              </div>
              <div className="text-[10px] text-slate-500">Brand Owner</div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
