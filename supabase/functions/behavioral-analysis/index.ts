import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface BehaviorAnalysis {
  userId: string
  patterns: {
    loginTimes: number[]
    deviceTypes: string[]
    ipAddresses: string[]
    actionFrequency: Record<string, number>
  }
  anomalyScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handleBehavioralAnalysis(req: Request, logger: SecurityLogger): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { userId, timeRange = 30 } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.info('Starting behavioral analysis', { userId, timeRange })

    // Get user activity data from the last timeRange days
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000))

    const { data: activities, error: activitiesError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (activitiesError) {
      logger.error('Failed to fetch user activities', activitiesError)
      throw activitiesError
    }

    // Get security events for the user
    const { data: securityEvents, error: securityError } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    if (securityError) {
      logger.error('Failed to fetch security events', securityError)
    }

    // Analyze behavioral patterns
    const analysis = analyzeBehaviorPatterns(activities || [], securityEvents || [])
    
    // Calculate anomaly score using ML-like algorithms
    const anomalyScore = calculateAnomalyScore(analysis.patterns)
    
    // Determine risk level
    const riskLevel = determineRiskLevel(anomalyScore, securityEvents?.length || 0)
    
    // Generate recommendations
    const recommendations = generateRecommendations(analysis.patterns, riskLevel)

    const result: BehaviorAnalysis = {
      userId,
      patterns: analysis.patterns,
      anomalyScore,
      riskLevel,
      recommendations
    }

    // Store analysis results
    await supabase.from('behavioral_analytics').insert({
      user_id: userId,
      behavior_type: 'comprehensive_analysis',
      behavior_data: result,
      risk_score: anomalyScore,
      anomaly_detected: anomalyScore > 0.7,
      processed_at: new Date().toISOString()
    })

    logger.info('Behavioral analysis completed', {
      userId,
      anomalyScore,
      riskLevel,
      recommendationCount: recommendations.length
    })

    return new Response(JSON.stringify({
      success: true,
      analysis: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    logger.error('Behavioral analysis failed', error as Error)
    
    return new Response(JSON.stringify({
      error: 'Failed to perform behavioral analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function analyzeBehaviorPatterns(activities: any[], securityEvents: any[]) {
  const patterns = {
    loginTimes: [] as number[],
    deviceTypes: [] as string[],
    ipAddresses: [] as string[],
    actionFrequency: {} as Record<string, number>
  }

  activities.forEach(activity => {
    // Extract login times (hour of day)
    if (activity.action === 'login' || activity.action === 'session_created') {
      const hour = new Date(activity.created_at).getHours()
      patterns.loginTimes.push(hour)
    }

    // Extract device types from user agent
    if (activity.user_agent) {
      const deviceType = extractDeviceType(activity.user_agent)
      if (deviceType && !patterns.deviceTypes.includes(deviceType)) {
        patterns.deviceTypes.push(deviceType)
      }
    }

    // Extract IP addresses
    if (activity.ip_address && !patterns.ipAddresses.includes(activity.ip_address)) {
      patterns.ipAddresses.push(activity.ip_address)
    }

    // Count action frequencies
    if (activity.action) {
      patterns.actionFrequency[activity.action] = (patterns.actionFrequency[activity.action] || 0) + 1
    }
  })

  return { patterns }
}

function extractDeviceType(userAgent: string): string {
  if (!userAgent) return 'unknown'
  
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return 'mobile'
  } else if (/Tablet/i.test(userAgent)) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

function calculateAnomalyScore(patterns: BehaviorAnalysis['patterns']): number {
  let score = 0
  let factors = 0

  // Unusual login times (outside of 6 AM - 11 PM)
  const unusualLoginTimes = patterns.loginTimes.filter(hour => hour < 6 || hour > 23)
  if (unusualLoginTimes.length > 0) {
    score += (unusualLoginTimes.length / patterns.loginTimes.length) * 0.3
    factors++
  }

  // Multiple device types (higher risk)
  if (patterns.deviceTypes.length > 3) {
    score += 0.4
    factors++
  }

  // Multiple IP addresses (potential account sharing or compromise)
  if (patterns.ipAddresses.length > 5) {
    score += 0.5
    factors++
  }

  // High activity frequency (potential bot behavior)
  const totalActions = Object.values(patterns.actionFrequency).reduce((sum, count) => sum + count, 0)
  if (totalActions > 1000) {
    score += 0.3
    factors++
  }

  // Normalize score
  return factors > 0 ? Math.min(score / factors, 1) : 0
}

function determineRiskLevel(anomalyScore: number, securityEventCount: number): 'low' | 'medium' | 'high' | 'critical' {
  if (anomalyScore >= 0.8 || securityEventCount >= 10) {
    return 'critical'
  } else if (anomalyScore >= 0.6 || securityEventCount >= 5) {
    return 'high'
  } else if (anomalyScore >= 0.4 || securityEventCount >= 2) {
    return 'medium'
  } else {
    return 'low'
  }
}

function generateRecommendations(patterns: BehaviorAnalysis['patterns'], riskLevel: string): string[] {
  const recommendations: string[] = []

  if (patterns.ipAddresses.length > 3) {
    recommendations.push('Consider enabling IP address restrictions for enhanced security')
  }

  if (patterns.deviceTypes.length > 2) {
    recommendations.push('Review and remove unused device sessions regularly')
  }

  if (riskLevel === 'high' || riskLevel === 'critical') {
    recommendations.push('Enable two-factor authentication immediately')
    recommendations.push('Review recent account activity for any suspicious actions')
  }

  if (patterns.loginTimes.some(hour => hour < 6 || hour > 23)) {
    recommendations.push('Consider setting up login time restrictions')
  }

  if (recommendations.length === 0) {
    recommendations.push('Your account behavior appears normal. Continue following security best practices.')
  }

  return recommendations
}

export default withSecurity(handleBehavioralAnalysis, {
  requireAuth: false,
  rateLimitRequests: 50,
  rateLimitWindow: 60000,
  enableCORS: true
})