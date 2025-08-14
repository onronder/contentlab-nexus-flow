import { z } from 'zod';

// Comprehensive settings validation schemas
export const userSettingsSchema = z.object({
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    in_app: z.boolean()
  }),
  theme_preferences: z.object({
    mode: z.enum(['light', 'dark', 'system']),
    color: z.string().min(1)
  }),
  privacy_settings: z.object({
    profile_visibility: z.enum(['public', 'team', 'private']),
    activity_visibility: z.enum(['public', 'team', 'private'])
  }),
  feature_flags: z.record(z.any()).optional()
});

export const contentSettingsSchema = z.object({
  management_settings: z.object({
    autoSave: z.boolean(),
    versionControl: z.boolean(),
    backupFrequency: z.enum(['daily', 'weekly', 'monthly'])
  }),
  workflow_settings: z.object({
    autoPublish: z.boolean(),
    reviewSteps: z.number().min(0).max(5),
    approvalRequired: z.boolean()
  }),
  upload_settings: z.object({
    maxFileSize: z.number().min(1048576).max(104857600), // 1MB to 100MB
    allowedTypes: z.array(z.string()),
    autoOptimize: z.boolean()
  }),
  organization_settings: z.object({
    autoTagging: z.boolean(),
    defaultTags: z.array(z.string()),
    categoryRequired: z.boolean()
  }),
  search_settings: z.object({
    indexContent: z.boolean(),
    searchHistory: z.boolean(),
    enableFullText: z.boolean()
  })
});

export const competitiveSettingsSchema = z.object({
  monitoring_settings: z.object({
    frequency: z.enum(['hourly', 'daily', 'weekly']),
    alertThreshold: z.number().min(0).max(1),
    autoMonitoring: z.boolean()
  }),
  analysis_settings: z.object({
    depthLevel: z.enum(['basic', 'standard', 'comprehensive']),
    includeSerp: z.boolean(),
    trackChanges: z.boolean()
  }),
  reporting_settings: z.object({
    autoReports: z.boolean(),
    includeCharts: z.boolean(),
    reportFrequency: z.enum(['daily', 'weekly', 'monthly'])
  }),
  alerting_settings: z.object({
    emailAlerts: z.boolean(),
    inAppAlerts: z.boolean(),
    severityFilter: z.enum(['low', 'medium', 'high'])
  }),
  data_retention: z.object({
    retentionPeriod: z.number().min(30).max(730), // 30 days to 2 years
    autoCleanup: z.boolean(),
    exportBeforeCleanup: z.boolean()
  })
});

export const analyticsSettingsSchema = z.object({
  dashboard_settings: z.object({
    defaultDateRange: z.enum(['7d', '30d', '90d', '1y']),
    showRealTime: z.boolean(),
    refreshInterval: z.number().min(60).max(3600)
  }),
  chart_settings: z.object({
    defaultChartType: z.enum(['line', 'bar', 'pie', 'area']),
    showDataLabels: z.boolean(),
    enableInteractivity: z.boolean()
  }),
  report_settings: z.object({
    format: z.enum(['pdf', 'excel', 'csv']),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    autoGenerate: z.boolean()
  }),
  data_settings: z.object({
    dataRetention: z.number().min(90).max(1095), // 3 months to 3 years
    includeRawData: z.boolean(),
    aggregationLevel: z.enum(['hourly', 'daily', 'weekly'])
  }),
  alert_settings: z.object({
    thresholdAlerts: z.boolean(),
    anomalyDetection: z.boolean(),
    alertChannels: z.array(z.enum(['email', 'inApp', 'webhook']))
  }),
  privacy_settings: z.object({
    dataExport: z.boolean(),
    anonymizeData: z.boolean(),
    shareAnalytics: z.boolean()
  })
});

