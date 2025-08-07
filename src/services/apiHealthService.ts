/**
 * API Health Service for monitoring OpenAI API status and health
 * Provides intelligent health checks and circuit breaker management
 */

export interface ApiHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  lastCheck: Date;
  consecutiveFailures: number;
  errorRate: number;
  quotaRemaining?: number;
  rateLimitRemaining?: number;
  resetTime?: Date;
}

export interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  error?: string;
  quotaInfo?: {
    remaining: number;
    total: number;
    resetTime: Date;
  };
}

export class ApiHealthService {
  private static instance: ApiHealthService;
  private healthStatus: ApiHealthStatus = {
    isHealthy: true,
    responseTime: 0,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    errorRate: 0
  };
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
  private recentResults: HealthCheckResult[] = [];
  private readonly MAX_RECENT_RESULTS = 10;

  static getInstance(): ApiHealthService {
    if (!ApiHealthService.instance) {
      ApiHealthService.instance = new ApiHealthService();
    }
    return ApiHealthService.instance;
  }

  private constructor() {
    this.startHealthChecks();
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Perform a health check against OpenAI API
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple health check using a minimal API call
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getOpenAIKey()}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.HEALTH_CHECK_TIMEOUT)
      });

      const responseTime = Date.now() - startTime;
      const success = response.ok;

      const result: HealthCheckResult = {
        success,
        responseTime,
      };

      // Extract rate limit information from headers
      if (response.headers.has('x-ratelimit-remaining-requests')) {
        result.quotaInfo = {
          remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests') || '0'),
          total: parseInt(response.headers.get('x-ratelimit-limit-requests') || '0'),
          resetTime: new Date(response.headers.get('x-ratelimit-reset-requests') || Date.now())
        };
      }

      if (!success) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      this.updateHealthStatus(result);
      this.addRecentResult(result);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.updateHealthStatus(result);
      this.addRecentResult(result);
      
      return result;
    }
  }

  /**
   * Update internal health status based on check result
   */
  private updateHealthStatus(result: HealthCheckResult) {
    if (result.success) {
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.isHealthy = true;
    } else {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.isHealthy = this.healthStatus.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES;
    }

    this.healthStatus.responseTime = result.responseTime;
    this.healthStatus.lastCheck = new Date();
    
    // Update quota information if available
    if (result.quotaInfo) {
      this.healthStatus.quotaRemaining = result.quotaInfo.remaining;
      this.healthStatus.rateLimitRemaining = result.quotaInfo.remaining;
      this.healthStatus.resetTime = result.quotaInfo.resetTime;
    }

    // Calculate error rate from recent results
    this.updateErrorRate();
  }

  /**
   * Calculate error rate from recent results
   */
  private updateErrorRate() {
    if (this.recentResults.length === 0) {
      this.healthStatus.errorRate = 0;
      return;
    }

    const failures = this.recentResults.filter(r => !r.success).length;
    this.healthStatus.errorRate = failures / this.recentResults.length;
  }

  /**
   * Add result to recent results tracking
   */
  private addRecentResult(result: HealthCheckResult) {
    this.recentResults.push(result);
    
    // Keep only the most recent results
    if (this.recentResults.length > this.MAX_RECENT_RESULTS) {
      this.recentResults = this.recentResults.slice(-this.MAX_RECENT_RESULTS);
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ApiHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Check if API is currently healthy
   */
  isHealthy(): boolean {
    return this.healthStatus.isHealthy && this.healthStatus.errorRate < 0.5;
  }

  /**
   * Check if circuit breaker should be opened
   */
  shouldOpenCircuitBreaker(): boolean {
    return !this.isHealthy() || this.healthStatus.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES;
  }

  /**
   * Check if circuit breaker can be closed (API is healthy again)
   */
  canCloseCircuitBreaker(): boolean {
    return this.isHealthy() && this.healthStatus.consecutiveFailures === 0;
  }

  /**
   * Get API usage metrics
   */
  getApiMetrics() {
    return {
      healthStatus: this.getHealthStatus(),
      recentResults: [...this.recentResults],
      averageResponseTime: this.calculateAverageResponseTime(),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Calculate average response time from recent results
   */
  private calculateAverageResponseTime(): number {
    if (this.recentResults.length === 0) return 0;
    
    const totalTime = this.recentResults.reduce((sum, result) => sum + result.responseTime, 0);
    return totalTime / this.recentResults.length;
  }

  /**
   * Calculate success rate from recent results
   */
  private calculateSuccessRate(): number {
    if (this.recentResults.length === 0) return 1;
    
    const successCount = this.recentResults.filter(r => r.success).length;
    return successCount / this.recentResults.length;
  }

  /**
   * Force a health check immediately
   */
  async forceHealthCheck(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  /**
   * Stop health checks (for cleanup)
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get OpenAI API key (fallback for edge functions)
   */
  private getOpenAIKey(): string {
    // In production, this would be handled by edge functions
    // This is a fallback for health checks
    return 'dummy-key-for-health-check';
  }
}

export const apiHealthService = ApiHealthService.getInstance();
