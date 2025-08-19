/**
 * Production-ready rate limiting system
 */
import { productionLogger } from '@/utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStatus {
  isAllowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  retryAfter?: number;
}

class ProductionRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if request is allowed and update counters
   */
  checkLimit(
    identifier: string, 
    config: RateLimitConfig
  ): RateLimitStatus {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create counter for this key
    let counter = this.store.get(key);
    
    // Reset counter if window has expired
    if (!counter || counter.resetTime <= now) {
      counter = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.store.set(key, counter);
    }

    // Check if limit exceeded
    const isAllowed = counter.count < config.maxRequests;
    
    if (isAllowed) {
      counter.count++;
    }

    const remainingRequests = Math.max(0, config.maxRequests - counter.count);
    const resetTime = new Date(counter.resetTime);
    const retryAfter = isAllowed ? undefined : Math.ceil((counter.resetTime - now) / 1000);

    // Log rate limit violations
    if (!isAllowed) {
      productionLogger.warn(`Rate limit exceeded for ${identifier}`, {
        key,
        count: counter.count,
        limit: config.maxRequests,
        resetTime: resetTime.toISOString()
      });
    }

    return {
      isAllowed,
      remainingRequests,
      resetTime,
      retryAfter
    };
  }

  /**
   * Reset rate limit for specific identifier
   */
  reset(identifier: string, keyGenerator?: (id: string) => string): boolean {
    const key = keyGenerator ? keyGenerator(identifier) : identifier;
    const deleted = this.store.delete(key);
    
    if (deleted) {
      productionLogger.log(`Rate limit reset for ${identifier}`);
    }
    
    return deleted;
  }

  /**
   * Get current status without incrementing counter
   */
  getStatus(
    identifier: string, 
    config: RateLimitConfig
  ): RateLimitStatus {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    
    const counter = this.store.get(key);
    
    if (!counter || counter.resetTime <= now) {
      return {
        isAllowed: true,
        remainingRequests: config.maxRequests,
        resetTime: new Date(now + config.windowMs)
      };
    }

    const remainingRequests = Math.max(0, config.maxRequests - counter.count);
    const isAllowed = counter.count < config.maxRequests;
    const retryAfter = isAllowed ? undefined : Math.ceil((counter.resetTime - now) / 1000);

    return {
      isAllowed,
      remainingRequests,
      resetTime: new Date(counter.resetTime),
      retryAfter
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, counter] of this.store.entries()) {
      if (counter.resetTime <= now) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      productionLogger.log(`Rate limiter cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const counter of this.store.values()) {
      if (counter.resetTime > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries,
      expiredEntries,
      memoryUsage: this.store.size * 64 // Rough estimate
    };
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    productionLogger.log(`Rate limiter cleared ${size} entries`);
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Common rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  API_STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50
  },
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  FILE_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  SEARCH_QUERIES: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  }
} as const;

// Create rate limiter instances for different purposes
export const apiRateLimiter = new ProductionRateLimiter();
export const authRateLimiter = new ProductionRateLimiter();
export const uploadRateLimiter = new ProductionRateLimiter();

export type { RateLimitConfig, RateLimitStatus };