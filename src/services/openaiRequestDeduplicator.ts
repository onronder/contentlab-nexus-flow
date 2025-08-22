/**
 * OpenAI Request Deduplication Service
 * Prevents duplicate requests and implements intelligent request batching
 */

interface PendingRequest {
  id: string;
  key: string;
  promise: Promise<any>;
  resolvers: Array<(value: any) => void>;
  rejectors: Array<(error: any) => void>;
  createdAt: number;
  priority: 'high' | 'normal' | 'low';
  cost: number;
  metadata: Record<string, any>;
}

interface BatchRequest {
  id: string;
  requests: PendingRequest[];
  type: string;
  scheduledAt: number;
  timeout: NodeJS.Timeout;
}

interface DeduplicationStats {
  totalRequests: number;
  duplicateRequests: number;
  batchedRequests: number;
  costSaved: number;
  averageWaitTime: number;
}

export class OpenAIRequestDeduplicator {
  private static instance: OpenAIRequestDeduplicator;
  private pendingRequests = new Map<string, PendingRequest>();
  private batchRequests = new Map<string, BatchRequest>();
  private stats: DeduplicationStats = {
    totalRequests: 0,
    duplicateRequests: 0,
    batchedRequests: 0,
    costSaved: 0,
    averageWaitTime: 0
  };

  // Configuration
  private readonly maxPendingTime = 30000; // 30 seconds max pending time
  private readonly batchDelay = 5000; // 5 seconds batch delay
  private readonly maxBatchSize = 10;

  static getInstance(): OpenAIRequestDeduplicator {
    if (!OpenAIRequestDeduplicator.instance) {
      OpenAIRequestDeduplicator.instance = new OpenAIRequestDeduplicator();
    }
    return OpenAIRequestDeduplicator.instance;
  }

