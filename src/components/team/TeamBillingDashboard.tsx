import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Check,
  Crown,
  Star,
  Zap,
  Download,
  Calendar
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamBillingService, type TeamBilling } from "@/services/teamBillingService";
import { toast } from "sonner";

interface TeamBillingDashboardProps {
  teamId: string;
}

export const TeamBillingDashboard = ({ teamId }: TeamBillingDashboardProps) => {
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  
  const queryClient = useQueryClient();

  // Fetch billing data
  const { data: billing, isLoading } = useQuery({
    queryKey: ['team-billing', teamId],
    queryFn: () => TeamBillingService.getTeamBilling(teamId),
    enabled: !!teamId
  });

  const { data: usageAlerts } = useQuery({
    queryKey: ['usage-alerts', teamId],
    queryFn: () => TeamBillingService.getUsageAlerts(teamId),
    enabled: !!teamId && !!billing
  });

  const { data: billingHistory } = useQuery({
    queryKey: ['billing-history', teamId],
    queryFn: () => TeamBillingService.getBillingHistory(teamId),
    enabled: !!teamId
  });

  // Change subscription mutation
  const changeSubscriptionMutation = useMutation({
    mutationFn: ({ tier, cycle }: { tier: string, cycle: string }) =>
      TeamBillingService.changeSubscription(teamId, tier as any, cycle as any),
    onSuccess: () => {
      toast.success('Subscription updated successfully');
      queryClient.invalidateQueries({ queryKey: ['team-billing', teamId] });
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    }
  });

  const handleSubscriptionChange = () => {
    if (!selectedTier || !selectedCycle) {
      toast.error('Please select both tier and billing cycle');
      return;
    }
    changeSubscriptionMutation.mutate({ tier: selectedTier, cycle: selectedCycle });
  };

  const calculateSavings = (tier: string, cycle: string) => {
    const monthlyCost = TeamBillingService.getTierCost(tier as any, 'monthly');
    const yearlyCost = TeamBillingService.getTierCost(tier as any, 'yearly');
    if (cycle === 'yearly') {
      return (monthlyCost * 12) - yearlyCost;
    }
    return 0;
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  const tiers = [
    {
      name: 'Basic',
      value: 'basic',
      icon: Check,
      price: { monthly: 29, yearly: 290 },
      features: ['Up to 10 users', '5 projects', '10GB storage', 'Basic support'],
      limits: { users: 10, projects: 5, storage_gb: 10 }
    },
    {
      name: 'Professional',
      value: 'professional',
      icon: Star,
      price: { monthly: 99, yearly: 990 },
      features: ['Up to 50 users', '25 projects', '100GB storage', 'Priority support', 'Advanced analytics'],
      limits: { users: 50, projects: 25, storage_gb: 100 }
    },
    {
      name: 'Enterprise',
      value: 'enterprise',
      icon: Crown,
      price: { monthly: 299, yearly: 2990 },
      features: ['Up to 500 users', '100 projects', '1TB storage', '24/7 support', 'Custom integrations', 'Advanced security'],
      limits: { users: 500, projects: 100, storage_gb: 1000 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your team's subscription and view usage
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Invoice
        </Button>
      </div>

      {/* Current Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <Badge variant={billing?.subscription_status === 'active' ? 'default' : 'destructive'}>
                {billing?.subscription_status || 'Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {billing?.subscription_tier?.charAt(0).toUpperCase() + billing?.subscription_tier?.slice(1) || 'Basic'}
            </h3>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-lg font-semibold mt-2">
              ${billing?.monthly_cost || 0}/{billing?.billing_cycle?.replace('ly', '') || 'month'}
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <Badge variant="outline">
                {billing?.billing_cycle || 'monthly'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {billing?.next_billing_date ? 
                new Date(billing.next_billing_date).toLocaleDateString() : 
                'N/A'
              }
            </h3>
            <p className="text-sm text-muted-foreground">Next Billing Date</p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <Badge variant="secondary">
                {usageAlerts?.length || 0} alerts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {billing ? Object.values(billing.current_usage).reduce((a, b) => a + (b || 0), 0) : 0}
            </h3>
            <p className="text-sm text-muted-foreground">Total Usage Units</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Alerts */}
      {usageAlerts && usageAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Usage Alerts</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              You're approaching limits for some resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {alert.metric.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {alert.current} / {alert.limit}
                    </div>
                    <Progress value={alert.percentage} className="w-20" />
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {Math.round(alert.percentage)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">Usage Details</TabsTrigger>
          <TabsTrigger value="plans">Change Plan</TabsTrigger>
          <TabsTrigger value="history">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>Current usage against your plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              {billing && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Team Members</span>
                      <span className={`text-sm ${getUsageColor(getUsagePercentage(billing.current_usage.users || 0, billing.usage_limits.users))}`}>
                        {billing.current_usage.users || 0} / {billing.usage_limits.users}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(billing.current_usage.users || 0, billing.usage_limits.users)} />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Projects</span>
                      <span className={`text-sm ${getUsageColor(getUsagePercentage(billing.current_usage.projects || 0, billing.usage_limits.projects))}`}>
                        {billing.current_usage.projects || 0} / {billing.usage_limits.projects}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(billing.current_usage.projects || 0, billing.usage_limits.projects)} />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Storage</span>
                      <span className={`text-sm ${getUsageColor(getUsagePercentage(billing.current_usage.storage_gb || 0, billing.usage_limits.storage_gb))}`}>
                        {billing.current_usage.storage_gb || 0} GB / {billing.usage_limits.storage_gb} GB
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(billing.current_usage.storage_gb || 0, billing.usage_limits.storage_gb)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                const isCurrentTier = billing?.subscription_tier === tier.value;
                
                return (
                  <Card key={tier.value} className={`relative ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}>
                    {isCurrentTier && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        Current Plan
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle>{tier.name}</CardTitle>
                      </div>
                      <div>
                        <span className="text-3xl font-bold">${tier.price.monthly}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${tier.price.yearly}/year (save ${tier.price.monthly * 12 - tier.price.yearly})
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Change Subscription</CardTitle>
                <CardDescription>Select a new plan and billing cycle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Plan Tier</label>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.name} - ${tier.price.monthly}/month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Billing Cycle</label>
                    <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">
                          Yearly (Save {selectedTier ? `$${calculateSavings(selectedTier, 'yearly')}` : '$0'})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!selectedTier || !selectedCycle || changeSubscriptionMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {changeSubscriptionMutation.isPending ? 'Updating...' : 'Update Subscription'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Subscription Change</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to change your subscription to {selectedTier} {selectedCycle}?
                        {selectedTier && selectedCycle && (
                          <div className="mt-2 p-3 bg-muted rounded-lg">
                            <p className="font-medium">
                              New cost: ${TeamBillingService.getTierCost(selectedTier as any, selectedCycle as any)}/{selectedCycle.replace('ly', '')}
                            </p>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSubscriptionChange}>
                        Confirm Change
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View past invoices and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory && billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingHistory.map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.description}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${invoice.amount}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No billing history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};