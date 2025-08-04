/**
 * Request Queue Service for managing OpenAI API rate limiting
 * Implements mutex pattern and exponential backoff for reliable API access
 */

type QueuedRequest = {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  createdAt: Date;
};

export class RequestQueueService {
  private static instance: RequestQueueService;
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 3000; // 3 seconds minimum between requests
  private readonly MAX_RETRIES = 4;
  private readonly BASE_DELAY = 5000; // 5 seconds base delay
  private readonly MAX_QUEUE_SIZE = 50;
  private circuitBreakerOpen = false;
  private circuitBreakerTimeout: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes

  static getInstance(): RequestQueueService {
    if (!RequestQueueService.instance) {
      RequestQueueService.instance = new RequestQueueService();
    }
    return RequestQueueService.instance;
  }

  private constructor() {}

  /**
   * Add a request to the queue
   */
  async enqueueRequest<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        reject(new Error('AI analysis service is temporarily unavailable due to rate limiting. Please try again in a few minutes.'));
        return;
      }

      // Check queue size
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error('Analysis queue is full. Please try again later.'));
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
   * Get queue status for UI feedback
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      circuitBreakerOpen: this.circuitBreakerOpen,
      estimatedWaitTime: this.calculateEstimatedWaitTime()
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

        // Execute the request with retry logic
        const result = await this.executeWithRetry(request);
        request.resolve(result);
        
        // Reset circuit breaker on success
        this.consecutiveFailures = 0;
        if (this.circuitBreakerOpen) {
          this.resetCircuitBreaker();
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
        
        // Check if it's a rate limiting error
        if (this.isRateLimitError(error)) {
          if (attempt === this.MAX_RETRIES) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
              this.openCircuitBreaker();
            }
            break;
          }

          // Calculate exponential backoff delay
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES + 1})`);
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

  private openCircuitBreaker() {
    this.circuitBreakerOpen = true;
    console.warn('Circuit breaker opened due to consecutive rate limit failures');
    
    this.circuitBreakerTimeout = setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.CIRCUIT_BREAKER_TIMEOUT);
  }

  private resetCircuitBreaker() {
    this.circuitBreakerOpen = false;
    this.consecutiveFailures = 0;
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
    console.log('Circuit breaker reset - analysis service available');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const requestQueueService = RequestQueueService.getInstance();