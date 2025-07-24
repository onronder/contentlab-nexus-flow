import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Grid3X3, List, FolderOpen, AlertCircle, RefreshCw, Settings2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import { SkipLinks } from '@/components/ui/skip-links';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { ProjectAnalyticsCards } from '@/components/projects/ProjectAnalyticsCards';
import { ProjectFilterSidebar } from '@/components/projects/ProjectFilterSidebar';
import { AdvancedSearchInput } from '@/components/projects/AdvancedSearchInput';
import { AdvancedSearchDialog } from '@/components/projects/AdvancedSearchDialog';
import { ProjectBulkActions } from '@/components/projects/ProjectBulkActions';
import { ProjectGridView } from '@/components/projects/ProjectGridView';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { useProjects, useCurrentUserId } from '@/hooks';
import { useAdvancedProjectFilters } from '@/hooks/useAdvancedProjectFilters';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAccessibleAnnouncement } from '@/hooks/useAccessibleAnnouncement';
import { useFocusManagement } from '@/hooks/useFocusManagement';
import { Project } from '@/types/projects';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'grid' | 'list';

const Projects = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const currentUserId = useCurrentUserId();
  
  // Accessibility hooks
  const { announce, announceResultCount, announceSelectionChange } = useAccessibleAnnouncement();
  const { getButtonProps } = useFocusManagement();
  
  // Refs for accessibility
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('projects-view-mode') as ViewMode) || 'grid';
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { data: projects = [], isLoading, error, refetch } = useProjects();

  // Advanced filtering hook
  const {
    filters,
    setFilters,
    updateFilter,
    filterProjects,
    activeFilterCount,
    clearAllFilters,
    searchHistory,
    saveSearchToHistory,
    quickDateFilters,
    applyQuickDateFilter,
    getFilterOptions
  } = useAdvancedProjectFilters(currentUserId);

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    localStorage.removeItem('project-search-history');
    window.location.reload(); // Simple way to reset search history state
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    updateFilter('search', {
      ...filters.search,
      query
    });
    if (query.trim()) {
      saveSearchToHistory(query);
    }
  }, [filters.search, updateFilter, saveSearchToHistory]);

  // Handle search from history
  const handleSearchFromHistory = useCallback((query: string) => {
    updateFilter('search', {
      ...filters.search,
      query
    });
  }, [filters.search, updateFilter]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('projects-view-mode', viewMode);
  }, [viewMode]);

  // Apply filtering
  const filteredProjects = useMemo(() => {
    const filtered = filterProjects(projects);
    // Announce result count for accessibility
    if (!isLoading) {
      announceResultCount(filtered.length, 'projects');
    }
    return filtered;
  }, [projects, filterProjects, isLoading, announceResultCount]);

  // Get filter options with counts
  const filterOptions = useMemo(() => {
    return getFilterOptions(projects);
  }, [projects, getFilterOptions]);

  // Project selection handlers
  const handleProjectSelect = useCallback((projectId: string, selected: boolean) => {
    setSelectedProjects(prev => {
      const newSelection = selected 
        ? [...prev, projectId]
        : prev.filter(id => id !== projectId);
      
      // Announce selection change for accessibility
      announceSelectionChange(newSelection.length, filteredProjects.length, 'projects');
      return newSelection;
    });
  }, [filteredProjects.length, announceSelectionChange]);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredProjects.map(p => p.id);
    setSelectedProjects(allIds);
    announceSelectionChange(allIds.length, filteredProjects.length, 'projects');
  }, [filteredProjects, announceSelectionChange]);

  const handleDeselectAll = useCallback(() => {
    setSelectedProjects([]);
    announceSelectionChange(0, filteredProjects.length, 'projects');
  }, [filteredProjects.length, announceSelectionChange]);

  // Bulk action handlers
  const handleBulkArchive = useCallback(() => {
    // TODO: Implement bulk archive
    toast({
      title: "Archive Projects",
      description: `${selectedProjects.length} projects will be archived.`,
    });
    setSelectedProjects([]);
  }, [selectedProjects, toast]);

  const handleBulkDelete = useCallback(() => {
    // TODO: Implement bulk delete with confirmation
    toast({
      title: "Delete Projects",
      description: `${selectedProjects.length} projects will be deleted.`,
      variant: "destructive",
    });
    setSelectedProjects([]);
  }, [selectedProjects, toast]);

  const handleBulkStatusChange = useCallback((status: string) => {
    // TODO: Implement bulk status change
    toast({
      title: "Status Updated",
      description: `${selectedProjects.length} projects status changed to ${status}.`,
    });
    setSelectedProjects([]);
  }, [selectedProjects, toast]);

  const handleBulkExport = useCallback(() => {
    // TODO: Implement bulk export
    toast({
      title: "Export Projects",
      description: `${selectedProjects.length} projects exported successfully.`,
    });
  }, [selectedProjects, toast]);

  // Navigation to create project page
  const handleCreateProject = useCallback(() => {
    navigate('/projects/create');
    announce('Navigating to create project page');
  }, [navigate, announce]);

  // Project click handler
  const handleProjectClick = useCallback((project: Project) => {
    // TODO: Navigate to project detail page
    console.log('Navigate to project:', project.id);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateProject: handleCreateProject,
    onSearch: () => searchInputRef.current?.focus(),
    onToggleFilters: () => setShowFilters(prev => !prev),
    onEscape: () => {
      setShowFilters(false);
      setSelectedProjects([]);
    },
    onSelectAll: handleSelectAll,
    onClearSelection: handleDeselectAll,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          
          {/* Controls skeleton */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
          
          {/* Analytics cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          
          {/* Projects grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Project Dashboard</h1>
              <p className="text-muted-foreground text-lg">Manage your competitive intelligence projects</p>
            </div>
          </div>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load projects: {(error as Error).message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <SkipLinks />
      <div className="min-h-screen bg-gradient-subtle">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
            <div>
              <h1 
                id="main-heading"
                className="text-4xl font-bold text-foreground mb-2"
              >
                Project Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your competitive intelligence projects and track progress. 
                Use keyboard shortcuts: Ctrl+N to create, Ctrl+F to search, F to toggle filters.
              </p>
            </div>
            
            <AccessibleButton 
              onClick={handleCreateProject}
              className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200 mt-4 lg:mt-0"
              description="Create a new competitive intelligence project"
              shortcut="Ctrl+N"
              {...getButtonProps('Create new project', 'Opens the project creation wizard')}
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Create New Project
            </AccessibleButton>
          </header>

          {/* Controls */}
          <section 
            className="flex flex-col lg:flex-row gap-4 mb-6"
            aria-label="Project search and filtering controls"
          >
            {/* Advanced Search */}
            <div className="flex-1 flex gap-2">
              <AdvancedSearchInput
                value={filters.search.query}
                onChange={(value) => updateFilter('search', { ...filters.search, query: value })}
                onSearch={handleSearch}
                searchHistory={searchHistory}
                onClearHistory={clearSearchHistory}
                className="flex-1"
                aria-label="Search projects"
                placeholder="Search projects by name, description, or keywords..."
              />
              <AdvancedSearchDialog
                filters={filters}
                onFiltersChange={setFilters}
                searchHistory={searchHistory}
                onSearchFromHistory={handleSearchFromHistory}
                onClearHistory={clearSearchHistory}
              />
            </div>

            {/* Filter toggle */}
            <AccessibleButton
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-muted' : ''}
              expanded={showFilters}
              controls="filter-sidebar"
              description={`Toggle project filters. ${activeFilterCount > 0 ? `${activeFilterCount} filters active` : 'No active filters'}`}
              shortcut="F"
              {...getButtonProps(
                showFilters ? 'Hide filters' : 'Show filters',
                `Toggle the filter sidebar. Currently ${showFilters ? 'expanded' : 'collapsed'}`
              )}
            >
              <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </AccessibleButton>

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <AccessibleButton
                variant="outline"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-destructive"
                description={`Clear all ${activeFilterCount} active filters`}
                {...getButtonProps('Clear all filters', `Remove all active filters and show all projects`)}
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Clear All
              </AccessibleButton>
            )}

            {/* View toggle */}
            <div 
              className="flex border rounded-lg"
              role="radiogroup"
              aria-label="View mode selection"
            >
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={() => setViewMode('grid')}
                className="rounded-r-none"
                aria-label="Grid view"
                role="radio"
                aria-checked={viewMode === 'grid'}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Grid view</span>
              </Toggle>
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={() => setViewMode('list')}
                className="rounded-l-none border-l"
                aria-label="List view"
                role="radio"
                aria-checked={viewMode === 'list'}
              >
                <List className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">List view</span>
              </Toggle>
            </div>
          </section>

          {/* Analytics Cards */}
          <section aria-label="Project analytics overview">
            <ProjectAnalyticsCards projects={projects} isLoading={isLoading} />
          </section>

          {/* Main Content Area */}
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            {showFilters && (
              <aside 
                id="filter-sidebar"
                className="w-80 flex-shrink-0 hidden lg:block"
                aria-label="Project filters"
              >
                <ProjectFilterSidebar
                  isOpen={showFilters}
                  onClose={() => setShowFilters(false)}
                  filters={filters}
                  onFiltersChange={setFilters}
                  projects={projects}
                  activeFilterCount={activeFilterCount}
                  quickDateFilters={quickDateFilters}
                  onApplyQuickDateFilter={applyQuickDateFilter}
                  filterOptions={filterOptions}
                  currentUserId={currentUserId}
                />
              </aside>
            )}

            {/* Mobile Filter Sidebar */}
            <ProjectFilterSidebar
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              filters={filters}
              onFiltersChange={setFilters}
              projects={projects}
              activeFilterCount={activeFilterCount}
              quickDateFilters={quickDateFilters}
              onApplyQuickDateFilter={applyQuickDateFilter}
              filterOptions={filterOptions}
              currentUserId={currentUserId}
            />

            {/* Projects Content */}
            <main 
              id="main-content"
              ref={mainContentRef}
              className="flex-1"
              aria-label="Projects list"
            >
              {/* Bulk Actions */}
              <section aria-label="Bulk actions for selected projects">
                <ProjectBulkActions
                  selectedProjects={selectedProjects}
                  allProjects={filteredProjects}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onArchiveSelected={handleBulkArchive}
                  onDeleteSelected={handleBulkDelete}
                  onChangeStatus={handleBulkStatusChange}
                  onExportSelected={handleBulkExport}
                />
              </section>

              {/* Projects Display */}
              <section 
                aria-label={`${filteredProjects.length} projects displayed in ${viewMode} view`}
                aria-live="polite"
              >
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12" role="region" aria-label="No projects message">
                    <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h2 className="text-lg font-semibold mb-2">No projects found</h2>
                    <p className="text-muted-foreground mb-4">
                      {filters.search.query || activeFilterCount > 0
                        ? "Try adjusting your search terms or filters" 
                        : "Create your first project to get started"
                      }
                    </p>
                    <div className="flex justify-center gap-2">
                      {(filters.search.query || activeFilterCount > 0) && (
                        <AccessibleButton 
                          variant="outline" 
                          onClick={clearAllFilters}
                          description="Remove all active filters to show all projects"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                          Clear Filters
                        </AccessibleButton>
                      )}
                      <AccessibleButton 
                        onClick={handleCreateProject} 
                        className="gradient-primary"
                        description="Start creating your first project"
                      >
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                        Create New Project
                      </AccessibleButton>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <ProjectGridView
                    projects={filteredProjects}
                    selectedProjects={selectedProjects}
                    onProjectSelect={handleProjectSelect}
                    onProjectClick={handleProjectClick}
                  />
                ) : (
                  <ProjectListView
                    projects={filteredProjects}
                    selectedProjects={selectedProjects}
                    onProjectSelect={handleProjectSelect}
                    onProjectClick={handleProjectClick}
                  />
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Projects;