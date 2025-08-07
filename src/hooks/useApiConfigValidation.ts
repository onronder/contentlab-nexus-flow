import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useApiConfigValidation() {
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('openai-health', { body: { action: 'ping' } });
        if (cancelled) return;
        if (error || !data?.ok) {
          toast({
            title: 'OpenAI API Not Configured',
            description: 'Missing or invalid API key. Some AI features may be unavailable until configured.',
            variant: 'destructive',
          });
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            title: 'AI Health Check Failed',
            description: 'Could not verify OpenAI configuration. Features will retry automatically.',
            variant: 'destructive',
          });
        }
      }
    };
    validate();
    return () => { cancelled = true; };
  }, [toast]);
}