// Advanced validation utilities
export class SettingsValidator {
  static validateCrossFieldDependencies(settingType: string, data: any): ValidationResult {
    const errors: ValidationError[] = [];

    switch (settingType) {
      case 'content':
        // Example: If approval is required, review steps must be > 0
        if (data.workflow_settings?.approvalRequired && data.workflow_settings?.reviewSteps === 0) {
          errors.push({
            field: 'workflow_settings.reviewSteps',
            message: 'Review steps must be greater than 0 when approval is required',
            code: 'DEPENDENCY_VIOLATION'
          });
        }
        break;

      case 'competitive':
        // Example: If auto monitoring is enabled, frequency must be set
        if (data.monitoring_settings?.autoMonitoring && !data.monitoring_settings?.frequency) {
          errors.push({
            field: 'monitoring_settings.frequency',
            message: 'Monitoring frequency is required when auto monitoring is enabled',
            code: 'DEPENDENCY_VIOLATION'
          });
        }
        break;

      case 'analytics':
        // Example: If real-time is enabled, refresh interval must be low
        if (data.dashboard_settings?.showRealTime && data.dashboard_settings?.refreshInterval > 300) {
          errors.push({
            field: 'dashboard_settings.refreshInterval',
            message: 'Refresh interval must be 5 minutes or less for real-time data',
            code: 'BUSINESS_RULE_VIOLATION'
          });
        }
        break;
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateBusinessRules(settingType: string, data: any, context?: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Team-specific validations
    if (context?.teamLimits) {
      switch (settingType) {
        case 'content':
          if (data.upload_settings?.maxFileSize > context.teamLimits.maxFileSize) {
            errors.push({
              field: 'upload_settings.maxFileSize',
              message: `File size limit cannot exceed team limit of ${context.teamLimits.maxFileSize}`,
              code: 'TEAM_LIMIT_EXCEEDED'
            });
          }
          break;

        case 'competitive':
          if (data.monitoring_settings?.frequency === 'hourly' && !context.teamLimits.hourlyMonitoring) {
            errors.push({
              field: 'monitoring_settings.frequency',
              message: 'Hourly monitoring requires premium team plan',
              code: 'FEATURE_NOT_AVAILABLE'
            });
          }
          break;
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  static validateSecurityConstraints(settingType: string, data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Security validations
    if (settingType === 'user') {
      // Example: Public profile requires certain privacy settings
      if (data.privacy_settings?.profile_visibility === 'public' && 
          data.privacy_settings?.activity_visibility === 'private') {
        errors.push({
          field: 'privacy_settings.activity_visibility',
          message: 'Activity visibility cannot be private when profile is public',
          code: 'SECURITY_CONSTRAINT'
        });
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
}

// Comprehensive validation function
export const validateSettings = (
  settingType: string,
  data: any,
  context?: any
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Schema validation
  let schemaResult: ValidationResult = { success: true };
  
  try {
    switch (settingType) {
      case 'user':
        userSettingsSchema.parse(data);
        break;
      case 'content':
        contentSettingsSchema.parse(data);
        break;
      case 'competitive':
        competitiveSettingsSchema.parse(data);
        break;
      case 'analytics':
        analyticsSettingsSchema.parse(data);
        break;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      schemaResult = {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
  }

  if (schemaResult.errors) {
    errors.push(...schemaResult.errors);
  }

  // Cross-field validation
  const crossFieldResult = SettingsValidator.validateCrossFieldDependencies(settingType, data);
  if (crossFieldResult.errors) {
    errors.push(...crossFieldResult.errors);
  }

  // Business rules validation
  const businessRulesResult = SettingsValidator.validateBusinessRules(settingType, data, context);
  if (businessRulesResult.errors) {
    errors.push(...businessRulesResult.errors);
  }

  // Security constraints validation
  const securityResult = SettingsValidator.validateSecurityConstraints(settingType, data);
  if (securityResult.errors) {
    errors.push(...securityResult.errors);
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

// Default validation configurations
export const defaultValidationRules = {
  user: [
    {
      field_path: 'notification_preferences.email',
      rule_type: 'required',
      rule_config: {},
      error_message: 'Email notification preference is required'
    },
    {
      field_path: 'theme_preferences.mode',
      rule_type: 'required',
      rule_config: {},
      error_message: 'Theme mode is required'
    }
  ],
  content: [
    {
      field_path: 'upload_settings.maxFileSize',
      rule_type: 'range',
      rule_config: { min: 1048576, max: 104857600 },
      error_message: 'File size must be between 1MB and 100MB'
    }
  ],
  competitive: [
    {
      field_path: 'monitoring_settings.alertThreshold',
      rule_type: 'range',
      rule_config: { min: 0, max: 1 },
      error_message: 'Alert threshold must be between 0 and 1'
    }
  ],
  analytics: [
    {
      field_path: 'data_settings.dataRetention',
      rule_type: 'range',
      rule_config: { min: 90, max: 1095 },
      error_message: 'Data retention must be between 90 and 1095 days'
    }
  ]
};