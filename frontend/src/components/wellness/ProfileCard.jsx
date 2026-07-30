import React from 'react';
import SectionTitle from './SectionTitle';

export default function ProfileCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'blue',
  children,
  className = ''
}) {
  return (
    <div className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${className}`}>
      {/* Subtle background glow accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl pointer-events-none" />

      {title && (
        <SectionTitle
          icon={Icon}
          title={title}
          subtitle={subtitle}
          badge={badge}
          badgeColor={badgeColor}
        />
      )}

      <div>
        {children}
      </div>
    </div>
  );
}
