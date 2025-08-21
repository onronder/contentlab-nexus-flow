import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

interface SecurityAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metadata: Record<string, any>
  timestamp: string
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get('upgrade') || ''

  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { status: 400 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  
  console.log('WebSocket connection established for security alerts')

  // Send initial connection confirmation
  socket.onopen = () => {
    console.log('Security alerts WebSocket opened')
    socket.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }))
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      console.log('Received security alert request:', message)

      if (message.type === 'subscribe_alerts') {
        // Set up real-time subscription for security events
        const channel = supabase
          .channel('security-alerts')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'security_events'
            },
            (payload) => {
              console.log('New security event detected:', payload)
              
              const alert: SecurityAlert = {
                id: payload.new.id,
                type: payload.new.event_type,
                severity: payload.new.severity,
                message: `Security event: ${payload.new.event_type}`,
                metadata: payload.new.event_data || {},
                timestamp: payload.new.created_at
              }

              socket.send(JSON.stringify({
                type: 'security_alert',
                alert
              }))
            }
          )
          .subscribe()

        socket.send(JSON.stringify({
          type: 'subscription_active',
          message: 'Security alerts subscription active'
        }))
      }

      if (message.type === 'get_recent_alerts') {
        // Fetch recent security events
        const { data: recentEvents, error } = await supabase
          .from('security_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching recent alerts:', error)
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Failed to fetch recent alerts'
          }))
          return
        }

        const alerts: SecurityAlert[] = recentEvents.map(event => ({
          id: event.id,
          type: event.event_type,
          severity: event.severity,
          message: `Security event: ${event.event_type}`,
          metadata: event.event_data || {},
          timestamp: event.created_at
        }))

        socket.send(JSON.stringify({
          type: 'recent_alerts',
          alerts
        }))
      }

    } catch (error) {
      console.error('Error processing WebSocket message:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }))
    }
  }

  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  socket.onclose = () => {
    console.log('Security alerts WebSocket closed')
  }

  return response
})