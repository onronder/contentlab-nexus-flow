import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface AIAssistantOptions {
  sessionId: string;
  suggestionType?: 'content_improvement' | 'conflict_resolution' | 'style_suggestion' | 'grammar_check' | 'context_enhancement';
}

export interface AISuggestion {
  id: string;
  session_id: string;
  user_id: string;
  suggestion_type: string;
  original_content: string;
  suggested_content: string;
  confidence_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useAICollaborationAssistant = ({ sessionId, suggestionType = 'content_improvement' }: AIAssistantOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI suggestions for the session
  const {
    data: suggestions = [],
    isLoading: isLoadingSuggestions,
    error: suggestionsError
  } = useQuery({
    queryKey: ['ai-suggestions', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AISuggestion[];
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
  });

  // Generate AI suggestion mutation
  const generateSuggestionMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string; type?: string }) => {
      console.log(`Generating AI suggestion for session ${sessionId}`);
      
      const { data, error } = await supabase.functions.invoke('ai-collaboration-assistant', {
        body: {
          content,
          sessionId,
          suggestionType: type || suggestionType
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', sessionId] });
      toast({
        title: "AI Suggestion Generated",
        description: "New AI-powered suggestion is ready for review.",
      });
    },
    onError: (error: Error) => {
      console.error('AI suggestion error:', error);
      toast({
        title: "AI Suggestion Failed",
        description: error.message || "Failed to generate AI suggestion. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update suggestion status mutation
  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: string; status: AISuggestion['status'] }) => {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;
      return { suggestionId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', sessionId] });
      toast({
        title: "Suggestion Updated",
        description: "AI suggestion status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update suggestion status.",
        variant: "destructive",
      });
    }
  });

  // Generate suggestion with content
  const generateSuggestion = useCallback(async (content: string, type?: string) => {
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please provide content to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await generateSuggestionMutation.mutateAsync({ content, type });
    } finally {
      setIsProcessing(false);
    }
  }, [generateSuggestionMutation, toast]);

  // Accept suggestion
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    await updateSuggestionMutation.mutateAsync({ suggestionId, status: 'accepted' });
  }, [updateSuggestionMutation]);

  // Reject suggestion
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    await updateSuggestionMutation.mutateAsync({ suggestionId, status: 'rejected' });
  }, [updateSuggestionMutation]);

  // Ignore suggestion
  const ignoreSuggestion = useCallback(async (suggestionId: string) => {
    await updateSuggestionMutation.mutateAsync({ suggestionId, status: 'ignored' });
  }, [updateSuggestionMutation]);

  // Get suggestions by type
  const getSuggestionsByType = useCallback((type: string) => {
    return suggestions.filter(suggestion => suggestion.suggestion_type === type);
  }, [suggestions]);

  // Get pending suggestions
  const getPendingSuggestions = useCallback(() => {
    return suggestions.filter(suggestion => suggestion.status === 'pending');
  }, [suggestions]);

  // Get high confidence suggestions
  const getHighConfidenceSuggestions = useCallback((threshold = 0.8) => {
    return suggestions.filter(suggestion => suggestion.confidence_score >= threshold);
  }, [suggestions]);

  return {
    // Data
    suggestions,
    pendingSuggestions: getPendingSuggestions(),
    highConfidenceSuggestions: getHighConfidenceSuggestions(),
    
    // State
    isLoadingSuggestions,
    isProcessing: isProcessing || generateSuggestionMutation.isPending,
    isUpdating: updateSuggestionMutation.isPending,
    
    // Actions
    generateSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    ignoreSuggestion,
    
    // Utilities
    getSuggestionsByType,
    getPendingSuggestions,
    getHighConfidenceSuggestions,
    
    // Errors
    error: suggestionsError || generateSuggestionMutation.error || updateSuggestionMutation.error,
  };
};