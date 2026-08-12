import React from 'react';
import { LifeBuoy } from 'lucide-react';

const FloatingSupportButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3">
      {/* Tooltip Label */}
      <div className="bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 dark:border-slate-600 relative">
        <span>Customer Support</span>
        <div className="absolute -bottom-1 right-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 dark:border-t-slate-700" />
      </div>

      <button
        onClick={onClick}
        className="relative p-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg shadow-slate-900/20 dark:shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
        title="Customer Support"
        aria-label="Open Customer Support"
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" style={{ animationDuration: '2.5s' }} />
        <LifeBuoy className="w-6 h-6 relative" />
      </button>
    </div>
  );
};

export default FloatingSupportButton;
