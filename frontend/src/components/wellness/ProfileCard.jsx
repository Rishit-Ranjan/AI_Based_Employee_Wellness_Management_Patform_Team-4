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
    <div className={`bg-(--color-bg-card) dark:bg-(--color-bg-card-dark) rounded-2xl border border-(--color-border) dark:border-(--color-border-dark) p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${className}`}>
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
