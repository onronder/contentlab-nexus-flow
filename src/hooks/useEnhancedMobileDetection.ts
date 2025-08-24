import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  orientation: 'portrait' | 'landscape'
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  hasTouch: boolean
  hasTouchScreen: boolean
  supportsHover: boolean
  hasHapticFeedback: boolean
  connectionType?: string
  deviceType: 'phone' | 'tablet' | 'desktop'
}

export interface ViewportInfo {
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  scrollY: number
  scrollX: number
}

export function useEnhancedMobileDetection() {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
        screenWidth: 1920,
        screenHeight: 1080,
        devicePixelRatio: 1,
        hasTouch: false,
        hasTouchScreen: false,
        supportsHover: true,
        hasHapticFeedback: false,
        deviceType: 'desktop'
      }
    }
    
    const width = window.innerWidth
    const height = window.innerHeight
    const isMobile = width < MOBILE_BREAKPOINT
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
    const isDesktop = width >= TABLET_BREAKPOINT
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasHapticFeedback = 'vibrate' in navigator
    // Move media query to useEffect to avoid render-time DOM access
    const supportsHover = false // Will be set in useEffect
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      orientation: height > width ? 'portrait' : 'landscape',
      screenWidth: width,
      screenHeight: height,
      devicePixelRatio: window.devicePixelRatio || 1,
      hasTouch,
      hasTouchScreen: hasTouch,
      supportsHover,
      hasHapticFeedback,
      deviceType: isMobile ? 'phone' : isTablet ? 'tablet' : 'desktop',
      connectionType: (navigator as any).connection?.effectiveType
    }
  })

  const [viewportInfo, setViewportInfo] = React.useState<ViewportInfo>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    innerWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    innerHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    scrollY: 0,
    scrollX: 0
  }))

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < MOBILE_BREAKPOINT
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
      const isDesktop = width >= TABLET_BREAKPOINT
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const supportsHover = window.matchMedia('(hover: hover)').matches
      const hasHapticFeedback = 'vibrate' in navigator

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        orientation: height > width ? 'portrait' : 'landscape',
        screenWidth: width,
        screenHeight: height,
        devicePixelRatio: window.devicePixelRatio || 1,
        hasTouch,
        hasTouchScreen: hasTouch,
        supportsHover,
        hasHapticFeedback,
        deviceType: isMobile ? 'phone' : isTablet ? 'tablet' : 'desktop',
        connectionType: (navigator as any).connection?.effectiveType
      })
    }

    const updateViewportInfo = () => {
      setViewportInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        scrollX: window.scrollX
      })
    }

    // Listen for resize and orientation changes
    const resizeObserver = new ResizeObserver(updateDeviceInfo)
    resizeObserver.observe(document.body)

    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)
    window.addEventListener('scroll', updateViewportInfo, { passive: true })

    // Check for connection changes
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', updateDeviceInfo)
    }

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
      window.removeEventListener('scroll', updateViewportInfo)
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateDeviceInfo)
      }
    }
  }, [])

  return {
    ...deviceInfo,
    viewport: viewportInfo,
    // Utility functions
    isSmallScreen: deviceInfo.screenWidth < MOBILE_BREAKPOINT,
    isMediumScreen: deviceInfo.screenWidth >= MOBILE_BREAKPOINT && deviceInfo.screenWidth < TABLET_BREAKPOINT,
    isLargeScreen: deviceInfo.screenWidth >= TABLET_BREAKPOINT,
    // Touch-specific utilities
    canHover: !deviceInfo.hasTouch || deviceInfo.supportsHover,
    prefersTouchInteraction: deviceInfo.hasTouch && !deviceInfo.supportsHover,
    // Performance hints - moved to avoid render-time DOM access
    shouldReduceMotion: false, // Will be updated in useEffect
    prefersDarkScheme: false // Will be updated in useEffect
  }
}

// Hook for simple mobile detection (backward compatibility)
export function useIsMobile() {
  const { isMobile } = useEnhancedMobileDetection()
  return isMobile
}