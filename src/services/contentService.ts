import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  ContentItem,
  ContentCreateInput,
  ContentUpdateInput,
  ContentFilters,
  AnalyticsUpdateInput,
  EngagementType,
  ContentError,
  ContentValidationError,
  ContentNotFoundError,
  ContentPermissionError
} from "@/types/content";

type ContentRow = Database['public']['Tables']['content_items']['Row'];
type ContentInsert = Database['public']['Tables']['content_items']['Insert'];
type ContentUpdate = Database['public']['Tables']['content_items']['Update'];
type ContentAnalyticsRow = Database['public']['Tables']['content_analytics']['Row'];

// ==================== ENHANCED CONTENT SERVICE ====================

export class ContentService {
  private static instance: ContentService;

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  // ==================== CORE CRUD OPERATIONS ====================

  async createContent(data: ContentCreateInput): Promise<ContentItem> {
    try {
      this.validateContentInput(data);
      
      const contentData: ContentInsert = {
        project_id: data.project_id,
        user_id: (await this.getCurrentUserId()),
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        status: data.status || 'draft',
        file_path: data.file_path,
        file_size: data.file_size,
        mime_type: data.mime_type,
        thumbnail_path: data.thumbnail_path,
        metadata: data.metadata || {},
        category_id: data.category_id,
        scheduled_publish_at: data.scheduled_publish_at
      };

      const { data: content, error } = await supabase
        .from('content_items')
        .insert(contentData)
        .select(this.getSelectQuery())
        .single();

      if (error || !content) throw new ContentError(`Failed to create content: ${error?.message || 'No content returned'}`, 'CREATE_ERROR');
      
      // Add tags if provided
      if (data.tags && data.tags.length > 0) {
        await this.addTags((content as any).id, data.tags);
      }

      return this.transformContentRow(content);
    } catch (error) {
      this.handleError(error, 'createContent');
      throw error;
    }
  }

