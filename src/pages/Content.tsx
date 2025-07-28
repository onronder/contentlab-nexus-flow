import { useState, useMemo } from "react";
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
import { useContentItems } from "@/hooks/useContentQueries";
import { useFileUrl } from "@/hooks/useFileUpload";
import { FileUploadDialog } from "@/components/content/FileUploadDialog";
import { ContentCard } from "@/components/content/ContentCard";
import { useProjects } from "@/hooks";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ContentErrorBoundary } from "@/components/ui/content-error-boundary";
import { ErrorAlert } from "@/components/ui/error-alert";

const Content = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Get the first project for now - in a real app, this would be from route params
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;

  // Fetch content from database with error handling
  const { 
    data: contentItems = [], 
    isLoading, 
    error,
    refetch
  } = useContentItems(projectId || '');

  const { getThumbnailUrl, getContentFileUrl } = useFileUrl();

  // Transform database content to match UI expectations
  const transformedContent = useMemo(() => {
    return contentItems.map(item => ({
      ...item,
      type: item.content_type as 'blog-post' | 'social-media' | 'video' | 'document' | 'image',
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

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Project Selected</h1>
          <p className="text-muted-foreground">Please create a project first to manage content.</p>
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

        <FileUploadDialog 
          open={showUploadModal} 
          onOpenChange={setShowUploadModal}
          projectId={projectId}
        />

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
                <SelectItem value="blog-post">Blog Posts</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
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

        {/* Content Type Tabs */}
        <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({transformedContent.length})</TabsTrigger>
            <TabsTrigger value="blog-post">Posts ({transformedContent.filter(c => c.type === 'blog-post').length})</TabsTrigger>
            <TabsTrigger value="video">Videos ({transformedContent.filter(c => c.type === 'video').length})</TabsTrigger>
            <TabsTrigger value="image">Images ({transformedContent.filter(c => c.type === 'image').length})</TabsTrigger>
            <TabsTrigger value="document">Docs ({transformedContent.filter(c => c.type === 'document').length})</TabsTrigger>
            <TabsTrigger value="social-media">Social ({transformedContent.filter(c => c.type === 'social-media').length})</TabsTrigger>
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
      </div>
    </ContentErrorBoundary>
  );
};

export default Content;