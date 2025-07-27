import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { 
  Competitor, 
  CompetitorCreateInput, 
  CompetitorUpdateInput,
  BulkCompetitorInput,
  BulkCompetitorResult
} from '@/types/competitors';
import { 
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  restoreCompetitor,
  bulkCreateCompetitors,
  toggleMonitoring
} from '@/services/competitorService';
import { queryKeys } from '@/lib/queryClient';
import { competitorQueryKeys } from './useCompetitorQueries';
import { useToast } from '@/hooks/use-toast';

// ==================== COMPETITOR MUTATION HOOKS ====================

export function useCreateCompetitor(): UseMutationResult<
  Competitor,
  Error,
  { projectId: string; competitorData: CompetitorCreateInput }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, competitorData }) => createCompetitor(projectId, competitorData),
    onSuccess: (newCompetitor, { projectId }) => {
      // Invalidate and refetch competitor lists
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });
      
      // Invalidate project analytics
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.analytics(projectId) 
      });

      toast({
        title: 'Competitor Added',
        description: `${newCompetitor.company_name} has been added to your project.`,
      });
    },
    onError: (error) => {
      console.error('Error creating competitor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create competitor. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCompetitor(): UseMutationResult<
  Competitor,
  Error,
  { competitorId: string; updateData: CompetitorUpdateInput }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ competitorId, updateData }) => updateCompetitor(competitorId, updateData),
    onSuccess: (updatedCompetitor) => {
      // Update the specific competitor in cache
      queryClient.setQueryData(
        competitorQueryKeys.detail(updatedCompetitor.id),
        updatedCompetitor
      );

      // Invalidate competitor lists for the project
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(updatedCompetitor.project_id) 
      });

      // Invalidate competitor analytics
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.analytics(updatedCompetitor.id) 
      });

      toast({
        title: 'Competitor Updated',
        description: `${updatedCompetitor.company_name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating competitor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update competitor. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCompetitor(): UseMutationResult<
  void,
  Error,
  { competitorId: string; projectId: string; competitorName: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ competitorId }) => deleteCompetitor(competitorId),
    onSuccess: (_, { projectId, competitorName }) => {
      // Invalidate competitor lists
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });

      // Invalidate project analytics
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.analytics(projectId) 
      });

      toast({
        title: 'Competitor Deleted',
        description: `${competitorName} has been moved to inactive status.`,
      });
    },
    onError: (error) => {
      console.error('Error deleting competitor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete competitor. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreCompetitor(): UseMutationResult<
  Competitor,
  Error,
  { competitorId: string; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ competitorId }) => restoreCompetitor(competitorId),
    onSuccess: (restoredCompetitor, { projectId }) => {
      // Update the specific competitor in cache
      queryClient.setQueryData(
        competitorQueryKeys.detail(restoredCompetitor.id),
        restoredCompetitor
      );

      // Invalidate competitor lists
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });

      // Invalidate project analytics
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.analytics(projectId) 
      });

      toast({
        title: 'Competitor Restored',
        description: `${restoredCompetitor.company_name} has been restored and is now active.`,
      });
    },
    onError: (error) => {
      console.error('Error restoring competitor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore competitor. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkCreateCompetitors(): UseMutationResult<
  BulkCompetitorResult,
  Error,
  { projectId: string; bulkData: BulkCompetitorInput }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, bulkData }) => bulkCreateCompetitors(projectId, bulkData),
    onSuccess: (result, { projectId }) => {
      // Invalidate competitor lists
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });

      // Invalidate project analytics
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.projects.analytics(projectId) 
      });

      const { summary } = result;
      toast({
        title: 'Bulk Import Complete',
        description: `Successfully imported ${summary.successful} competitors. ${summary.failed} failed, ${summary.duplicates} duplicates skipped.`,
      });
    },
    onError: (error) => {
      console.error('Error bulk creating competitors:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import competitors. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useToggleMonitoring(): UseMutationResult<
  Competitor,
  Error,
  { competitorId: string; enabled: boolean; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ competitorId, enabled }) => toggleMonitoring(competitorId, enabled),
    onMutate: async ({ competitorId, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: competitorQueryKeys.detail(competitorId) 
      });

      // Snapshot the previous value
      const previousCompetitor = queryClient.getQueryData<Competitor>(
        competitorQueryKeys.detail(competitorId)
      );

      // Optimistically update the cache
      if (previousCompetitor) {
        queryClient.setQueryData(
          competitorQueryKeys.detail(competitorId),
          { ...previousCompetitor, monitoring_enabled: enabled }
        );
      }

      return { previousCompetitor };
    },
    onSuccess: (updatedCompetitor, { projectId, enabled }) => {
      // Update the specific competitor in cache with the real data
      queryClient.setQueryData(
        competitorQueryKeys.detail(updatedCompetitor.id),
        updatedCompetitor
      );

      // Invalidate competitor lists to reflect monitoring status changes
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });

      // Invalidate competitors for analysis list
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.forAnalysis(projectId) 
      });

      toast({
        title: 'Monitoring Updated',
        description: `Monitoring ${enabled ? 'enabled' : 'disabled'} for ${updatedCompetitor.company_name}.`,
      });
    },
    onError: (error, { competitorId }, context) => {
      // Revert optimistic update on error
      if (context?.previousCompetitor) {
        queryClient.setQueryData(
          competitorQueryKeys.detail(competitorId),
          context.previousCompetitor
        );
      }

      console.error('Error toggling monitoring:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update monitoring status. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== BATCH OPERATIONS ====================

export function useBatchUpdateCompetitors(): UseMutationResult<
  Competitor[],
  Error,
  { competitorIds: string[]; updateData: CompetitorUpdateInput; projectId: string }
> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ competitorIds, updateData }) => {
      const results = await Promise.allSettled(
        competitorIds.map(id => updateCompetitor(id, updateData))
      );
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<Competitor> => result.status === 'fulfilled')
        .map(result => result.value);
        
      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .length;

      if (failed > 0) {
        throw new Error(`${failed} out of ${competitorIds.length} updates failed`);
      }

      return successful;
    },
    onSuccess: (updatedCompetitors, { projectId }) => {
      // Invalidate competitor lists
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.list(projectId) 
      });

      // Update individual competitor caches
      updatedCompetitors.forEach(competitor => {
        queryClient.setQueryData(
          competitorQueryKeys.detail(competitor.id),
          competitor
        );
      });

      toast({
        title: 'Batch Update Complete',
        description: `Successfully updated ${updatedCompetitors.length} competitors.`,
      });
    },
    onError: (error) => {
      console.error('Error batch updating competitors:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update competitors. Please try again.',
        variant: 'destructive',
      });
    },
  });
}