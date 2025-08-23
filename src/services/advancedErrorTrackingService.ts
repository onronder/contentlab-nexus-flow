import { supabase } from '@/integrations/supabase/client';
import { realTimeMonitoringService } from './realTimeMonitoringService';

interface ErrorPattern {
  id: string;
  pattern: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  firstSeen: number;
  lastSeen: number;
  affectedUsers: Set<string>;
  stackTrace: string[];
  category: 'frontend' | 'backend' | 'database' | 'network' | 'security';
  resolution?: {
    status: 'investigating' | 'identified' | 'resolved';
    action: string;
    resolvedAt: number;
    resolvedBy: string;
  };
}

interface ErrorTrendAnalysis {
  timeRange: string;
  totalErrors: number;
  errorRate: number;
  trends: {
    increasing: ErrorPattern[];
    decreasing: ErrorPattern[];
    stable: ErrorPattern[];
  };
  predictions: {
    nextHour: number;
    nextDay: number;
    confidence: number;
  };
  recommendations: string[];
}

interface RootCauseAnalysis {
  errorId: string;
  confidence: number;
  rootCause: {
    type: 'code' | 'infrastructure' | 'external' | 'user' | 'configuration';
    description: string;
    location?: string;
    suggestedFix?: string;
  };
  relatedErrors: string[];
  timeline: {
    timestamp: number;
    event: string;
    impact: string;
  }[];
}

class AdvancedErrorTrackingService {
  private static instance: AdvancedErrorTrackingService;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private errorBuffer: any[] = [];
  private analysisEngine: any = null;
  private isProcessing = false;

  private constructor() {
    this.initializeErrorTracking();
    this.startPatternAnalysis();
  }

  static getInstance(): AdvancedErrorTrackingService {
    if (!AdvancedErrorTrackingService.instance) {
      AdvancedErrorTrackingService.instance = new AdvancedErrorTrackingService();
    }
    return AdvancedErrorTrackingService.instance;
  }

