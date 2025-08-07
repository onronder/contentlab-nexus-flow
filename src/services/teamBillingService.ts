import { supabase } from "@/integrations/supabase/client";

export interface TeamBilling {
  id: string;
  team_id: string;
  subscription_status: 'active' | 'cancelled' | 'suspended' | 'expired';
  subscription_tier: 'basic' | 'professional' | 'enterprise';
  billing_cycle: 'monthly' | 'yearly';
  monthly_cost: number;
  usage_limits: {
    users: number;
    projects: number;
    storage_gb: number;
  };
  current_usage: {
    users: number;
    projects: number;
    storage_gb: number;
  };
  billing_contact_id?: string;
  payment_method: Record<string, any>;
  next_billing_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingUsageAlert {
  metric: string;
  current: number;
  limit: number;
  percentage: number;
  severity: 'low' | 'medium' | 'high';
}

export class TeamBillingService {
  /**
   * Get team billing information
   */
  static async getTeamBilling(teamId: string): Promise<TeamBilling | null> {
    try {
      const { data, error } = await supabase
        .from('team_billing')
        .select('*')
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching team billing:', error);
        return null;
      }

      // If no billing record exists, create a default one
      if (!data) {
        try {
          return await this.createTeamBilling({
            team_id: teamId,
            subscription_tier: 'basic',
            billing_cycle: 'monthly'
          });
        } catch (createError) {
          console.error('Error creating default billing:', createError);
          return null;
        }
      }

      return data as TeamBilling;
    } catch (error) {
      console.error('TeamBillingService.getTeamBilling error:', error);
      return null;
    }
  }

  /**
   * Update team billing information
   */
  static async updateTeamBilling(
    teamId: string, 
    updates: Partial<TeamBilling>
  ): Promise<TeamBilling> {
    try {
      const { data, error } = await supabase
        .from('team_billing')
        .update(updates)
        .eq('team_id', teamId)
        .select()
        .single();

      if (error) {
        console.error('Error updating team billing:', error);
        throw new Error(`Failed to update team billing: ${error.message}`);
      }

      return data as TeamBilling;
    } catch (error) {
      console.error('TeamBillingService.updateTeamBilling error:', error);
      throw error;
    }
  }

  /**
   * Create billing record for new team
   */
  static async createTeamBilling(teamData: {
    team_id: string;
    subscription_tier: string;
    billing_cycle: string;
    billing_contact_id?: string;
  }): Promise<TeamBilling> {
    try {
      const tierLimits = this.getTierLimits(teamData.subscription_tier as any);
      const tierCost = this.getTierCost(teamData.subscription_tier as any, teamData.billing_cycle as any);

      const { data, error } = await supabase
        .from('team_billing')
        .insert({
          team_id: teamData.team_id,
          subscription_tier: teamData.subscription_tier,
          billing_cycle: teamData.billing_cycle,
          monthly_cost: tierCost,
          usage_limits: tierLimits,
          billing_contact_id: teamData.billing_contact_id,
          next_billing_date: this.calculateNextBillingDate(teamData.billing_cycle as any)
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating team billing:', error);
        throw new Error(`Failed to create team billing: ${error.message}`);
      }

      return data as TeamBilling;
    } catch (error) {
      console.error('TeamBillingService.createTeamBilling error:', error);
      throw error;
    }
  }

  /**
   * Update current usage for a team
   */
  static async updateUsage(
    teamId: string,
    usage: Partial<TeamBilling['current_usage']>
  ): Promise<void> {
    try {
      // Get current billing info
      const billing = await this.getTeamBilling(teamId);
      if (!billing) {
        throw new Error('No billing record found for team');
      }

      const updatedUsage = {
        ...billing.current_usage,
        ...usage
      };

      await this.updateTeamBilling(teamId, { current_usage: updatedUsage });
    } catch (error) {
      console.error('TeamBillingService.updateUsage error:', error);
      throw error;
    }
  }

  /**
   * Check for usage alerts
   */
  static async getUsageAlerts(teamId: string): Promise<BillingUsageAlert[]> {
    try {
      const billing = await this.getTeamBilling(teamId);
      if (!billing) {
        return [];
      }

      const alerts: BillingUsageAlert[] = [];
      const { current_usage, usage_limits } = billing;

      // Check each metric
      Object.keys(current_usage).forEach(metric => {
        const current = current_usage[metric as keyof typeof current_usage];
        const limit = usage_limits[metric as keyof typeof usage_limits];
        
        if (limit > 0) {
          const percentage = (current / limit) * 100;
          
          if (percentage >= 90) {
            alerts.push({
              metric,
              current,
              limit,
              percentage,
              severity: 'high'
            });
          } else if (percentage >= 75) {
            alerts.push({
              metric,
              current,
              limit,
              percentage,
              severity: 'medium'
            });
          } else if (percentage >= 50) {
            alerts.push({
              metric,
              current,
              limit,
              percentage,
              severity: 'low'
            });
          }
        }
      });

      return alerts;
    } catch (error) {
      console.error('TeamBillingService.getUsageAlerts error:', error);
      throw error;
    }
  }

  /**
   * Get billing history
   */
  static async getBillingHistory(teamId: string): Promise<any[]> {
    try {
      // This would typically query a billing_history table
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('TeamBillingService.getBillingHistory error:', error);
      throw error;
    }
  }

  /**
   * Calculate subscription cost
   */
  static getTierCost(tier: TeamBilling['subscription_tier'], cycle: TeamBilling['billing_cycle']): number {
    const monthlyPrices = {
      basic: 29,
      professional: 99,
      enterprise: 299
    };

    const basePrice = monthlyPrices[tier];
    return cycle === 'yearly' ? basePrice * 10 : basePrice; // 2 months free for yearly
  }

  /**
   * Get tier usage limits
   */
  static getTierLimits(tier: TeamBilling['subscription_tier']): TeamBilling['usage_limits'] {
    const limits = {
      basic: { users: 10, projects: 5, storage_gb: 10 },
      professional: { users: 50, projects: 25, storage_gb: 100 },
      enterprise: { users: 500, projects: 100, storage_gb: 1000 }
    };

    return limits[tier];
  }

  /**
   * Calculate next billing date
   */
  static calculateNextBillingDate(cycle: TeamBilling['billing_cycle']): string {
    const now = new Date();
    if (cycle === 'yearly') {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  }

  /**
   * Upgrade/downgrade subscription
   */
  static async changeSubscription(
    teamId: string,
    newTier: TeamBilling['subscription_tier'],
    newCycle: TeamBilling['billing_cycle']
  ): Promise<TeamBilling> {
    try {
      const newCost = this.getTierCost(newTier, newCycle);
      const newLimits = this.getTierLimits(newTier);
      const nextBillingDate = this.calculateNextBillingDate(newCycle);

      return await this.updateTeamBilling(teamId, {
        subscription_tier: newTier,
        billing_cycle: newCycle,
        monthly_cost: newCost,
        usage_limits: newLimits,
        next_billing_date: nextBillingDate
      });
    } catch (error) {
      console.error('TeamBillingService.changeSubscription error:', error);
      throw error;
    }
  }
}