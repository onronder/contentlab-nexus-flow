interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: 'network' | 'database' | 'service' | 'load' | 'storage' | 'auth';
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number; // minutes
  parameters: Record<string, any>;
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  safeguards: {
    maxDuration: number;
    rollbackTriggers: string[];
    monitoringChecks: string[];
  };
  status: 'ready' | 'running' | 'completed' | 'failed' | 'aborted';
  results?: ChaosExperimentResult;
}

interface ChaosExperimentResult {
  startTime: number;
  endTime: number;
  success: boolean;
  metrics: {
    systemRecoveryTime: number;
    errorRateIncrease: number;
    performanceImpact: number;
    userImpact: number;
  };
  observations: string[];
  recommendations: string[];
  artifacts: {
    logs: string[];
    screenshots: string[];
    metrics: Record<string, number[]>;
  };
}

interface SystemResilience {
  overallScore: number;
  categories: {
    networkResilience: number;
    serviceResilience: number;
    dataResilience: number;
    userExperienceResilience: number;
  };
  weakPoints: string[];
  improvements: string[];
}

class ChaosEngineeringService {
  private experiments: Map<string, ChaosExperiment> = new Map();
  private activeExperiments: Set<string> = new Set();
  private resilienceHistory: SystemResilience[] = [];
  private safeguardCallbacks: Map<string, () => void> = new Map();

  // Predefined Chaos Experiments
  private defaultExperiments: Omit<ChaosExperiment, 'id' | 'status'>[] = [
    {
      name: 'Database Connection Pool Exhaustion',
      description: 'Simulate database connection pool exhaustion to test connection handling',
      type: 'database',
      severity: 'high',
      duration: 5,
      parameters: {
        targetConnections: 95, // percentage of max connections
        connectionHoldTime: 30, // seconds
      },
      safeguards: {
        maxDuration: 10,
        rollbackTriggers: ['error_rate > 50%', 'response_time > 10s'],
        monitoringChecks: ['database_health', 'application_health'],
      },
    },
    {
      name: 'Network Latency Injection',
      description: 'Add artificial network latency to test timeout handling',
      type: 'network',
      severity: 'medium',
      duration: 10,
      parameters: {
        latencyMs: 2000,
        targetPercentage: 25, // percentage of requests affected
        jitter: 500, // random variation in ms
      },
      safeguards: {
        maxDuration: 15,
        rollbackTriggers: ['user_sessions < 80%', 'conversion_rate < 50%'],
        monitoringChecks: ['response_times', 'user_experience'],
      },
    },
    {
      name: 'Service Dependency Failure',
      description: 'Simulate third-party service failures',
      type: 'service',
      severity: 'high',
      duration: 3,
      parameters: {
        serviceName: 'external_api',
        failureRate: 100, // percentage
        fallbackEnabled: true,
      },
      safeguards: {
        maxDuration: 5,
        rollbackTriggers: ['critical_feature_failure'],
        monitoringChecks: ['service_health', 'fallback_usage'],
      },
    },
    {
      name: 'Memory Pressure Test',
      description: 'Gradually increase memory usage to test memory management',
      type: 'service',
      severity: 'medium',
      duration: 15,
      parameters: {
        targetMemoryPercentage: 85,
        increaseRate: 5, // percentage per minute
        includeGarbageCollection: true,
      },
      safeguards: {
        maxDuration: 20,
        rollbackTriggers: ['memory_usage > 90%', 'gc_pressure > critical'],
        monitoringChecks: ['memory_health', 'gc_performance'],
      },
    },
    {
      name: 'Authentication Service Disruption',
      description: 'Test auth service resilience and session handling',
      type: 'auth',
      severity: 'critical',
      duration: 2,
      parameters: {
        disruptionType: 'slow_response', // 'failure', 'slow_response', 'intermittent'
        responseDelayMs: 5000,
        affectedPercentage: 50,
      },
      safeguards: {
        maxDuration: 3,
        rollbackTriggers: ['auth_failure_rate > 25%'],
        monitoringChecks: ['auth_health', 'session_validity'],
      },
    },
    {
      name: 'Load Balancer Failure',
      description: 'Simulate load balancer node failures',
      type: 'load',
      severity: 'high',
      duration: 8,
      parameters: {
        failedNodesPercentage: 50,
        recoveryTime: 300, // seconds
        trafficRedistribution: true,
      },
      safeguards: {
        maxDuration: 10,
        rollbackTriggers: ['available_capacity < 30%'],
        monitoringChecks: ['load_distribution', 'node_health'],
      },
    },
  ];

