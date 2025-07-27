import { supabase } from '@/integrations/supabase/client';
import { 
  Competitor, 
  CompetitorCreateInput, 
  CompetitorUpdateInput,
  CompetitorAnalytics,
  CompetitorAnalysisMetadata,
  CompetitorSearchResult,
  CompetitorFilters,
  CompetitorSortOptions,
  BulkCompetitorInput,
  BulkCompetitorResult,
  competitorValidationRules
} from '@/types/competitors';

// ==================== VALIDATION FUNCTIONS ====================

export function validateCompetitorData(data: CompetitorCreateInput | CompetitorUpdateInput): string[] {
  const errors: string[] = [];

  // Validate company name
  if ('company_name' in data && data.company_name !== undefined) {
    const { company_name } = data;
    if (!company_name || company_name.length < competitorValidationRules.company_name.minLength) {
      errors.push('Company name must be at least 2 characters long');
    }
    if (company_name && company_name.length > competitorValidationRules.company_name.maxLength) {
      errors.push('Company name must be less than 100 characters');
    }
    if (company_name && !competitorValidationRules.company_name.pattern.test(company_name)) {
      errors.push('Company name contains invalid characters');
    }
  }

  // Validate domain
  if ('domain' in data && data.domain !== undefined) {
    const { domain } = data;
    if (!domain) {
      errors.push('Domain is required');
    } else if (!competitorValidationRules.domain.pattern.test(domain)) {
      errors.push('Invalid domain format');
    }
  }

  // Validate founded year
  if ('founded_year' in data && data.founded_year !== undefined) {
    const { founded_year } = data;
    if (founded_year && (founded_year < competitorValidationRules.founded_year.min || founded_year > competitorValidationRules.founded_year.max)) {
      errors.push(`Founded year must be between ${competitorValidationRules.founded_year.min} and ${competitorValidationRules.founded_year.max}`);
    }
  }

  // Validate market share estimate
  if ('market_share_estimate' in data && data.market_share_estimate !== undefined) {
    const { market_share_estimate } = data;
    if (market_share_estimate && (market_share_estimate < competitorValidationRules.market_share_estimate.min || market_share_estimate > competitorValidationRules.market_share_estimate.max)) {
      errors.push('Market share estimate must be between 0 and 100');
    }
  }

  return errors;
}

// ==================== CORE CRUD OPERATIONS ====================

export async function createCompetitor(projectId: string, competitorData: CompetitorCreateInput): Promise<Competitor> {
  try {
    // Validate input data
    const validationErrors = validateCompetitorData(competitorData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check for duplicates within the project
    const { data: existingCompetitor, error: checkError } = await supabase
      .from('project_competitors')
      .select('id, company_name')
      .eq('project_id', projectId)
      .eq('domain', competitorData.domain)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to check for duplicates: ${checkError.message}`);
    }

    if (existingCompetitor) {
      throw new Error(`Competitor with domain "${competitorData.domain}" already exists in this project`);
    }

    // Create the competitor
    const { data, error } = await supabase
      .from('project_competitors')
      .insert({
        project_id: projectId,
        ...competitorData,
        added_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'active',
        analysis_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create competitor: ${error.message}`);
    }

    return transformDatabaseCompetitor(data);
  } catch (error) {
    console.error('Error creating competitor:', error);
    throw error;
  }
}

export async function getCompetitorById(competitorId: string): Promise<Competitor | null> {
  try {
    const { data, error } = await supabase
      .from('project_competitors')
      .select('*')
      .eq('id', competitorId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch competitor: ${error.message}`);
    }

    return data ? transformDatabaseCompetitor(data) : null;
  } catch (error) {
    console.error('Error fetching competitor:', error);
    throw error;
  }
}

export async function getCompetitorsByProject(
  projectId: string, 
  filters?: CompetitorFilters,
  sort?: CompetitorSortOptions,
  page: number = 1,
  limit: number = 50
): Promise<CompetitorSearchResult> {
  try {
    let query = supabase
      .from('project_competitors')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (filters) {
      if (filters.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%`);
      }
      if (filters.industry) {
        query = query.eq('industry', filters.industry);
      }
      if (filters.competitive_tier) {
        query = query.eq('competitive_tier', filters.competitive_tier);
      }
      if (filters.threat_level) {
        query = query.eq('threat_level', filters.threat_level);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.monitoring_enabled !== undefined) {
        query = query.eq('monitoring_enabled', filters.monitoring_enabled);
      }
      if (filters.company_size) {
        query = query.eq('company_size', filters.company_size);
      }
      if (filters.market_size) {
        query = query.eq('market_size', filters.market_size);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch competitors: ${error.message}`);
    }

    return {
      competitors: (data || []).map(transformDatabaseCompetitor),
      total: count || 0,
      filtered: count || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching competitors:', error);
    throw error;
  }
}

export async function updateCompetitor(competitorId: string, updateData: CompetitorUpdateInput): Promise<Competitor> {
  try {
    // Validate input data
    const validationErrors = validateCompetitorData(updateData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check for domain conflicts if domain is being updated
    if (updateData.domain) {
      const { data: competitor } = await supabase
        .from('project_competitors')
        .select('project_id')
        .eq('id', competitorId)
        .single();

      if (competitor) {
        const { data: existingCompetitor } = await supabase
          .from('project_competitors')
          .select('id')
          .eq('project_id', competitor.project_id)
          .eq('domain', updateData.domain)
          .neq('id', competitorId)
          .maybeSingle();

        if (existingCompetitor) {
          throw new Error(`Competitor with domain "${updateData.domain}" already exists in this project`);
        }
      }
    }

    const { data, error } = await supabase
      .from('project_competitors')
      .update(updateData)
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update competitor: ${error.message}`);
    }

    return transformDatabaseCompetitor(data);
  } catch (error) {
    console.error('Error updating competitor:', error);
    throw error;
  }
}

