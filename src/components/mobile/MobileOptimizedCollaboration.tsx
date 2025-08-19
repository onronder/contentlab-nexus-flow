import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useEnhancedMobile } from '@/hooks/useEnhancedMobile';
import { useAdvancedCollaboration } from '@/hooks/useAdvancedCollaboration';
import { 
  Smartphone, 
  Tablet, 
  Wifi, 
  WifiOff, 
  Download, 
  Users, 
  Zap,
  Hand,
  Eye,
  Bell,
  Vibrate
} from 'lucide-react';

interface MobileOptimizedCollaborationProps {
  teamId?: string;
  resourceId?: string;
  className?: string;
}

export const MobileOptimizedCollaboration: React.FC<MobileOptimizedCollaborationProps> = ({
  teamId,
  resourceId,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTap, setLastTap] = useState(0);

  const {
    isMobile,
    features,
    isOnline,
    currentSession,
    gestureHistory,
    offlineActions,
    installPromptEvent,
    trackGesture,
    addOfflineAction,
    syncOfflineActions,
    showInstallPrompt,
    triggerHaptic,
    requestNotificationPermission
  } = useEnhancedMobile();

  const {
    session,
    isSessionActive,
    isConnected,
    presence,
    events,
    typingUsers,
    startSession,
    endSession,
    broadcastEvent,
    broadcastCursorMove,
    broadcastTextChange
  } = useAdvancedCollaboration({
    teamId: teamId || '',
    resourceId: resourceId || '',
    resourceType: 'content'
  });

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    
    trackGesture('touch_start');
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Detect gesture types
    if (distance < 10) {
      // Tap gesture
      const now = Date.now();
      const timeDiff = now - lastTap;
      
      if (timeDiff < 300) {
        // Double tap
        trackGesture('double_tap');
        triggerHaptic(50);
        handleDoubleTap();
      } else {
        // Single tap
        trackGesture('single_tap');
      }
      
      setLastTap(now);
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 50) {
        trackGesture('swipe_right');
        handleSwipeRight();
      } else if (deltaX < -50) {
        trackGesture('swipe_left');
        handleSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > 50) {
        trackGesture('swipe_down');
        handleSwipeDown();
      } else if (deltaY < -50) {
        trackGesture('swipe_up');
        handleSwipeUp();
      }
    }
    
    setTouchStart(null);
  };

  const handlePinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      trackGesture('pinch');
      triggerHaptic([50, 50]);
    }
  };

  // Gesture action handlers
  const handleDoubleTap = () => {
    if (isSessionActive) {
      broadcastEvent('mobile_interaction', { 
        type: 'double_tap', 
        timestamp: Date.now() 
      });
    }
  };

  const handleSwipeRight = () => {
    // Navigate to next section or show collaboration panel
    console.log('Swipe right detected - showing collaboration panel');
  };

  const handleSwipeLeft = () => {
    // Navigate to previous section or hide panel
    console.log('Swipe left detected - hiding collaboration panel');
  };

  const handleSwipeUp = () => {
    // Show quick actions
    console.log('Swipe up detected - showing quick actions');
  };

  const handleSwipeDown = () => {
    // Refresh or sync
    if (offlineActions.length > 0 && isOnline) {
      syncOfflineActions();
    }
  };

  // PWA and mobile features
  const handleInstallApp = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      triggerHaptic(200);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      triggerHaptic(100);
    }
  };

  const handleStartCollaboration = async () => {
    if (!teamId || !resourceId) return;
    
    triggerHaptic(50);
    await startSession();
    
    if (!isOnline) {
      addOfflineAction({
        type: 'start_collaboration',
        teamId,
        resourceId,
        mobile: true
      });
    }
  };

  const handleEndCollaboration = async () => {
    triggerHaptic([100, 50]);
    await endSession();
  };

  if (!isMobile) {
    return (
      <Alert className={className}>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          This component is optimized for mobile devices.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`space-y-4 touch-manipulation ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handlePinch}
    >
      {/* Mobile Status Bar */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {features.touchOptimized && window.innerWidth < 768 ? (
                <Smartphone className="h-4 w-4 text-primary" />
              ) : (
                <Tablet className="h-4 w-4 text-primary" />
              )}
              Mobile Collaboration
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              {isConnected && (
                <Badge variant="outline" className="text-xs">
                  Connected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Connection Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-xs text-muted-foreground">
                Network Status
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-semibold">
                {Object.keys(presence).length}
              </div>
              <div className="text-xs text-muted-foreground">
                Active Users
              </div>
            </div>
          </div>

          {/* PWA Features */}
          {features.installPrompt && installPromptEvent && (
            <Button 
              onClick={handleInstallApp}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
          )}

          {features.pushNotifications && (
            <Button 
              onClick={handleEnableNotifications}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          )}

          {/* Collaboration Controls */}
          <div className="space-y-2">
            {!isSessionActive ? (
              <Button 
                onClick={handleStartCollaboration}
                disabled={!teamId || !resourceId}
                className="w-full"
                size="lg"
              >
                <Users className="w-4 h-4 mr-2" />
                Start Collaboration
              </Button>
            ) : (
              <Button 
                onClick={handleEndCollaboration}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Users className="w-4 h-4 mr-2" />
                End Session
              </Button>
            )}
          </div>

          {/* Offline Actions */}
          {offlineActions.length > 0 && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{offlineActions.length} actions pending sync</span>
                {isOnline && (
                  <Button 
                    onClick={syncOfflineActions}
                    size="sm"
                    variant="outline"
                  >
                    Sync Now
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Mobile Features Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Hand className={`h-3 w-3 ${features.gestureSupport ? 'text-green-500' : 'text-gray-400'}`} />
              <span>Gestures</span>
            </div>
            <div className="flex items-center gap-1">
              <Vibrate className={`h-3 w-3 ${features.hapticFeedback ? 'text-green-500' : 'text-gray-400'}`} />
              <span>Haptics</span>
            </div>
            <div className="flex items-center gap-1">
              <WifiOff className={`h-3 w-3 ${features.offlineCapable ? 'text-green-500' : 'text-gray-400'}`} />
              <span>Offline</span>
            </div>
            <div className="flex items-center gap-1">
              <Bell className={`h-3 w-3 ${features.pushNotifications ? 'text-green-500' : 'text-gray-400'}`} />
              <span>Push</span>
            </div>
          </div>

          {/* Gesture History (Debug Info) */}
          {gestureHistory.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Recent Gestures ({gestureHistory.slice(-5).length})
              </summary>
              <div className="mt-2 space-y-1">
                {gestureHistory.slice(-5).map((gesture, index) => (
                  <div key={index} className="text-muted-foreground">
                    {gesture}
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Active Session Info */}
      {isSessionActive && session && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Session</CardTitle>
            <CardDescription className="text-sm">
              Collaborative Session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-1">
                  {typingUsers.slice(0, 3).map((user, index) => (
                    <div 
                      key={user}
                      className="w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center text-xs text-white"
                    >
                      {user.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </div>
              </div>
            )}

            {/* Recent Events */}
            {events.slice(-3).map((event, index) => (
              <div key={index} className="text-xs text-muted-foreground border-l-2 border-muted pl-2 mb-2">
                <span className="font-medium">{event.type}</span>
                <span className="ml-2">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mobile Collaboration Guide */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="text-sm space-y-2">
            <div className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              Mobile Gestures
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Double-tap: Quick action</li>
              <li>• Swipe right: Show collaboration panel</li>
              <li>• Swipe down: Sync offline actions</li>
              <li>• Pinch: Zoom/scale content</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};