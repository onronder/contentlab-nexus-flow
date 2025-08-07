/**
 * Rate Limit Service implementing Token Bucket algorithm
 * Provides intelligent rate limiting to prevent API quota exhaustion
 */

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // milliseconds
}

export interface RateLimitStatus {
  tokensAvailable: number;
  maxTokens: number;
  refillRate: number;
  nextRefill: Date;
  isThrottled: boolean;
  estimatedWaitTime: number;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private tokens: number;
  private lastRefill: number;
  private refillTimer: NodeJS.Timeout | null = null;
  
  // Default configuration for OpenAI API
  private config: RateLimitConfig = {
    maxTokens: 50, // Conservative limit
    refillRate: 1, // 1 token per second
    refillInterval: 1000 // 1 second
  };

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private constructor() {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
    this.startRefillTimer();
  }

  /**
   * Start the token refill timer
   */
  private startRefillTimer() {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
    }

    this.refillTimer = setInterval(() => {
      this.refillTokens();
    }, this.config.refillInterval);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens() {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000) * this.config.refillRate;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokens + tokensToAdd, this.config.maxTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Attempt to consume tokens for a request
   */
  async consumeToken(cost: number = 1): Promise<boolean> {
    this.refillTokens(); // Update tokens first
    
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    
    return false;
  }

  /**
   * Wait for tokens to become available
   */
  async waitForTokens(cost: number = 1): Promise<void> {
    while (!(await this.consumeToken(cost))) {
      const waitTime = this.calculateWaitTime(cost);
      await this.delay(Math.min(waitTime, 5000)); // Max 5 second wait
    }
  }

  /**
   * Calculate estimated wait time for tokens
   */
  private calculateWaitTime(cost: number): number {
    this.refillTokens();
    
    if (this.tokens >= cost) {
      return 0;
    }
    
    const tokensNeeded = cost - this.tokens;
    const timeNeeded = (tokensNeeded / this.config.refillRate) * 1000;
    
    return Math.ceil(timeNeeded);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.refillTokens();
    
    return {
      tokensAvailable: this.tokens,
      maxTokens: this.config.maxTokens,
      refillRate: this.config.refillRate,
      nextRefill: new Date(this.lastRefill + this.config.refillInterval),
      isThrottled: this.tokens < 1,
      estimatedWaitTime: this.calculateWaitTime(1)
    };
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart timer with new interval if changed
    if (newConfig.refillInterval) {
      this.startRefillTimer();
    }
    
    // Adjust current tokens if max changed
    if (newConfig.maxTokens && this.tokens > newConfig.maxTokens) {
      this.tokens = newConfig.maxTokens;
    }
  }

  /**
   * Reset tokens to maximum (for emergency situations)
   */
  resetTokens() {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Check if we can make a request without waiting
   */
  canMakeRequest(cost: number = 1): boolean {
    this.refillTokens();
    return this.tokens >= cost;
  }

  /**
   * Get estimated time until we can make a request
   */
  getEstimatedWaitTime(cost: number = 1): number {
    return this.calculateWaitTime(cost);
  }

  /**
   * Adaptive rate limiting based on API response
   */
  adaptRateLimit(response: {
    status: number;
    headers: Record<string, string>;
  }) {
    // Adjust rate limits based on API response headers
    const remaining = response.headers['x-ratelimit-remaining-requests'];
    const limit = response.headers['x-ratelimit-limit-requests'];
    const resetTime = response.headers['x-ratelimit-reset-requests'];
    
    if (remaining && limit) {
      const remainingRequests = parseInt(remaining);
      const totalLimit = parseInt(limit);
      const utilizationRate = (totalLimit - remainingRequests) / totalLimit;
      
      // Adjust token bucket based on API utilization
      if (utilizationRate > 0.8) {
        // High utilization - be more conservative
        this.updateConfig({
          maxTokens: Math.max(this.config.maxTokens * 0.8, 10),
          refillRate: Math.max(this.config.refillRate * 0.8, 0.5)
        });
      } else if (utilizationRate < 0.3) {
        // Low utilization - can be more aggressive
        this.updateConfig({
          maxTokens: Math.min(this.config.maxTokens * 1.1, 100),
          refillRate: Math.min(this.config.refillRate * 1.1, 2)
        });
      }
    }
    
    // Handle rate limit responses
    if (response.status === 429) {
      // Significantly reduce rate on 429
      this.updateConfig({
        maxTokens: Math.max(this.config.maxTokens * 0.5, 5),
        refillRate: Math.max(this.config.refillRate * 0.5, 0.2)
      });
      
      // Empty the bucket to force waiting
      this.tokens = 0;
    }
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    const status = this.getStatus();
    return {
      ...status,
      config: { ...this.config },
      utilization: (this.config.maxTokens - status.tokensAvailable) / this.config.maxTokens
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimitService = RateLimitService.getInstance();