import { useState, useEffect, useCallback } from 'react'

interface SecurityAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metadata: Record<string, any>
  timestamp: string
}

interface UseRealtimeSecurityAlertsReturn {
  alerts: SecurityAlert[]
  isConnected: boolean
  connectionError: string | null
  clearAlert: (alertId: string) => void
  clearAllAlerts: () => void
}

export const useRealtimeSecurityAlerts = (): UseRealtimeSecurityAlertsReturn => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  const connectWebSocket = useCallback(() => {
    try {
      // Use the correct WebSocket URL for Supabase edge functions
      const wsUrl = 'wss://ijvhqqdfthchtittyvnt.functions.supabase.co/realtime-security-alerts'
      const socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        console.log('Security alerts WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        
        // Subscribe to security alerts
        socket.send(JSON.stringify({
          type: 'subscribe_alerts'
        }))

        // Request recent alerts
        socket.send(JSON.stringify({
          type: 'get_recent_alerts'
        }))
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received security alert data:', data)

          switch (data.type) {
            case 'security_alert':
              setAlerts(prev => [data.alert, ...prev].slice(0, 50)) // Keep last 50 alerts
              break
              
            case 'recent_alerts':
              setAlerts(data.alerts)
              break
              
            case 'connection_established':
            case 'subscription_active':
              console.log('Security alerts:', data.message || data.type)
              break
              
            case 'error':
              console.error('Security alerts error:', data.message)
              setConnectionError(data.message)
              break
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      socket.onerror = (error) => {
        console.error('Security alerts WebSocket error:', error)
        setConnectionError('Connection error occurred')
        setIsConnected(false)
      }

      socket.onclose = (event) => {
        console.log('Security alerts WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        
        // Reconnect after 5 seconds if not a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            console.log('Attempting to reconnect security alerts WebSocket...')
            connectWebSocket()
          }, 5000)
        }
      }

      setWs(socket)
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError('Failed to establish connection')
    }
  }, [])

  useEffect(() => {
    connectWebSocket()

    return () => {
      if (ws) {
        ws.close(1000) // Normal closure
      }
    }
  }, [connectWebSocket])

  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  const clearAllAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return {
    alerts,
    isConnected,
    connectionError,
    clearAlert,
    clearAllAlerts
  }
}