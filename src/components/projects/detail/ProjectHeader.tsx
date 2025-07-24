import React, { useState } from 'react';
import { Project } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_STATUSES } from '@/types/projects';

interface ProjectHeaderProps {
  project: Project;
  canEdit: boolean;
  onUpdate?: (updates: Partial<Project>) => Promise<void>;
}

export function ProjectHeader({ project, canEdit, onUpdate }: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project.name);
  const [editedDescription, setEditedDescription] = useState(project.description || '');
  const [editedStatus, setEditedStatus] = useState(project.status);
  const [editedPriority, setEditedPriority] = useState(project.priority);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;

    setIsSaving(true);
    try {
      await onUpdate({
        name: editedName,
        description: editedDescription,
        status: editedStatus,
        priority: editedPriority,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(project.name);
    setEditedDescription(project.description || '');
    setEditedStatus(project.status);
    setEditedPriority(project.priority);
    setIsEditing(false);
  };

  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-2xl font-bold h-12"
            placeholder="Project name"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editedName.trim()}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>

        <Textarea
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          placeholder="Project description"
          className="min-h-[100px]"
        />

        <div className="flex gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={editedStatus} onValueChange={(value: any) => setEditedStatus(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={editedPriority} onValueChange={(value: any) => setEditedPriority(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {project.name}
            </h1>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="opacity-60 hover:opacity-100"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={statusConfig?.color === 'green' ? 'default' : 'secondary'}>
              {statusConfig?.label}
            </Badge>
            <Badge variant="outline">
              {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </Badge>
          </div>

          {project.description && (
            <p className="text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </div>

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
  );
}