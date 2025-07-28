import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type ContentInsert = Database['public']['Tables']['content_items']['Insert'];
type ContentUpdate = Database['public']['Tables']['content_items']['Update'];
type ContentAnalytics = Database['public']['Tables']['content_analytics']['Row'];
type ContentTag = Database['public']['Tables']['content_tags']['Row'];
type ContentCategory = Database['public']['Tables']['content_categories']['Row'];

// Content CRUD operations
export const contentService = {
  // Get all content items for a project
  async getContentItems(projectId: string) {
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_analytics(*),
        content_tags(tag),
        content_categories(name, color, icon)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single content item
  async getContentItem(id: string) {
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_analytics(*),
        content_tags(tag),
        content_categories(name, color, icon),
        profiles:user_id(full_name, avatar_url),
        content_versions(*),
        content_collaborators(
          *,
          profiles:user_id(full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create content item
  async createContentItem(contentData: ContentInsert) {
    const { data, error } = await supabase
      .from('content_items')
      .insert(contentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update content item
  async updateContentItem(id: string, updates: ContentUpdate) {
    const { data, error } = await supabase
      .from('content_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete content item
  async deleteContentItem(id: string) {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search content with full-text search
  async searchContent(projectId: string, query: string) {
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        content_analytics(*),
        content_tags(tag),
        profiles:user_id(full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .textSearch('search_vector', query)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Filter content by type, status, etc.
  async filterContent(
    projectId: string,
    filters: {
      content_type?: string;
      status?: string;
      category_id?: string;
      user_id?: string;
    }
  ) {
    let query = supabase
      .from('content_items')
      .select(`
        *,
        content_analytics(*),
        content_tags(tag),
        content_categories(name, color, icon),
        profiles:user_id(full_name, avatar_url)
      `)
      .eq('project_id', projectId);

    if (filters.content_type) {
      query = query.eq('content_type', filters.content_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Content analytics operations
export const analyticsService = {
  // Get analytics for content item
  async getContentAnalytics(contentId: string) {
    const { data, error } = await supabase
      .from('content_analytics')
      .select('*')
      .eq('content_id', contentId)
      .order('analytics_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update analytics
  async updateAnalytics(contentId: string, analytics: Partial<ContentAnalytics>) {
    const { data, error } = await supabase
      .from('content_analytics')
      .upsert({
        content_id: contentId,
        analytics_date: new Date().toISOString().split('T')[0],
        ...analytics
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Content tags operations
export const tagsService = {
  // Get all tags for content
  async getContentTags(contentId: string) {
    const { data, error } = await supabase
      .from('content_tags')
      .select('*')
      .eq('content_id', contentId);

    if (error) throw error;
    return data;
  },

  // Add tags to content
  async addTags(contentId: string, tags: string[]) {
    const tagData = tags.map(tag => ({
      content_id: contentId,
      tag
    }));

    const { data, error } = await supabase
      .from('content_tags')
      .insert(tagData)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove tag from content
  async removeTag(contentId: string, tag: string) {
    const { error } = await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId)
      .eq('tag', tag);

    if (error) throw error;
  },

  // Get popular tags
  async getPopularTags(limit: number = 20) {
    const { data, error } = await supabase
      .from('content_tags')
      .select('tag')
      .limit(limit);

    if (error) throw error;
    
    // Count tag frequency
    const tagCounts = data?.reduce((acc, { tag }) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts || {})
      .sort(([,a], [,b]) => b - a)
      .map(([tag, count]) => ({ tag, count }));
  }
};

// Content categories operations
export const categoriesService = {
  // Get all categories
  async getCategories() {
    const { data, error } = await supabase
      .from('content_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  // Create category
  async createCategory(category: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_id?: string;
  }) {
    const { data, error } = await supabase
      .from('content_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// File upload operations
export const storageService = {
  // Upload file to content-files bucket
  async uploadFile(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('content-files')
      .upload(path, file);

    if (error) throw error;
    return data;
  },

  // Upload thumbnail to content-thumbnails bucket
  async uploadThumbnail(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('content-thumbnails')
      .upload(path, file);

    if (error) throw error;
    return data;
  },

  // Get file URL
  getFileUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Delete file
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }
};