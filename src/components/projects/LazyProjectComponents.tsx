import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Lazy load heavy components for code splitting
export const LazyProjectAnalytics = lazy(() => 
  import('@/components/projects/detail/ProjectAnalyticsTab').then(module => ({
    default: module.ProjectAnalyticsTab
  }))
);

export const LazyProjectTeamManagement = lazy(() => 
  import('@/components/projects/detail/ProjectTeamManagement').then(module => ({
    default: module.ProjectTeamManagement
  }))
);

export const LazyProjectActivityFeed = lazy(() => 
  import('@/components/projects/detail/ProjectActivityFeed').then(module => ({
    default: module.ProjectActivityFeed
  }))
);

export const LazyCompetitiveAnalysis = lazy(() => 
  import('@/pages/Competitive').then(module => ({
    default: module.default
  }))
);

export const LazyProjectCreationWizard = lazy(() => 
  import('@/components/projects/ProjectCreationWizard').then(module => ({
    default: module.ProjectCreationWizard
  }))
);

// Loading components for better UX
export const ProjectAnalyticsLoading = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export const ProjectTeamLoading = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-24" />
    </div>
    
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const ProjectActivityLoading = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const ProjectCreationLoading = () => (
  <div className="space-y-6">
    <div className="text-center">
      <Skeleton className="h-8 w-64 mx-auto mb-2" />
      <Skeleton className="h-4 w-96 mx-auto" />
    </div>
    
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Wrapper components with error boundaries
export const ProjectAnalyticsLazy = (props: any) => (
  <Suspense fallback={<ProjectAnalyticsLoading />}>
    <LazyProjectAnalytics {...props} />
  </Suspense>
);

export const ProjectTeamManagementLazy = (props: any) => (
  <Suspense fallback={<ProjectTeamLoading />}>
    <LazyProjectTeamManagement {...props} />
  </Suspense>
);

export const ProjectActivityFeedLazy = (props: any) => (
  <Suspense fallback={<ProjectActivityLoading />}>
    <LazyProjectActivityFeed {...props} />
  </Suspense>
);

export const CompetitiveAnalysisLazy = (props: any) => (
  <Suspense fallback={<ProjectAnalyticsLoading />}>
    <LazyCompetitiveAnalysis {...props} />
  </Suspense>
);

export const ProjectCreationWizardLazy = (props: any) => (
  <Suspense fallback={<ProjectCreationLoading />}>
    <LazyProjectCreationWizard {...props} />
  </Suspense>
);