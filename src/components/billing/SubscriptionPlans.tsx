import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { subscriptionService, type SubscriptionPlan } from '@/services/subscriptionService';
import { toast } from 'sonner';

interface SubscriptionPlansProps {
  currentPlanSlug?: string;
  onSelectPlan?: (planSlug: string) => void;
}

export function SubscriptionPlans({ currentPlanSlug, onSelectPlan }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await subscriptionService.getSubscriptionPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (price === 0) return 'Free';
    
    const monthlyPrice = billingCycle === 'yearly' ? price / 12 : price;
    return `$${monthlyPrice.toFixed(2)}/month`;
  };

  const getYearlySavings = (plan: SubscriptionPlan) => {
    if (plan.price_yearly === 0 || plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    const savings = ((plan.price_monthly - yearlyMonthly) / plan.price_monthly) * 100;
    return Math.round(savings);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-20"></div>
              <div className="h-4 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-24 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('yearly')}
          className="relative"
        >
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">
            Save up to 20%
          </Badge>
        </Button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanSlug === plan.slug;
          const isPopular = plan.slug === 'pro';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPopular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {isCurrentPlan && (
                    <Badge variant="outline">Current Plan</Badge>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">
                    {formatPrice(plan)}
                    {billingCycle === 'yearly' && plan.price_yearly > 0 && (
                      <div className="text-sm font-normal text-muted-foreground">
                        Save {getYearlySavings(plan)}% annually
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {Object.keys(plan.limits).length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Limits</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {Object.entries(plan.limits).map(([key, value]) => (
                          <li key={key} className="flex justify-between">
                            <span>{key.replace('_', ' ')}:</span>
                            <span>{value === -1 ? 'Unlimited' : value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                  onClick={() => onSelectPlan?.(plan.slug)}
                >
                  {isCurrentPlan ? 'Current Plan' : `Choose ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}