/**
 * Production configuration and optimization settings
 */

export const productionConfig = {
  // Performance optimizations
  performance: {
    enableCaching: true,
    cacheExpiration: 5 * 60 * 1000, // 5 minutes
    debounceSearch: 300, // ms
    virtualizedListThreshold: 100,
    imageLazyLoading: true,
    enableServiceWorker: true,
  },

  // Security settings
  security: {
    enableCSP: true,
    enableHSTS: true,
    enableXSSProtection: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireSecureContext: true,
  },

  // Analytics and monitoring
  monitoring: {
    enableErrorTracking: true,
    enablePerformanceMetrics: true,
    enableUserAnalytics: true,
    enableRealTimeMonitoring: true,
    errorReportingLevel: 'error',
    metricsCollection: true,
  },

  // Feature flags for production
  features: {
    enableAdvancedAnalytics: true,
    enableTeamCollaboration: true,
    enableContentManagement: true,
    enableSecurityDashboard: true,
    enableAuditLogging: true,
    enableRealTimeUpdates: true,
    enableBulkOperations: true,
    enableExportFeatures: true,
    enableAdvancedSearch: true,
  },

  // API configurations
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
    compression: true,
  },

  // Data retention and cleanup
  dataRetention: {
    auditLogDays: 365,
    sessionLogDays: 30,
    errorLogDays: 90,
    analyticsDataDays: 730, // 2 years
    tempFileCleanupHours: 24,
  },

  // Notification settings
  notifications: {
    enablePush: true,
    enableEmail: true,
    enableInApp: true,
    batchNotifications: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
  },
};

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  return {
    ...productionConfig,
    // Override settings for development
    ...(isDevelopment && {
      security: {
        ...productionConfig.security,
        sessionTimeout: 60 * 60 * 1000, // 1 hour in dev
        requireSecureContext: false,
      },
      monitoring: {
        ...productionConfig.monitoring,
        errorReportingLevel: 'debug',
      },
    }),
    // Production-only optimizations
    ...(isProduction && {
      performance: {
        ...productionConfig.performance,
        enableServiceWorker: true,
        enableCaching: true,
      },
    }),
  };
};

// Security headers for production
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://ijvhqqdfthchtittyvnt.supabase.co wss://ijvhqqdfthchtittyvnt.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
  ].join(', '),
};

export default productionConfig;