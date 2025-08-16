import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// API health monitoring disabled to prevent network errors
// import { useApiHealth } from '@/hooks/useApiHealth';
// import { useCircuitBreakerStatus } from '@/hooks/useCircuitBreakerStatus';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApiStatusIndicatorProps {
  variant?: 'compact' | 'detailed';
  showRefreshButton?: boolean;
}

export function ApiStatusIndicator({ 
  variant = 'compact', 
  showRefreshButton = false 
}: ApiStatusIndicatorProps) {
  // Component disabled to prevent network errors
  return null;

}