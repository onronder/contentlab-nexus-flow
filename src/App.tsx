import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute, PublicRoute } from "@/components/routing";
import { RootRedirect } from "@/components/routing/RootRedirect";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import { EditProject } from "./pages/EditProject";
import ProjectDetail from "./pages/ProjectDetail";
import Content from "./pages/Content";
import Analytics from "./pages/Analytics";
import TeamPage from "./pages/Team";
import CreateTeam from "./pages/CreateTeam";
import Settings from "./pages/Settings";
import Competitive from "./pages/Competitive";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";
import { AuthTestingPanel } from '@/components/auth/AuthTestingPanel';
import { AcceptInvitationPage } from '@/components/invitations/AcceptInvitationPage';
import { TeamOnboardingWizard } from '@/components/onboarding/TeamOnboardingWizard';
import { isDevelopment } from '@/utils/production';
import { TeamProvider } from '@/contexts/TeamContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { ApiConfigValidator } from '@/components/debug/ApiConfigValidator';
import { ApiDashboard } from '@/components/admin/ApiDashboard';

// Debug: Verify App.tsx is loading properly
console.log('🎨 App.tsx loaded - Tailwind CSS should be ready');
import Share from "./pages/Share";

const App = () => (
  <TooltipProvider>
    {/* DEBUGGING: CSS verification indicator */}
    <div className="debug-css-loaded">CSS Loaded ✓</div>
    <Toaster />
    <Sonner />
    <ApiConfigValidator />
    <BrowserRouter>
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
                <Login />
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <AuthLayout>
                <Signup />
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPassword />
              </AuthLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <PublicRoute>
              <AuthLayout>
                <ResetPassword />
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
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/create" 
          element={
            <ProtectedRoute>
              <Layout>
                <CreateProject />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/:projectId/edit" 
          element={
            <ProtectedRoute>
              <Layout>
                <EditProject />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/:projectId" 
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/content" 
          element={
            <ProtectedRoute>
              <Layout>
                <Content />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/team" 
          element={
            <ProtectedRoute>
              <Layout>
                <TeamPage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-team" 
          element={
            <ProtectedRoute>
              <CreateTeam />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/competitive" 
          element={
            <ProtectedRoute>
              <Layout>
                <Competitive />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/security" 
          element={
            <ProtectedRoute>
              <Layout>
                <Security />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/api-usage" 
          element={
            <ProtectedRoute>
              <Layout>
                <ApiDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Onboarding route */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <TeamOnboardingWizard />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={
          <Layout>
            <NotFound />
          </Layout>
        } />
        </Routes>
        </AnalyticsProvider>
      </TeamProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