  constructor() {
    this.initializeDefaultExperiments();
  }

  private initializeDefaultExperiments(): void {
    this.defaultExperiments.forEach(exp => {
      const experiment: ChaosExperiment = {
        ...exp,
        id: crypto.randomUUID(),
        status: 'ready',
      };
      this.experiments.set(experiment.id, experiment);
    });
  }

  // Experiment Management
  async createExperiment(experiment: Omit<ChaosExperiment, 'id' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();
    const chaosExperiment: ChaosExperiment = {
      ...experiment,
      id,
      status: 'ready',
    };

    this.experiments.set(id, chaosExperiment);
    return id;
  }

  getExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  getExperiment(id: string): ChaosExperiment | undefined {
    return this.experiments.get(id);
  }

  async runExperiment(id: string): Promise<ChaosExperimentResult> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment ${id} not found`);
    }

    if (this.activeExperiments.has(id)) {
      throw new Error(`Experiment ${id} is already running`);
    }

    // Pre-flight safety checks
    const safetyCheck = await this.performSafetyChecks(experiment);
    if (!safetyCheck.safe) {
      throw new Error(`Safety check failed: ${safetyCheck.reason}`);
    }

    experiment.status = 'running';
    this.activeExperiments.add(id);

    try {
      const result = await this.executeExperiment(experiment);
      experiment.results = result;
      experiment.status = result.success ? 'completed' : 'failed';
      return result;
    } catch (error) {
      experiment.status = 'failed';
      throw error;
    } finally {
      this.activeExperiments.delete(id);
      this.cleanup(id);
    }
  }

  async abortExperiment(id: string, reason: string = 'Manual abort'): Promise<void> {
    const experiment = this.experiments.get(id);
    if (!experiment || !this.activeExperiments.has(id)) {
      return;
    }

    console.log(`Aborting experiment ${id}: ${reason}`);
    experiment.status = 'aborted';
    this.activeExperiments.delete(id);
    await this.cleanup(id);
  }

  // Experiment Execution
  private async executeExperiment(experiment: ChaosExperiment): Promise<ChaosExperimentResult> {
    const startTime = Date.now();
    const result: ChaosExperimentResult = {
      startTime,
      endTime: 0,
      success: false,
      metrics: {
        systemRecoveryTime: 0,
        errorRateIncrease: 0,
        performanceImpact: 0,
        userImpact: 0,
      },
      observations: [],
      recommendations: [],
      artifacts: {
        logs: [],
        screenshots: [],
        metrics: {},
      },
    };

    // Set up monitoring
    const monitoringInterval = this.setupMonitoring(experiment, result);
    
    // Set up safeguards
    const safeguardTimeout = this.setupSafeguards(experiment);

    try {
      // Execute the specific chaos based on type
      await this.executeChaosInjection(experiment, result);

      // Wait for experiment duration
      await this.wait(experiment.duration * 60 * 1000);

      // Stop chaos injection
      await this.stopChaosInjection(experiment, result);

      // Wait for system recovery
      const recoveryTime = await this.waitForRecovery(experiment);
      result.metrics.systemRecoveryTime = recoveryTime;

      result.success = true;
      result.observations.push(`Experiment completed successfully after ${experiment.duration} minutes`);
      
    } catch (error) {
      result.observations.push(`Experiment failed: ${error}`);
      result.success = false;
    } finally {
      clearInterval(monitoringInterval);
      clearTimeout(safeguardTimeout);
      result.endTime = Date.now();
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(experiment, result);

    return result;
  }

  private async executeChaosInjection(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    result.observations.push(`Starting ${experiment.type} chaos injection`);

    switch (experiment.type) {
      case 'database':
        await this.injectDatabaseChaos(experiment, result);
        break;
      case 'network':
        await this.injectNetworkChaos(experiment, result);
        break;
      case 'service':
        await this.injectServiceChaos(experiment, result);
        break;
      case 'load':
        await this.injectLoadChaos(experiment, result);
        break;
      case 'auth':
        await this.injectAuthChaos(experiment, result);
        break;
      default:
        throw new Error(`Unknown chaos type: ${experiment.type}`);
    }
  }

  private async injectDatabaseChaos(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    const params = experiment.parameters;
    
    if (experiment.name.includes('Connection Pool')) {
      // Simulate connection pool exhaustion
      result.observations.push(`Simulating ${params.targetConnections}% connection pool usage`);
      
      // In a real implementation, this would actually stress the connection pool
      // For demo purposes, we'll simulate the effect
      await this.simulateMetricChange(result, 'database_connections', params.targetConnections);
    }
  }

  private async injectNetworkChaos(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    const params = experiment.parameters;
    
    if (experiment.name.includes('Latency')) {
      result.observations.push(`Injecting ${params.latencyMs}ms latency to ${params.targetPercentage}% of requests`);
      
      // Simulate network latency effects
      await this.simulateMetricChange(result, 'response_time', params.latencyMs / 1000);
      await this.simulateMetricChange(result, 'timeout_rate', params.targetPercentage / 100);
    }
  }

  private async injectServiceChaos(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    const params = experiment.parameters;
    
    if (experiment.name.includes('Dependency Failure')) {
      result.observations.push(`Failing ${params.serviceName} with ${params.failureRate}% failure rate`);
      
      await this.simulateMetricChange(result, 'service_availability', (100 - params.failureRate) / 100);
      if (params.fallbackEnabled) {
        await this.simulateMetricChange(result, 'fallback_usage', params.failureRate / 100);
      }
    } else if (experiment.name.includes('Memory Pressure')) {
      result.observations.push(`Increasing memory usage to ${params.targetMemoryPercentage}%`);
      
      await this.simulateMetricChange(result, 'memory_usage', params.targetMemoryPercentage / 100);
      if (params.includeGarbageCollection) {
        await this.simulateMetricChange(result, 'gc_frequency', 2.0);
      }
    }
  }

  private async injectLoadChaos(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    const params = experiment.parameters;
    
    result.observations.push(`Failing ${params.failedNodesPercentage}% of load balancer nodes`);
    
    await this.simulateMetricChange(result, 'available_nodes', (100 - params.failedNodesPercentage) / 100);
    if (params.trafficRedistribution) {
      await this.simulateMetricChange(result, 'node_load_redistribution', 1.5);
    }
  }

  private async injectAuthChaos(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    const params = experiment.parameters;
    
    result.observations.push(`Disrupting auth service: ${params.disruptionType}`);
    
    if (params.disruptionType === 'slow_response') {
      await this.simulateMetricChange(result, 'auth_response_time', params.responseDelayMs / 1000);
    }
    
    await this.simulateMetricChange(result, 'auth_success_rate', (100 - params.affectedPercentage) / 100);
  }

  private async stopChaosInjection(experiment: ChaosExperiment, result: ChaosExperimentResult): Promise<void> {
    result.observations.push(`Stopping ${experiment.type} chaos injection`);
    
    // In a real implementation, this would clean up the chaos injection
    // For now, we'll just log the action
  }

  // Monitoring and Safeguards
  private setupMonitoring(experiment: ChaosExperiment, result: ChaosExperimentResult): NodeJS.Timeout {
    return setInterval(() => {
      // Collect metrics during experiment
      const metrics = this.collectRealTimeMetrics();
      
      Object.entries(metrics).forEach(([key, value]) => {
        if (!result.artifacts.metrics[key]) {
          result.artifacts.metrics[key] = [];
        }
        result.artifacts.metrics[key].push(value);
      });

      // Check for anomalies
      this.checkForAnomalies(experiment, metrics, result);
    }, 10000); // Every 10 seconds
  }

  private setupSafeguards(experiment: ChaosExperiment): NodeJS.Timeout {
    return setTimeout(() => {
      console.warn(`Experiment ${experiment.id} exceeded max duration, aborting`);
      this.abortExperiment(experiment.id, 'Maximum duration exceeded');
    }, experiment.safeguards.maxDuration * 60 * 1000);
  }

  private async performSafetyChecks(experiment: ChaosExperiment): Promise<{ safe: boolean; reason?: string }> {
    // Check system health before running experiment
    const systemHealth = await this.getSystemHealth();
    
    if (systemHealth.overallHealth < 0.8 && experiment.severity === 'critical') {
      return { safe: false, reason: 'System health too low for critical experiment' };
    }

    // Check if there are already too many active experiments
    if (this.activeExperiments.size >= 2) {
      return { safe: false, reason: 'Too many active experiments' };
    }

    // Check business hours for high-severity experiments
    const now = new Date();
    const isBusinessHours = now.getHours() >= 9 && now.getHours() <= 17;
    if (experiment.severity === 'critical' && isBusinessHours) {
      return { safe: false, reason: 'Critical experiments not allowed during business hours' };
    }

    return { safe: true };
  }

  private collectRealTimeMetrics(): Record<string, number> {
    // In a real implementation, this would collect actual metrics
    return {
      response_time: Math.random() * 2 + 0.5,
      error_rate: Math.random() * 0.1,
      cpu_usage: Math.random() * 0.8 + 0.2,
      memory_usage: Math.random() * 0.7 + 0.3,
      active_users: Math.floor(Math.random() * 1000 + 500),
      database_connections: Math.floor(Math.random() * 100 + 50),
    };
  }

  private checkForAnomalies(experiment: ChaosExperiment, metrics: Record<string, number>, result: ChaosExperimentResult): void {
    // Check against rollback triggers
    experiment.safeguards.rollbackTriggers.forEach(trigger => {
      if (this.evaluateTrigger(trigger, metrics)) {
        result.observations.push(`Rollback trigger activated: ${trigger}`);
        this.abortExperiment(experiment.id, `Rollback trigger: ${trigger}`);
      }
    });
  }

  private evaluateTrigger(trigger: string, metrics: Record<string, number>): boolean {
    // Simple trigger evaluation (would be more sophisticated in production)
    if (trigger.includes('error_rate > 50%')) {
      return metrics.error_rate > 0.5;
    }
    if (trigger.includes('response_time > 10s')) {
      return metrics.response_time > 10;
    }
    if (trigger.includes('memory_usage > 90%')) {
      return metrics.memory_usage > 0.9;
    }
    
    return false;
  }

  private async waitForRecovery(experiment: ChaosExperiment): Promise<number> {
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
    
    while (Date.now() - startTime < maxWaitTime) {
      const health = await this.getSystemHealth();
      if (health.overallHealth > 0.9) {
        return Date.now() - startTime;
      }
      await this.wait(5000); // Wait 5 seconds
    }
    
    return maxWaitTime; // Recovery took too long
  }

  // System Health Assessment
  private async getSystemHealth(): Promise<{ overallHealth: number; details: Record<string, number> }> {
    const metrics = this.collectRealTimeMetrics();
    
    const healthScores = {
      response_time: Math.max(0, 1 - (metrics.response_time - 0.5) / 2),
      error_rate: Math.max(0, 1 - metrics.error_rate / 0.1),
      cpu_usage: Math.max(0, 1 - Math.max(0, metrics.cpu_usage - 0.7) / 0.3),
      memory_usage: Math.max(0, 1 - Math.max(0, metrics.memory_usage - 0.8) / 0.2),
    };

    const overallHealth = Object.values(healthScores).reduce((sum, score) => sum + score, 0) / Object.keys(healthScores).length;

    return {
      overallHealth,
      details: healthScores,
    };
  }

  // Resilience Assessment
  async assessSystemResilience(): Promise<SystemResilience> {
    const completedExperiments = Array.from(this.experiments.values())
      .filter(exp => exp.status === 'completed' && exp.results);

    if (completedExperiments.length === 0) {
      return {
        overallScore: 0,
        categories: {
          networkResilience: 0,
          serviceResilience: 0,
          dataResilience: 0,
          userExperienceResilience: 0,
        },
        weakPoints: ['No resilience data available'],
        improvements: ['Run chaos experiments to assess resilience'],
      };
    }

    const categoryScores = {
      networkResilience: this.calculateCategoryScore(completedExperiments, 'network'),
      serviceResilience: this.calculateCategoryScore(completedExperiments, 'service'),
      dataResilience: this.calculateCategoryScore(completedExperiments, 'database'),
      userExperienceResilience: this.calculateUserExperienceScore(completedExperiments),
    };

    const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 4;

    const weakPoints = this.identifyWeakPoints(categoryScores, completedExperiments);
    const improvements = this.generateResilienceImprovements(categoryScores, completedExperiments);

    const resilience: SystemResilience = {
      overallScore,
      categories: categoryScores,
      weakPoints,
      improvements,
    };

    this.resilienceHistory.push(resilience);
    return resilience;
  }

  private calculateCategoryScore(experiments: ChaosExperiment[], category: string): number {
    const categoryExperiments = experiments.filter(exp => exp.type === category);
    if (categoryExperiments.length === 0) return 0;

    let totalScore = 0;
    categoryExperiments.forEach(exp => {
      const result = exp.results!;
      let score = result.success ? 0.7 : 0.3; // Base score
      
      // Adjust based on recovery time
      if (result.metrics.systemRecoveryTime < 60000) score += 0.2; // < 1 minute
      else if (result.metrics.systemRecoveryTime < 300000) score += 0.1; // < 5 minutes
      
      // Adjust based on user impact
      if (result.metrics.userImpact < 0.1) score += 0.1;
      
      totalScore += Math.min(score, 1.0);
    });

    return totalScore / categoryExperiments.length;
  }

  private calculateUserExperienceScore(experiments: ChaosExperiment[]): number {
    let totalImpact = 0;
    let experimentCount = 0;

    experiments.forEach(exp => {
      if (exp.results) {
        totalImpact += exp.results.metrics.userImpact;
        experimentCount++;
      }
    });

    if (experimentCount === 0) return 0;
    const avgImpact = totalImpact / experimentCount;
    
    return Math.max(0, 1 - avgImpact);
  }

  private identifyWeakPoints(categoryScores: Record<string, number>, experiments: ChaosExperiment[]): string[] {
    const weakPoints: string[] = [];
    
    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score < 0.6) {
        weakPoints.push(`${category}: Score ${(score * 100).toFixed(0)}%`);
      }
    });

    // Identify specific failure patterns
    experiments.forEach(exp => {
      if (exp.results && !exp.results.success) {
        weakPoints.push(`${exp.name}: Failed during execution`);
      }
      if (exp.results && exp.results.metrics.systemRecoveryTime > 300000) {
        weakPoints.push(`${exp.name}: Slow recovery (${Math.round(exp.results.metrics.systemRecoveryTime / 60000)} minutes)`);
      }
    });

    return weakPoints;
  }

  private generateResilienceImprovements(categoryScores: Record<string, number>, experiments: ChaosExperiment[]): string[] {
    const improvements: string[] = [];

    if (categoryScores.networkResilience < 0.7) {
      improvements.push('Implement circuit breakers for external service calls');
      improvements.push('Add request timeout and retry logic');
    }

    if (categoryScores.serviceResilience < 0.7) {
      improvements.push('Implement graceful degradation for non-critical features');
      improvements.push('Add health checks and auto-scaling policies');
    }

    if (categoryScores.dataResilience < 0.7) {
      improvements.push('Implement database connection pooling and failover');
      improvements.push('Add data backup and recovery procedures');
    }

    if (categoryScores.userExperienceResilience < 0.7) {
      improvements.push('Implement offline-first architecture');
      improvements.push('Add user-friendly error messages and fallback content');
    }

    return improvements;
  }

  // Utility Methods
  private async simulateMetricChange(result: ChaosExperimentResult, metric: string, value: number): Promise<void> {
    // Simulate the effect of chaos on metrics
    if (!result.artifacts.metrics[metric]) {
      result.artifacts.metrics[metric] = [];
    }
    result.artifacts.metrics[metric].push(value);
  }

  private generateRecommendations(experiment: ChaosExperiment, result: ChaosExperimentResult): string[] {
    const recommendations: string[] = [];

    if (result.success) {
      recommendations.push(`System showed good resilience to ${experiment.type} failures`);
      
      if (result.metrics.systemRecoveryTime < 60000) {
        recommendations.push('Excellent recovery time - system self-healed quickly');
      } else {
        recommendations.push('Consider optimizing recovery procedures to reduce downtime');
      }
    } else {
      recommendations.push(`System failed to handle ${experiment.type} chaos - needs attention`);
      recommendations.push('Review error handling and failover mechanisms');
    }

    // Type-specific recommendations
    if (experiment.type === 'database' && result.metrics.errorRateIncrease > 0.2) {
      recommendations.push('Consider implementing database connection pooling and circuit breakers');
    }

    if (experiment.type === 'network' && result.metrics.performanceImpact > 0.3) {
      recommendations.push('Implement request caching and optimize for high-latency scenarios');
    }

    return recommendations;
  }

  private async cleanup(experimentId: string): Promise<void> {
    // Clean up any resources used during the experiment
    const callback = this.safeguardCallbacks.get(experimentId);
    if (callback) {
      callback();
      this.safeguardCallbacks.delete(experimentId);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  getResilienceHistory(): SystemResilience[] {
    return [...this.resilienceHistory];
  }

  getActiveExperiments(): ChaosExperiment[] {
    return Array.from(this.activeExperiments).map(id => this.experiments.get(id)!);
  }

  async scheduleExperiment(id: string, schedule: ChaosExperiment['schedule']): Promise<void> {
    const experiment = this.experiments.get(id);
    if (experiment) {
      experiment.schedule = schedule;
      // In a real implementation, this would set up cron jobs
      console.log(`Scheduled experiment ${id} with cron: ${schedule?.cron}`);
    }
  }
}

export const chaosEngineeringService = new ChaosEngineeringService();