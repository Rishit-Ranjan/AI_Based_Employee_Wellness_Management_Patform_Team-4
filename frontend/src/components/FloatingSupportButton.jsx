import React from 'react';
import { LifeBuoy } from 'lucide-react';

const FloatingSupportButton = ({ onClick }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[150]">
      <button
        onClick={onClick}
        className="group relative p-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg shadow-slate-900/20 dark:shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
        title="Customer Support"
        aria-label="Open Customer Support"
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" style={{ animationDuration: '2.5s' }} />
        <LifeBuoy className="w-6 h-6 relative" />

        {/* Tooltip Label */}
        <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 w-max bg-slate-900 dark:bg-slate-700 text-white dark:text-slate-100 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span>Customer Support</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 dark:border-t-slate-700" />
        </div>
      </button>
    </div>
  );
};

export default FloatingSupportButton;
