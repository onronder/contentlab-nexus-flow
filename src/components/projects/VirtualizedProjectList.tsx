import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Project } from '@/types/projects';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProjectGridViewOptimized } from './ProjectGridViewOptimized';
import { ProjectListViewOptimized } from './ProjectListViewOptimized';

interface VirtualizedProjectListProps {
  projects: Project[];
  selectedProjects: string[];
  onProjectSelect: (projectId: string, selected: boolean) => void;
  onProjectClick: (project: Project) => void;
  viewMode: 'grid' | 'list';
  itemHeight?: number;
  containerHeight?: number;
}

// Item renderer for react-window
const ListItem = memo(({ 
  index, 
  style, 
  data 
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    projects: Project[];
    selectedProjects: string[];
    onProjectSelect: (projectId: string, selected: boolean) => void;
    onProjectClick: (project: Project) => void;
    viewMode: 'grid' | 'list';
    itemsPerRow: number;
  };
}) => {
  const { 
    projects, 
    selectedProjects, 
    onProjectSelect, 
    onProjectClick, 
    viewMode, 
    itemsPerRow 
  } = data;

  if (viewMode === 'grid') {
    // For grid view, render multiple items per row
    const startIndex = index * itemsPerRow;
    const endIndex = Math.min(startIndex + itemsPerRow, projects.length);
    const rowProjects = projects.slice(startIndex, endIndex);

    return (
      <div style={style} className="px-4">
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)` }}>
          {rowProjects.map((project) => (
            <div key={project.id} className="border-2 transition-all duration-200 border-gray-200 bg-white dark:bg-gray-950/20 rounded-lg p-4">
              {/* Simplified project card content */}
              <div className="flex items-start justify-between mb-3">
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project.id)}
                  onChange={(e) => onProjectSelect(project.id, e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1 ml-3 cursor-pointer" onClick={() => onProjectClick(project)}>
                  <h3 className="font-semibold text-lg line-clamp-1">{project.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {project.description || 'No description provided'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{project.status}</span>
                <span>{project.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    // For list view, render one item per row
    const project = projects[index];
    if (!project) return null;

    return (
      <div style={style} className="px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center py-4 gap-4 hover:bg-muted/50 cursor-pointer" onClick={() => onProjectClick(project)}>
          <input
            type="checkbox"
            checked={selectedProjects.includes(project.id)}
            onChange={(e) => {
              e.stopPropagation();
              onProjectSelect(project.id, e.target.checked);
            }}
          />
          
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium line-clamp-1">{project.name}</div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {project.description || 'No description'}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 rounded text-xs bg-secondary">{project.projectType}</span>
            <span className="px-2 py-1 rounded text-xs bg-secondary">{project.status}</span>
            <span className="px-2 py-1 rounded text-xs bg-secondary">{project.priority}</span>
            <span>{project.teamMemberCount} members</span>
          </div>
        </div>
      </div>
    );
  }
});

ListItem.displayName = 'ListItem';

export const VirtualizedProjectList = memo(({
  projects,
  selectedProjects,
  onProjectSelect,
  onProjectClick,
  viewMode,
  itemHeight = 200,
  containerHeight = 600
}: VirtualizedProjectListProps) => {
  const isMobile = useIsMobile();
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });

  // Calculate items per row for grid view
  const itemsPerRow = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (isMobile) return 1;
    
    const minItemWidth = 320; // Minimum width for a project card
    const gap = 24; // Gap between items
    const padding = 32; // Container padding
    
    const availableWidth = containerSize.width - padding;
    const itemsWithGaps = Math.floor((availableWidth + gap) / (minItemWidth + gap));
    return Math.max(1, Math.min(3, itemsWithGaps)); // Between 1 and 3 items per row
  }, [viewMode, isMobile, containerSize.width]);

  // Calculate total number of rows
  const totalRows = useMemo(() => {
    if (viewMode === 'list') return projects.length;
    return Math.ceil(projects.length / itemsPerRow);
  }, [projects.length, itemsPerRow, viewMode]);

  // Adjusted item height for grid view
  const adjustedItemHeight = useMemo(() => {
    return viewMode === 'grid' ? itemHeight + 24 : 80; // Add gap for grid view
  }, [viewMode, itemHeight]);

  // Container ref for measuring
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height || containerHeight
          });
        }
      });
      
      resizeObserver.observe(node);
      
      // Initial measurement
      setContainerSize({
        width: node.offsetWidth,
        height: node.offsetHeight || containerHeight
      });
      
      return () => resizeObserver.disconnect();
    }
  }, [containerHeight]);

  // Memoized data for list items
  const itemData = useMemo(() => ({
    projects,
    selectedProjects,
    onProjectSelect,
    onProjectClick,
    viewMode,
    itemsPerRow
  }), [projects, selectedProjects, onProjectSelect, onProjectClick, viewMode, itemsPerRow]);

  // For small lists, use regular rendering
  if (projects.length <= 20) {
    return viewMode === 'grid' ? (
      <ProjectGridViewOptimized
        projects={projects}
        selectedProjects={selectedProjects}
        onProjectSelect={onProjectSelect}
        onProjectClick={onProjectClick}
      />
    ) : (
      <ProjectListViewOptimized
        projects={projects}
        selectedProjects={selectedProjects}
        onProjectSelect={onProjectSelect}
        onProjectClick={onProjectClick}
      />
    );
  }

  // Use virtualization for large lists
  return (
    <div 
      ref={containerRef}
      className="h-full w-full"
      style={{ height: containerHeight }}
    >
      {containerSize.width > 0 && (
        <List
          height={containerSize.height}
          width={containerSize.width}
          itemCount={totalRows}
          itemSize={adjustedItemHeight}
          itemData={itemData}
          overscanCount={2} // Render 2 extra items for smooth scrolling
        >
          {ListItem}
        </List>
      )}
    </div>
  );
});

VirtualizedProjectList.displayName = 'VirtualizedProjectList';