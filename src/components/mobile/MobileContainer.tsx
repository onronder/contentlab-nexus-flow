import React from 'react'
import { cn } from '@/lib/utils'
import { useEnhancedMobileDetection } from '@/hooks/useEnhancedMobileDetection'
import { useTouchGestures, TouchGestureCallbacks } from '@/hooks/useTouchGestures'

interface MobileContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  enableGestures?: boolean
  gestureCallbacks?: TouchGestureCallbacks
  adaptive?: boolean
  touchOptimized?: boolean
}

export function MobileContainer({
  children,
  className,
  enableGestures = true,
  gestureCallbacks = {},
  adaptive = true,
  touchOptimized = true,
  ...props
}: MobileContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { isMobile, isTablet, hasTouch, prefersTouchInteraction } = useEnhancedMobileDetection()

  // Set up touch gestures if enabled
  useTouchGestures(containerRef, gestureCallbacks, {
    enableHapticFeedback: isMobile,
    preventDefault: false
  })

  const containerClasses = cn(
    // Base styles
    'relative',
    
    // Adaptive layout styles
    adaptive && {
      // Mobile-first responsive padding
      'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8': true,
      
      // Touch optimization
      ...(touchOptimized && hasTouch && {
        // Larger touch targets on touch devices
        '[&_button]:min-h-[44px] [&_button]:min-w-[44px]': true,
        // Improved tap targets for links
        '[&_a]:min-h-[32px] [&_a]:inline-block [&_a]:py-1': true,
        // Better spacing for touch interfaces
        '[&>*+*]:mt-4': isMobile,
        '[&>*+*]:mt-3': isTablet,
      })
    },
    
    // Touch-specific optimizations
    touchOptimized && prefersTouchInteraction && {
      // Disable hover effects on pure touch devices
      '[&_*]:hover:transform-none': true,
      // Optimize scrolling
      'overflow-auto overscroll-behavior-contain': true,
      // Improve touch scrolling momentum
      '[&::-webkit-scrollbar]:hidden': true,
      'scrollbar-width-none': true,
    },
    
    // Gesture support styles
    enableGestures && hasTouch && {
      // Enable touch actions for gestures
      'touch-action-manipulation': true,
      // Prevent text selection during gestures
      'select-none': true,
      // Add subtle feedback for interactive elements
      'active:bg-muted/5': true
    },
    
    className
  )

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      {...props}
    >
      {children}
    </div>
  )
}

// Specialized mobile layout components
export function MobileSection({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useEnhancedMobileDetection()
  
  return (
    <section
      className={cn(
        'space-y-4',
        isMobile && 'space-y-6',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function MobileGrid({ 
  children, 
  className,
  cols = 'auto',
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { 
  cols?: 'auto' | 1 | 2 | 3 | 4 
}) {
  const { isMobile, isTablet } = useEnhancedMobileDetection()
  
  const gridClasses = cn(
    'grid gap-4',
    {
      // Auto-responsive grid
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4': cols === 'auto',
      // Fixed columns with mobile fallback
      'grid-cols-1': cols === 1 || (isMobile && typeof cols === 'number' && cols > 1),
      'sm:grid-cols-2': cols === 2 && !isMobile,
      'lg:grid-cols-3': cols === 3 && !isMobile,
      'xl:grid-cols-4': cols === 4 && !isMobile
    },
    // Mobile-specific adjustments
    isMobile ? 'gap-6' : isTablet ? 'gap-5' : 'gap-4',
    className
  )
  
  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  )
}

export function MobileCard({ 
  children, 
  className,
  touchOptimized = true,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { touchOptimized?: boolean }) {
  const { isMobile, hasTouch } = useEnhancedMobileDetection()
  
  return (
    <div
      className={cn(
        // Base card styles
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        
        // Mobile optimizations
        isMobile && [
          'rounded-xl', // Larger border radius on mobile
          'shadow-elegant' // Better shadow for mobile
        ],
        
        // Touch optimizations
        touchOptimized && hasTouch && [
          'active:scale-[0.98]', // Subtle press feedback
          'transition-transform duration-150', // Smooth transitions
          'cursor-pointer' // Clear interaction affordance
        ],
        
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}