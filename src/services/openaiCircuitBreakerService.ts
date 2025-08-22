/**
 * Enhanced Circuit Breaker Service for OpenAI API
 * Implements cost-aware circuit breaking and standardized thresholds
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
  costThresholdDaily: number; // Daily cost limit in USD
  quotaThresholdPercentage: number; // Percentage of quota usage to trigger circuit
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure: number | null;
  openedAt: number | null;
  halfOpenCalls: number;
  dailyCost: number;
  dailyRequests: number;
  lastReset: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  config: CircuitBreakerConfig;
  health: {
    isHealthy: boolean;
    reason?: string;
    timeToRecovery?: number;
  };
  usage: {
    costEfficiency: number;
    requestSuccessRate: number;
    averageResponseTime: number;
  };
}

export class OpenAICircuitBreakerService {
  private static instance: OpenAICircuitBreakerService;
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private responseTimeHistory: number[] = [];
  private successfulRequests = 0;
  private totalRequests = 0;

  // Default configuration - standardized across all OpenAI functions
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Standardized threshold
    recoveryTimeout: 2 * 60 * 1000, // 2 minutes
    halfOpenMaxCalls: 3,
    costThresholdDaily: 50.0, // $50 daily limit
    quotaThresholdPercentage: 90 // 90% quota usage triggers caution
  };

  static getInstance(): OpenAICircuitBreakerService {
    if (!OpenAICircuitBreakerService.instance) {
      OpenAICircuitBreakerService.instance = new OpenAICircuitBreakerService();
    }
    return OpenAICircuitBreakerService.instance;
  }

  private constructor() {
    this.config = { ...this.defaultConfig };
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailure: null,
      openedAt: null,
      halfOpenCalls: 0,
      dailyCost: 0,
      dailyRequests: 0,
      lastReset: Date.now()
    };

    // Reset daily counters at midnight
    this.scheduleDailyReset();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, cost: number = 0): Promise<T> {
    // Check if circuit should be open
    if (!this.canExecute()) {
      throw new Error(this.getCircuitOpenMessage());
    }

    this.totalRequests++;
    this.state.dailyRequests++;

    const startTime = Date.now();
    
    try {
      const result = await operation();
      
      // Record success
      this.onSuccess(Date.now() - startTime, cost);
      
      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Check if execution is allowed based on circuit state
   */
  canExecute(): boolean {
    this.updateStateIfNeeded();
    
    // Check daily cost limit
    if (this.state.dailyCost >= this.config.costThresholdDaily) {
      if (this.state.state !== 'OPEN') {
        this.openCircuit('Daily cost limit exceeded');
      }
      return false;
    }

    switch (this.state.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return false;
      case 'HALF_OPEN':
        return this.state.halfOpenCalls < this.config.halfOpenMaxCalls;
      default:
        return false;
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    this.updateStateIfNeeded();
    
    const averageResponseTime = this.responseTimeHistory.length > 0
      ? this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length
      : 0;

    const requestSuccessRate = this.totalRequests > 0
      ? this.successfulRequests / this.totalRequests
      : 1;

    const costEfficiency = this.state.dailyRequests > 0
      ? this.state.dailyCost / this.state.dailyRequests
      : 0;

    return {
      state: { ...this.state },
      config: { ...this.config },
      health: {
        isHealthy: this.state.state === 'CLOSED',
        reason: this.getHealthReason(),
        timeToRecovery: this.getTimeToRecovery()
      },
      usage: {
        costEfficiency,
        requestSuccessRate,
        averageResponseTime
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Circuit breaker configuration updated:', this.config);
  }

  /**
   * Force open the circuit (emergency use)
   */
  forceOpen(reason: string = 'Manual override'): void {
    this.openCircuit(reason);
  }

  /**
   * Force close the circuit (emergency use)
   */
  forceClose(): void {
    this.state.state = 'CLOSED';
    this.state.failures = 0;
    this.state.lastFailure = null;
    this.state.openedAt = null;
    this.state.halfOpenCalls = 0;
    console.log('Circuit breaker manually closed');
  }

  /**
   * Reset daily usage counters
   */
  resetDailyCounters(): void {
    this.state.dailyCost = 0;
    this.state.dailyRequests = 0;
    this.state.lastReset = Date.now();
    console.log('Daily usage counters reset');
  }

  /**
   * Add cost to daily tracking
   */
  addCost(cost: number): void {
    this.state.dailyCost += cost;
    
    // Check if we're approaching the daily limit
    const costPercentage = this.state.dailyCost / this.config.costThresholdDaily;
    if (costPercentage >= 0.8 && this.state.state === 'CLOSED') {
      console.warn(`Daily cost approaching limit: ${(costPercentage * 100).toFixed(1)}%`);
    }
  }

  /**
   * Check if API quota is approaching limits
   */
  checkQuotaUsage(quotaUsed: number, quotaLimit: number): void {
    const usagePercentage = (quotaUsed / quotaLimit) * 100;
    
    if (usagePercentage >= this.config.quotaThresholdPercentage) {
      if (this.state.state !== 'OPEN') {
        this.openCircuit(`API quota usage at ${usagePercentage.toFixed(1)}%`);
      }
    }
  }

  private onSuccess(responseTime: number, cost: number): void {
    this.successfulRequests++;
    this.addCost(cost);
    
    // Track response time
    this.responseTimeHistory.push(responseTime);
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift(); // Keep only last 100 measurements
    }

    // Handle state transitions
    if (this.state.state === 'HALF_OPEN') {
      this.state.halfOpenCalls++;
      if (this.state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.closeCircuit();
      }
    } else if (this.state.state === 'CLOSED') {
      // Reset failure count on success
      this.state.failures = 0;
    }
  }

  private onFailure(error: any): void {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    // Check if we should open the circuit
    if (this.state.failures >= this.config.failureThreshold) {
      this.openCircuit(`Failure threshold reached: ${this.state.failures} failures`);
    }

    console.warn(`Circuit breaker recorded failure ${this.state.failures}/${this.config.failureThreshold}:`, error.message);
  }

  private openCircuit(reason: string): void {
    this.state.state = 'OPEN';
    this.state.openedAt = Date.now();
    this.state.halfOpenCalls = 0;
    
    console.warn(`Circuit breaker opened: ${reason}`);
    
    // Schedule transition to half-open
    setTimeout(() => {
      if (this.state.state === 'OPEN') {
        this.transitionToHalfOpen();
      }
    }, this.config.recoveryTimeout);
  }

  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.halfOpenCalls = 0;
    console.log('Circuit breaker transitioned to half-open state');
  }

  private closeCircuit(): void {
    this.state.state = 'CLOSED';
    this.state.failures = 0;
    this.state.lastFailure = null;
    this.state.openedAt = null;
    this.state.halfOpenCalls = 0;
    console.log('Circuit breaker closed - service recovered');
  }

  private updateStateIfNeeded(): void {
    const now = Date.now();
    
    // Check if we need to reset daily counters
    const timeSinceReset = now - this.state.lastReset;
    if (timeSinceReset >= 24 * 60 * 60 * 1000) { // 24 hours
      this.resetDailyCounters();
    }

    // Check if half-open timeout has expired
    if (this.state.state === 'OPEN' && this.state.openedAt) {
      const timeOpen = now - this.state.openedAt;
      if (timeOpen >= this.config.recoveryTimeout) {
        this.transitionToHalfOpen();
      }
    }
  }

  private getCircuitOpenMessage(): string {
    const metrics = this.getMetrics();
    const timeToRecovery = this.getTimeToRecovery();
    
    let reason = 'Service temporarily unavailable';
    if (this.state.dailyCost >= this.config.costThresholdDaily) {
      reason = 'Daily cost limit exceeded';
    } else if (this.state.failures >= this.config.failureThreshold) {
      reason = 'Multiple consecutive failures detected';
    }
    
    return `${reason}. Circuit breaker will attempt recovery in ${Math.ceil(timeToRecovery / 60000)} minutes.`;
  }

  private getHealthReason(): string | undefined {
    if (this.state.state === 'OPEN') {
      if (this.state.dailyCost >= this.config.costThresholdDaily) {
        return 'Daily cost limit exceeded';
      }
      return `${this.state.failures} consecutive failures`;
    }
    if (this.state.state === 'HALF_OPEN') {
      return 'Testing service recovery';
    }
    return undefined;
  }

  private getTimeToRecovery(): number {
    if (this.state.state !== 'OPEN' || !this.state.openedAt) {
      return 0;
    }
    
    const elapsed = Date.now() - this.state.openedAt;
    return Math.max(0, this.config.recoveryTimeout - elapsed);
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCounters();
      // Schedule next reset
      setInterval(() => this.resetDailyCounters(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
}

export const openaiCircuitBreakerService = OpenAICircuitBreakerService.getInstance();