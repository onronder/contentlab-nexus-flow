import { supabase } from '@/integrations/supabase/client';
import { generateRandomString } from '@/utils/security';

export interface ApiKey {
  id: string;
  user_id: string;
  team_id?: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

class ApiKeyService {
  async createApiKey(name: string, permissions: string[], teamId?: string): Promise<{ key: string; apiKey: ApiKey }> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    // Generate a secure API key
    const key = this.generateApiKey();
    const keyPrefix = key.substring(0, 8) + '...';
    const keyHash = await this.hashApiKey(key);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.data.user.id,
        team_id: teamId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions,
        rate_limit: 1000,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return {
      key, // Return the full key only once during creation
      apiKey: {
        id: data.id || '',
        user_id: data.user_id || '',
        team_id: data.team_id,
        name: data.name || '',
        key_prefix: data.key_prefix || '',
        permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
        rate_limit: data.rate_limit || 1000,
        is_active: data.is_active !== false,
        last_used_at: data.last_used_at,
        expires_at: data.expires_at,
        created_at: data.created_at || new Date().toISOString()
      }
    };
  }

  async getUserApiKeys(): Promise<ApiKey[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(key => ({
      id: key.id || '',
      user_id: key.user_id || '',
      team_id: key.team_id,
      name: key.name || '',
      key_prefix: key.key_prefix || '',
      permissions: Array.isArray(key.permissions) ? (key.permissions as string[]) : [],
      rate_limit: key.rate_limit || 1000,
      is_active: key.is_active !== false,
      last_used_at: key.last_used_at,
      expires_at: key.expires_at,
      created_at: key.created_at || new Date().toISOString()
    }));
  }

  async getTeamApiKeys(teamId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(key => ({
      id: key.id || '',
      user_id: key.user_id || '',
      team_id: key.team_id,
      name: key.name || '',
      key_prefix: key.key_prefix || '',
      permissions: Array.isArray(key.permissions) ? (key.permissions as string[]) : [],
      rate_limit: key.rate_limit || 1000,
      is_active: key.is_active !== false,
      last_used_at: key.last_used_at,
      expires_at: key.expires_at,
      created_at: key.created_at || new Date().toISOString()
    }));
  }

  async updateApiKey(id: string, updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rate_limit' | 'is_active'>>): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteApiKey(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    const keyHash = await this.hashApiKey(key);
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      id: data.id || '',
      user_id: data.user_id || '',
      team_id: data.team_id,
      name: data.name || '',
      key_prefix: data.key_prefix || '',
      permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
      rate_limit: data.rate_limit || 1000,
      is_active: data.is_active !== false,
      last_used_at: data.last_used_at,
      expires_at: data.expires_at,
      created_at: data.created_at || new Date().toISOString()
    };
  }

  private generateApiKey(): string {
    return `clb_${generateRandomString(32)}`;
  }

  private async hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const apiKeyService = new ApiKeyService();