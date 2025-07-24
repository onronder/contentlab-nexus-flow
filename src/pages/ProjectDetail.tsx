import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Archive, Trash2, Share2, Download, MoreVertical } from 'lucide-react';
import { useProject, useProjectAnalytics, useProjectTeamMembers } from '@/hooks/queries/useProjectQueries';
import { useUpdateProject, useArchiveProject, useDeleteProject } from '@/hooks/mutations/useProjectMutations';
import { useAuth } from '@/hooks/useAuth';
import { exportProjectDetails } from '@/utils/exportUtils';
import { logError } from '@/utils/productionUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ProjectHeader } from '@/components/projects/detail/ProjectHeader';
import { ProjectOverview } from '@/components/projects/detail/ProjectOverview';
import { ProjectInformation } from '@/components/projects/detail/ProjectInformation';
import { ProjectTeamManagement } from '@/components/projects/detail/ProjectTeamManagement';
import { ProjectProgressTracking } from '@/components/projects/detail/ProjectProgressTracking';
import { ProjectAnalyticsTab } from '@/components/projects/detail/ProjectAnalyticsTab';
import { ProjectActivityFeed } from '@/components/projects/detail/ProjectActivityFeed';
import { PROJECT_STATUSES } from '@/types/projects';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('information');

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId || null);
  const { data: analytics, isLoading: analyticsLoading } = useProjectAnalytics(projectId || null);
  const { data: teamMembers, isLoading: teamLoading } = useProjectTeamMembers(projectId || null);
  
  const updateProjectMutation = useUpdateProject();
  const archiveProjectMutation = useArchiveProject();
  const deleteProjectMutation = useDeleteProject();

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const handleEditProject = () => {
    // Navigate to edit page or open edit modal
    navigate(`/projects/${projectId}/edit`);
  };

  const handleArchiveProject = async () => {
    if (!project) return;
    
    const confirmed = confirm(`Are you sure you want to archive "${project.name}"?`);
    if (!confirmed) return;

    try {
      await archiveProjectMutation.mutateAsync(project.id);
      toast({
        title: "Project Archived",
        description: `${project.name} has been archived successfully.`,
      });
    } catch (error) {
      logError(error as Error, 'Archive Project');
      toast({
        title: "Archive Failed",
        description: "Failed to archive the project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteProjectMutation.mutateAsync(project.id);
      toast({
        title: "Project Deleted",
        description: `${project.name} has been deleted successfully.`,
      });
      navigate('/projects');
    } catch (error) {
      logError(error as Error, 'Delete Project');
      toast({
        title: "Delete Failed",
        description: "Failed to delete the project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareProject = () => {
    if (!project) return;
    
    const shareUrl = `${window.location.origin}/projects/${project.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: project.name,
        text: project.description,
        url: shareUrl,
      }).catch((error) => {
        logError(error, 'Share Project');
        fallbackShare(shareUrl);
      });
    } else {
      fallbackShare(shareUrl);
    }
  };

  const fallbackShare = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied",
        description: "Project link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share Project",
        description: `Share this link: ${url}`,
      });
    });
  };

  const handleExportProject = () => {
    if (!project) return;
    
    try {
      exportProjectDetails(project);
      toast({
        title: "Export Complete",
        description: `${project.name} has been exported successfully.`,
      });
    } catch (error) {
      logError(error as Error, 'Export Project');
      toast({
        title: "Export Failed",
        description: "Failed to export the project. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (projectLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={handleBackToProjects} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={handleBackToProjects}>
            Return to Projects
          </Button>
        </div>
      </div>
    );
  }

  const currentUserMember = teamMembers?.find(member => member.userId === user?.id);
  const canEdit = currentUserMember?.permissions.manageProject || project.createdBy === user?.id;
  const canManageTeam = currentUserMember?.permissions.manageTeam || project.createdBy === user?.id;

  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);
  const progressPercentage = analytics?.progressPercentage || project.progressPercentage || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 lg:p-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={handleBackToProjects} className="cursor-pointer">
                  Projects
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground truncate">
                  {project.name}
                </h1>
                <Badge variant={statusConfig?.color === 'green' ? 'default' : 'secondary'}>
                  {statusConfig?.label}
                </Badge>
                <Badge variant="outline">
                  {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {project.description || 'No description provided'}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{project.projectType.replace('_', ' ').toUpperCase()}</span>
                <span>•</span>
                <span>{project.industry}</span>
                {project.targetMarket && (
                  <>
                    <span>•</span>
                    <span>{project.targetMarket}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant="outline" onClick={handleEditProject}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={handleShareProject}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={handleExportProject}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={handleArchiveProject}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDeleteProject}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Project Overview Section */}
        <ProjectOverview project={project} analytics={analytics} teamMembers={teamMembers} />

        {/* Main Content Tabs */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="information">Information</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="information" className="space-y-6">
              <ProjectInformation project={project} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <ProjectTeamManagement 
                project={project} 
                teamMembers={teamMembers || []} 
                canManageTeam={canManageTeam}
                currentUserMember={currentUserMember}
              />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <ProjectProgressTracking project={project} analytics={analytics} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <ProjectAnalyticsTab project={project} analytics={analytics} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ProjectActivityFeed projectId={project.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}