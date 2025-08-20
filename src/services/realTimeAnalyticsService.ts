import React from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealTimeMetric {
  id: string;
  timestamp: number;
  type: 'performance' | 'engagement' | 'system' | 'business';
  value: number;
  metadata?: Record<string, any>;
}

interface RealTimeUpdate {
  type: 'metric_update' | 'alert' | 'forecast_update';
  data: any;
  timestamp: number;
}

class RealTimeAnalyticsService {
  private websocket: WebSocket | null = null;
  private subscribers: Map<string, (update: RealTimeUpdate) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.initializeWebSocket();
    this.setupSupabaseRealtime();
  }

  private initializeWebSocket() {
    try {
      // Create WebSocket connection for real-time analytics updates
      const wsUrl = `wss://ijvhqqdfthchtittyvnt.supabase.co/realtime/v1/websocket`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Real-time analytics WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendHeartbeat();
      };

      this.websocket.onmessage = (event) => {
        try {
          const update: RealTimeUpdate = JSON.parse(event.data);
          this.broadcastUpdate(update);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Real-time analytics WebSocket disconnected');
        this.isConnected = false;
        this.handleReconnect();
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  private setupSupabaseRealtime() {
    // Listen to real-time updates from analytics tables
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_analytics'
        },
        (payload) => {
          this.broadcastUpdate({
            type: 'metric_update',
            data: {
              table: 'content_analytics',
              change: payload
            },
            timestamp: Date.now()
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_metrics'
        },
        (payload) => {
          this.broadcastUpdate({
            type: 'metric_update',
            data: {
              table: 'business_metrics',
              change: payload
            },
            timestamp: Date.now()
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, delay);
    }
  }

  private sendHeartbeat() {
    if (this.isConnected && this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      setTimeout(() => this.sendHeartbeat(), 30000); // Every 30 seconds
    }
  }

  private broadcastUpdate(update: RealTimeUpdate) {
    this.subscribers.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  // Public API
  subscribe(id: string, callback: (update: RealTimeUpdate) => void) {
    this.subscribers.set(id, callback);
    return () => {
      this.subscribers.delete(id);
    };
  }

  publishMetric(metric: RealTimeMetric) {
    const update: RealTimeUpdate = {
      type: 'metric_update',
      data: metric,
      timestamp: Date.now()
    };

    if (this.isConnected && this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(update));
    }

    this.broadcastUpdate(update);
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriberCount: this.subscribers.size
    };
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.subscribers.clear();
    this.isConnected = false;
  }
}

// Singleton instance
export const realTimeAnalyticsService = new RealTimeAnalyticsService();

// React hook for real-time analytics
export function useRealTimeAnalytics() {
  const [updates, setUpdates] = React.useState<RealTimeUpdate[]>([]);
  const [connectionStatus, setConnectionStatus] = React.useState(
    realTimeAnalyticsService.getConnectionStatus()
  );

  React.useEffect(() => {
    const unsubscribe = realTimeAnalyticsService.subscribe('dashboard', (update) => {
      setUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
    });

    const statusInterval = setInterval(() => {
      setConnectionStatus(realTimeAnalyticsService.getConnectionStatus());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  return {
    updates,
    connectionStatus,
    publishMetric: realTimeAnalyticsService.publishMetric.bind(realTimeAnalyticsService)
  };
}