import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface ThreatPrediction {
  threatType: string
  probability: number
  timeFrame: string
  confidence: number
  mitigationStrategies: string[]
}

interface SecurityTrend {
  metric: string
  trend: 'increasing' | 'decreasing' | 'stable'
  changePercent: number
  prediction: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handlePredictiveAnalytics(req: Request, logger: SecurityLogger): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { analysisType = 'comprehensive', timeRange = 30, teamId } = await req.json()

    logger.info('Starting predictive security analytics', { analysisType, timeRange, teamId })

    // Get historical security data
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000))

    const whereClause = teamId ? { team_id: teamId } : {}

    const { data: securityEvents, error: eventsError } = await supabase
      .from('security_events')
      .select('*')
      .match(whereClause)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (eventsError) {
      logger.error('Failed to fetch security events', eventsError)
      throw eventsError
    }

    const { data: behavioralData, error: behaviorError } = await supabase
      .from('behavioral_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (behaviorError) {
      logger.error('Failed to fetch behavioral data', behaviorError)
    }

    // Perform predictive analysis
    const threatPredictions = analyzeThreatPatterns(securityEvents || [])
    const securityTrends = analyzeSecurityTrends(securityEvents || [])
    const riskScore = calculateOverallRiskScore(securityEvents || [], behavioralData || [])
    const recommendations = generatePredictiveRecommendations(threatPredictions, securityTrends, riskScore)

    // Store predictions for tracking accuracy
    for (const prediction of threatPredictions) {
      await supabase.from('analytics_predictions').insert({
        team_id: teamId,
        prediction_type: prediction.threatType,
        prediction_data: prediction,
        confidence_level: prediction.confidence,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
    }

    const result = {
      threatPredictions,
      securityTrends,
      overallRiskScore: riskScore,
      recommendations,
      analysisTimestamp: new Date().toISOString(),
      dataPoints: securityEvents?.length || 0
    }

    logger.info('Predictive analytics completed', {
      threatCount: threatPredictions.length,
      riskScore,
      dataPoints: securityEvents?.length || 0
    })

    return new Response(JSON.stringify({
      success: true,
      analytics: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    logger.error('Predictive analytics failed', error as Error)
    
    return new Response(JSON.stringify({
      error: 'Failed to perform predictive analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function analyzeThreatPatterns(events: any[]): ThreatPrediction[] {
  const predictions: ThreatPrediction[] = []
  
  // Group events by type and analyze patterns
  const eventsByType = events.reduce((acc, event) => {
    const type = event.event_type || 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(event)
    return acc
  }, {} as Record<string, any[]>)

  // Analyze brute force attack patterns
  const loginFailures = eventsByType['login_failed'] || []
  if (loginFailures.length > 0) {
    const recentFailures = loginFailures.filter(event => 
      new Date(event.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
    
    if (recentFailures.length >= 3) {
      predictions.push({
        threatType: 'brute_force_attack',
        probability: Math.min(recentFailures.length / 10, 0.95),
        timeFrame: '24 hours',
        confidence: 0.8,
        mitigationStrategies: [
          'Enable account lockout after failed attempts',
          'Implement CAPTCHA verification',
          'Monitor and block suspicious IP addresses'
        ]
      })
    }
  }

  // Analyze privilege escalation attempts
  const permissionDenied = eventsByType['permission_denied'] || []
  if (permissionDenied.length >= 2) {
    predictions.push({
      threatType: 'privilege_escalation',
      probability: Math.min(permissionDenied.length / 20, 0.85),
      timeFrame: '48 hours',
      confidence: 0.7,
      mitigationStrategies: [
        'Review user permissions and access controls',
        'Implement least privilege principle',
        'Monitor administrative actions closely'
      ]
    })
  }

  // Analyze data exfiltration patterns
  const suspiciousDownloads = events.filter(event => 
    event.event_type === 'file_download' && 
    event.event_data?.file_size > 100 * 1024 * 1024 // > 100MB
  )
  
  if (suspiciousDownloads.length >= 3) {
    predictions.push({
      threatType: 'data_exfiltration',
      probability: Math.min(suspiciousDownloads.length / 15, 0.9),
      timeFrame: '72 hours',
      confidence: 0.75,
      mitigationStrategies: [
        'Implement data loss prevention (DLP) controls',
        'Monitor large file transfers',
        'Restrict download permissions for sensitive data'
      ]
    })
  }

  return predictions
}

function analyzeSecurityTrends(events: any[]): SecurityTrend[] {
  const trends: SecurityTrend[] = []
  
  // Analyze trends over the last 7 days vs previous 7 days
  const now = new Date()
  const week1End = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const week2End = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const currentWeek = events.filter(e => new Date(e.created_at) >= week1End)
  const previousWeek = events.filter(e => 
    new Date(e.created_at) >= week2End && new Date(e.created_at) < week1End
  )

  // Failed login attempts trend
  const currentFailures = currentWeek.filter(e => e.event_type === 'login_failed').length
  const previousFailures = previousWeek.filter(e => e.event_type === 'login_failed').length
  
  if (previousFailures > 0) {
    const changePercent = ((currentFailures - previousFailures) / previousFailures) * 100
    trends.push({
      metric: 'failed_login_attempts',
      trend: changePercent > 10 ? 'increasing' : changePercent < -10 ? 'decreasing' : 'stable',
      changePercent: Math.round(changePercent),
      prediction: currentFailures + (changePercent / 100 * currentFailures)
    })
  }

  // Security events frequency
  const changePercent = previousWeek.length > 0 
    ? ((currentWeek.length - previousWeek.length) / previousWeek.length) * 100
    : 0

  trends.push({
    metric: 'total_security_events',
    trend: changePercent > 15 ? 'increasing' : changePercent < -15 ? 'decreasing' : 'stable',
    changePercent: Math.round(changePercent),
    prediction: currentWeek.length + (changePercent / 100 * currentWeek.length)
  })

  return trends
}

function calculateOverallRiskScore(events: any[], behavioralData: any[]): number {
  let score = 0
  
  // Recent critical events (last 24 hours)
  const recentCritical = events.filter(e => 
    e.severity === 'critical' && 
    new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length
  
  score += recentCritical * 0.3

  // High-risk behavioral patterns
  const highRiskBehavior = behavioralData.filter(b => b.risk_score > 0.7).length
  score += highRiskBehavior * 0.2

  // Event frequency in last week
  const weeklyEvents = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length
  
  score += Math.min(weeklyEvents / 100, 0.5)

  return Math.min(score, 1)
}

function generatePredictiveRecommendations(
  predictions: ThreatPrediction[], 
  trends: SecurityTrend[], 
  riskScore: number
): string[] {
  const recommendations: string[] = []

  // High-risk predictions
  const highRiskPredictions = predictions.filter(p => p.probability > 0.7)
  if (highRiskPredictions.length > 0) {
    recommendations.push('Immediate action required: High-probability threats detected')
    recommendations.push('Review and implement suggested mitigation strategies')
  }

  // Increasing security trends
  const increasingTrends = trends.filter(t => t.trend === 'increasing' && t.changePercent > 20)
  if (increasingTrends.length > 0) {
    recommendations.push('Security incidents are trending upward - review security policies')
  }

  // Overall risk score
  if (riskScore > 0.8) {
    recommendations.push('Critical: Overall security risk is very high')
    recommendations.push('Conduct immediate security review and implement additional controls')
  } else if (riskScore > 0.6) {
    recommendations.push('Warning: Elevated security risk detected')
    recommendations.push('Consider strengthening security measures')
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Security posture appears stable')
    recommendations.push('Continue monitoring and maintaining current security practices')
  }

  return recommendations
}

export default withSecurity(handlePredictiveAnalytics, {
  requireAuth: false,
  rateLimitRequests: 30,
  rateLimitWindow: 60000,
  enableCORS: true
})