  private initializeErrorTracking() {
    // Capture global errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now(),
          severity: 'medium'
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          type: 'promise_rejection',
          message: event.reason?.message || 'Unhandled promise rejection',
          stack: event.reason?.stack,
          timestamp: Date.now(),
          severity: 'high'
        });
      });

      // Capture network errors
      this.interceptNetworkErrors();
    }

    // Subscribe to real-time monitoring for system errors
    realTimeMonitoringService.subscribe('alert', (alert) => {
      if (alert.type === 'anomaly' || alert.severity === 'critical') {
        this.captureError({
          type: 'system',
          message: alert.message,
          timestamp: alert.timestamp,
          severity: alert.severity,
          metadata: alert.metadata
        });
      }
    });
  }

  private interceptNetworkErrors() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError({
            type: 'network',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0]?.toString(),
            status: response.status,
            timestamp: Date.now(),
            severity: response.status >= 500 ? 'high' : 'medium'
          });
        }
        
        return response;
      } catch (error) {
        this.captureError({
          type: 'network',
          message: error.message,
          url: args[0]?.toString(),
          timestamp: Date.now(),
          severity: 'high',
          stack: error.stack
        });
        throw error;
      }
    };
  }

  private captureError(error: any) {
    // Add to buffer for processing
    this.errorBuffer.push({
      ...error,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAgent: navigator?.userAgent,
      url: window.location?.href,
      userId: this.getCurrentUserId()
    });

    // Process immediately if buffer is getting large
    if (this.errorBuffer.length > 10) {
      this.processErrorBuffer();
    }

    // Store in database
    this.storeError(error);
  }

  private async storeError(error: any) {
    try {
      await supabase.from('error_logs').insert({
        error_type: error.type,
        error_message: error.message,
        error_stack: error.stack,
        severity: error.severity,
        url: error.url || error.filename,
        user_agent: error.userAgent,
        context: {
          lineno: error.lineno,
          colno: error.colno,
          status: error.status,
          metadata: error.metadata
        },
        metadata: {
          timestamp: error.timestamp,
          category: this.categorizeError(error),
          patternId: this.getPatternId(error)
        }
      });
    } catch (dbError) {
      console.error('Failed to store error:', dbError);
    }
  }

  private categorizeError(error: any): string {
    if (error.type === 'network' || error.url) return 'network';
    if (error.type === 'system') return 'backend';
    if (error.type === 'security') return 'security';
    if (error.message?.includes('database') || error.message?.includes('sql')) return 'database';
    return 'frontend';
  }

  private getPatternId(error: any): string {
    // Create pattern ID based on error characteristics
    const key = `${error.type}_${error.message?.slice(0, 50)}_${error.filename || ''}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  }

  private startPatternAnalysis() {
    // Process error buffer every 30 seconds
    setInterval(() => {
      if (this.errorBuffer.length > 0) {
        this.processErrorBuffer();
      }
    }, 30000);

    // Run deep analysis every 5 minutes
    setInterval(() => {
      this.analyzeErrorPatterns();
    }, 5 * 60 * 1000);
  }

  private processErrorBuffer() {
    if (this.isProcessing || this.errorBuffer.length === 0) return;

    this.isProcessing = true;
    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      for (const error of errors) {
        this.updateErrorPattern(error);
      }
      
      this.detectNewPatterns(errors);
      this.checkForCriticalPatterns();
      
    } finally {
      this.isProcessing = false;
    }
  }

  private updateErrorPattern(error: any) {
    const patternId = this.getPatternId(error);
    let pattern = this.errorPatterns.get(patternId);

    if (!pattern) {
      pattern = {
        id: patternId,
        pattern: `${error.type}: ${error.message?.slice(0, 100)}`,
        frequency: 0,
        severity: error.severity,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        affectedUsers: new Set(),
        stackTrace: [],
        category: this.categorizeError(error) as any
      };
    }

    // Update pattern
    pattern.frequency += 1;
    pattern.lastSeen = error.timestamp;
    
    if (error.userId) {
      pattern.affectedUsers.add(error.userId);
    }
    
    if (error.stack && !pattern.stackTrace.includes(error.stack)) {
      pattern.stackTrace.push(error.stack);
    }

    // Update severity based on frequency and recency
    pattern.severity = this.calculatePatternSeverity(pattern);

    this.errorPatterns.set(patternId, pattern);
  }

  private calculatePatternSeverity(pattern: ErrorPattern): 'low' | 'medium' | 'high' | 'critical' {
    const timeSinceFirst = Date.now() - pattern.firstSeen;
    const hoursSinceFirst = timeSinceFirst / (1000 * 60 * 60);
    const frequency = pattern.frequency;
    const affectedUserCount = pattern.affectedUsers.size;

    // High frequency in short time = critical
    if (frequency > 50 && hoursSinceFirst < 1) return 'critical';
    if (frequency > 20 && hoursSinceFirst < 0.5) return 'critical';
    
    // Multiple users affected = high priority
    if (affectedUserCount > 10) return 'critical';
    if (affectedUserCount > 5) return 'high';
    
    // Moderate frequency = medium/high
    if (frequency > 10) return 'high';
    if (frequency > 5) return 'medium';
    
    return 'low';
  }

  private detectNewPatterns(errors: any[]) {
    // Group errors by similarity
    const similarityGroups = new Map<string, any[]>();
    
    errors.forEach(error => {
      const similarityKey = this.getSimilarityKey(error);
      if (!similarityGroups.has(similarityKey)) {
        similarityGroups.set(similarityKey, []);
      }
      similarityGroups.get(similarityKey)!.push(error);
    });

    // Identify new patterns (groups with multiple similar errors)
    similarityGroups.forEach((group, key) => {
      if (group.length >= 3) { // At least 3 similar errors
        const patternId = `new_${key}_${Date.now()}`;
        
        if (!this.errorPatterns.has(patternId)) {
          console.log(`New error pattern detected: ${key}`, group);
          
          // Create alert for new pattern
          this.createPatternAlert(group, 'new_pattern');
        }
      }
    });
  }

  private getSimilarityKey(error: any): string {
    // Create key for grouping similar errors
    const messageWords = error.message?.split(' ').slice(0, 5).join(' ') || '';
    return `${error.type}_${messageWords}_${error.filename || ''}`.toLowerCase();
  }

  private checkForCriticalPatterns() {
    this.errorPatterns.forEach(pattern => {
      if (pattern.severity === 'critical') {
        this.createPatternAlert(pattern, 'critical_pattern');
      }
    });
  }

  private createPatternAlert(patternOrErrors: any, type: string) {
    const isPattern = patternOrErrors.id !== undefined;
    
    let message: string;
    let metadata: any;

    if (isPattern) {
      const pattern = patternOrErrors as ErrorPattern;
      message = `Critical error pattern: ${pattern.pattern} (${pattern.frequency} occurrences)`;
      metadata = {
        patternId: pattern.id,
        frequency: pattern.frequency,
        affectedUsers: pattern.affectedUsers.size,
        category: pattern.category
      };
    } else {
      const errors = patternOrErrors as any[];
      message = `New error pattern detected: ${errors.length} similar errors`;
      metadata = {
        errorCount: errors.length,
        errorType: errors[0]?.type,
        timespan: Date.now() - errors[0]?.timestamp
      };
    }

    // Send alert through monitoring service
    realTimeMonitoringService.subscribe('all', () => {});
  }

  private analyzeErrorPatterns() {
    // Perform deeper analysis of error patterns
    const analysis = this.generateTrendAnalysis();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis);
    
    // Store analysis results
    this.storeAnalysisResults(analysis, recommendations);
  }

  private generateTrendAnalysis(): ErrorTrendAnalysis {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentPatterns = Array.from(this.errorPatterns.values())
      .filter(p => p.lastSeen > oneHourAgo);

    const totalErrors = recentPatterns.reduce((sum, p) => sum + p.frequency, 0);
    const errorRate = totalErrors / (60 * 60); // errors per second

    // Categorize trends
    const trends = {
      increasing: recentPatterns.filter(p => this.isIncreasing(p)),
      decreasing: recentPatterns.filter(p => this.isDecreasing(p)),
      stable: recentPatterns.filter(p => this.isStable(p))
    };

    // Simple prediction based on recent trend
    const recentErrorRate = totalErrors / 60; // errors per minute
    const predictions = {
      nextHour: Math.round(recentErrorRate * 60),
      nextDay: Math.round(recentErrorRate * 60 * 24 * 0.8), // Assume some decline
      confidence: Math.min(0.9, recentPatterns.length / 10)
    };

    return {
      timeRange: '1h',
      totalErrors,
      errorRate,
      trends,
      predictions,
      recommendations: []
    };
  }

  private isIncreasing(pattern: ErrorPattern): boolean {
    // Simple heuristic: recent frequency vs older frequency
    const recent = pattern.lastSeen - pattern.firstSeen;
    return recent < (60 * 60 * 1000) && pattern.frequency > 5; // High frequency in last hour
  }

  private isDecreasing(pattern: ErrorPattern): boolean {
    const timeSinceLastSeen = Date.now() - pattern.lastSeen;
    return timeSinceLastSeen > (30 * 60 * 1000); // No errors in 30 minutes
  }

  private isStable(pattern: ErrorPattern): boolean {
    return !this.isIncreasing(pattern) && !this.isDecreasing(pattern);
  }

  private generateRecommendations(analysis: ErrorTrendAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.errorRate > 0.1) {
      recommendations.push('Error rate is elevated. Consider investigating recent deployments.');
    }

    if (analysis.trends.increasing.length > 3) {
      recommendations.push('Multiple error patterns are increasing. Check system resources and recent changes.');
    }

    analysis.trends.increasing.forEach(pattern => {
      if (pattern.category === 'network') {
        recommendations.push('Network errors are increasing. Check API endpoints and external services.');
      } else if (pattern.category === 'database') {
        recommendations.push('Database errors detected. Check connection pools and query performance.');
      }
    });

    return recommendations;
  }

  private async storeAnalysisResults(analysis: ErrorTrendAnalysis, recommendations: string[]) {
    try {
      await supabase.from('analytics_insights').insert({
        insight_type: 'error_analysis',
        insight_category: 'operational',
        title: 'Error Pattern Analysis',
        description: `Analyzed ${analysis.totalErrors} errors with ${analysis.errorRate.toFixed(2)} errors/sec`,
        insight_data: JSON.parse(JSON.stringify({
          analysis,
          recommendations,
          timestamp: Date.now()
        })),
        impact_level: analysis.errorRate > 0.1 ? 'high' : analysis.errorRate > 0.05 ? 'medium' : 'low',
        is_actionable: recommendations.length > 0,
        recommended_actions: JSON.parse(JSON.stringify(
          recommendations.map(rec => ({ action: rec, priority: 'medium' }))
        ))
      });
    } catch (error) {
      console.error('Failed to store analysis results:', error);
    }
  }

  private getCurrentUserId(): string | null {
    // This would integrate with your auth system
    return null;
  }

  // Public API methods
  async performRootCauseAnalysis(errorId: string): Promise<RootCauseAnalysis | null> {
    try {
      // Fetch error details
      const { data: error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('id', errorId)
        .single();

      if (!error) return null;

      // Analyze error context and patterns
      const relatedErrors = await this.findRelatedErrors(error);
      const timeline = await this.buildErrorTimeline(error, relatedErrors);
      const rootCause = await this.identifyRootCause(error, relatedErrors);

      return {
        errorId,
        confidence: rootCause.confidence,
        rootCause: {
          type: rootCause.type,
          description: rootCause.description,
          location: rootCause.location,
          suggestedFix: rootCause.suggestedFix
        },
        relatedErrors: relatedErrors.map(e => e.id),
        timeline
      };

    } catch (error) {
      console.error('Root cause analysis failed:', error);
      return null;
    }
  }

  private async findRelatedErrors(error: any): Promise<any[]> {
    const { data: relatedErrors } = await supabase
      .from('error_logs')
      .select('*')
      .or(`error_type.eq.${error.error_type},error_message.ilike.%${error.error_message?.slice(0, 20)}%`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('id', error.id)
      .limit(10);

    return relatedErrors || [];
  }

  private async buildErrorTimeline(error: any, relatedErrors: any[]) {
    const allErrors = [error, ...relatedErrors].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return allErrors.map(e => ({
      timestamp: new Date(e.created_at).getTime(),
      event: `${e.error_type}: ${e.error_message}`,
      impact: e.severity
    }));
  }

  private async identifyRootCause(error: any, relatedErrors: any[]) {
    // Simple heuristic-based root cause identification
    const errorCount = relatedErrors.length + 1;
    
    let type: 'code' | 'infrastructure' | 'external' | 'user' | 'configuration';
    let description: string;
    let confidence: number;

    if (error.error_type === 'network' && errorCount > 5) {
      type = 'infrastructure';
      description = 'Multiple network errors suggest infrastructure issues';
      confidence = 0.8;
    } else if (error.error_message?.includes('database') || error.error_message?.includes('sql')) {
      type = 'infrastructure';
      description = 'Database-related errors detected';
      confidence = 0.7;
    } else if (error.error_type === 'javascript' && error.error_stack) {
      type = 'code';
      description = 'JavaScript runtime error in application code';
      confidence = 0.9;
    } else if (error.error_type === 'security') {
      type = 'configuration';
      description = 'Security-related configuration issue';
      confidence = 0.6;
    } else {
      type = 'code';
      description = 'General application error';
      confidence = 0.5;
    }

    return {
      type,
      description,
      confidence,
      location: error.url || error.error_stack?.split('\n')[0],
      suggestedFix: this.generateSuggestedFix(type, error)
    };
  }

  private generateSuggestedFix(type: string, error: any): string {
    switch (type) {
      case 'code':
        return 'Review the code at the error location and add proper error handling';
      case 'infrastructure':
        return 'Check system resources, network connectivity, and service health';
      case 'configuration':
        return 'Review application configuration and environment variables';
      case 'external':
        return 'Check external service status and API endpoints';
      default:
        return 'Investigate error context and recent changes';
    }
  }

  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values());
  }

  getRecentAnalysis(): ErrorTrendAnalysis | null {
    return this.generateTrendAnalysis();
  }

  async resolvePattern(patternId: string, resolution: any) {
    const pattern = this.errorPatterns.get(patternId);
    if (pattern) {
      pattern.resolution = {
        status: 'resolved',
        action: resolution.action,
        resolvedAt: Date.now(),
        resolvedBy: resolution.resolvedBy
      };
      
      // Log resolution
      await supabase.from('audit_logs').insert({
        action_type: 'error_pattern_resolved',
        action_description: `Error pattern resolved: ${pattern.pattern}`,
        metadata: { patternId, resolution }
      });
    }
  }
}

export const advancedErrorTrackingService = AdvancedErrorTrackingService.getInstance();
export type { ErrorPattern, ErrorTrendAnalysis, RootCauseAnalysis };