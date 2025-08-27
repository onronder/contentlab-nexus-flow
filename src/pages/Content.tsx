import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  File,
  Share2,
  Eye,
  Heart,
  MessageCircle,
  Download,
  MoreVertical,
  Calendar,
  User,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUrl } from "@/hooks/useFileUpload";
import { BatchUploadDialog } from "@/components/content/BatchUploadDialog";
import { AdvancedSearchPanel } from "@/components/content/AdvancedSearchPanel";
import { FileVersioningManager } from "@/components/content/FileVersioningManager";
import { DeduplicationManager } from "@/components/content/DeduplicationManager";
import { StorageAnalyticsDashboard } from "@/components/content/StorageAnalyticsDashboard";
import { ContentCard } from "@/components/content/ContentCard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ContentErrorBoundary } from "@/components/ui/content-error-boundary";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useTeamContext } from "@/contexts/TeamContext";
import { useTeamProjects } from "@/hooks/queries/useTeamAwareProjectQueries";
import { useTeamContent } from "@/hooks/queries/useTeamAwareContentQueries";
import { 
  WorkspacePermissionManager,
  RealTimeCollaborativeEditor,
  AdvancedVersionControl,
  ContentReviewWorkflow,
  CollaborativeAnalytics
} from "@/components/collaboration";
import { ContentPerformanceDashboard } from '@/components/analytics/ContentPerformanceDashboard';
import { UsagePatternAnalytics } from '@/components/analytics/UsagePatternAnalytics';
import { PerformanceOptimizationPanel } from '@/components/analytics/PerformanceOptimizationPanel';
import { PredictiveAnalyticsDashboard } from '@/components/analytics/PredictiveAnalyticsDashboard';
import { ExecutiveReportingDashboard } from '@/components/analytics/ExecutiveReportingDashboard';

