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

// Competitor hooks
export {
  useCompetitors,
  useCompetitor,
  useCompetitorAnalytics,
  useCompetitorSearch,
  useCompetitorsForAnalysis,
  useCompetitorCount,
  useActiveCompetitors,
  useMonitoredCompetitors,
  useCompetitorsByThreatLevel,
  useCompetitorsByIndustry,
} from './useCompetitorQueries';

export {
  useCreateCompetitor,
  useUpdateCompetitor,
  useDeleteCompetitor,
  useRestoreCompetitor,
  useBulkCreateCompetitors,
  useToggleMonitoring,
  useBatchUpdateCompetitors,
} from './useCompetitorMutations';

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

// Content management hooks
export {
  useContentItems,
  useContentItem,
  useSearchContent,
  useFilteredContent,
  useContentAnalytics,
  useContentTags,
  usePopularTags,
  useContentCategories,
} from './useContentQueries';

export {
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
  useArchiveContent,
  useBulkUpdateStatus,
  useBulkDelete,
  useAddTags,
  useRemoveTag,
  useTrackEngagement,
  useTrackView,
  useContentMutations,
} from './useContentMutations';

// File upload hooks
export { useFileUpload, useFileUrl } from './useFileUpload';

// Real-time hooks
export {
  useRealTimeCompetitors,
  useRealTimeAlerts,
  useMonitoringStatus,
  useRealTimeMetrics,
  useRealTimeSerpData
} from './useRealTimeQueries';

export {
  useToggleRealTimeMonitoring,
  useAcknowledgeAlert,
  useBulkAcknowledgeAlerts,
  useSnoozeAlert,
  useDismissAlert,
  useUpdateAlertPreferences,
  useTriggerAnalysis,
  useUpdateMonitoringFrequency
} from './useRealTimeMutations';

// Permission management hooks
export {
  usePermissions,
  useUserRoles,
  useRolePermissions,
  useUserPermissions,
  useHasPermission,
  useCanAccessResource,
  usePermissionChecks,
  useRoleBySlug,
  usePermissionMatrix
} from './usePermissionQueries';

export {
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissions,
  useBulkAssignPermissions,
  useInvalidateUserPermissions,
  useRefreshPermissions
} from './usePermissionMutations';

// Team management hooks
export {
  useTeams,
  useTeam,
  useTeamMembers,
  useUserTeamRoles,
  useTeamPermissions,
  useTeamStats,
  useAvailableRoles
} from './useTeamQueries';

export {
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useInviteTeamMember,
  useUpdateMemberRole,
  useRemoveTeamMember,
  useBulkMemberOperations
} from './useTeamMutations';