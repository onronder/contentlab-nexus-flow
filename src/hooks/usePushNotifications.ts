import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PushNotificationHook {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, body: string, userId?: string) => Promise<void>;
}

export function usePushNotifications(): PushNotificationHook {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported] = useState(() => 'Notification' in window);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Permission Error',
        description: 'Failed to request notification permission',
        variant: 'destructive',
      });
      return false;
    }
  };

  const sendNotification = async (title: string, body: string, userId?: string): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('mobile-push-notifications', {
        body: {
          userId: userId || user.user?.id,
          title,
          body,
          data: {
            timestamp: new Date().toISOString(),
            source: 'web-app'
          }
        }
      });

      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      toast({
        title: 'Notification Error',
        description: 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
}