import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Filter, Grid3X3, List, FolderOpen, AlertCircle, RefreshCw, Settings2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';
import { ProjectAnalyticsCards } from '@/components/projects/ProjectAnalyticsCards';
import { ProjectFilterSidebar } from '@/components/projects/ProjectFilterSidebar';
import { AdvancedSearchInput } from '@/components/projects/AdvancedSearchInput';
import { AdvancedSearchDialog } from '@/components/projects/AdvancedSearchDialog';
import { ProjectBulkActions } from '@/components/projects/ProjectBulkActions';
import { ProjectGridView } from '@/components/projects/ProjectGridView';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { useProjects, useCurrentUserId } from '@/hooks';
import { useAdvancedProjectFilters } from '@/hooks/useAdvancedProjectFilters';
import { Project } from '@/types/projects';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'grid' | 'list';

const Projects = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const currentUserId = useCurrentUserId();
  
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
    return filterProjects(projects);
  }, [projects, filterProjects]);

  // Get filter options with counts
  const filterOptions = useMemo(() => {
    return getFilterOptions(projects);
  }, [projects, getFilterOptions]);

  // Project selection handlers
  const handleProjectSelect = useCallback((projectId: string, selected: boolean) => {
    setSelectedProjects(prev => 
      selected 
        ? [...prev, projectId]
        : prev.filter(id => id !== projectId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedProjects(filteredProjects.map(p => p.id));
  }, [filteredProjects]);

  const handleDeselectAll = useCallback(() => {
    setSelectedProjects([]);
  }, []);

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
  }, [navigate]);

  // Project click handler
  const handleProjectClick = useCallback((project: Project) => {
    // TODO: Navigate to project detail page
    console.log('Navigate to project:', project.id);
  }, []);

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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Project Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage your competitive intelligence projects and track progress
            </p>
          </div>
          
          <Button 
            onClick={handleCreateProject}
            className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200 mt-4 lg:mt-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Advanced Search */}
          <div className="flex-1 flex gap-2">
            <AdvancedSearchInput
              value={filters.search.query}
              onChange={(value) => updateFilter('search', { ...filters.search, query: value })}
              onSearch={handleSearch}
              searchHistory={searchHistory}
              onClearHistory={clearSearchHistory}
              className="flex-1"
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
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Clear filters button */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-destructive"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}

          {/* View toggle */}
          <div className="flex border rounded-lg">
            <Toggle
              pressed={viewMode === 'grid'}
              onPressedChange={() => setViewMode('grid')}
              className="rounded-r-none"
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={viewMode === 'list'}
              onPressedChange={() => setViewMode('list')}
              className="rounded-l-none border-l"
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Toggle>
          </div>
        </div>

        {/* Analytics Cards */}
        <ProjectAnalyticsCards projects={projects} isLoading={isLoading} />

        {/* Main Content Area */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0 hidden lg:block">
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
            </div>
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
          <div className="flex-1">
            {/* Bulk Actions */}
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

            {/* Projects Display */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {filters.search.query || activeFilterCount > 0
                    ? "Try adjusting your search terms or filters" 
                    : "Create your first project to get started"
                  }
                </p>
                <div className="flex justify-center gap-2">
                  {(filters.search.query || activeFilterCount > 0) && (
                    <Button 
                      variant="outline" 
                      onClick={clearAllFilters}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                  <Button onClick={handleCreateProject} className="gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;