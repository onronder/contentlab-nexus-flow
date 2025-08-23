import { supabase } from '@/integrations/supabase/client';

// Phase 2: API Response Optimization Service
export class QueryOptimizationService {
  private static instance: QueryOptimizationService;
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  static getInstance(): QueryOptimizationService {
    if (!QueryOptimizationService.instance) {
      QueryOptimizationService.instance = new QueryOptimizationService();
    }
    return QueryOptimizationService.instance;
  }

  // Selective field queries - GraphQL-like functionality
  async selectiveQuery<T = any>(
    table: string,
    columns: string[],
    filters?: Record<string, any>,
    options?: {
      limit?: number;
      orderBy?: { column: string; ascending?: boolean };
      cacheTtl?: number;
    }
  ): Promise<{ data: T[] | null; error: any }> {
    const cacheKey = this.generateCacheKey(table, columns, filters, options);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return { data: cached, error: null };
    }

    try {
      let query = (supabase as any)
        .from(table)
        .select(columns.join(','));

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (!error && data) {
        this.setCache(cacheKey, data, options?.cacheTtl || 300000); // 5min default
      }

      return { data: error ? null : (data as T[]), error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Optimized pagination
  async paginatedQuery<T = any>(
    table: string,
    columns: string[],
    page: number = 1,
    pageSize: number = 20,
    filters?: Record<string, any>
  ): Promise<{
    data: T[] | null;
    error: any;
    count: number | null;
    hasMore: boolean;
  }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = (supabase as any)
        .from(table)
        .select(columns.join(','), { count: 'exact' })
        .range(from, to);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error, count } = await query;

      return {
        data: error ? null : (data as T[]),
        error,
        count,
        hasMore: count ? from + pageSize < count : false
      };
    } catch (err) {
      return {
        data: null,
        error: err,
        count: null,
        hasMore: false
      };
    }
  }

  // Batch queries for related data
  async batchQueries<T extends Record<string, any>>(
    queries: Array<{
      table: string;
      columns: string[];
      filters?: Record<string, any>;
      key: string;
    }>
  ): Promise<Record<string, { data: any[] | null; error: any }>> {
    const promises = queries.map(async ({ table, columns, filters, key }) => {
      const result = await this.selectiveQuery(table, columns, filters);
      return { key, result };
    });

    const results = await Promise.all(promises);
    
    return results.reduce((acc, { key, result }) => {
      acc[key] = result;
      return acc;
    }, {} as Record<string, { data: any[] | null; error: any }>);
  }

  // Optimized project analytics using new DB function
  async getProjectAnalyticsOptimized(
    userId: string,
    teamId?: string,
    limit: number = 50
  ) {
    const { data, error } = await supabase.rpc('get_project_analytics_optimized', {
      p_user_id: userId,
      p_team_id: teamId || null,
      p_limit: limit
    });

    return { data, error };
  }

  // Cache management
  private generateCacheKey(
    table: string,
    columns: string[],
    filters?: Record<string, any>,
    options?: any
  ): string {
    return `${table}:${columns.sort().join(',')}:${JSON.stringify(filters)}:${JSON.stringify(options)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Clear cache
  clearCache(): void {
    this.queryCache.clear();
  }

  // Cache statistics
  getCacheStats() {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys())
    };
  }
}

export const queryOptimizationService = QueryOptimizationService.getInstance();