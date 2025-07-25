import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import App from './App.tsx'
import './index.css'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/integrations/supabase/client'

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={supabase}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </SessionContextProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
