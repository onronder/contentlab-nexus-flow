// Authentication hooks
export { useAuth } from '../contexts';
export { useCurrentUserId, useIsAuthenticated } from './useAuthHelpers';
export { useProjectPermissions } from './useProjectPermissions';
export type { ProjectPermissions } from './useProjectPermissions';

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
export { useAuthOperations } from './useAuthOperations';
export { useAuthGuard } from './useAuthGuard';
export { useProfileImage } from './useProfileImage';
export { useIsMobile } from './use-mobile';
export { useToast } from './use-toast';
export { useStepperState } from './useStepperState';
export { useSessionManager } from './useSessionManager';
export { useSecurityMonitoring } from './useSecurityMonitoring';
export { useBulkOperations } from './useBulkOperations';