export async function deleteCompetitor(competitorId: string): Promise<void> {
  try {
    // Soft delete by setting status to inactive
    const { error } = await supabase
      .from('project_competitors')
      .update({ status: 'inactive' })
      .eq('id', competitorId);

    if (error) {
      throw new Error(`Failed to delete competitor: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting competitor:', error);
    throw error;
  }
}

export async function restoreCompetitor(competitorId: string): Promise<Competitor> {
  try {
    const { data, error } = await supabase
      .from('project_competitors')
      .update({ status: 'active' })
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to restore competitor: ${error.message}`);
    }

    return transformDatabaseCompetitor(data);
  } catch (error) {
    console.error('Error restoring competitor:', error);
    throw error;
  }
}

// ==================== ADVANCED OPERATIONS ====================

export async function bulkCreateCompetitors(
  projectId: string, 
  bulkData: BulkCompetitorInput
): Promise<BulkCompetitorResult> {
  const result: BulkCompetitorResult = {
    successful: [],
    failed: [],
    duplicates: [],
    summary: {
      total: bulkData.competitors.length,
      successful: 0,
      failed: 0,
      duplicates: 0
    }
  };

  // Get existing domains if checking for duplicates
  let existingDomains: Set<string> = new Set();
  if (bulkData.skipDuplicates) {
    const { data: existing } = await supabase
      .from('project_competitors')
      .select('domain')
      .eq('project_id', projectId);
    
    existingDomains = new Set((existing || []).map(c => c.domain));
  }

  for (const competitorData of bulkData.competitors) {
    try {
      // Check for duplicates
      if (bulkData.skipDuplicates && existingDomains.has(competitorData.domain)) {
        result.duplicates.push(competitorData);
        result.summary.duplicates++;
        continue;
      }

      const competitor = await createCompetitor(projectId, competitorData);
      result.successful.push(competitor);
      result.summary.successful++;
      existingDomains.add(competitorData.domain);
    } catch (error) {
      result.failed.push({
        input: competitorData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.summary.failed++;
    }
  }

  return result;
}

export async function searchCompetitors(
  projectId: string, 
  searchTerm: string,
  filters?: CompetitorFilters
): Promise<CompetitorSearchResult> {
  return getCompetitorsByProject(projectId, {
    ...filters,
    search: searchTerm
  });
}

export async function getCompetitorAnalytics(competitorId: string): Promise<CompetitorAnalytics | null> {
  try {
    // Get analysis metadata
    const { data: analysisData, error: analysisError } = await supabase
      .from('competitor_analysis_metadata')
      .select('*')
      .eq('competitor_id', competitorId);

    if (analysisError) {
      throw new Error(`Failed to fetch competitor analytics: ${analysisError.message}`);
    }

    if (!analysisData || analysisData.length === 0) {
      return null;
    }

    // Calculate analytics
    const total_analyses = analysisData.length;
    const completed_analyses = analysisData.filter(a => a.status === 'completed').length;
    const failed_analyses = analysisData.filter(a => a.status === 'failed').length;
    const confidenceScores = analysisData
      .filter(a => a.confidence_score !== null)
      .map(a => a.confidence_score);
    const avg_confidence_score = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;

    const last_analysis_completed = analysisData
      .filter(a => a.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]?.completed_at;

    return {
      competitor_id: competitorId,
      total_analyses,
      completed_analyses,
      failed_analyses,
      avg_confidence_score,
      last_analysis_completed: last_analysis_completed ? new Date(last_analysis_completed) : undefined,
      analysis_trend: 'stable', // This would need more complex logic to determine
      performance_metrics: {
        market_share: 0, // These would come from actual analysis results
        content_velocity: 0,
        social_engagement: 0,
        seo_score: 0
      }
    };
  } catch (error) {
    console.error('Error fetching competitor analytics:', error);
    throw error;
  }
}

export async function toggleMonitoring(competitorId: string, enabled: boolean): Promise<Competitor> {
  try {
    const updateData = {
      monitoring_enabled: enabled,
      last_analyzed: enabled ? new Date().toISOString() : undefined
    };

    const { data, error } = await supabase
      .from('project_competitors')
      .update(updateData)
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle monitoring: ${error.message}`);
    }

    return transformDatabaseCompetitor(data);
  } catch (error) {
    console.error('Error toggling monitoring:', error);
    throw error;
  }
}

export async function getCompetitorsForAnalysis(projectId: string): Promise<Competitor[]> {
  try {
    const { data, error } = await supabase
      .from('project_competitors')
      .select('*')
      .eq('project_id', projectId)
      .eq('monitoring_enabled', true)
      .eq('status', 'active')
      .order('last_analyzed', { ascending: true, nullsFirst: true });

    if (error) {
      throw new Error(`Failed to fetch competitors for analysis: ${error.message}`);
    }

    return (data || []).map(transformDatabaseCompetitor);
  } catch (error) {
    console.error('Error fetching competitors for analysis:', error);
    throw error;
  }
}

// ==================== UTILITY FUNCTIONS ====================

function transformDatabaseCompetitor(dbCompetitor: any): Competitor {
  return {
    id: dbCompetitor.id,
    project_id: dbCompetitor.project_id,
    company_name: dbCompetitor.company_name,
    domain: dbCompetitor.domain,
    industry: dbCompetitor.industry,
    company_size: dbCompetitor.company_size,
    competitive_tier: dbCompetitor.competitive_tier,
    threat_level: dbCompetitor.threat_level,
    headquarters: dbCompetitor.headquarters,
    value_proposition: dbCompetitor.value_proposition,
    market_size: dbCompetitor.market_size,
    analysis_frequency: dbCompetitor.analysis_frequency,
    description: dbCompetitor.description,
    logo_url: dbCompetitor.logo_url,
    founded_year: dbCompetitor.founded_year,
    employee_count: dbCompetitor.employee_count,
    revenue_range: dbCompetitor.revenue_range,
    funding_status: dbCompetitor.funding_status,
    market_share_estimate: dbCompetitor.market_share_estimate,
    monitoring_enabled: dbCompetitor.monitoring_enabled,
    last_analyzed: dbCompetitor.last_analyzed ? new Date(dbCompetitor.last_analyzed) : undefined,
    last_analysis_date: dbCompetitor.last_analysis_date ? new Date(dbCompetitor.last_analysis_date) : undefined,
    analysis_count: dbCompetitor.analysis_count || 0,
    data_quality_score: dbCompetitor.data_quality_score,
    status: dbCompetitor.status,
    tags: dbCompetitor.tags || [],
    custom_attributes: dbCompetitor.custom_attributes || {},
    added_by: dbCompetitor.added_by,
    created_at: new Date(dbCompetitor.created_at),
    updated_at: new Date(dbCompetitor.updated_at)
  };
}

export function validateDomain(domain: string): boolean {
  return competitorValidationRules.domain.pattern.test(domain);
}

export function generateCompetitorSummary(competitors: Competitor[]): {
  total: number;
  active: number;
  inactive: number;
  monitoring: number;
  byThreatLevel: Record<string, number>;
  byIndustry: Record<string, number>;
} {
  const summary = {
    total: competitors.length,
    active: 0,
    inactive: 0,
    monitoring: 0,
    byThreatLevel: {} as Record<string, number>,
    byIndustry: {} as Record<string, number>
  };

  competitors.forEach(competitor => {
    if (competitor.status === 'active') summary.active++;
    if (competitor.status === 'inactive') summary.inactive++;
    if (competitor.monitoring_enabled) summary.monitoring++;

    // Group by threat level
    const threatLevel = competitor.threat_level;
    summary.byThreatLevel[threatLevel] = (summary.byThreatLevel[threatLevel] || 0) + 1;

    // Group by industry
    if (competitor.industry) {
      summary.byIndustry[competitor.industry] = (summary.byIndustry[competitor.industry] || 0) + 1;
    }
  });

  return summary;
}