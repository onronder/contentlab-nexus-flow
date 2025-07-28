import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File as FileGeneric,
  Music,
  Archive,
  Code,
  Database,
  Presentation,
  Table,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export const FileIcon = ({ mimeType, className }: FileIconProps) => {
  const getFileIcon = () => {
    if (!mimeType) return <FileGeneric className={cn("h-4 w-4", className)} />;

    // Images
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className={cn("h-4 w-4 text-green-600", className)} />;
    }

    // Videos
    if (mimeType.startsWith('video/')) {
      return <Video className={cn("h-4 w-4 text-purple-600", className)} />;
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return <Music className={cn("h-4 w-4 text-blue-600", className)} />;
    }

    // Documents
    if (mimeType.includes('pdf')) {
      return <FileText className={cn("h-4 w-4 text-red-600", className)} />;
    }

    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className={cn("h-4 w-4 text-blue-600", className)} />;
    }

    // Spreadsheets
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <Table className={cn("h-4 w-4 text-green-600", className)} />;
    }

    // Presentations
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <Presentation className={cn("h-4 w-4 text-orange-600", className)} />;
    }

    // Code files
    if (
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('html') ||
      mimeType.includes('css') ||
      mimeType.includes('xml') ||
      mimeType.includes('code')
    ) {
      return <Code className={cn("h-4 w-4 text-purple-600", className)} />;
    }

    // Archives
    if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('tar') ||
      mimeType.includes('gz')
    ) {
      return <Archive className={cn("h-4 w-4 text-yellow-600", className)} />;
    }

    // Text files
    if (mimeType.startsWith('text/')) {
      return <Type className={cn("h-4 w-4 text-gray-600", className)} />;
    }

    // Database files
    if (mimeType.includes('database') || mimeType.includes('sql')) {
      return <Database className={cn("h-4 w-4 text-indigo-600", className)} />;
    }

    // Default
    return <FileGeneric className={cn("h-4 w-4 text-muted-foreground", className)} />;
  };

  return getFileIcon();
};