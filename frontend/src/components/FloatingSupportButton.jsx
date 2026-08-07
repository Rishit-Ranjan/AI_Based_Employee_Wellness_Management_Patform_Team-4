import React from 'react';
import { LifeBuoy } from 'lucide-react';

const FloatingSupportButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3">
      {/* Tooltip label */}
      <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        Customer Support
        <div className="absolute -bottom-1 right-7 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-slate-800" />
      </div>

      <button
        onClick={onClick}
        className="relative p-4 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-xl shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
        title="Customer Support"
        aria-label="Open Customer Support"
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" style={{ animationDuration: '2.5s' }} />
        <LifeBuoy className="w-6 h-6 relative" />
      </button>
    </div>
  );
};

export default FloatingSupportButton;