  async getContent(id: string): Promise<ContentItem> {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select(this.getSelectQuery())
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ContentNotFoundError(id);
        }
        throw new ContentError(`Failed to fetch content: ${error.message}`, 'FETCH_ERROR');
      }

      return this.transformContentRow(data);
    } catch (error) {
      this.handleError(error, 'getContent');
      throw error;
    }
  }

  async updateContent(id: string, updates: ContentUpdateInput): Promise<ContentItem> {
    try {
      const updateData: ContentUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('content_items')
        .update(updateData)
        .eq('id', id)
        .select(this.getSelectQuery())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ContentNotFoundError(id);
        }
        throw new ContentError(`Failed to update content: ${error.message}`, 'UPDATE_ERROR');
      }

      return this.transformContentRow(data);
    } catch (error) {
      this.handleError(error, 'updateContent');
      throw error;
    }
  }

  async deleteContent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);

      if (error) throw new ContentError(`Failed to delete content: ${error.message}`, 'DELETE_ERROR');
    } catch (error) {
      this.handleError(error, 'deleteContent');
      throw error;
    }
  }

  async archiveContent(id: string): Promise<ContentItem> {
    return this.updateContent(id, { status: 'archived' });
  }

  // ==================== ADVANCED QUERY OPERATIONS ====================

  async getContentByProject(projectId: string, filters?: ContentFilters, teamId?: string): Promise<ContentItem[]> {
    try {
      let query = supabase
        .from('content_items')
        .select(this.getSelectQuery())
        .eq('project_id', projectId);

      // Add team-based filtering if teamId provided
      if (teamId) {
        // Use new safe security definer function to avoid RLS recursion
        const currentUserId = await this.getCurrentUserId();
        
        // Verify user has access to this team using security definer function
        const { data: userTeamIds } = await supabase.rpc('get_user_team_ids_safe', {
          p_user_id: currentUserId
        });

        const userTeamIdList = userTeamIds?.map(team => team.team_id) || [];
        const hasTeamAccess = userTeamIdList.includes(teamId);
        
        if (hasTeamAccess) {
          // Filter content to only show items from the specified team context
          query = query.eq('team_id', teamId);
        } else {
          // User doesn't have access to this team, return empty array
          return [];
        }
      }

      query = this.applyFilters(query, filters);

      const { data, error } = await query;

      if (error) throw new ContentError(`Failed to fetch project content: ${error.message}`, 'FETCH_ERROR');

      return data.map(item => this.transformContentRow(item));
    } catch (error) {
      this.handleError(error, 'getContentByProject');
      throw error;
    }
  }

  async searchContent(searchQuery: string, filters?: ContentFilters): Promise<ContentItem[]> {
    try {
      if (!searchQuery.trim()) return [];

      let query = supabase
        .from('content_items')
        .select(this.getSelectQuery())
        .textSearch('search_vector', searchQuery);

      query = this.applyFilters(query, filters);

      const { data, error } = await query.limit(filters?.limit || 50);

      if (error) throw new ContentError(`Failed to search content: ${error.message}`, 'SEARCH_ERROR');

      return data.map(item => this.transformContentRow(item));
    } catch (error) {
      this.handleError(error, 'searchContent');
      throw error;
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  async trackView(contentId: string): Promise<void> {
    await this.trackEngagement(contentId, 'view');
  }

  async trackEngagement(contentId: string, type: EngagementType): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current analytics for today
      const { data: existing } = await supabase
        .from('content_analytics')
        .select('*')
        .eq('content_id', contentId)
        .eq('analytics_date', today)
        .single();

      const updateData: Record<string, number> = {};
      
      switch (type) {
        case 'view':
          updateData.views = (existing?.views || 0) + 1;
          break;
        case 'like':
          updateData.likes = (existing?.likes || 0) + 1;
          break;
        case 'share':
          updateData.shares = (existing?.shares || 0) + 1;
          break;
        case 'comment':
          updateData.comments = (existing?.comments || 0) + 1;
          break;
        case 'download':
          updateData.downloads = (existing?.downloads || 0) + 1;
          break;
        case 'click':
          updateData.impressions = (existing?.impressions || 0) + 1;
          break;
      }

      const { error } = await supabase
        .from('content_analytics')
        .upsert({
          content_id: contentId,
          analytics_date: today,
          ...updateData
        });

      if (error) throw new ContentError(`Failed to track engagement: ${error.message}`, 'ANALYTICS_ERROR');
    } catch (error) {
      this.handleError(error, 'trackEngagement');
      // Don't throw analytics errors to avoid breaking user experience
      console.warn('Analytics tracking failed:', error);
    }
  }

  async getAnalytics(contentId: string): Promise<ContentAnalyticsRow[]> {
    try {
      const { data, error } = await supabase
        .from('content_analytics')
        .select('*')
        .eq('content_id', contentId)
        .order('analytics_date', { ascending: false });

      if (error) throw new ContentError(`Failed to fetch analytics: ${error.message}`, 'ANALYTICS_ERROR');

      return data || [];
    } catch (error) {
      this.handleError(error, 'getAnalytics');
      throw error;
    }
  }

  async updateAnalytics(contentId: string, analytics: AnalyticsUpdateInput): Promise<ContentAnalyticsRow> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('content_analytics')
        .upsert({
          content_id: contentId,
          analytics_date: today,
          ...analytics
        })
        .select()
        .single();

      if (error) throw new ContentError(`Failed to update analytics: ${error.message}`, 'ANALYTICS_ERROR');

      return data;
    } catch (error) {
      this.handleError(error, 'updateAnalytics');
      throw error;
    }
  }

  // ==================== TAG OPERATIONS ====================

  async addTags(contentId: string, tags: string[]): Promise<void> {
    try {
      const tagData = tags.map(tag => ({
        content_id: contentId,
        tag: tag.trim().toLowerCase()
      }));

      const { error } = await supabase
        .from('content_tags')
        .insert(tagData);

      if (error) throw new ContentError(`Failed to add tags: ${error.message}`, 'TAG_ERROR');
    } catch (error) {
      this.handleError(error, 'addTags');
      throw error;
    }
  }

  async removeTag(contentId: string, tag: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_tags')
        .delete()
        .eq('content_id', contentId)
        .eq('tag', tag.trim().toLowerCase());

      if (error) throw new ContentError(`Failed to remove tag: ${error.message}`, 'TAG_ERROR');
    } catch (error) {
      this.handleError(error, 'removeTag');
      throw error;
    }
  }

  async getPopularTags(limit: number = 20): Promise<Array<{tag: string; count: number}>> {
    try {
      const { data, error } = await supabase
        .from('content_tags')
        .select('tag')
        .limit(1000);

      if (error) throw new ContentError(`Failed to fetch tags: ${error.message}`, 'TAG_ERROR');

      // Count tag frequency
      const tagCounts = data?.reduce((acc, { tag }) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(tagCounts || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    } catch (error) {
      this.handleError(error, 'getPopularTags');
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateStatus(contentIds: string[], status: ContentItem['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', contentIds);

      if (error) throw new ContentError(`Failed to bulk update status: ${error.message}`, 'BULK_UPDATE_ERROR');
    } catch (error) {
      this.handleError(error, 'bulkUpdateStatus');
      throw error;
    }
  }

  async bulkDelete(contentIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .in('id', contentIds);

      if (error) throw new ContentError(`Failed to bulk delete: ${error.message}`, 'BULK_DELETE_ERROR');
    } catch (error) {
      this.handleError(error, 'bulkDelete');
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private getSelectQuery(): string {
    return `
      *,
      content_analytics(*),
      content_tags(tag),
      content_categories(name, color, icon),
      profiles!content_items_user_id_fkey(full_name, avatar_url),
      content_versions(*),
      content_collaborators(
        *,
        profiles!content_collaborators_user_id_fkey(full_name, avatar_url)
      )
    `;
  }

  private applyFilters(query: any, filters?: ContentFilters): any {
    if (!filters) return query.order('created_at', { ascending: false });

    if (filters.content_type) {
      query = query.eq('content_type', filters.content_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.workflow_status) {
      query = query.eq('workflow_status', filters.workflow_status);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }

    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    return query;
  }

  private transformContentRow(row: any): ContentItem {
    return {
      id: row.id,
      user_id: row.user_id,
      project_id: row.project_id,
      title: row.title,
      description: row.description,
      content_type: row.content_type,
      status: row.status,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      thumbnail_path: row.thumbnail_path,
      metadata: row.metadata || {},
      content_hash: row.content_hash,
      workflow_status: row.workflow_status,
      category_id: row.category_id,
      scheduled_publish_at: row.scheduled_publish_at,
      published_at: row.published_at,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      review_comments: row.review_comments,
      created_at: row.created_at,
      updated_at: row.updated_at,
      content_analytics: row.content_analytics,
      content_tags: row.content_tags,
      content_categories: row.content_categories,
      profiles: row.profiles,
      content_versions: row.content_versions,
      content_collaborators: row.content_collaborators
    };
  }

  private validateContentInput(data: ContentCreateInput): void {
    if (!data.title?.trim()) {
      throw new ContentValidationError('Title is required', 'title');
    }
    if (!data.project_id) {
      throw new ContentValidationError('Project ID is required', 'project_id');
    }
    if (!data.content_type) {
      throw new ContentValidationError('Content type is required', 'content_type');
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new ContentPermissionError('User not authenticated');
    }
    return user.id;
  }

  private handleError(error: any, operation: string): void {
    if (error instanceof ContentError) {
      // Re-throw our custom errors
      return;
    }
    
    console.error(`ContentService.${operation} error:`, error);
    
    // Handle common Supabase errors
    if (error?.code === 'PGRST301') {
      throw new ContentPermissionError(operation);
    }
    if (error?.code === 'PGRST116') {
      throw new ContentNotFoundError('unknown');
    }
    
    // Generic fallback
    throw new ContentError(
      `Failed to ${operation}: ${error?.message || 'Unknown error'}`,
      'UNKNOWN_ERROR'
    );
  }
}

// ==================== EXPORT SINGLETON INSTANCE ====================

export const contentService = ContentService.getInstance();

// ==================== STORAGE SERVICE ====================

export class StorageService {
  async uploadFile(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('content-files')
      .upload(path, file);

    if (error) throw new ContentError(`Failed to upload file: ${error.message}`, 'UPLOAD_ERROR');
    return data;
  }

  async uploadThumbnail(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('content-thumbnails')
      .upload(path, file);

    if (error) throw new ContentError(`Failed to upload thumbnail: ${error.message}`, 'UPLOAD_ERROR');
    return data;
  }

  getFileUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw new ContentError(`Failed to delete file: ${error.message}`, 'DELETE_ERROR');
  }
}

export const storageService = new StorageService();

// ==================== LEGACY EXPORTS FOR BACKWARD COMPATIBILITY ====================

export {
  contentService as default,
  contentService as analyticsService,
  contentService as tagsService,
  contentService as categoriesService
};