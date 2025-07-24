import React, { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibleButtonProps extends ButtonProps {
  /**
   * Loading state with accessible announcement
   */
  loading?: boolean;
  
  /**
   * Description for screen readers
   */
  description?: string;
  
  /**
   * Keyboard shortcut hint
   */
  shortcut?: string;
  
  /**
   * Whether the button controls an expanded/collapsed state
   */
  expanded?: boolean;
  
  /**
   * ID of element this button controls
   */
  controls?: string;
  
  /**
   * Success state for feedback
   */
  success?: boolean;
  
  /**
   * Custom loading text for screen readers
   */
  loadingText?: string;
}

/**
 * Enhanced button component with comprehensive accessibility features
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    loading = false,
    description,
    shortcut,
    expanded,
    controls,
    success = false,
    loadingText = "Loading",
    className,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    const ariaProps = {
      'aria-describedby': description ? `${props.id}-description` : undefined,
      'aria-expanded': expanded,
      'aria-controls': controls,
      'aria-disabled': isDisabled,
      'aria-keyshortcuts': shortcut,
    };

    return (
      <>
        <Button
          ref={ref}
          disabled={isDisabled}
          className={cn(
            // Success state styling
            success && "bg-green-500 hover:bg-green-600 text-white",
            // Loading state styling
            loading && "cursor-wait",
            // Enhanced focus styling for accessibility
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "focus-visible:outline-none",
            className
          )}
          {...ariaProps}
          {...props}
        >
          {loading && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">{loadingText}</span>
            </>
          )}
          
          {success && !loading && (
            <span className="sr-only">Success: </span>
          )}
          
          {children}
          
          {shortcut && (
            <span className="sr-only"> (Keyboard shortcut: {shortcut})</span>
          )}
        </Button>
        
        {description && (
          <div 
            id={`${props.id}-description`} 
            className="sr-only"
          >
            {description}
          </div>
        )}
      </>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";