'use client';

import React from 'react';

export interface PageTemplateProps {
  children: React.ReactNode;
  /** Wrap content in a centered white card (like the login card) */
  card?: boolean;
  /** Max width when using card: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  cardSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Extra class for the card */
  cardClassName?: string;
  /** Extra class for the outer wrapper */
  className?: string;
}

const cardMaxWidth = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export default function PageTemplate({
  children,
  card = false,
  cardSize = 'md',
  cardClassName = '',
  className = '',
}: PageTemplateProps) {
  if (!card) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 py-8 ${className}`}>
      <div
        className={`w-full ${cardMaxWidth[cardSize]} bg-white rounded-2xl shadow-xl p-6 sm:p-8 ${cardClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
