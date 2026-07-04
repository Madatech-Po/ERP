import React, { useEffect, useState } from 'react';
import { Calendar, Database, DatabaseZap } from 'lucide-react';
import { dbService, Settings } from '../services/db';
import { isMock } from '../supabaseClient';

export const Header: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({ store_name: 'مدير المحل', currency: 'ج.م', low_stock_alert: 5.0 });
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // Load store settings
    const loadSettings = async () => {
      try {
        const data = await dbService.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load header settings:', err);
      }
    };
    loadSettings();

    // Format Arabic Date
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setFormattedDate(new Date().toLocaleDateString('ar-EG', options));
  }, []);

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
      {/* Right side: Store Name & Date */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-tajawal">{settings.store_name}</h2>
          <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
            <Calendar size={14} />
            <span className="font-medium">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Left side: Connection Badge */}
      <div className="flex items-center gap-4">
        {isMock ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-xs font-semibold shadow-sm animate-pulse">
            <Database size={14} className="stroke-[2.5]" />
            <span>بيئة تجريبية (محلية)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-semibold shadow-sm">
            <DatabaseZap size={14} className="stroke-[2.5]" />
            <span>متصل بـ Supabase</span>
          </div>
        )}
      </div>
    </header>
  );
};
export default Header;
