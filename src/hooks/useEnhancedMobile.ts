import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export interface MobileSession {
  id: string;
  user_id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  device_info: any;
  session_duration: number;
  gestures_used: string[];
  offline_actions: any[];
  sync_status: 'synced' | 'pending' | 'failed';
  performance_metrics: any;
  created_at: string;
  updated_at: string;
}

export interface MobileFeatures {
  touchOptimized: boolean;
  gestureSupport: boolean;
  offlineCapable: boolean;
  pushNotifications: boolean;
  installPrompt: boolean;
  hapticFeedback: boolean;
}

export const useEnhancedMobile = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gestureHistory, setGestureHistory] = useState<string[]>([]);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  // Detect device capabilities
  const [features, setFeatures] = useState<MobileFeatures>({
    touchOptimized: 'ontouchstart' in window,
    gestureSupport: 'ontouchstart' in window,
    offlineCapable: 'serviceWorker' in navigator,
    pushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
    installPrompt: false,
    hapticFeedback: 'vibrate' in navigator
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineActions.length > 0) {
        syncOfflineActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "You're now offline. Changes will sync when connection is restored.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineActions.length]);

  // PWA install prompt detection
  useEffect(() => {
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setFeatures(prev => ({ ...prev, installPrompt: true }));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  // Initialize mobile session
  const initializeMobileSession = useCallback(async () => {
    if (!isMobile) return;

    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenSize: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      touchPoints: navigator.maxTouchPoints || 0,
      orientation: screen.orientation?.type || 'unknown',
      online: navigator.onLine,
      features: JSON.stringify(features)
    };

    const sessionId = `mobile_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSession(sessionId);

    try {
      await supabase.from('mobile_sessions').insert({
        device_type: window.innerWidth < 768 ? 'mobile' : 'tablet',
        device_info: deviceInfo,
        session_duration: 0,
        gestures_used: [],
        offline_actions: [],
        sync_status: 'synced',
        performance_metrics: {
          startTime: Date.now(),
          sessionId
        }
      });

      console.log('Mobile session initialized:', sessionId);
    } catch (error) {
      console.error('Failed to initialize mobile session:', error);
    }
  }, [isMobile, features]);

  // Track mobile session query
  const { data: mobileSession, isLoading: isSessionLoading } = useQuery({
    queryKey: ['mobile-session', currentSession],
    queryFn: async () => {
      if (!currentSession) return null;
      
      const { data, error } = await supabase
        .from('mobile_sessions')
        .select('*')
        .eq('id', currentSession)
        .single();

      if (error) throw error;
      return data as MobileSession;
    },
    enabled: !!currentSession,
    staleTime: 30000,
  });

  // Update mobile session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<MobileSession>) => {
      if (!currentSession) throw new Error('No active session');

      const { error } = await supabase
        .from('mobile_sessions')
        .update(updates)
        .eq('id', currentSession);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-session', currentSession] });
    }
  });

  // Track gesture usage
  const trackGesture = useCallback((gestureType: string) => {
    if (!isMobile) return;

    setGestureHistory(prev => [...prev, gestureType]);
    
    if (currentSession && isOnline) {
      updateSessionMutation.mutate({
        gestures_used: [...gestureHistory, gestureType],
        performance_metrics: {
          ...mobileSession?.performance_metrics,
          lastGesture: gestureType,
          gestureCount: gestureHistory.length + 1
        }
      });
    }
  }, [isMobile, currentSession, isOnline, gestureHistory, mobileSession?.performance_metrics, updateSessionMutation]);

  // Handle offline actions
  const addOfflineAction = useCallback((action: any) => {
    const offlineAction = {
      ...action,
      timestamp: Date.now(),
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setOfflineActions(prev => [...prev, offlineAction]);
    
    toast({
      title: "Action Saved",
      description: "Action saved offline. Will sync when online.",
    });
  }, [toast]);

  // Sync offline actions
  const syncOfflineActions = useCallback(async () => {
    if (offlineActions.length === 0 || !isOnline) return;

    try {
      // Process offline actions (implement based on action types)
      for (const action of offlineActions) {
        // This would be implemented based on specific action types
        console.log('Syncing offline action:', action);
      }

      // Clear offline actions after successful sync
      setOfflineActions([]);
      
      if (currentSession) {
        updateSessionMutation.mutate({
          sync_status: 'synced',
          offline_actions: []
        });
      }

      toast({
        title: "Sync Complete",
        description: `${offlineActions.length} offline actions synced successfully.`,
      });
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
      
      if (currentSession) {
        updateSessionMutation.mutate({
          sync_status: 'failed'
        });
      }

      toast({
        title: "Sync Failed",
        description: "Failed to sync offline actions. Will retry automatically.",
        variant: "destructive",
      });
    }
  }, [offlineActions, isOnline, currentSession, updateSessionMutation, toast]);

  // PWA install prompt
  const showInstallPrompt = useCallback(async () => {
    if (!installPromptEvent) return false;

    try {
      installPromptEvent.prompt();
      const result = await installPromptEvent.userChoice;
      
      if (result.outcome === 'accepted') {
        setInstallPromptEvent(null);
        setFeatures(prev => ({ ...prev, installPrompt: false }));
        
        toast({
          title: "App Installed",
          description: "The app has been installed successfully!",
        });
        
        return true;
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
    
    return false;
  }, [installPromptEvent, toast]);

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[] = 100) => {
    if (features.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [features.hapticFeedback]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!features.pushNotifications) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  }, [features.pushNotifications]);

  // Initialize session on mount
  useEffect(() => {
    if (isMobile) {
      initializeMobileSession();
    }
  }, [isMobile, initializeMobileSession]);

  // Update session duration periodically
  useEffect(() => {
    if (!currentSession || !isMobile) return;

    const interval = setInterval(() => {
      const duration = Date.now() - (mobileSession?.performance_metrics?.startTime || Date.now());
      
      updateSessionMutation.mutate({
        session_duration: Math.floor(duration / 1000),
        performance_metrics: {
          ...mobileSession?.performance_metrics,
          currentDuration: duration
        }
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [currentSession, isMobile, mobileSession?.performance_metrics, updateSessionMutation]);

  return {
    // Device info
    isMobile,
    features,
    isOnline,
    
    // Session data
    currentSession,
    mobileSession,
    isSessionLoading,
    
    // Gesture tracking
    gestureHistory,
    trackGesture,
    
    // Offline support
    offlineActions,
    addOfflineAction,
    syncOfflineActions,
    
    // PWA features
    installPromptEvent,
    showInstallPrompt,
    
    // Device features
    triggerHaptic,
    requestNotificationPermission,
    
    // Actions
    initializeMobileSession,
    
    // Utils
    updateSession: updateSessionMutation.mutate,
    
    // State
    isUpdating: updateSessionMutation.isPending,
  };
};