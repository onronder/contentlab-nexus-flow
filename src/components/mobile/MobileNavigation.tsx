import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Home, 
  FolderOpen, 
  BarChart3, 
  Users, 
  Settings,
  Target,
  FileText,
  Shield
} from 'lucide-react'
import { useEnhancedMobileDetection } from '@/hooks/useEnhancedMobileDetection'

interface MobileNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}

interface MobileBottomNavigationProps {
  items?: MobileNavItem[]
  className?: string
}

const defaultNavItems: MobileNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Competitive', href: '/competitive', icon: Target },
  { label: 'Settings', href: '/settings', icon: Settings }
]

export function MobileBottomNavigation({ 
  items = defaultNavItems, 
  className 
}: MobileBottomNavigationProps) {
  const location = useLocation()
  const { isMobile, hasTouch } = useEnhancedMobileDetection()

  // Only show on mobile devices
  if (!isMobile) return null

  return (
    <nav className={cn(
      // Fixed bottom navigation
      'fixed bottom-0 left-0 right-0 z-50',
      // Background and styling
      'bg-background/95 backdrop-blur-lg border-t border-border',
      // Safe area insets for devices with home indicator
      'pb-safe',
      // Touch optimizations
      hasTouch && 'touch-manipulation',
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                // Base styles
                'flex flex-col items-center justify-center',
                'min-h-[48px] min-w-[48px] px-2 py-1',
                'rounded-lg transition-all duration-200',
                // Touch feedback
                'active:scale-95 active:bg-muted/50',
                // Active/inactive states
                isActive ? [
                  'text-primary bg-primary/10',
                  'shadow-sm'
                ] : [
                  'text-muted-foreground',
                  'hover:text-foreground hover:bg-muted/30'
                ]
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  'h-5 w-5 mb-1',
                  isActive && 'text-primary'
                )} />
                {item.badge && (
                  <span className={cn(
                    'absolute -top-1 -right-1 h-4 w-4',
                    'bg-destructive text-destructive-foreground',
                    'text-xs font-medium rounded-full',
                    'flex items-center justify-center'
                  )}>
                    {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium leading-none',
                'max-w-[48px] truncate',
                isActive && 'text-primary'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Mobile hamburger menu for additional navigation items
interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function MobileMenu({ isOpen, onClose, className }: MobileMenuProps) {
  const { isMobile } = useEnhancedMobileDetection()
  const location = useLocation()

  const additionalNavItems: MobileNavItem[] = [
    { label: 'Team', href: '/team', icon: Users },
    { label: 'Content', href: '/content', icon: FileText },
    { label: 'Security', href: '/security', icon: Shield },
    { label: 'Monitoring', href: '/monitoring', icon: BarChart3 }
  ]

  // Close menu on location change
  React.useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  // Close menu on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isMobile || !isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu content */}
      <div className={cn(
        // Positioning
        'fixed top-0 left-0 z-50',
        'h-full w-64 max-w-[80vw]',
        // Styling
        'bg-background border-r border-border',
        'shadow-2xl',
        // Animation
        'transform transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 p-4 space-y-2">
            {additionalNavItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg',
                    'min-h-[44px] transition-all duration-200',
                    'active:scale-95',
                    isActive ? [
                      'text-primary bg-primary/10',
                      'border border-primary/20'
                    ] : [
                      'text-muted-foreground',
                      'hover:text-foreground hover:bg-muted/50'
                    ]
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      'ml-auto h-5 w-5 bg-destructive text-destructive-foreground',
                      'text-xs font-medium rounded-full',
                      'flex items-center justify-center'
                    )}>
                      {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}