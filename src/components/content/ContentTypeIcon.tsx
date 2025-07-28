import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File as FileGeneric,
  Share2,
  PenTool,
  Newspaper,
  Mail,
  Camera,
  Monitor
} from 'lucide-react';
import { ContentType } from '@/types/content';
import { cn } from '@/lib/utils';

interface ContentTypeIconProps {
  type: ContentType;
  className?: string;
}

export const ContentTypeIcon = ({ type, className }: ContentTypeIconProps) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'blog_post':
        return <Newspaper className={cn("h-4 w-4 text-blue-600", className)} />;
      case 'social':
        return <Share2 className={cn("h-4 w-4 text-pink-600", className)} />;
      case 'image':
        return <ImageIcon className={cn("h-4 w-4 text-green-600", className)} />;
      case 'video':
        return <Video className={cn("h-4 w-4 text-purple-600", className)} />;
      case 'document':
        return <FileText className={cn("h-4 w-4 text-orange-600", className)} />;
      case 'infographic':
        return <Camera className={cn("h-4 w-4 text-cyan-600", className)} />;
      case 'presentation':
        return <Monitor className={cn("h-4 w-4 text-yellow-600", className)} />;
      default:
        return <FileGeneric className={cn("h-4 w-4 text-muted-foreground", className)} />;
    }
  };

  return getTypeIcon();
};