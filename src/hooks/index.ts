// Authentication hooks
export { useAuth } from './useAuth';
export { useCurrentUserId } from './useCurrentUserId';

// Project data hooks
export {
  useProjects,
  useProject,
  useProjectAnalytics,
  useProjectTeamMembers,
  useProjectCompetitors,
} from './queries/useProjectQueries';

// Project mutation hooks
export {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useRestoreProject,
} from './mutations/useProjectMutations';

// Other hooks
export { useProjectPermissions } from './useProjectPermissions';
export type { ProjectPermissions } from './useProjectPermissions';
export { useProfileImage } from './useProfileImage';
export { useIsMobile } from './use-mobile';
export { useToast } from './use-toast';
export { useStepperState } from './useStepperState';
export { useSessionManager } from './useSessionManager';
export { useSecurityMonitoring } from './useSecurityMonitoring';
export { useBulkOperations } from './useBulkOperations';