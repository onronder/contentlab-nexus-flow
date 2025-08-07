/**
 * Enhanced Request Queue Service for managing OpenAI API rate limiting
 * Implements intelligent circuit breaker, token bucket rate limiting, and health monitoring
 */

import { apiHealthService } from './apiHealthService';
import { rateLimitService } from './rateLimitService';

type QueuedRequest = {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  createdAt: Date;
  timeoutId?: NodeJS.Timeout;
};

type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class RequestQueueService {
  private static instance: RequestQueueService;
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between requests
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 2000; // 2 seconds base delay
  private readonly MAX_QUEUE_SIZE = 100;
  
  // Enhanced Circuit Breaker
  private circuitBreakerState: CircuitBreakerState = 'closed';
  private circuitBreakerTimeout: NodeJS.Timeout | null = null;
  private circuitBreakerOpenedAt: number | null = null;
  private consecutiveFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly HALF_OPEN_MAX_CALLS = 3;
  private halfOpenCallCount = 0;

  static getInstance(): RequestQueueService {
    if (!RequestQueueService.instance) {
      RequestQueueService.instance = new RequestQueueService();
    }
    return RequestQueueService.instance;
  }

  private constructor() {}

  /**
   * Add a request to the queue with enhanced error handling
   */
  async enqueueRequest<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check circuit breaker state
      if (this.circuitBreakerState === 'open') {
        const timeRemaining = this.getCircuitBreakerTimeRemaining();
        reject(new Error(`AI analysis service is temporarily unavailable due to repeated failures. Service will automatically retry in ${Math.ceil(timeRemaining / 60000)} minutes. If this persists, please check your OpenAI API configuration.`));
        return;
      }

      // Check rate limiting
      if (!rateLimitService.canMakeRequest()) {
        const waitTime = rateLimitService.getEstimatedWaitTime();
        if (waitTime > 30000) { // Don't queue if wait is too long
          reject(new Error(`API rate limit reached. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`));
          return;
        }
      }

      // Check queue size
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error('Analysis queue is full. Please try again later or cancel some pending requests.'));
        return;
      }

      const request: QueuedRequest = {
        id: this.generateRequestId(),
        operation,
        resolve,
        reject,
        priority,
        retries: 0,
        createdAt: new Date()
      };

      // Insert based on priority
      this.insertByPriority(request);
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Get comprehensive queue status for UI feedback
   */
  getQueueStatus() {
    const rateLimitStatus = rateLimitService.getStatus();
    const healthStatus = apiHealthService.getHealthStatus();
    
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      circuitBreakerOpen: this.circuitBreakerState === 'open',
      circuitBreakerState: this.circuitBreakerState,
      estimatedWaitTime: this.calculateEstimatedWaitTime(),
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerOpenedAt: this.circuitBreakerOpenedAt,
      circuitBreakerTimeRemaining: this.getCircuitBreakerTimeRemaining(),
      rateLimitStatus,
      healthStatus,
      apiMetrics: apiHealthService.getApiMetrics()
    };
  }

  /**
   * Clear the queue (for emergency situations)
   */
  clearQueue() {
    this.queue.forEach(request => {
      request.reject(new Error('Request cancelled due to system reset'));
    });
    this.queue = [];
    this.isProcessing = false;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      try {
        // Enforce minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
          await this.delay(delay);
        }

        // Wait for rate limit tokens
        await rateLimitService.waitForTokens();

        // Execute the request with retry logic
        const result = await this.executeWithRetry(request);
        request.resolve(result);
        
        // Handle successful request
        this.onRequestSuccess();
        
        // Update rate limiting based on response
        if (result && result.headers) {
          rateLimitService.adaptRateLimit({
            status: 200,
            headers: result.headers
          });
        }

        this.lastRequestTime = Date.now();

      } catch (error) {
        this.handleRequestError(request, error);
      }

      // Add small delay between queue items
      await this.delay(1000);
    }

    this.isProcessing = false;
  }

  private async executeWithRetry(request: QueuedRequest): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await request.operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limiting or API error
        if (this.isRateLimitError(error) || this.isApiError(error)) {
          // Update rate limiting service with error response
          if (this.isRateLimitError(error)) {
            rateLimitService.adaptRateLimit({
              status: 429,
              headers: {}
            });
          }
          
          if (attempt === this.MAX_RETRIES) {
            this.consecutiveFailures++;
            
            // Check if circuit breaker should open
            if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD || 
                apiHealthService.shouldOpenCircuitBreaker()) {
              this.openCircuitBreaker();
            }
            break;
          }

          // Calculate exponential backoff delay with jitter
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`API error, retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES + 1})`);
          await this.delay(delay);
        } else {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }

    throw lastError!;
  }

  private handleRequestError(request: QueuedRequest, error: any) {
    if (this.isRateLimitError(error) && request.retries < this.MAX_RETRIES) {
      // Re-queue with lower priority
      request.retries++;
      request.priority = 'low';
      this.insertByPriority(request);
    } else {
      request.reject(error);
    }
  }

  private insertByPriority(request: QueuedRequest) {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const insertIndex = this.queue.findIndex(
      item => priorityOrder[item.priority] > priorityOrder[request.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }
  }

  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 2000; // Up to 2 seconds jitter
    return Math.min(exponentialDelay + jitter, 120000); // Max 2 minutes
  }

  private calculateEstimatedWaitTime(): number {
    if (this.queue.length === 0) return 0;
    
    const avgProcessingTime = 10000; // 10 seconds average
    const queuePosition = this.queue.length;
    return queuePosition * (avgProcessingTime + this.MIN_REQUEST_INTERVAL);
  }

  private isRateLimitError(error: any): boolean {
    return error?.message?.includes('429') || 
           error?.message?.includes('Too Many Requests') ||
           error?.message?.includes('rate limited') ||
           error?.status === 429;
  }

  /**
   * Check if error is a general API error requiring circuit breaker action
   */
  private isApiError(error: any): boolean {
    return error?.status >= 500 || 
           error?.message?.includes('timeout') ||
           error?.message?.includes('connection') ||
           error?.message?.includes('network') ||
           error?.code === 'ECONNRESET' ||
           error?.code === 'ETIMEDOUT';
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): boolean {
    const requestIndex = this.queue.findIndex(req => req.id === requestId);
    if (requestIndex !== -1) {
      const request = this.queue[requestIndex];
      this.queue.splice(requestIndex, 1);
      
      // Clear timeout if exists
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      
      request.reject(new Error('Request cancelled by user'));
      return true;
    }
    return false;
  }

  /**
   * Get detailed metrics for monitoring
   */
  getDetailedMetrics() {
    return {
      queue: {
        length: this.queue.length,
        oldestRequest: this.queue.length > 0 ? this.queue[0].createdAt : null,
        priorityBreakdown: this.getPriorityBreakdown()
      },
      circuitBreaker: {
        state: this.circuitBreakerState,
        consecutiveFailures: this.consecutiveFailures,
        openedAt: this.circuitBreakerOpenedAt,
        timeRemaining: this.getCircuitBreakerTimeRemaining()
      },
      rateLimiting: rateLimitService.getMetrics(),
      apiHealth: apiHealthService.getApiMetrics(),
      processing: {
        isProcessing: this.isProcessing,
        lastRequestTime: new Date(this.lastRequestTime)
      }
    };
  }

  /**
   * Get priority breakdown of queued requests
   */
  private getPriorityBreakdown() {
    return this.queue.reduce((breakdown, request) => {
      breakdown[request.priority] = (breakdown[request.priority] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }

  /**
   * Handle successful request
   */
  private onRequestSuccess() {
    this.consecutiveFailures = 0;
    
    // Handle circuit breaker state transitions
    if (this.circuitBreakerState === 'half-open') {
      this.halfOpenCallCount++;
      if (this.halfOpenCallCount >= this.HALF_OPEN_MAX_CALLS) {
        this.closeCircuitBreaker();
      }
    } else if (this.circuitBreakerState === 'open') {
      // API health service indicates recovery
      if (apiHealthService.canCloseCircuitBreaker()) {
        this.transitionToHalfOpen();
      }
    }
  }

  /**
   * Open circuit breaker with intelligent logic
   */
  private openCircuitBreaker() {
    this.circuitBreakerState = 'open';
    this.circuitBreakerOpenedAt = Date.now();
    this.halfOpenCallCount = 0;
    
    console.warn('Circuit breaker opened due to consecutive failures or API health issues');
    
    this.circuitBreakerTimeout = setTimeout(() => {
      this.transitionToHalfOpen();
    }, this.CIRCUIT_BREAKER_TIMEOUT);
  }

  /**
   * Transition to half-open state for testing recovery
   */
  private transitionToHalfOpen() {
    this.circuitBreakerState = 'half-open';
    this.halfOpenCallCount = 0;
    
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
    
    console.log('Circuit breaker transitioned to half-open - testing API recovery');
  }

  /**
   * Close circuit breaker (full recovery)
   */
  private closeCircuitBreaker() {
    this.circuitBreakerState = 'closed';
    this.consecutiveFailures = 0;
    this.circuitBreakerOpenedAt = null;
    this.halfOpenCallCount = 0;
    
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
    
    console.log('Circuit breaker closed - analysis service fully recovered');
  }

  /**
   * Get remaining time until circuit breaker attempts recovery
   */
  private getCircuitBreakerTimeRemaining(): number {
    if (this.circuitBreakerState !== 'open' || !this.circuitBreakerOpenedAt) {
      return 0;
    }
    
    const elapsed = Date.now() - this.circuitBreakerOpenedAt;
    return Math.max(0, this.CIRCUIT_BREAKER_TIMEOUT - elapsed);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const requestQueueService = RequestQueueService.getInstance();

// Make service globally accessible for debugging
if (typeof window !== 'undefined') {
  (window as any).requestQueueService = requestQueueService;
}