  private constructor() {
    // Cleanup expired requests every minute
    setInterval(() => this.cleanupExpiredRequests(), 60000);
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    operation: () => Promise<T>,
    key: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      cost?: number;
      metadata?: Record<string, any>;
      batchable?: boolean;
      type?: string;
    } = {}
  ): Promise<T> {
    const {
      priority = 'normal',
      cost = 0,
      metadata = {},
      batchable = false,
      type = 'default'
    } = options;

    this.stats.totalRequests++;

    // Check for existing pending request
    const existing = this.pendingRequests.get(key);
    if (existing) {
      this.stats.duplicateRequests++;
      this.stats.costSaved += cost;
      
      console.log(`Deduplicating request for key: ${key} (saved $${cost.toFixed(4)})`);
      
      // Add to existing request's resolver list
      return new Promise<T>((resolve, reject) => {
        existing.resolvers.push(resolve);
        existing.rejectors.push(reject);
      });
    }

    // Check if request can be batched
    if (batchable && type) {
      return this.handleBatchableRequest(operation, key, type, {
        priority,
        cost,
        metadata
      });
    }

    // Create new pending request
    const request: PendingRequest = {
      id: this.generateRequestId(),
      key,
      promise: this.executeWithCleanup(operation, key),
      resolvers: [],
      rejectors: [],
      createdAt: Date.now(),
      priority,
      cost,
      metadata
    };

    this.pendingRequests.set(key, request);

    try {
      const result = await request.promise;
      
      // Resolve all waiting promises
      request.resolvers.forEach(resolve => resolve(result));
      
      return result;
    } catch (error) {
      // Reject all waiting promises
      request.rejectors.forEach(reject => reject(error));
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Handle batchable requests
   */
  private async handleBatchableRequest<T>(
    operation: () => Promise<T>,
    key: string,
    type: string,
    options: {
      priority: 'high' | 'normal' | 'low';
      cost: number;
      metadata: Record<string, any>;
    }
  ): Promise<T> {
    const batchKey = `batch_${type}`;
    let batch = this.batchRequests.get(batchKey);

    if (!batch) {
      // Create new batch
      batch = {
        id: this.generateRequestId(),
        requests: [],
        type,
        scheduledAt: Date.now() + this.batchDelay,
        timeout: setTimeout(() => this.executeBatch(batchKey), this.batchDelay)
      };
      this.batchRequests.set(batchKey, batch);
    }

    // Create pending request for batch
    const request: PendingRequest = {
      id: this.generateRequestId(),
      key,
      promise: Promise.resolve(null), // Will be replaced by batch execution
      resolvers: [],
      rejectors: [],
      createdAt: Date.now(),
      priority: options.priority,
      cost: options.cost,
      metadata: options.metadata
    };

    // Add to batch
    batch.requests.push(request);
    this.stats.batchedRequests++;

    // Execute batch immediately if it's full or high priority
    if (batch.requests.length >= this.maxBatchSize || options.priority === 'high') {
      clearTimeout(batch.timeout);
      return this.executeBatch(batchKey, request.id);
    }

    // Wait for batch execution
    return new Promise<T>((resolve, reject) => {
      request.resolvers.push(resolve);
      request.rejectors.push(reject);
    });
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchKey: string, specificRequestId?: string): Promise<any> {
    const batch = this.batchRequests.get(batchKey);
    if (!batch) return;

    this.batchRequests.delete(batchKey);
    clearTimeout(batch.timeout);

    console.log(`Executing batch of ${batch.requests.length} requests for type: ${batch.type}`);

    try {
      // Sort by priority
      const sortedRequests = batch.requests.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Execute requests with slight delays to prevent overwhelming the API
      const results = await Promise.allSettled(
        sortedRequests.map(async (request, index) => {
          if (index > 0) {
            await this.delay(200 * index); // 200ms delay between batch items
          }
          
          // Execute the original operation
          const operation = this.reconstructOperation(request);
          return operation();
        })
      );

      // Resolve each request with its result
      results.forEach((result, index) => {
        const request = sortedRequests[index];
        
        if (result.status === 'fulfilled') {
          request.resolvers.forEach(resolve => resolve(result.value));
          
          // Return specific result if requested
          if (specificRequestId && request.id === specificRequestId) {
            return result.value;
          }
        } else {
          request.rejectors.forEach(reject => reject(result.reason));
          
          // Throw specific error if requested
          if (specificRequestId && request.id === specificRequestId) {
            throw result.reason;
          }
        }
      });

      // Return first successful result if no specific request ID
      const firstSuccess = results.find(r => r.status === 'fulfilled');
      return firstSuccess ? (firstSuccess as PromiseFulfilledResult<any>).value : null;

    } catch (error) {
      // Reject all requests in batch
      batch.requests.forEach(request => {
        request.rejectors.forEach(reject => reject(error));
      });
      throw error;
    }
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicationStats & { 
    currentPending: number; 
    currentBatches: number;
    efficiency: number;
  } {
    const efficiency = this.stats.totalRequests > 0
      ? (this.stats.duplicateRequests + this.stats.batchedRequests) / this.stats.totalRequests
      : 0;

    return {
      ...this.stats,
      currentPending: this.pendingRequests.size,
      currentBatches: this.batchRequests.size,
      efficiency
    };
  }

  /**
   * Get pending requests info
   */
  getPendingRequests(): Array<{
    key: string;
    age: number;
    priority: string;
    cost: number;
  }> {
    const now = Date.now();
    return Array.from(this.pendingRequests.values()).map(request => ({
      key: request.key,
      age: now - request.createdAt,
      priority: request.priority,
      cost: request.cost
    }));
  }

  /**
   * Cancel a specific pending request
   */
  cancelRequest(key: string): boolean {
    const request = this.pendingRequests.get(key);
    if (request) {
      request.rejectors.forEach(reject => reject(new Error('Request cancelled')));
      this.pendingRequests.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    for (const request of this.pendingRequests.values()) {
      request.rejectors.forEach(reject => reject(new Error('All requests cleared')));
    }
    this.pendingRequests.clear();

    for (const batch of this.batchRequests.values()) {
      clearTimeout(batch.timeout);
      batch.requests.forEach(request => {
        request.rejectors.forEach(reject => reject(new Error('Batch cancelled')));
      });
    }
    this.batchRequests.clear();
  }

  /**
   * Generate request key from content and parameters
   */
  generateKey(content: string, parameters: Record<string, any> = {}): string {
    const contentHash = this.hashContent(content);
    const paramString = Object.entries(parameters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const paramHash = this.hashContent(paramString);
    
    return `${contentHash}_${paramHash}`;
  }

  private async executeWithCleanup<T>(operation: () => Promise<T>, key: string): Promise<T> {
    try {
      return await operation();
    } finally {
      // Request will be cleaned up by the caller
    }
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.createdAt > this.maxPendingTime) {
        expiredKeys.push(key);
        request.rejectors.forEach(reject => 
          reject(new Error('Request timeout - exceeded maximum pending time'))
        );
      }
    }

    expiredKeys.forEach(key => this.pendingRequests.delete(key));

    if (expiredKeys.length > 0) {
      console.warn(`Cleaned up ${expiredKeys.length} expired pending requests`);
    }
  }

  private reconstructOperation(request: PendingRequest): () => Promise<any> {
    // This is a placeholder - in practice, you'd need to store the operation
    // or reconstruct it from metadata
    return async () => {
      throw new Error('Operation reconstruction not implemented');
    };
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const openaiRequestDeduplicator = OpenAIRequestDeduplicator.getInstance();