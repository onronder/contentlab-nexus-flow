import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionReadinessDashboard } from '@/components/production/ProductionReadinessDashboard';
import { ProductionTestingSuite } from '@/components/production/ProductionTestingSuite';
import { PerformanceMonitor } from '@/components/production/PerformanceMonitor';
import { UserJourneyTester } from '@/components/production/UserJourneyTester';
import { RealTimeHealthDashboard } from '@/components/production/RealTimeHealthDashboard';
import { EnhancedSessionManager } from '@/components/production/EnhancedSessionManager';
import { SecurityMonitoringCenter } from '@/components/production/SecurityMonitoringCenter';

export default function ProductionReadiness() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Production Readiness Center</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive testing and monitoring for production deployment
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Live Health</TabsTrigger>
            <TabsTrigger value="session">Session Mgmt</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="journey">User Journey</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProductionReadinessDashboard />
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <RealTimeHealthDashboard />
          </TabsContent>

          <TabsContent value="session" className="mt-6">
            <EnhancedSessionManager />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityMonitoringCenter />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformanceMonitor />
          </TabsContent>

          <TabsContent value="journey" className="mt-6">
            <UserJourneyTester />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}