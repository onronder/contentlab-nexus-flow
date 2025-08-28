import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: Record<string, number>;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  plan: SubscriptionPlan;
}

export interface UsageData {
  resource_type: string;
  usage_count: number;
  limit: number;
  percentage: number;
}

class SubscriptionService {
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    return (data || []).map(plan => ({
      ...plan,
      features: Array.isArray(plan.features) ? (plan.features as Json[]).map(f => String(f)) : [],
      limits: typeof plan.limits === 'object' && plan.limits ? plan.limits as Record<string, number> : {},
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
      description: plan.description || '',
      is_active: plan.is_active !== false
    }));
  }

  async getUserSubscription(): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    return {
      ...data,
      plan: {
        ...data.plan,
        features: Array.isArray(data.plan.features) ? (data.plan.features as Json[]).map(f => String(f)) : [],
        limits: typeof data.plan.limits === 'object' && data.plan.limits ? data.plan.limits as Record<string, number> : {},
        price_monthly: data.plan.price_monthly || 0,
        price_yearly: data.plan.price_yearly || 0,
        description: data.plan.description || '',
        is_active: data.plan.is_active !== false
      }
    };
  }

  async getUserUsage(): Promise<UsageData[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const subscription = await this.getUserSubscription();
    if (!subscription) return [];

    // Get usage from database using a simple query
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('resource_type, usage_count')
      .eq('user_id', user.data.user.id)
      .gte('usage_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;

    // Aggregate usage by resource type
    const usageMap = new Map<string, number>();
    (data || []).forEach(item => {
      const current = usageMap.get(item.resource_type) || 0;
      usageMap.set(item.resource_type, current + item.usage_count);
    });

    return Array.from(usageMap.entries()).map(([resource_type, usage_count]) => {
      const limit = subscription.plan.limits[resource_type] || 0;
      return {
        resource_type,
        usage_count,
        limit,
        percentage: limit > 0 ? (usage_count / limit) * 100 : 0
      };
    });
  }

  async trackUsage(resourceType: string, resourceId?: string, count: number = 1): Promise<void> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;

    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.data.user.id,
        resource_type: resourceType,
        resource_id: resourceId,
        usage_count: count,
        usage_date: new Date().toISOString().split('T')[0]
      });

    if (error) console.error('Failed to track usage:', error);
  }

  async checkUsageLimit(resourceType: string): Promise<boolean> {
    const subscription = await this.getUserSubscription();
    if (!subscription) return false;

    const limit = subscription.plan.limits[resourceType];
    if (limit === -1) return true; // Unlimited

    const usage = await this.getUserUsage();
    const resourceUsage = usage.find(u => u.resource_type === resourceType);
    
    return !resourceUsage || resourceUsage.usage_count < limit;
  }
}

export const subscriptionService = new SubscriptionService();