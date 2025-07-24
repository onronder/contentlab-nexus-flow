import React, { useState } from 'react';
import { Project } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROJECT_TYPES } from '@/types/projects';

interface ProjectInformationProps {
  project: Project;
  canEdit: boolean;
  onUpdate?: (updates: Partial<Project>) => Promise<void>;
}

export function ProjectInformation({ project, canEdit, onUpdate }: ProjectInformationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>(project);
  const [newTag, setNewTag] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;

    setIsSaving(true);
    try {
      await onUpdate(editedProject);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProject(project);
    setIsEditing(false);
  };

  const addTag = () => {
    if (newTag.trim() && !editedProject.tags?.includes(newTag.trim())) {
      setEditedProject({
        ...editedProject,
        tags: [...(editedProject.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setEditedProject({
      ...editedProject,
      tags: editedProject.tags?.filter(t => t !== tag) || []
    });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setEditedProject({
        ...editedProject,
        primaryObjectives: [...(editedProject.primaryObjectives || []), newObjective.trim()]
      });
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setEditedProject({
      ...editedProject,
      primaryObjectives: editedProject.primaryObjectives?.filter((_, i) => i !== index) || []
    });
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      setEditedProject({
        ...editedProject,
        successMetrics: [...(editedProject.successMetrics || []), newMetric.trim()]
      });
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    setEditedProject({
      ...editedProject,
      successMetrics: editedProject.successMetrics?.filter((_, i) => i !== index) || []
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Basic Information</CardTitle>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={editedProject.name || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedProject.description || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={editedProject.industry || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, industry: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select
                    value={editedProject.projectType}
                    onValueChange={(value: any) => setEditedProject({ ...editedProject, projectType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="targetMarket">Target Market</Label>
                <Input
                  id="targetMarket"
                  value={editedProject.targetMarket || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, targetMarket: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Project Name</h3>
                <p className="text-muted-foreground">{project.name}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{project.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Industry</h3>
                  <p className="text-muted-foreground">{project.industry}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Project Type</h3>
                  <p className="text-muted-foreground">
                    {PROJECT_TYPES.find(t => t.value === project.projectType)?.label || project.projectType}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Target Market</h3>
                <p className="text-muted-foreground">{project.targetMarket || 'Not specified'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Objectives */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Objectives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              {editedProject.primaryObjectives?.map((objective, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={objective} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeObjective(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add new objective..."
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                />
                <Button onClick={addObjective} disabled={!newObjective.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {project.primaryObjectives.length > 0 ? (
                project.primaryObjectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-sm">{objective}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No objectives defined yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Success Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              {editedProject.successMetrics?.map((metric, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={metric} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMetric(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add new metric..."
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMetric()}
                />
                <Button onClick={addMetric} disabled={!newMetric.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {project.successMetrics.length > 0 ? (
                project.successMetrics.map((metric, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <p className="text-sm">{metric}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No success metrics defined yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags and Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tags & Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tags */}
          <div>
            <h3 className="font-medium mb-3">Tags</h3>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {editedProject.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} disabled={!newTag.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.tags.length > 0 ? (
                  project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tags added</p>
                )}
              </div>
            )}
          </div>

          {/* Project Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Project Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPublic">Public Project</Label>
                  <p className="text-sm text-muted-foreground">Make this project visible to everyone</p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isEditing ? editedProject.isPublic : project.isPublic}
                  onCheckedChange={(checked) => 
                    isEditing && setEditedProject({ ...editedProject, isPublic: checked })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowTeamAccess">Team Access</Label>
                  <p className="text-sm text-muted-foreground">Allow team members to access this project</p>
                </div>
                <Switch
                  id="allowTeamAccess"
                  checked={isEditing ? editedProject.allowTeamAccess : project.allowTeamAccess}
                  onCheckedChange={(checked) => 
                    isEditing && setEditedProject({ ...editedProject, allowTeamAccess: checked })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoAnalysis">Auto Analysis</Label>
                  <p className="text-sm text-muted-foreground">Automatically run competitive analysis</p>
                </div>
                <Switch
                  id="autoAnalysis"
                  checked={isEditing ? editedProject.autoAnalysisEnabled : project.autoAnalysisEnabled}
                  onCheckedChange={(checked) => 
                    isEditing && setEditedProject({ ...editedProject, autoAnalysisEnabled: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}