import { supabase } from '@/integrations/supabase/client';

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
      features: Array.isArray(plan.features) ? plan.features : [],
      limits: typeof plan.limits === 'object' && plan.limits ? plan.limits as Record<string, number> : {}
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
        features: Array.isArray(data.plan.features) ? data.plan.features : [],
        limits: typeof data.plan.limits === 'object' && data.plan.limits ? data.plan.limits as Record<string, number> : {}
      }
    };
  }

  async getUserUsage(): Promise<UsageData[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const subscription = await this.getUserSubscription();
    if (!subscription) return [];

    // Use rpc for aggregation since groupBy is not available in the client
    const { data, error } = await supabase
      .rpc('get_user_usage_summary', {
        p_user_id: user.data.user.id,
        p_days: 30
      });

    if (error) throw error;

    return (data || []).map(item => {
      const limit = subscription.plan.limits[item.resource_type] || 0;
      const usage = item.sum || 0;
      return {
        resource_type: item.resource_type,
        usage_count: usage,
        limit,
        percentage: limit > 0 ? (usage / limit) * 100 : 0
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