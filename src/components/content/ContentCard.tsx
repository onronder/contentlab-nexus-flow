import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Heart, 
  Share2, 
  MessageCircle, 
  Download, 
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2
} from 'lucide-react';
import { ContentItem } from '@/types/content';
import { useDeleteContent } from '@/hooks/useContentMutations';
import { useFileUrl } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { FileIcon } from './FileIcon';
import { ContentTypeIcon } from './ContentTypeIcon';

interface ContentCardProps {
  content: ContentItem;
  viewMode?: 'grid' | 'list';
}

export const ContentCard = ({ content, viewMode = 'grid' }: ContentCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteContent = useDeleteContent();
  const { getThumbnailUrl, getContentFileUrl } = useFileUrl();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteContent.mutateAsync(content.id);
    } catch (error) {
      console.error('Failed to delete content:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (content.file_path) {
      const url = getContentFileUrl(content.file_path);
      window.open(url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success/10 text-success border-success/20';
      case 'draft':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'archived':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const thumbnailUrl = content.thumbnail_path 
    ? getThumbnailUrl(content.thumbnail_path)
    : null;

  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row hover:shadow-elegant transition-all duration-200">
        <div className="w-24 h-16 flex-shrink-0 relative">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={content.title}
              className="w-full h-full object-cover rounded-l-lg"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-l-lg flex items-center justify-center">
              <FileIcon mimeType={content.mime_type} className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ContentTypeIcon type={content.content_type} className="h-4 w-4" />
                <h3 className="font-semibold truncate">{content.title}</h3>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}</span>
                <span>•</span>
                <span>{formatFileSize(content.file_size || 0)}</span>
              </div>

              {/* Analytics */}
              {content.content_analytics?.[0] && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{content.content_analytics[0].views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{content.content_analytics[0].likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    <span>{content.content_analytics[0].shares || 0}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Badge className={cn("text-xs", getStatusColor(content.status))}>
                {content.status}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-elegant transition-all duration-200 interactive-lift">
      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback icon */}
        <div className={cn(
          "absolute inset-0 w-full h-full bg-muted flex items-center justify-center",
          thumbnailUrl && "hidden"
        )}>
          <FileIcon mimeType={content.mime_type} className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Status Badge */}
        <Badge className={cn("absolute top-2 right-2 text-xs", getStatusColor(content.status))}>
          {content.status}
        </Badge>

        {/* Content Type Icon */}
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-md p-1">
          <ContentTypeIcon type={content.content_type} className="h-4 w-4" />
        </div>
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {content.title}
        </h3>
        
        {content.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {content.description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Author and Date */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {content.user_id.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* File Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span>{formatFileSize(content.file_size || 0)}</span>
          <span className="text-xs truncate max-w-[100px]">{content.mime_type}</span>
        </div>

        {/* Analytics */}
        {content.content_analytics?.[0] && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{content.content_analytics[0].views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{content.content_analytics[0].likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span>{content.content_analytics[0].shares || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{content.content_analytics[0].comments || 0}</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {content.content_tags && content.content_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.content_tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.tag}
              </Badge>
            ))}
            {content.content_tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{content.content_tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};