import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Save, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Eye,
  Edit,
  Merge,
  GitBranch,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CollaborativeEditorProps {
  contentId: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

interface Cursor {
  userId: string;
  userName: string;
  position: number;
  selection?: { start: number; end: number };
  color: string;
}

interface Operation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

interface Conflict {
  id: string;
  type: 'content' | 'format' | 'structure';
  description: string;
  users: string[];
  resolution?: 'auto' | 'manual';
}

const userColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

export const RealTimeCollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  contentId,
  initialContent = '',
  onSave,
  readOnly = false
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [activeCursors, setActiveCursors] = useState<Cursor[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [operationQueue, setOperationQueue] = useState<Operation[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Real-time presence tracking
  useEffect(() => {
    if (!user || !contentId) return;

    const channel = supabase.channel(`content-${contentId}`, {
      config: { presence: { key: user.id } }
    });

    // Track user presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const cursors: Cursor[] = [];
        
        Object.entries(state).forEach(([userId, presence]: [string, any]) => {
          if (userId !== user.id && presence[0]) {
            cursors.push({
              userId,
              userName: presence[0].userName || 'Unknown User',
              position: presence[0].cursorPosition || 0,
              selection: presence[0].selection,
              color: userColors[parseInt(userId.slice(-1), 16) % userColors.length]
            });
          }
        });
        
        setActiveCursors(cursors);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_items',
        filter: `id=eq.${contentId}`
      }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          handleRemoteUpdate(payload.new);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userName: user.email?.split('@')[0] || 'Anonymous',
            cursorPosition: 0,
            online_at: new Date().toISOString()
          });
        }
      });

    setPresenceChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contentId]);

  // Operational Transformation logic
  const applyOperation = useCallback((op: Operation, currentContent: string): string => {
    switch (op.type) {
      case 'insert':
        return currentContent.slice(0, op.position) + 
               (op.content || '') + 
               currentContent.slice(op.position);
      case 'delete':
        return currentContent.slice(0, op.position) + 
               currentContent.slice(op.position + (op.length || 0));
      case 'retain':
        return currentContent;
      default:
        return currentContent;
    }
  }, []);

  const transformOperation = useCallback((op1: Operation, op2: Operation): Operation => {
    // Transform op1 against op2 for operational transformation
    if (op1.position <= op2.position) {
      return op1;
    }
    
    const transformedOp = { ...op1 };
    
    if (op2.type === 'insert') {
      transformedOp.position += op2.content?.length || 0;
    } else if (op2.type === 'delete') {
      transformedOp.position -= op2.length || 0;
    }
    
    return transformedOp;
  }, []);

  const handleRemoteUpdate = useCallback((newData: any) => {
    // Handle incoming changes from other users
    const newContent = newData.description || '';
    if (newContent !== content) {
      detectConflicts(content, newContent);
      setContent(newContent);
    }
  }, [content]);

  const detectConflicts = useCallback((localContent: string, remoteContent: string) => {
    // Simple conflict detection - in production, this would be more sophisticated
    if (localContent !== remoteContent && hasUnsavedChanges) {
      const conflict: Conflict = {
        id: `conflict-${Date.now()}`,
        type: 'content',
        description: 'Simultaneous edits detected',
        users: [user?.id || 'unknown'],
        resolution: 'manual'
      };
      setConflicts(prev => [...prev, conflict]);
    }
  }, [hasUnsavedChanges, user]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    
    // Clear existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 2000);

    // Track cursor position for collaboration
    if (presenceChannel && textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const selection = textareaRef.current.selectionStart !== textareaRef.current.selectionEnd
        ? { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd }
        : undefined;

      presenceChannel.track({
        userName: user?.email?.split('@')[0] || 'Anonymous',
        cursorPosition,
        selection,
        online_at: new Date().toISOString()
      });
    }
  }, [presenceChannel, user]);

  const handleSave = async (contentToSave?: string) => {
    const saveContent = contentToSave || content;
    
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ description: saveContent })
        .eq('id', contentId);

      if (error) throw error;

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSave?.(saveContent);
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleLockToggle = async () => {
    if (isLocked && lockedBy !== user?.id) return;

    const newLockState = !isLocked;
    setIsLocked(newLockState);
    setLockedBy(newLockState ? user?.id || null : null);

    // Broadcast lock state to other users
    if (presenceChannel) {
      presenceChannel.track({
        userName: user?.email?.split('@')[0] || 'Anonymous',
        locked: newLockState,
        online_at: new Date().toISOString()
      });
    }
  };

  const resolveConflict = (conflictId: string, resolution: 'accept' | 'reject') => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    // In production, this would apply the resolution strategy
  };

  const renderCursorOverlays = () => {
    if (!textareaRef.current) return null;

    return activeCursors.map(cursor => (
      <div
        key={cursor.userId}
        className="absolute pointer-events-none"
        style={{
          top: `${Math.floor(cursor.position / 50) * 20}px`, // Approximate line positioning
          left: `${(cursor.position % 50) * 8}px`, // Approximate character positioning
          borderLeft: `2px solid ${cursor.color}`,
          height: '20px',
          zIndex: 10
        }}
      >
        <div
          className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded"
          style={{ backgroundColor: cursor.color }}
        >
          {cursor.userName}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Collaboration Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Collaborative Editor</CardTitle>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              {lastSaved && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Active Users */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {activeCursors.slice(0, 3).map((cursor) => (
                    <Avatar key={cursor.userId} className="h-8 w-8 border-2 border-background">
                      <AvatarFallback 
                        className="text-xs"
                        style={{ backgroundColor: cursor.color, color: 'white' }}
                      >
                        {cursor.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {activeCursors.length > 3 && (
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                      +{activeCursors.length - 3}
                    </div>
                  )}
                </div>
              </div>

              {/* Editor Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLockToggle}
                disabled={isLocked && lockedBy !== user?.id}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                {isLocked ? 'Locked' : 'Lock'}
              </Button>
              
              <Button
                size="sm"
                onClick={() => handleSave()}
                disabled={!hasUnsavedChanges || readOnly}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Conflict Alerts */}
      {conflicts.map((conflict) => (
        <Alert key={conflict.id} className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>{conflict.description}</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => resolveConflict(conflict.id, 'accept')}
              >
                Accept Changes
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => resolveConflict(conflict.id, 'reject')}
              >
                Keep Mine
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Editor */}
      <Card className="relative">
        <CardContent className="p-4">
          <div className="relative">
            {renderCursorOverlays()}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start typing to collaborate in real-time..."
              className="min-h-[400px] resize-none font-mono text-sm"
              disabled={readOnly || (isLocked && lockedBy !== user?.id)}
            />
          </div>
          
          {isLocked && lockedBy !== user?.id && (
            <div className="absolute inset-0 bg-black/10 rounded-md flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="font-medium">Content is locked for editing</p>
                <p className="text-sm text-muted-foreground">Another user is currently making changes</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collaboration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-xl font-bold">{activeCursors.length + 1}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Edit className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-xl font-bold">{operationQueue.length}</div>
            <div className="text-sm text-muted-foreground">Pending Operations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Merge className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <div className="text-xl font-bold">{conflicts.length}</div>
            <div className="text-sm text-muted-foreground">Active Conflicts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <History className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-xl font-bold">{content.length}</div>
            <div className="text-sm text-muted-foreground">Characters</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};