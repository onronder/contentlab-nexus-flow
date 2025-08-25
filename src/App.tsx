import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute, PublicRoute } from "@/components/routing";
import { RootRedirect } from "@/components/routing/RootRedirect";
import { PageLoading } from "@/components/ui/page-loading";
import { AcceptInvitationPage } from '@/components/invitations/AcceptInvitationPage';
import { TeamOnboardingWizard } from '@/components/onboarding/TeamOnboardingWizard';
import { isDevelopment } from '@/utils/production';
import { TeamProvider } from '@/contexts/TeamContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { GlobalErrorHandler } from '@/components/error/GlobalErrorHandler';

// Route-level code splitting with React.lazy
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Projects = React.lazy(() => import("./pages/Projects"));
const CreateProject = React.lazy(() => import("./pages/CreateProject"));
const EditProject = React.lazy(() => import("./pages/EditProject").then(m => ({ default: m.EditProject })));
const ProjectDetail = React.lazy(() => import("./pages/ProjectDetail"));
const Content = React.lazy(() => import("./pages/Content"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const TeamPage = React.lazy(() => import("./pages/Team"));
const CreateTeam = React.lazy(() => import("./pages/CreateTeam"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Competitive = React.lazy(() => import("./pages/Competitive"));
const Security = React.lazy(() => import("./pages/Security"));
const Monitoring = React.lazy(() => import("./pages/Monitoring"));
const ProductionReadiness = React.lazy(() => import("./pages/ProductionReadiness"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Collaboration = React.lazy(() => import("./pages/Collaboration").then(m => ({ default: m.Collaboration })));
const Share = React.lazy(() => import("./pages/Share"));

const App = () => (
  <ErrorBoundary>
    <GlobalErrorHandler>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                <p className="text-muted-foreground mb-4">Unable to load the application properly.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          }>
            <TeamProvider>
              <AnalyticsProvider>
                <Routes>
        {/* Development-only routes */}
        {isDevelopment() && (
          <>
            <Route path="/auth-test" element={<div>Debug panel disabled in production</div>} />
            <Route path="/debug" element={<div>Debug tools disabled in production</div>} />
          </>
        )}
        
        {/* Public invitation route */}
        <Route path="/invite/:token" element={<AcceptInvitationPage />} />
        
        {/* Public share route */}
        <Route path="/share/:token" element={<Share />} />
        
        {/* Root redirect route */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Authentication routes with auth layout */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<PageLoading />}>
                  <Login />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<PageLoading />}>
                  <Signup />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<PageLoading />}>
                  <ForgotPassword />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<PageLoading />}>
                  <ResetPassword />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          } 
        />
        
        {/* Protected routes with main layout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Dashboard />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Profile />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Projects />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/create" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <CreateProject />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/:projectId/edit" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <EditProject />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/:projectId" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <ProjectDetail />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/content" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Content />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Analytics />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/team" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <TeamPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-team" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <CreateTeam />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Settings />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/competitive" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Competitive />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/security" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Security />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/monitoring" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Monitoring />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/production-readiness" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <ProductionReadiness />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/collaboration" 
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoading />}>
                  <Collaboration />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Onboarding route */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <TeamOnboardingWizard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={
          <Layout>
            <Suspense fallback={<PageLoading />}>
              <NotFound />
            </Suspense>
          </Layout>
        } />
                </Routes>
              </AnalyticsProvider>
            </TeamProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </GlobalErrorHandler>
  </ErrorBoundary>
);

export default App;
