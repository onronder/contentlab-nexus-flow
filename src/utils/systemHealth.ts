// System health monitoring and recovery utilities

export interface SystemHealth {
  teamPersistence: {
    circuitBreakerOpen: boolean;
    failureCount: number;
    lastError: string | null;
  };
  database: {
    connected: boolean;
    lastSyncAttempt: number | null;
    triggerErrors: string[];
  };
  authentication: {
    sessionValid: boolean;
    lastAuthError: string | null;
  };
}

class SystemHealthMonitor {
  private health: SystemHealth = {
    teamPersistence: {
      circuitBreakerOpen: false,
      failureCount: 0,
      lastError: null
    },
    database: {
      connected: true,
      lastSyncAttempt: null,
      triggerErrors: []
    },
    authentication: {
      sessionValid: true,
      lastAuthError: null
    }
  };

  private listeners: ((health: SystemHealth) => void)[] = [];

  getHealth(): SystemHealth {
    return { ...this.health };
  }

  updateTeamPersistenceHealth(update: Partial<SystemHealth['teamPersistence']>) {
    this.health.teamPersistence = { ...this.health.teamPersistence, ...update };
    this.notifyListeners();
  }

  updateDatabaseHealth(update: Partial<SystemHealth['database']>) {
    this.health.database = { ...this.health.database, ...update };
    this.notifyListeners();
  }

  updateAuthHealth(update: Partial<SystemHealth['authentication']>) {
    this.health.authentication = { ...this.health.authentication, ...update };
    this.notifyListeners();
  }

  addListener(listener: (health: SystemHealth) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.health);
      } catch (error) {
        console.warn('System health listener error:', error);
      }
    });
  }

  // Check overall system health
  isHealthy(): boolean {
    const { teamPersistence, database, authentication } = this.health;
    
    return !teamPersistence.circuitBreakerOpen &&
           database.connected &&
           authentication.sessionValid &&
           teamPersistence.failureCount < 3;
  }

  // Get health status summary
  getStatusSummary(): string {
    if (this.isHealthy()) {
      return 'System is healthy';
    }

    const issues: string[] = [];
    
    if (this.health.teamPersistence.circuitBreakerOpen) {
      issues.push('Team persistence circuit breaker is open');
    }
    
    if (!this.health.database.connected) {
      issues.push('Database connection issues');
    }
    
    if (!this.health.authentication.sessionValid) {
      issues.push('Authentication issues detected');
    }
    
    if (this.health.teamPersistence.failureCount >= 3) {
      issues.push('Multiple team persistence failures');
    }

    return `System issues detected: ${issues.join(', ')}`;
  }

  // Auto-recovery mechanisms
  attemptRecovery(): Promise<boolean> {
    return new Promise((resolve) => {
      // Reset circuit breaker if enough time has passed
      if (this.health.teamPersistence.circuitBreakerOpen) {
        setTimeout(() => {
          this.updateTeamPersistenceHealth({
            circuitBreakerOpen: false,
            failureCount: 0,
            lastError: null
          });
          console.log('Team persistence circuit breaker reset');
        }, 30000); // 30 seconds
      }

      // Clear old errors
      if (this.health.database.triggerErrors.length > 10) {
        this.updateDatabaseHealth({
          triggerErrors: this.health.database.triggerErrors.slice(-5)
        });
      }

      resolve(true);
    });
  }
}

// Global system health monitor instance
export const systemHealth = new SystemHealthMonitor();

// Helper function to report system errors
export function reportSystemError(
  category: keyof SystemHealth,
  error: any,
  context?: string
) {
  const errorMessage = error?.message || 'Unknown error';
  const timestamp = Date.now();

  switch (category) {
    case 'teamPersistence':
      systemHealth.updateTeamPersistenceHealth({
        failureCount: systemHealth.getHealth().teamPersistence.failureCount + 1,
        lastError: errorMessage,
        circuitBreakerOpen: systemHealth.getHealth().teamPersistence.failureCount >= 2
      });
      break;

    case 'database':
      systemHealth.updateDatabaseHealth({
        connected: false,
        lastSyncAttempt: timestamp,
        triggerErrors: [
          ...systemHealth.getHealth().database.triggerErrors,
          `${context || 'Unknown'}: ${errorMessage}`
        ].slice(-10) // Keep only last 10 errors
      });
      break;

    case 'authentication':
      systemHealth.updateAuthHealth({
        sessionValid: false,
        lastAuthError: errorMessage
      });
      break;
  }

  console.warn(`[SystemHealth] ${category} error:`, error);
}

// Helper function to report system recovery
export function reportSystemRecovery(category: keyof SystemHealth) {
  switch (category) {
    case 'teamPersistence':
      systemHealth.updateTeamPersistenceHealth({
        failureCount: 0,
        lastError: null,
        circuitBreakerOpen: false
      });
      break;

    case 'database':
      systemHealth.updateDatabaseHealth({
        connected: true,
        lastSyncAttempt: Date.now()
      });
      break;

    case 'authentication':
      systemHealth.updateAuthHealth({
        sessionValid: true,
        lastAuthError: null
      });
      break;
  }

  console.log(`[SystemHealth] ${category} recovered`);
}