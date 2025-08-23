import React from 'react'
import { cn } from '@/lib/utils'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { useEnhancedMobileDetection } from '@/hooks/useEnhancedMobileDetection'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void> | void
  disabled?: boolean
  threshold?: number
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className
}: PullToRefreshProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [shouldRefresh, setShouldRefresh] = React.useState(false)
  const touchStartY = React.useRef(0)
  const scrollTop = React.useRef(0)
  
  const { isMobile, hasTouch } = useEnhancedMobileDetection()

  // Only enable pull-to-refresh on mobile touch devices
  const isEnabled = isMobile && hasTouch && !disabled

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (!isEnabled || isRefreshing) return
    
    touchStartY.current = e.touches[0].clientY
    scrollTop.current = containerRef.current?.scrollTop || 0
  }, [isEnabled, isRefreshing])

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!isEnabled || isRefreshing || scrollTop.current > 0) return
    
    const touchY = e.touches[0].clientY
    const diff = touchY - touchStartY.current
    
    // Only allow pull down when at the top of the container
    if (diff > 0 && scrollTop.current === 0) {
      e.preventDefault()
      
      // Apply resistance to the pull
      const resistance = Math.min(diff * 0.5, threshold * 1.5)
      setPullDistance(resistance)
      setShouldRefresh(resistance >= threshold)
    }
  }, [isEnabled, isRefreshing, threshold])

  const handleTouchEnd = React.useCallback(async () => {
    if (!isEnabled || isRefreshing) return
    
    if (shouldRefresh && pullDistance >= threshold) {
      setIsRefreshing(true)
      
      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(20)
      }
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
    setShouldRefresh(false)
  }, [isEnabled, isRefreshing, shouldRefresh, pullDistance, threshold, onRefresh])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !isEnabled) return

    const options = { passive: false }
    
    container.addEventListener('touchstart', handleTouchStart, options)
    container.addEventListener('touchmove', handleTouchMove, options)
    container.addEventListener('touchend', handleTouchEnd, options)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isEnabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  const refreshIndicatorTransform = `translateY(${Math.min(pullDistance - threshold, 0)}px)`
  const refreshIconRotation = isRefreshing ? 'animate-spin' : 
    shouldRefresh ? 'rotate-180' : 
    `rotate-${Math.min((pullDistance / threshold) * 180, 180)}`

  const refreshOpacity = Math.min(pullDistance / (threshold * 0.5), 1)

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-auto h-full',
        // Enable smooth scrolling
        'scroll-smooth',
        // Prevent overscroll bounce on iOS
        'overscroll-behavior-y-contain',
        className
      )}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.3, threshold * 0.3)}px)`,
        transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
      }}
    >
      {/* Pull to refresh indicator */}
      {isEnabled && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-16 pointer-events-none"
          style={{
            transform: refreshIndicatorTransform,
            opacity: refreshOpacity,
            transition: pullDistance === 0 ? 'opacity 0.2s ease-out, transform 0.2s ease-out' : 'none'
          }}
        >
          <div className="flex flex-col items-center space-y-1 text-muted-foreground">
            {isRefreshing ? (
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            ) : shouldRefresh ? (
              <ChevronDown className="h-5 w-5 text-primary rotate-180" />
            ) : (
              <ChevronDown 
                className={cn("h-5 w-5 transition-transform duration-200", refreshIconRotation)} 
                style={{ 
                  transform: `rotate(${Math.min((pullDistance / threshold) * 180, 180)}deg)` 
                }}
              />
            )}
            <span className="text-xs">
              {isRefreshing ? 'Refreshing...' : 
               shouldRefresh ? 'Release to refresh' : 
               pullDistance > 10 ? 'Pull to refresh' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn(
        // Add top padding when pull indicator is visible
        isEnabled && pullDistance > 0 && 'pt-16'
      )}>
        {children}
      </div>
    </div>
  )
}