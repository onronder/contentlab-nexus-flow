import React, { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card is interactive (clickable)
   */
  interactive?: boolean;
  
  /**
   * Label for screen readers
   */
  label?: string;
  
  /**
   * Description for screen readers
   */
  description?: string;
  
  /**
   * Whether the card is selected
   */
  selected?: boolean;
  
  /**
   * Card's role for screen readers
   */
  role?: string;
  
  /**
   * Keyboard handler for interactive cards
   */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  
  /**
   * Click handler for interactive cards
   */
  onClick?: (event: React.MouseEvent) => void;
}

/**
 * Enhanced card component with comprehensive accessibility features
 */
export const AccessibleCard = forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({ 
    children,
    interactive = false,
    label,
    description,
    selected = false,
    role,
    onKeyDown,
    onClick,
    className,
    ...props 
  }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (interactive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as any);
      }
      onKeyDown?.(event);
    };

    const cardRole = role || (interactive ? 'button' : undefined);
    const tabIndex = interactive ? 0 : undefined;

    return (
      <Card
        ref={ref}
        role={cardRole}
        tabIndex={tabIndex}
        aria-label={label}
        aria-describedby={description ? `${props.id}-description` : undefined}
        aria-selected={selected}
        onKeyDown={handleKeyDown}
        onClick={onClick}
        className={cn(
          // Interactive styling
          interactive && [
            "cursor-pointer",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "focus-visible:outline-none",
            "hover:shadow-md",
            "transition-shadow duration-200"
          ],
          // Selected state styling
          selected && [
            "ring-2 ring-primary ring-offset-2",
            "bg-primary/5"
          ],
          className
        )}
        {...props}
      >
        {children}
        
        {description && (
          <div 
            id={`${props.id}-description`} 
            className="sr-only"
          >
            {description}
          </div>
        )}
      </Card>
    );
  }
);

AccessibleCard.displayName = "AccessibleCard";