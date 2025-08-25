import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionReadinessDashboard } from '@/components/production/ProductionReadinessDashboard';
import { ProductionTestingSuite } from '@/components/production/ProductionTestingSuite';
import { PerformanceMonitor } from '@/components/production/PerformanceMonitor';
import { UserJourneyTester } from '@/components/production/UserJourneyTester';

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="testing">Live Testing</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="journey">User Journey</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProductionReadinessDashboard />
          </TabsContent>

          <TabsContent value="testing" className="mt-6">
            <ProductionTestingSuite />
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