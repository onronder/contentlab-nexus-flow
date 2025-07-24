import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, Users, MoreVertical, FolderOpen, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProjectCreationWizard } from '@/components/projects/ProjectCreationWizard';
import { useProjects, useCreateProject } from '@/hooks';
import { Project, ProjectCreationInput } from '@/types/projects';

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const createProjectMutation = useCreateProject();

  // Handle project creation
  const handleProjectCreated = async (projectData: ProjectCreationInput) => {
    try {
      await createProjectMutation.mutateAsync(projectData);
      setShowCreateModal(false);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to create project:', error);
    }
  };

  // Filter projects based on search and status
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           project.industry.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Calculate project counts by status
  const projectCounts = useMemo(() => {
    return {
      all: projects.length,
      planning: projects.filter(p => p.status === 'planning').length,
      active: projects.filter(p => p.status === 'active').length,
      paused: projects.filter(p => p.status === 'paused').length,
      completed: projects.filter(p => p.status === 'completed').length,
      archived: projects.filter(p => p.status === 'archived').length,
    };
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "paused": return "bg-yellow-500";
      case "planning": return "bg-purple-500";
      case "archived": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "high": return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "medium": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "low": return "border-green-500 bg-green-50 dark:bg-green-950/20";
      default: return "border-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'competitive_analysis': return 'Competitive Analysis';
      case 'market_research': return 'Market Research';
      case 'brand_monitoring': return 'Brand Monitoring';
      case 'content_strategy': return 'Content Strategy';
      case 'seo_analysis': return 'SEO Analysis';
      default: return type;
    }
  };

  // Loading skeleton component
  const ProjectCardSkeleton = () => (
    <Card className="interactive-lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-2 w-full mb-4" />
        <div className="flex justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-8 w-8 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Projects</h1>
              <p className="text-muted-foreground text-lg">Manage your competitive intelligence projects and track progress</p>
            </div>
            <Button disabled className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New Project
            </Button>
          </div>
          
          {/* Loading skeleton for filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
          
          <Skeleton className="h-10 w-full mb-6" />
          
          {/* Loading skeleton for project cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Projects</h1>
              <p className="text-muted-foreground text-lg">Manage your competitive intelligence projects and track progress</p>
            </div>
          </div>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load projects: {(error as Error).message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground text-lg">Manage your competitive intelligence projects and track progress</p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new competitive intelligence project to track and analyze competitor activities.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(80vh-8rem)]">
                <ProjectCreationWizard 
                  onProjectCreated={handleProjectCreated}
                  onCancel={() => setShowCreateModal(false)}
                  isSubmitting={createProjectMutation.isPending}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search projects by name, description, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({projectCounts.all})</TabsTrigger>
            <TabsTrigger value="planning">Planning ({projectCounts.planning})</TabsTrigger>
            <TabsTrigger value="active">Active ({projectCounts.active})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({projectCounts.paused})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({projectCounts.completed})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({projectCounts.archived})</TabsTrigger>
          </TabsList>
          <TabsContent value={statusFilter} className="mt-6">
            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className={`interactive-lift cursor-pointer border-2 ${getPriorityColor(project.priority)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-lg">
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(project.status)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-1">{project.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {getProjectTypeLabel(project.projectType)}
                            </Badge>
                            <Badge variant={project.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm mb-4 line-clamp-2">
                      {project.description || 'No description provided'}
                    </CardDescription>
                    
                    {/* Industry and Market */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{project.industry}</Badge>
                        {project.targetMarket && (
                          <Badge variant="outline" className="text-xs">{project.targetMarket}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{project.teamMemberCount}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <span className="text-xs">Competitors: {project.competitorCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Updated {formatDate(project.updatedAt)}
                      </div>
                      {project.targetEndDate && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due {formatDate(project.targetEndDate)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first project to get started"}
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Projects;