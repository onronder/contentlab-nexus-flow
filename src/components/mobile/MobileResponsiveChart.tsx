import React from 'react'
import { cn } from '@/lib/utils'
import { useEnhancedMobileDetection } from '@/hooks/useEnhancedMobileDetection'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react'

interface MobileResponsiveChartProps {
  children: React.ReactNode
  title?: string
  className?: string
  enableZoom?: boolean
  enablePan?: boolean
  enableFullscreen?: boolean
}

export function MobileResponsiveChart({
  children,
  title,
  className,
  enableZoom = true,
  enablePan = true,
  enableFullscreen = true
}: MobileResponsiveChartProps) {
  const chartRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  const [zoom, setZoom] = React.useState(1)
  const [panX, setPanX] = React.useState(0)
  const [panY, setPanY] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  
  const { isMobile, hasTouch, isTablet } = useEnhancedMobileDetection()

  // Reset chart view
  const resetView = React.useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  // Zoom controls
  const zoomIn = React.useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }, [])

  const zoomOut = React.useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }, [])

  // Touch gesture handlers
  const gestureCallbacks = React.useMemo(() => ({
    onPinch: (gesture: any) => {
      if (enableZoom && gesture.scale) {
        setZoom(prev => Math.max(0.5, Math.min(3, prev * gesture.scale)))
      }
    },
    onSwipe: (gesture: any) => {
      if (enablePan && zoom > 1) {
        const sensitivity = 2
        switch (gesture.direction) {
          case 'left':
            setPanX(prev => prev - gesture.distance * sensitivity)
            break
          case 'right':
            setPanX(prev => prev + gesture.distance * sensitivity)
            break
          case 'up':
            setPanY(prev => prev - gesture.distance * sensitivity)
            break
          case 'down':
            setPanY(prev => prev + gesture.distance * sensitivity)
            break
        }
      }
    },
    onDoubleTap: () => {
      if (enableZoom) {
        zoom > 1 ? resetView() : zoomIn()
      }
    }
  }), [enableZoom, enablePan, zoom, zoomIn, resetView])

  // Set up touch gestures for mobile
  useTouchGestures(chartRef, gestureCallbacks, {
    enableHapticFeedback: isMobile,
    preventDefault: false
  })

  // Fullscreen toggle
  const toggleFullscreen = React.useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Chart content transform
  const contentTransform = `scale(${zoom}) translate(${panX}px, ${panY}px)`

  return (
    <Card className={cn(
      'relative overflow-hidden',
      isFullscreen && 'fixed inset-0 z-50 rounded-none',
      className
    )}>
      {title && (
        <CardHeader className={cn(
          'flex flex-row items-center justify-between space-y-0 pb-2',
          isMobile && 'px-4 py-3'
        )}>
          <CardTitle className={cn(
            'text-base font-medium',
            isMobile && 'text-sm'
          )}>
            {title}
          </CardTitle>
          
          {/* Mobile chart controls */}
          {(isMobile || isTablet) && (enableZoom || enableFullscreen) && (
            <div className="flex items-center space-x-1">
              {enableZoom && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    disabled={zoom <= 0.5}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    disabled={zoom >= 3}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetView}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </>
              )}
              {enableFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      )}
      
      <CardContent className={cn(
        'relative overflow-hidden',
        isMobile && 'p-4'
      )}>
        {/* Chart container */}
        <div
          ref={chartRef}
          className={cn(
            'relative w-full',
            // Mobile-specific height adjustments
            isMobile && 'h-64',
            isTablet && 'h-80',
            !isMobile && !isTablet && 'h-96',
            // Enable touch interactions
            hasTouch && enablePan && zoom > 1 && 'cursor-grab active:cursor-grabbing',
            // Fullscreen adjustments
            isFullscreen && 'h-[calc(100vh-120px)]'
          )}
        >
          {/* Zoom/pan container */}
          <div
            ref={contentRef}
            className="w-full h-full origin-center transition-transform duration-200"
            style={{
              transform: contentTransform,
              // Ensure content doesn't overflow on mobile
              minWidth: isMobile ? '100%' : 'auto',
              minHeight: isMobile ? '100%' : 'auto'
            }}
          >
            {children}
          </div>
          
          {/* Touch interaction hint for mobile */}
          {isMobile && hasTouch && (enableZoom || enablePan) && (
            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded backdrop-blur-sm">
              {enableZoom && enablePan ? 'Pinch to zoom • Swipe to pan • Double-tap to reset' :
               enableZoom ? 'Pinch to zoom • Double-tap to reset' :
               enablePan ? 'Swipe to pan' : ''}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Fullscreen overlay controls */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-background/90 backdrop-blur-sm"
          >
            Exit Fullscreen
          </Button>
        </div>
      )}
    </Card>
  )
}

// Hook for responsive chart sizing
export function useResponsiveChartSize() {
  const { isMobile, isTablet, screenWidth, screenHeight, orientation } = useEnhancedMobileDetection()
  
  return React.useMemo(() => {
    if (isMobile) {
      return {
        width: Math.min(screenWidth - 32, 400), // Account for padding
        height: orientation === 'portrait' ? 200 : 150,
        aspectRatio: '16:9' as const
      }
    }
    
    if (isTablet) {
      return {
        width: Math.min(screenWidth - 48, 600),
        height: 300,
        aspectRatio: '4:3' as const
      }
    }
    
    return {
      width: Math.min(screenWidth - 64, 800),
      height: 400,
      aspectRatio: '16:10' as const
    }
  }, [isMobile, isTablet, screenWidth, screenHeight, orientation])
}