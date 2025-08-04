import { useState, useEffect } from 'react';
import { TeamCommunicationService } from '@/services/teamCommunicationService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useTeamCommunication(teamId: string) {
  const [channels, setChannels] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userId = useCurrentUserId();

  useEffect(() => {
    if (!teamId || !userId) return;

    const loadData = async () => {
      setLoading(true);
      const [channelsData, notificationsData] = await Promise.all([
        TeamCommunicationService.getTeamChannels(teamId),
        TeamCommunicationService.getUserNotifications(userId)
      ]);
      
      setChannels(channelsData);
      setNotifications(notificationsData.notifications);
      setUnreadCount(notificationsData.unread_count);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const channelSub = TeamCommunicationService.subscribeToTeamChannels(teamId, () => {
      TeamCommunicationService.getTeamChannels(teamId).then(setChannels);
    });

    const notificationSub = TeamCommunicationService.subscribeToUserNotifications(userId, () => {
      TeamCommunicationService.getUserNotifications(userId).then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      });
    });

    return () => {
      channelSub.unsubscribe();
      notificationSub.unsubscribe();
    };
  }, [teamId, userId]);

  return {
    channels,
    notifications,
    unreadCount,
    loading,
    refetch: () => {
      if (teamId && userId) {
        TeamCommunicationService.getTeamChannels(teamId).then(setChannels);
        TeamCommunicationService.getUserNotifications(userId).then((data) => {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        });
      }
    }
  };
}