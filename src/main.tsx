import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts'
import { TeamProvider } from '@/contexts/TeamContext'
import { GlobalErrorBoundary } from '@/components/errors/GlobalErrorBoundary'
import App from './App.tsx'
import './index.css'
import { queryClient } from '@/lib/queryClient'
import { isDevelopment } from '@/utils/productionUtils'

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TeamProvider>
            <App />
            {isDevelopment() && <ReactQueryDevtools initialIsOpen={false} />}
          </TeamProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
