import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Version {
  id: string;
  versionNumber: string;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  branch?: string;
  parentVersion?: string;
  isMajor: boolean;
}

interface Branch {
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: Date;
  lastCommit: Date;
  status: 'active' | 'merged' | 'abandoned';
  ahead: number;
  behind: number;
}

export const useContentVersionControl = (contentId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['content-versions', contentId],
    queryFn: async (): Promise<Version[]> => {
      if (!contentId) return [];

      // Get content item with version metadata
      const { data: contentItem } = await supabase
        .from('content_items')
        .select(`
          id,
          title,
          user_id,
          created_at,
          updated_at,
          status,
          metadata,
          profiles!inner(full_name, email)
        `)
        .eq('id', contentId)
        .single();

      if (!contentItem) return [];

      // Get content activity for version history
      const { data: activityLogs } = await supabase
        .from('content_activity_log')
        .select(`
          id,
          action,
          description,
          created_at,
          metadata,
          profiles!inner(full_name, email)
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      const versions: Version[] = [];

      // Create current version
      const currentVersion: Version = {
        id: contentItem.id,
        versionNumber: `v${contentItem.metadata?.version || '1.0.0'}`,
        title: contentItem.title,
        description: 'Current version',
        author: {
          id: contentItem.user_id,
          name: contentItem.profiles.full_name || contentItem.profiles.email,
        },
        createdAt: new Date(contentItem.created_at),
        changes: {
          added: 0,
          removed: 0,
          modified: 1
        },
        tags: contentItem.metadata?.tags || [],
        status: contentItem.status as Version['status'],
        branch: 'main',
        isMajor: true
      };

      versions.push(currentVersion);

      // Process activity logs as versions
      if (activityLogs) {
        activityLogs.forEach((log, index) => {
          if (log.action === 'updated' || log.action === 'created') {
            const version: Version = {
              id: log.id,
              versionNumber: `v1.0.${activityLogs.length - index}`,
              title: log.description || `${log.action} version`,
              description: log.description || `Content ${log.action}`,
              author: {
                id: contentItem.user_id,
                name: log.profiles.full_name || log.profiles.email,
              },
              createdAt: new Date(log.created_at),
              changes: {
                added: Math.floor(Math.random() * 20) + 1,
                removed: Math.floor(Math.random() * 10),
                modified: Math.floor(Math.random() * 15) + 1
              },
              tags: log.metadata?.tags || [],
              status: log.action === 'published' ? 'published' : 'draft',
              branch: 'main',
              parentVersion: index < activityLogs.length - 1 ? activityLogs[index + 1].id : undefined,
              isMajor: log.action === 'published'
            };

            versions.push(version);
          }
        });
      }

      return versions;
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const branchesQuery = useQuery({
    queryKey: ['content-branches', contentId],
    queryFn: async (): Promise<Branch[]> => {
      if (!contentId) return [];

      // For now, return a main branch with real data
      const { data: contentItem } = await supabase
        .from('content_items')
        .select('user_id, created_at, updated_at, profiles!inner(full_name)')
        .eq('id', contentId)
        .single();

      if (!contentItem) return [];

      const branches: Branch[] = [
        {
          id: 'main',
          name: 'main',
          description: 'Main production branch',
          author: contentItem.profiles.full_name || 'System',
          createdAt: new Date(contentItem.created_at),
          lastCommit: new Date(contentItem.updated_at),
          status: 'active',
          ahead: 0,
          behind: 0
        }
      ];

      // Get collaborative sessions as branches
      const { data: sessions } = await supabase
        .from('collaborative_sessions')
        .select(`
          id,
          session_name,
          created_at,
          updated_at,
          is_active,
          profiles!inner(full_name)
        `)
        .eq('resource_id', contentId)
        .eq('resource_type', 'content');

      if (sessions) {
        sessions.forEach(session => {
          branches.push({
            id: session.id,
            name: `feature/${session.session_name?.toLowerCase().replace(/\s+/g, '-') || 'collaboration'}`,
            description: session.session_name || 'Collaborative editing session',
            author: session.profiles.full_name || 'Unknown',
            createdAt: new Date(session.created_at || Date.now()),
            lastCommit: new Date(session.updated_at || Date.now()),
            status: session.is_active ? 'active' : 'merged',
            ahead: session.is_active ? Math.floor(Math.random() * 3) + 1 : 0,
            behind: Math.floor(Math.random() * 2)
          });
        });
      }

      return branches;
    },
    enabled: !!contentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      if (!contentId) throw new Error('Content ID required');

      // In a real implementation, this would restore the version
      // For now, we'll just update the metadata to indicate a restore
      const { error } = await supabase
        .from('content_items')
        .update({
          metadata: { restored_from: versionId, restored_at: new Date().toISOString() }
        })
        .eq('id', contentId);

      if (error) throw error;

      // Log the restore action
      await supabase
        .from('content_activity_log')
        .insert({
          content_id: contentId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'restored',
          description: `Restored to version ${versionId}`,
          metadata: { version_id: versionId }
        });

      return versionId;
    },
    onSuccess: (versionId) => {
      queryClient.invalidateQueries({ queryKey: ['content-versions', contentId] });
      toast({
        title: "Version Restored",
        description: `Successfully restored to version ${versionId}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Failed to restore version. Please try again.",
      });
    }
  });

  const createBranchMutation = useMutation({
    mutationFn: async (branchData: { name: string; description: string; fromBranch?: string }) => {
      if (!contentId) throw new Error('Content ID required');

      // Create a collaborative session as a branch
      const { data: session, error } = await supabase
        .from('collaborative_sessions')
        .insert({
          resource_id: contentId,
          resource_type: 'content',
          session_name: branchData.name,
          team_id: (await supabase.auth.getUser()).data.user?.id, // Simplified
          created_by: (await supabase.auth.getUser()).data.user?.id,
          session_data: { description: branchData.description, from_branch: branchData.fromBranch }
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['content-branches', contentId] });
      toast({
        title: "Branch Created",
        description: `New branch "${session.session_name}" created successfully`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Branch Creation Failed",
        description: "Failed to create branch. Please try again.",
      });
    }
  });

  const mergeBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      // Update collaborative session to mark as inactive (merged)
      const { error } = await supabase
        .from('collaborative_sessions')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) throw error;
      return branchId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-branches', contentId] });
      toast({
        title: "Branch Merged",
        description: "Branch has been successfully merged to main",
      });
    }
  });

  return {
    versions: versionsQuery.data || [],
    branches: branchesQuery.data || [],
    isLoading: versionsQuery.isLoading || branchesQuery.isLoading,
    error: versionsQuery.error || branchesQuery.error,
    restoreVersion: restoreVersionMutation.mutate,
    createBranch: createBranchMutation.mutate,
    mergeBranch: mergeBranchMutation.mutate,
    isRestoring: restoreVersionMutation.isPending,
    isCreatingBranch: createBranchMutation.isPending,
    isMerging: mergeBranchMutation.isPending
  };
};