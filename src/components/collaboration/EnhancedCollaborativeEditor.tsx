import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Save, 
  Users, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedCollaborativeEditorProps {
  contentId: string;
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

interface TextOperation {
  type: 'insert' | 'delete' | 'format' | 'move';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
}

interface Conflict {
  id: string;
  type: 'concurrent_edit' | 'format_collision';
  participants: string[];
  timestamp: number;
  resolved: boolean;
}

export const EnhancedCollaborativeEditor: React.FC<EnhancedCollaborativeEditorProps> = ({
  contentId,
  initialContent = '',
  onSave,
  readOnly = false,
  className = ''
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { state, actions } = useCollaboration();
  
  const [content, setContent] = useState(initialContent);
  const [isLocked, setIsLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'pending'>('saved');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Map<string, any>>(new Map());
  const [lastSyncedContent, setLastSyncedContent] = useState(initialContent);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const operationQueueRef = useRef<TextOperation[]>([]);

  // Enhanced operational transformation
  const transformOperation = useCallback((operation: TextOperation, remoteOp: TextOperation): TextOperation => {
    if (operation.type === 'insert' && remoteOp.type === 'insert') {
      if (operation.position <= remoteOp.position) {
        return operation; // No transformation needed
      } else {
        return {
          ...operation,
          position: operation.position + (remoteOp.content?.length || 0)
        };
      }
    }
    
    if (operation.type === 'delete' && remoteOp.type === 'insert') {
      if (operation.position >= remoteOp.position) {
        return {
          ...operation,
          position: operation.position + (remoteOp.content?.length || 0)
        };
      }
    }
    
    if (operation.type === 'insert' && remoteOp.type === 'delete') {
      if (operation.position > remoteOp.position) {
        return {
          ...operation,
          position: Math.max(remoteOp.position, operation.position - (remoteOp.length || 0))
        };
      }
    }
    
    if (operation.type === 'delete' && remoteOp.type === 'delete') {
      if (operation.position >= remoteOp.position + (remoteOp.length || 0)) {
        return {
          ...operation,
          position: operation.position - (remoteOp.length || 0)
        };
      } else if (operation.position + (operation.length || 0) <= remoteOp.position) {
        return operation; // No overlap
      } else {
        // Complex overlap case - merge deletions
        const newPosition = Math.min(operation.position, remoteOp.position);
        const newLength = Math.max(
          operation.position + (operation.length || 0),
          remoteOp.position + (remoteOp.length || 0)
        ) - newPosition;
        
        return {
          ...operation,
          position: newPosition,
          length: newLength
        };
      }
    }
    
    return operation;
  }, []);

  // Apply operation to content
  const applyOperation = useCallback((operation: TextOperation, targetContent: string): string => {
    switch (operation.type) {
      case 'insert':
        return targetContent.slice(0, operation.position) + 
               (operation.content || '') + 
               targetContent.slice(operation.position);
               
      case 'delete':
        return targetContent.slice(0, operation.position) + 
               targetContent.slice(operation.position + (operation.length || 0));
               
      case 'format':
      case 'move':
        return targetContent; // No change for format/move operations
        
      default:
        return targetContent;
    }
  }, []);

  // Detect conflicts
  const detectConflicts = useCallback((operations: TextOperation[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    const operationsByPosition = new Map<number, TextOperation[]>();
    
    operations.forEach(op => {
      const positionOps = operationsByPosition.get(op.position) || [];
      positionOps.push(op);
      operationsByPosition.set(op.position, positionOps);
    });
    
    operationsByPosition.forEach((ops, position) => {
      if (ops.length > 1) {
        const participants = [...new Set(ops.map(op => op.attributes?.userId).filter(Boolean))];
        if (participants.length > 1) {
          conflicts.push({
            id: `conflict-${Date.now()}-${position}`,
            type: 'concurrent_edit',
            participants,
            timestamp: Date.now(),
            resolved: false
          });
        }
      }
    });
    
    return conflicts;
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (readOnly || isLocked) return;
    
    const cursorPosition = editorRef.current?.selectionStart || 0;
    
    // Calculate diff and create operation
    const operation: TextOperation = {
      type: newContent.length > content.length ? 'insert' : 'delete',
      position: cursorPosition,
      content: newContent.length > content.length 
        ? newContent.slice(content.length) 
        : undefined,
      length: newContent.length < content.length 
        ? content.length - newContent.length 
        : undefined,
      attributes: { userId: user?.id }
    };
    
    setContent(newContent);
    setSaveStatus('pending');
    
    // Add to operation queue and send to collaboration system
    operationQueueRef.current.push(operation);
    actions.addOperation({
      type: operation.type,
      data: operation
    });
    
    // Update cursor position
    actions.updateCursor({
      x: cursorPosition,
      y: 0,
      selection: {
        start: editorRef.current?.selectionStart || 0,
        end: editorRef.current?.selectionEnd || 0
      }
    });
    
    // Auto-save with debouncing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, state.settings.autoSave ? 1000 : 5000);
  }, [content, readOnly, isLocked, user?.id, actions, state.settings.autoSave]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    try {
      setSaveStatus('saving');
      await onSave(content);
      setLastSyncedContent(content);
      setSaveStatus('saved');
      
      toast({
        title: "Saved",
        description: "Changes have been saved successfully.",
      });
    } catch (error) {
      setSaveStatus('error');
      toast({
        title: "Save Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    }
  }, [content, onSave, toast]);

  // Handle remote operations
  useEffect(() => {
    const handleRemoteOperations = () => {
      const remoteOperations = state.operations.filter(
        op => op.userId !== user?.id && !op.applied
      );
      
      if (remoteOperations.length === 0) return;
      
      let newContent = content;
      const conflicts = detectConflicts([
        ...operationQueueRef.current,
        ...remoteOperations.map(op => op.data)
      ]);
      
      // Apply remote operations with transformation
      remoteOperations.forEach(remoteOp => {
        let transformedOp = remoteOp.data;
        
        // Transform against pending local operations
        operationQueueRef.current.forEach(localOp => {
          transformedOp = transformOperation(transformedOp, localOp);
        });
        
        newContent = applyOperation(transformedOp, newContent);
      });
      
      if (newContent !== content) {
        setContent(newContent);
      }
      
      if (conflicts.length > 0) {
        setConflicts(prev => [...prev, ...conflicts]);
      }
      
      // Clear applied operations
      operationQueueRef.current = [];
    };
    
    handleRemoteOperations();
  }, [state.operations, user?.id, content, transformOperation, applyOperation, detectConflicts]);

  // Handle cursor positions
  useEffect(() => {
    const newCursorPositions = new Map();
    state.participants.forEach(participant => {
      if (participant.cursor_position && participant.user_id !== user?.id) {
        newCursorPositions.set(participant.user_id, participant.cursor_position);
      }
    });
    setCursorPositions(newCursorPositions);
  }, [state.participants, user?.id]);

  // Lock/unlock editor
  const handleLockToggle = useCallback(() => {
    setIsLocked(!isLocked);
    
    if (!isLocked) {
      toast({
        title: "Editor Locked",
        description: "Editor is now locked to prevent conflicts.",
      });
    } else {
      toast({
        title: "Editor Unlocked",
        description: "Editor is now available for editing.",
      });
    }
  }, [isLocked, toast]);

  // Resolve conflict
  const handleResolveConflict = useCallback((conflictId: string, resolution: 'keep_local' | 'keep_remote' | 'merge') => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    actions.resolveConflict(conflictId, resolution);
    
    toast({
      title: "Conflict Resolved",
      description: `Conflict resolved using ${resolution.replace('_', ' ')} strategy.`,
    });
  }, [actions, toast]);

  // Render cursor overlays
  const renderCursorOverlays = () => {
    return Array.from(cursorPositions.entries()).map(([userId, position]) => {
      const participant = state.participants.find(p => p.user_id === userId);
      if (!participant) return null;
      
      return (
        <div
          key={userId}
          className="absolute pointer-events-none z-10"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            borderLeft: '2px solid hsl(var(--primary))',
            height: '20px'
          }}
        >
          <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md -mt-8 whitespace-nowrap">
            {participant.profiles?.full_name || participant.user_id}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Collaborative Editor</h3>
          <Badge variant={state.isConnected ? 'default' : 'destructive'}>
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Active users */}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">{state.participants.length}</span>
          </div>
          
          {/* Save status */}
          <div className="flex items-center gap-1">
            {saveStatus === 'saving' && <Clock className="h-4 w-4 animate-spin" />}
            {saveStatus === 'saved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {saveStatus === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className="text-sm capitalize">{saveStatus}</span>
          </div>
          
          {/* Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLockToggle}
            disabled={readOnly}
          >
            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || readOnly}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Conflict Alerts */}
      {conflicts.map(conflict => (
        <Card key={conflict.id} className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-red-800">Editing Conflict Detected</h4>
                <p className="text-sm text-red-600">
                  Multiple users are editing the same section. Choose a resolution:
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(conflict.id, 'keep_local')}
                >
                  Keep My Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(conflict.id, 'keep_remote')}
                >
                  Keep Their Changes
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleResolveConflict(conflict.id, 'merge')}
                >
                  Auto Merge
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Editor */}
      <div className="relative">
        {isLocked && (
          <div className="absolute inset-0 bg-black/10 z-20 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <Lock className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Editor Locked</p>
            </div>
          </div>
        )}
        
        {renderCursorOverlays()}
        
        <Textarea
          ref={editorRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing to collaborate..."
          className="min-h-[400px] font-mono text-sm resize-none"
          disabled={readOnly || isLocked}
        />
      </div>

      {/* Collaboration Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Collaboration Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Active Users</div>
              <div className="text-muted-foreground">{state.participants.length}</div>
            </div>
            <div>
              <div className="font-medium">Operations</div>
              <div className="text-muted-foreground">{state.operations.length}</div>
            </div>
            <div>
              <div className="font-medium">Conflicts</div>
              <div className="text-muted-foreground">{conflicts.length}</div>
            </div>
            <div>
              <div className="font-medium">Characters</div>
              <div className="text-muted-foreground">{content.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};