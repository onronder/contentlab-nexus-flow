import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute, PublicRoute } from "@/components/routing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import Content from "./pages/Content";
import Analytics from "./pages/Analytics";
import TeamPage from "./pages/Team";
import Settings from "./pages/Settings";
import Competitive from "./pages/Competitive";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes with main layout */}
          <Route path="/" element={
            <AppLayout>
              <Index />
            </AppLayout>
          } />
          
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
            path="/profile" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Projects />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/content" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Content />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Analytics />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TeamPage />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/competitive" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Competitive />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Security />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={
            <AppLayout>
              <NotFound />
            </AppLayout>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
