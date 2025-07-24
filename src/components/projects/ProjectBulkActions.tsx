import React from 'react';
import { Archive, Trash2, Download, Edit, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Project } from '@/types/projects';

interface ProjectBulkActionsProps {
  selectedProjects: string[];
  allProjects: Project[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  onChangeStatus: (status: string) => void;
  onExportSelected: () => void;
}

export function ProjectBulkActions({
  selectedProjects,
  allProjects,
  onSelectAll,
  onDeselectAll,
  onArchiveSelected,
  onDeleteSelected,
  onChangeStatus,
  onExportSelected
}: ProjectBulkActionsProps) {
  const selectedCount = selectedProjects.length;
  const totalCount = allProjects.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  if (selectedCount === 0) return null;

  return (
    <Card className="mb-4 animate-fade-in">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="h-8 w-8 p-0"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm font-medium">
              {selectedCount} of {totalCount} selected
            </span>
            <Badge variant="secondary" className="text-xs">
              {selectedCount}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change Status */}
          <Select onValueChange={onChangeStatus}>
            <SelectTrigger className="w-[140px] h-8">
              <Edit className="h-3 w-3 mr-2" />
              <SelectValue placeholder="Change Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportSelected}
            className="h-8"
          >
            <Download className="h-3 w-3 mr-2" />
            Export
          </Button>

          {/* Archive */}
          <Button
            variant="outline"
            size="sm"
            onClick={onArchiveSelected}
            className="h-8"
          >
            <Archive className="h-3 w-3 mr-2" />
            Archive
          </Button>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            className="h-8"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}