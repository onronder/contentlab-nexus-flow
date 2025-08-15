import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts'
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary'
import App from './App.tsx'
import './index.css'
import { queryClient } from '@/lib/queryClient'
import { isDevelopment, isProduction } from '@/utils/productionUtils'
import { prepareForDeployment, ProductionErrorHandler } from '@/utils/productionOptimization'
import { performanceMonitor, usePerformanceOptimization } from '@/utils/performanceOptimization'

// Initialize performance monitoring
performanceMonitor.markMilestone('main-start');

// Initialize production optimizations
if (isProduction()) {
  ProductionErrorHandler.initialize();
  prepareForDeployment();
}

// Performance wrapper component
const AppWithPerformanceMonitoring: React.FC = () => {
  usePerformanceOptimization();
  
  React.useEffect(() => {
    performanceMonitor.markMilestone('app-mounted');
  }, []);
  
  return <App />;
};

// Mark performance milestone before render
performanceMonitor.markMilestone('render-start');

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWithPerformanceMonitoring />
          {isDevelopment() && <ReactQueryDevtools initialIsOpen={false} />}
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
