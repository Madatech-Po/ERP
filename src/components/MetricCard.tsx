import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  currency?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'amber' | 'indigo' | 'slate';
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  currency = '',
  icon: Icon,
  color,
  description
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100/50',
      glow: 'shadow-blue-50/40',
      iconBg: 'bg-blue-600'
    },
    green: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100/50',
      glow: 'shadow-emerald-50/40',
      iconBg: 'bg-emerald-600'
    },
    red: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100/50',
      glow: 'shadow-rose-50/40',
      iconBg: 'bg-rose-600'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100/50',
      glow: 'shadow-amber-50/40',
      iconBg: 'bg-amber-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100/50',
      glow: 'shadow-indigo-50/40',
      iconBg: 'bg-indigo-600'
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-100/50',
      glow: 'shadow-slate-50/40',
      iconBg: 'bg-slate-600'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-between group`}>
      <div className="space-y-2">
        <span className="text-slate-400 text-sm font-semibold">{title}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
          </span>
          {currency && (
            <span className="text-sm font-bold text-slate-400 font-tajawal">{currency}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-400 font-medium">{description}</p>
        )}
      </div>

      <div className={`w-12 h-12 rounded-2xl ${scheme.bg} flex items-center justify-center text-slate-600 transition-all duration-300 group-hover:scale-110 shadow-sm ${scheme.text}`}>
        <Icon size={22} className="stroke-[2]" />
      </div>
    </div>
  );
};
export default MetricCard;
