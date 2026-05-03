import React from 'react';
import { ProfessionStyle } from './cardStyles';

interface ProfessionIconBadgeProps {
  style: ProfessionStyle;
}

const ProfessionIconBadge: React.FC<ProfessionIconBadgeProps> = ({ style }) => {
  if (style.isRainbow) {
    return (
      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg animate-[spin_3s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
            padding: '2px'
          }}
        />
        <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
        <svg className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="rainbowMoonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#eab308" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="url(#rainbowMoonGradient)" />
        </svg>
      </div>
    );
  }

  const Icon = style.icon;
  return (
    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg ${style.bg} border-2 ${style.border} flex items-center justify-center shadow-lg`}>
      <Icon size={22} className="text-white drop-shadow-md" />
    </div>
  );
};

export default ProfessionIconBadge;
