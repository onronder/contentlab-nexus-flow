// ==================== COMPETITOR TYPE DEFINITIONS ====================

export interface Competitor {
  id: string;
  project_id: string;
  company_name: string;
  domain: string;
  industry?: string;
  company_size?: string;
  competitive_tier: 'direct' | 'indirect' | 'substitute';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  headquarters?: string;
  value_proposition?: string;
  market_size?: string;
  analysis_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  description?: string;
  logo_url?: string;
  founded_year?: number;
  employee_count?: string;
  revenue_range?: string;
  funding_status?: string;
  market_share_estimate?: number;
  monitoring_enabled: boolean;
  last_analyzed?: string; // Changed from Date to string to match database
  last_analysis_date?: string; // Changed from Date to string to match database
  analysis_count: number;
  data_quality_score?: number;
  status: string; // Changed from union to string to match database
  tags: string[];
  custom_attributes?: any; // Changed to any to match Json type
  added_by: string;
  created_at: string; // Changed from Date to string to match database
  updated_at: string; // Changed from Date to string to match database
}

export interface CompetitorCreateInput {
  company_name: string;
  domain: string;
  industry?: string;
  company_size?: string;
  competitive_tier: 'direct' | 'indirect' | 'substitute';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  headquarters?: string;
  value_proposition?: string;
  market_size?: string;
  analysis_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  description?: string;
  logo_url?: string;
  founded_year?: number;
  employee_count?: string;
  revenue_range?: string;
  funding_status?: string;
  market_share_estimate?: number;
  monitoring_enabled: boolean;
  tags: string[];
  custom_attributes?: Record<string, any>;
}

export interface CompetitorUpdateInput {
  company_name?: string;
  domain?: string;
  industry?: string;
  company_size?: string;
  competitive_tier?: 'direct' | 'indirect' | 'substitute';
  threat_level?: 'low' | 'medium' | 'high' | 'critical';
  headquarters?: string;
  value_proposition?: string;
  market_size?: string;
  analysis_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  description?: string;
  logo_url?: string;
  founded_year?: number;
  employee_count?: string;
  revenue_range?: string;
  funding_status?: string;
  market_share_estimate?: number;
  monitoring_enabled?: boolean;
  status?: 'active' | 'inactive' | 'archived';
  tags?: string[];
  custom_attributes?: Record<string, any>;
}

export interface CompetitorAnalytics {
  competitor_id: string;
  total_analyses: number;
  completed_analyses: number;
  failed_analyses: number;
  avg_confidence_score: number;
  last_analysis_completed?: Date;
  analysis_trend: 'increasing' | 'decreasing' | 'stable';
  performance_metrics: {
    market_share: number;
    content_velocity: number;
    social_engagement: number;
    seo_score: number;
  };
}

export interface CompetitorAnalysisMetadata {
  id: string;
  competitor_id: string;
  analysis_type: string;
  status: string; // Changed from union to string to match database
  started_at: string; // Changed from Date to string to match database
  completed_at?: string; // Changed from Date to string to match database
  confidence_score?: number;
  results_summary?: any; // Changed to any to match Json type
  parameters?: any; // Changed to any to match Json type
  created_at: string; // Changed from Date to string to match database
  updated_at: string; // Changed from Date to string to match database
}

export interface CompetitorSearchResult {
  competitors: Competitor[];
  total: number;
  filtered: number;
  page: number;
  limit: number;
}

export interface CompetitorFilters {
  search?: string;
  industry?: string;
  competitive_tier?: string;
  threat_level?: string;
  status?: string;
  monitoring_enabled?: boolean;
  company_size?: string;
  market_size?: string;
  tags?: string[];
}

export interface CompetitorSortOptions {
  field: 'company_name' | 'created_at' | 'last_analyzed' | 'analysis_count' | 'threat_level';
  direction: 'asc' | 'desc';
}

export interface BulkCompetitorInput {
  competitors: CompetitorCreateInput[];
  skipDuplicates?: boolean;
  validateDomains?: boolean;
}

export interface BulkCompetitorResult {
  successful: Competitor[];
  failed: Array<{
    input: CompetitorCreateInput;
    error: string;
  }>;
  duplicates: CompetitorCreateInput[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duplicates: number;
  };
}

// ==================== ENUMS AND CONSTANTS ====================

export const COMPETITIVE_TIERS = [
  { value: 'direct', label: 'Direct Competitor', description: 'Direct competitors in the same market' },
  { value: 'indirect', label: 'Indirect Competitor', description: 'Similar solutions, different approach' },
  { value: 'substitute', label: 'Substitute', description: 'Alternative solutions to the same problem' }
] as const;

export const THREAT_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minimal competitive threat', color: 'green' },
  { value: 'medium', label: 'Medium', description: 'Moderate competitive threat', color: 'yellow' },
  { value: 'high', label: 'High', description: 'Significant competitive threat', color: 'orange' },
  { value: 'critical', label: 'Critical', description: 'Major competitive threat', color: 'red' }
] as const;

export const ANALYSIS_FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Monitor competitor daily' },
  { value: 'weekly', label: 'Weekly', description: 'Monitor competitor weekly' },
  { value: 'monthly', label: 'Monthly', description: 'Monitor competitor monthly' },
  { value: 'quarterly', label: 'Quarterly', description: 'Monitor competitor quarterly' }
] as const;

export const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup', description: '1-50 employees' },
  { value: 'small', label: 'Small', description: '51-200 employees' },
  { value: 'medium', label: 'Medium', description: '201-1000 employees' },
  { value: 'large', label: 'Large', description: '1001-5000 employees' },
  { value: 'enterprise', label: 'Enterprise', description: '5000+ employees' }
] as const;

export const MARKET_SIZES = [
  { value: 'niche', label: 'Niche', description: 'Specialized market segment' },
  { value: 'small', label: 'Small', description: 'Small market presence' },
  { value: 'medium', label: 'Medium', description: 'Medium market presence' },
  { value: 'large', label: 'Large', description: 'Large market presence' },
  { value: 'dominant', label: 'Dominant', description: 'Market leader' }
] as const;

export const REVENUE_RANGES = [
  { value: 'pre_revenue', label: 'Pre-Revenue', description: 'No revenue yet' },
  { value: 'under_1m', label: 'Under $1M', description: 'Less than $1M annual revenue' },
  { value: '1m_10m', label: '$1M - $10M', description: '$1M to $10M annual revenue' },
  { value: '10m_100m', label: '$10M - $100M', description: '$10M to $100M annual revenue' },
  { value: '100m_1b', label: '$100M - $1B', description: '$100M to $1B annual revenue' },
  { value: 'over_1b', label: 'Over $1B', description: 'More than $1B annual revenue' }
] as const;

export const FUNDING_STATUSES = [
  { value: 'bootstrapped', label: 'Bootstrapped', description: 'Self-funded' },
  { value: 'seed', label: 'Seed', description: 'Seed funding stage' },
  { value: 'series_a', label: 'Series A', description: 'Series A funding' },
  { value: 'series_b', label: 'Series B', description: 'Series B funding' },
  { value: 'series_c', label: 'Series C+', description: 'Series C or later' },
  { value: 'public', label: 'Public', description: 'Publicly traded' },
  { value: 'acquired', label: 'Acquired', description: 'Acquired by another company' }
] as const;

// ==================== VALIDATION SCHEMAS ====================

export const competitorValidationRules = {
  company_name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-&.,()]+$/
  },
  domain: {
    required: true,
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  },
  founded_year: {
    min: 1800,
    max: new Date().getFullYear()
  },
  market_share_estimate: {
    min: 0,
    max: 100
  }
};