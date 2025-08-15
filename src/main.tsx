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
// Initialize production optimizations
if (isProduction()) {
  ProductionErrorHandler.initialize();
  prepareForDeployment();
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          {isDevelopment() && <ReactQueryDevtools initialIsOpen={false} />}
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
