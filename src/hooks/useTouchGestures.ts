import * as React from "react"

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export interface GestureState {
  isActive: boolean
  startPoint?: TouchPoint
  currentPoint?: TouchPoint
  distance: number
  direction?: 'up' | 'down' | 'left' | 'right'
  velocity: number
  duration: number
}

export interface SwipeGesture extends GestureState {
  type: 'swipe'
  direction: 'up' | 'down' | 'left' | 'right'
}

export interface PinchGesture extends GestureState {
  type: 'pinch'
  scale: number
  centerPoint: TouchPoint
}

export interface TapGesture extends GestureState {
  type: 'tap' | 'double-tap' | 'long-press'
  tapCount: number
}

export type Gesture = SwipeGesture | PinchGesture | TapGesture

export interface TouchGestureCallbacks {
  onSwipe?: (gesture: SwipeGesture) => void
  onPinch?: (gesture: PinchGesture) => void
  onTap?: (gesture: TapGesture) => void
  onDoubleTap?: (gesture: TapGesture) => void
  onLongPress?: (gesture: TapGesture) => void
  onGestureStart?: (gesture: Gesture) => void
  onGestureEnd?: (gesture: Gesture) => void
}

export interface TouchGestureOptions {
  swipeThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
  pinchThreshold?: number
  velocityThreshold?: number
  preventDefault?: boolean
  enableHapticFeedback?: boolean
}