const Content = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Get current team and projects
  const { currentTeam } = useTeamContext();
  const { data: teamProjects = [], isLoading: projectsLoading } = useTeamProjects();
  
  // Use first project from current team
  const selectedProject = teamProjects[0];
  const projectId = selectedProject?.id;
  
  // Reset local state when team changes
  useEffect(() => {
    setStatusFilter('all');
    setSearchTerm('');
    setShowUploadModal(false);
  }, [currentTeam?.id]);

  // Fetch content from database with error handling
  const { 
    data: contentItems = [], 
    isLoading: contentLoading, 
    error,
    refetch
  } = useTeamContent(projectId || "", {});

  const isLoading = projectsLoading || contentLoading;

  const { getThumbnailUrl, getContentFileUrl } = useFileUrl();

  // Transform database content to match UI expectations
  const transformedContent = useMemo(() => {
    return contentItems.map(item => ({
      ...item,
      type: item.content_type,
      fileSize: item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(1)} MB` : '0 MB',
      thumbnail: item.thumbnail_path ? getThumbnailUrl(item.thumbnail_path) : '/placeholder.svg',
      tags: item.content_tags?.map(tag => tag.tag) || [],
    }));
  }, [contentItems, getThumbnailUrl]);

  const filteredContent = useMemo(() => {
    return transformedContent.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transformedContent, searchTerm, typeFilter, statusFilter]);

  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Team Selected</h1>
          <p className="text-muted-foreground">Please select a team to view content.</p>
        </div>
      </div>
    );
  }

  if (!projectsLoading && teamProjects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Projects Found</h1>
          <p className="text-muted-foreground">This team doesn't have any projects yet. Create a project to start managing content.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <ErrorAlert
          title="Error Loading Content"
          message={error instanceof Error ? error.message : "Failed to load content library. Please try again."}
          onRetry={() => refetch()}
          retryLabel="Retry Loading"
        />
      </div>
    );
  }

  return (
    <ContentErrorBoundary>
      <div className="min-h-screen bg-gradient-subtle p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Content Library</h1>
              <p className="text-muted-foreground text-lg">Manage and organize your competitive intelligence content</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </div>
          </div>
        </div>

        <BatchUploadDialog 
          open={showUploadModal} 
          onOpenChange={setShowUploadModal}
          projectId={projectId}
        />

        {/* Advanced Search Panel */}
        <AdvancedSearchPanel projectId={projectId} />

        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="blog_post">Blog Posts</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-13">
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="analytics">Storage</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="versioning">Versioning</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
            <TabsTrigger value="executive">Executive</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            {/* Content Type Sub-Tabs */}
            <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All ({transformedContent.length})</TabsTrigger>
                <TabsTrigger value="blog_post">Posts ({transformedContent.filter(c => c.type === 'blog_post').length})</TabsTrigger>
                <TabsTrigger value="video">Videos ({transformedContent.filter(c => c.type === 'video').length})</TabsTrigger>
                <TabsTrigger value="image">Images ({transformedContent.filter(c => c.type === 'image').length})</TabsTrigger>
                <TabsTrigger value="document">Docs ({transformedContent.filter(c => c.type === 'document').length})</TabsTrigger>
                <TabsTrigger value="social">Social ({transformedContent.filter(c => c.type === 'social').length})</TabsTrigger>
              </TabsList>
          <TabsContent value={typeFilter} className="mt-6">
            {/* Empty State */}
            {filteredContent.length === 0 && (
              <div className="text-center py-16">
                <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No content found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm ? 'No content matches your search criteria.' : 'Get started by uploading your first content item to begin building your library.'}
                </p>
                <Button 
                  onClick={() => setShowUploadModal(true)}
                  className="gradient-primary"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </div>
            )}

            {/* Content Grid/List */}
            {filteredContent.length > 0 && (
              <ContentErrorBoundary>
                <div className={cn(
                  viewMode === "grid" 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                    : "space-y-4"
                )}>
                  {filteredContent.map((item) => (
                    <ContentErrorBoundary key={item.id}>
                      <ContentCard 
                        content={item}
                        viewMode={viewMode}
                      />
                    </ContentErrorBoundary>
                  ))}
                </div>
              </ContentErrorBoundary>
            )}
            </TabsContent>
          </Tabs>
          </TabsContent>

          <TabsContent value="collaboration" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6">
                <WorkspacePermissionManager 
                  teamId={projectId} 
                  onPermissionChange={(userId, permissions) => {
                    console.log('Permission changed:', userId, permissions);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="mt-6">
            <div className="space-y-6">
              <ContentReviewWorkflow 
                contentId={transformedContent[0]?.id || ''}
                onWorkflowUpdate={(workflow) => {
                  console.log('Workflow updated:', workflow);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <StorageAnalyticsDashboard projectId={projectId} />
              <CollaborativeAnalytics teamId={projectId} />
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <div className="space-y-6">
              <AdvancedVersionControl 
                contentId={transformedContent[0]?.id || ''}
                onVersionRestore={(versionId) => {
                  console.log('Version restored:', versionId);
                }}
                onBranchCreate={(branchData) => {
                  console.log('Branch created:', branchData);
                }}
              />
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Real-time Collaborative Editor</h3>
                <RealTimeCollaborativeEditor 
                  contentId={transformedContent[0]?.id || ''}
                  initialContent={transformedContent[0]?.description || 'Start collaborating...'}
                  onSave={(content) => {
                    console.log('Content saved:', content);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="mt-6">
            <DeduplicationManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Advanced File Management</h3>
                <p className="text-muted-foreground mb-6">
                  Access advanced features for file processing, batch operations, and content optimization.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Upload className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold">Batch Processing</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Process multiple files simultaneously with automated optimization and tagging.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Search className="h-5 w-5 text-green-600" />
                      </div>
                      <h4 className="font-semibold">AI Content Analysis</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically analyze content for insights, sentiment, and categorization.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Filter className="h-5 w-5 text-purple-600" />
                      </div>
                      <h4 className="font-semibold">Smart Filters</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Advanced filtering options with AI-powered content recognition.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <ContentPerformanceDashboard projectId={projectId} />
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <UsagePatternAnalytics projectId={projectId} />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <PerformanceOptimizationPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="predictive" className="space-y-6">
            <PredictiveAnalyticsDashboard projectId={projectId} />
          </TabsContent>

          <TabsContent value="executive" className="space-y-6">
            <ExecutiveReportingDashboard projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </ContentErrorBoundary>
  );
};

export default Content;