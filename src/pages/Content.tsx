import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  User
} from "lucide-react";
import { mockContentItems, ContentItem } from "@/data/mockData";
import { cn } from "@/lib/utils";

const Content = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredContent = mockContentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "blog-post": return <FileText className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "image": return <ImageIcon className="h-4 w-4" />;
      case "document": return <File className="h-4 w-4" />;
      case "social-media": return <Share2 className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "blog-post": return "bg-blue-100 text-blue-800";
      case "video": return "bg-purple-100 text-purple-800";
      case "image": return "bg-green-100 text-green-800";
      case "document": return "bg-orange-100 text-orange-800";
      case "social-media": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatEngagement = (engagement: any) => {
    if (!engagement) return null;
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {engagement.views}
        </div>
        <div className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          {engagement.likes}
        </div>
        <div className="flex items-center gap-1">
          <Share2 className="h-3 w-3" />
          {engagement.shares}
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {engagement.comments}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Content Library</h1>
            <p className="text-muted-foreground text-lg">Manage and organize your competitive intelligence content</p>
          </div>
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200">
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Upload New Content</DialogTitle>
                <DialogDescription>
                  Upload files or create new content for your competitive intelligence library.
                </DialogDescription>
              </DialogHeader>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Drag and drop files here</h3>
                <p className="text-muted-foreground mb-4">Or click to browse and select files</p>
                <Button variant="outline">Browse Files</Button>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                <Button className="gradient-primary">Upload</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
            <TabsTrigger value="all">All ({mockContentItems.length})</TabsTrigger>
            <TabsTrigger value="blog-post">Posts ({mockContentItems.filter(c => c.type === 'blog-post').length})</TabsTrigger>
            <TabsTrigger value="video">Videos ({mockContentItems.filter(c => c.type === 'video').length})</TabsTrigger>
            <TabsTrigger value="image">Images ({mockContentItems.filter(c => c.type === 'image').length})</TabsTrigger>
            <TabsTrigger value="document">Docs ({mockContentItems.filter(c => c.type === 'document').length})</TabsTrigger>
            <TabsTrigger value="social-media">Social ({mockContentItems.filter(c => c.type === 'social-media').length})</TabsTrigger>
          </TabsList>
          <TabsContent value={typeFilter} className="mt-6">
            {/* Content Grid/List */}
            <div className={cn(
              viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "space-y-4"
            )}>
              {filteredContent.map((item) => (
                <Card key={item.id} className={cn(
                  "interactive-lift cursor-pointer",
                  viewMode === "list" && "flex flex-row"
                )}>
                  {viewMode === "grid" ? (
                    <>
                      <div className="relative">
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className={cn("text-xs", getTypeColor(item.type))}>
                            {getTypeIcon(item.type)}
                            <span className="ml-1 capitalize">{item.type.replace('-', ' ')}</span>
                          </Badge>
                        </div>
                        <div className="absolute top-3 right-3">
                          <Badge className={cn("text-xs", getStatusColor(item.status))}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold line-clamp-2">{item.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={item.author.avatar} alt={item.author.name} />
                            <AvatarFallback className="text-xs">{item.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span>{item.author.name}</span>
                          <span>•</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">{item.fileSize}</span>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.engagement && formatEngagement(item.engagement)}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-20 flex-shrink-0">
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-full h-full object-cover rounded-l-lg"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={item.author.avatar} alt={item.author.name} />
                                <AvatarFallback className="text-xs">{item.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <span>{item.author.name}</span>
                              <span>•</span>
                              <span>{formatDate(item.createdAt)}</span>
                              <span>•</span>
                              <span>{item.fileSize}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", getTypeColor(item.type))}>
                              {item.type.replace('-', ' ')}
                            </Badge>
                            <Badge className={cn("text-xs", getStatusColor(item.status))}>
                              {item.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {item.engagement && (
                          <div className="mb-2">
                            {formatEngagement(item.engagement)}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>

            {filteredContent.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No content found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Upload your first content item to get started"}
                </p>
                <Button onClick={() => setShowUploadModal(true)} className="gradient-primary">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Content;