const defaultOptions: TouchGestureOptions = {
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 10,
  velocityThreshold: 0.3,
  preventDefault: true,
  enableHapticFeedback: true
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks,
  options: TouchGestureOptions = {}
) {
  const opts = { ...defaultOptions, ...options }
  const gestureState = React.useRef<{
    touches: TouchPoint[]
    lastTap?: TouchPoint
    tapCount: number
    longPressTimer?: NodeJS.Timeout
    isTracking: boolean
  }>({
    touches: [],
    tapCount: 0,
    isTracking: false
  })

  const triggerHapticFeedback = React.useCallback((pattern?: number | number[]) => {
    if (opts.enableHapticFeedback && 'vibrate' in navigator) {
      const vibrationPattern = pattern || 10
      navigator.vibrate(vibrationPattern)
    }
  }, [opts.enableHapticFeedback])

  const getDistance = React.useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    )
  }, [])

  const getDirection = React.useCallback((start: TouchPoint, end: TouchPoint): 'up' | 'down' | 'left' | 'right' => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }, [])

  const getVelocity = React.useCallback((start: TouchPoint, end: TouchPoint): number => {
    const distance = getDistance(start, end)
    const time = end.timestamp - start.timestamp
    return time > 0 ? distance / time : 0
  }, [getDistance])

  const createTouchPoint = React.useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  }), [])

  const handleTouchStart = React.useCallback((event: TouchEvent) => {
    if (opts.preventDefault) {
      event.preventDefault()
    }

    const touches = Array.from(event.touches).map(createTouchPoint)
    gestureState.current.touches = touches
    gestureState.current.isTracking = true

    // Clear any existing long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer)
    }

    if (touches.length === 1) {
      // Single touch - could be tap or swipe
      const touch = touches[0]
      
      // Set up long press detection
      gestureState.current.longPressTimer = setTimeout(() => {
        if (gestureState.current.isTracking) {
          const longPressGesture: TapGesture = {
            type: 'long-press',
            isActive: true,
            startPoint: touch,
            currentPoint: touch,
            distance: 0,
            velocity: 0,
            duration: opts.longPressDelay!,
            tapCount: 1
          }
          
          triggerHapticFeedback([20, 10, 20])
          callbacks.onLongPress?.(longPressGesture)
          callbacks.onGestureStart?.(longPressGesture)
        }
      }, opts.longPressDelay)

      // Check for double tap
      if (gestureState.current.lastTap) {
        const timeDiff = touch.timestamp - gestureState.current.lastTap.timestamp
        const distance = getDistance(touch, gestureState.current.lastTap)
        
        if (timeDiff < opts.doubleTapDelay! && distance < 30) {
          gestureState.current.tapCount++
        } else {
          gestureState.current.tapCount = 1
        }
      } else {
        gestureState.current.tapCount = 1
      }
    }
  }, [opts, callbacks, createTouchPoint, getDistance, triggerHapticFeedback])

  const handleTouchMove = React.useCallback((event: TouchEvent) => {
    if (!gestureState.current.isTracking || opts.preventDefault) {
      event.preventDefault()
    }

    const touches = Array.from(event.touches).map(createTouchPoint)
    
    if (touches.length === 1 && gestureState.current.touches.length === 1) {
      // Single finger swipe
      const current = touches[0]
      const start = gestureState.current.touches[0]
      const distance = getDistance(start, current)
      
      if (distance > opts.swipeThreshold!) {
        // Clear long press timer
        if (gestureState.current.longPressTimer) {
          clearTimeout(gestureState.current.longPressTimer)
          gestureState.current.longPressTimer = undefined
        }
      }
    } else if (touches.length === 2 && gestureState.current.touches.length === 2) {
      // Two finger pinch
      const currentDistance = getDistance(touches[0], touches[1])
      const startDistance = getDistance(gestureState.current.touches[0], gestureState.current.touches[1])
      const scale = currentDistance / startDistance
      
      if (Math.abs(scale - 1) > opts.pinchThreshold! / 100) {
        const centerPoint: TouchPoint = {
          x: (touches[0].x + touches[1].x) / 2,
          y: (touches[0].y + touches[1].y) / 2,
          timestamp: Date.now()
        }
        
        const pinchGesture: PinchGesture = {
          type: 'pinch',
          isActive: true,
          startPoint: gestureState.current.touches[0],
          currentPoint: touches[0],
          distance: currentDistance,
          velocity: 0,
          duration: Date.now() - gestureState.current.touches[0].timestamp,
          scale,
          centerPoint
        }
        
        callbacks.onPinch?.(pinchGesture)
      }
    }
  }, [opts, callbacks, getDistance])

  const handleTouchEnd = React.useCallback((event: TouchEvent) => {
    if (opts.preventDefault) {
      event.preventDefault()
    }

    // Clear long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer)
      gestureState.current.longPressTimer = undefined
    }

    if (gestureState.current.touches.length === 1) {
      const start = gestureState.current.touches[0]
      const end = event.changedTouches.length > 0 
        ? createTouchPoint(event.changedTouches[0])
        : start
      
      const distance = getDistance(start, end)
      const velocity = getVelocity(start, end)
      const duration = end.timestamp - start.timestamp

      if (distance > opts.swipeThreshold! && velocity > opts.velocityThreshold!) {
        // Swipe gesture
        const direction = getDirection(start, end)
        const swipeGesture: SwipeGesture = {
          type: 'swipe',
          isActive: false,
          startPoint: start,
          currentPoint: end,
          distance,
          direction,
          velocity,
          duration
        }
        
        triggerHapticFeedback(15)
        callbacks.onSwipe?.(swipeGesture)
        callbacks.onGestureEnd?.(swipeGesture)
      } else if (distance < 20 && duration < opts.longPressDelay!) {
        // Tap gesture
        const tapGesture: TapGesture = {
          type: gestureState.current.tapCount > 1 ? 'double-tap' : 'tap',
          isActive: false,
          startPoint: start,
          currentPoint: end,
          distance,
          velocity,
          duration,
          tapCount: gestureState.current.tapCount
        }
        
        triggerHapticFeedback(5)
        
        if (gestureState.current.tapCount > 1) {
          callbacks.onDoubleTap?.(tapGesture)
        } else {
          callbacks.onTap?.(tapGesture)
        }
        
        callbacks.onGestureEnd?.(tapGesture)
        gestureState.current.lastTap = end
        
        // Reset tap count after delay
        setTimeout(() => {
          gestureState.current.tapCount = 0
        }, opts.doubleTapDelay)
      }
    }

    gestureState.current.isTracking = false
    gestureState.current.touches = []
  }, [opts, callbacks, createTouchPoint, getDistance, getVelocity, getDirection, triggerHapticFeedback])

  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const options = { passive: false }
    
    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)
    element.addEventListener('touchcancel', handleTouchEnd, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    triggerHapticFeedback,
    isTracking: gestureState.current.isTracking
  }
}