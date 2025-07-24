import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinksProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

/**
 * Skip links component for keyboard navigation accessibility
 */
export const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#sidebar', label: 'Skip to sidebar' },
  ],
  className 
}) => {
  return (
    <div className={cn("skip-links", className)}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            // Initially hidden, visible on focus
            "absolute left-[-10000px] top-auto w-1 h-1 overflow-hidden",
            // When focused, make visible and styled
            "focus:left-2 focus:top-2 focus:w-auto focus:h-auto focus:overflow-visible",
            "focus:z-50 focus:px-4 focus:py-2 focus:rounded-md",
            "focus:bg-primary focus:text-primary-foreground",
            "focus:shadow-lg focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "transition-all duration-200",
            "text-sm font-medium",
            "no-underline"
          )}
          onClick={(e) => {
            // Smooth scroll to target
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target) {
              target.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
              // Focus the target if it's focusable
              if (target instanceof HTMLElement && target.tabIndex >= 0) {
                target.focus();
              }
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};