import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Receipt,
  FileBarChart,
  Settings as SettingsIcon,
  CalendarCheck,
  Building2
} from 'lucide-react';

interface SidebarProps {
  onOpenEndOfDay: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenEndOfDay }) => {
  const menuItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'المنتجات', path: '/products', icon: Package },
    { name: 'التصنيفات', path: '/categories', icon: Tags },
    { name: 'الموردين', path: '/suppliers', icon: Users },
    { name: 'المشتريات', path: '/purchases', icon: ShoppingCart },
    { name: 'سداد الموردين', path: '/payments', icon: CreditCard },
    { name: 'تسجيل المبيعات اليومية', path: '/sales', icon: TrendingUp },
    { name: 'المصروفات', path: '/expenses', icon: Receipt },
    { name: 'إدارة الفروع', path: '/branches', icon: Building2 },
    { name: 'التقارير', path: '/reports', icon: FileBarChart },
    { name: 'الإعدادات', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="fixed top-0 right-0 h-screen w-64 bg-white border-l border-slate-100 flex flex-col z-30 shadow-[0_0_15px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="h-20 border-b border-slate-50 flex items-center px-6 gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
          <CalendarCheck size={22} className="stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-wide font-tajawal">مدير المحل</h1>
          <span className="text-xs text-slate-400 font-medium">ERP المتاجر البسيط</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <Icon size={18} className="stroke-[2]" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-50 bg-slate-50/50">
        <button
          onClick={onOpenEndOfDay}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 group transform active:scale-[0.98]"
        >
          <CalendarCheck size={18} className="stroke-[2.5] animate-pulse" />
          <span>إقفال اليوم</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
