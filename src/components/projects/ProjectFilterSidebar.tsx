import React from 'react';
import { X, Calendar, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Project } from '@/types/projects';

export interface ProjectFilters {
  status: string[];
  priority: string[];
  industry: string[];
  projectType: string[];
  dateRange: {
    field: 'created' | 'updated' | 'due';
    from?: Date;
    to?: Date;
  };
}

interface ProjectFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  projects: Project[];
  activeFilterCount: number;
}

export function ProjectFilterSidebar({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  projects,
  activeFilterCount
}: ProjectFilterSidebarProps) {
  // Extract unique values from projects
  const uniqueIndustries = React.useMemo(() => {
    return Array.from(new Set(projects.map(p => p.industry))).sort();
  }, [projects]);

  const uniqueProjectTypes = React.useMemo(() => {
    return Array.from(new Set(projects.map(p => p.projectType))).sort();
  }, [projects]);

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const projectTypeLabels: Record<string, string> = {
    competitive_analysis: 'Competitive Analysis',
    market_research: 'Market Research',
    brand_monitoring: 'Brand Monitoring',
    content_strategy: 'Content Strategy',
    seo_analysis: 'SEO Analysis'
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    const newPriority = checked
      ? [...filters.priority, priority]
      : filters.priority.filter(p => p !== priority);
    
    onFiltersChange({ ...filters, priority: newPriority });
  };

  const handleIndustryChange = (industry: string, checked: boolean) => {
    const newIndustry = checked
      ? [...filters.industry, industry]
      : filters.industry.filter(i => i !== industry);
    
    onFiltersChange({ ...filters, industry: newIndustry });
  };

  const handleProjectTypeChange = (type: string, checked: boolean) => {
    const newProjectType = checked
      ? [...filters.projectType, type]
      : filters.projectType.filter(t => t !== type);
    
    onFiltersChange({ ...filters, projectType: newProjectType });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      priority: [],
      industry: [],
      projectType: [],
      dateRange: { field: 'created' }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 lg:hidden" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <Card className="fixed right-0 top-0 h-full w-80 lg:relative lg:w-full lg:h-auto overflow-y-auto z-50 animate-slide-in-right lg:animate-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Filter */}
          <div>
            <Label className="text-sm font-semibold">Status</Label>
            <div className="mt-2 space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={filters.status.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleStatusChange(option.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div>
            <Label className="text-sm font-semibold">Priority</Label>
            <div className="mt-2 space-y-2">
              {priorityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={filters.priority.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handlePriorityChange(option.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`priority-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Industry Filter */}
          <div>
            <Label className="text-sm font-semibold">Industry</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {uniqueIndustries.map((industry) => (
                <div key={industry} className="flex items-center space-x-2">
                  <Checkbox
                    id={`industry-${industry}`}
                    checked={filters.industry.includes(industry)}
                    onCheckedChange={(checked) => 
                      handleIndustryChange(industry, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`industry-${industry}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {industry}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Project Type Filter */}
          <div>
            <Label className="text-sm font-semibold">Project Type</Label>
            <div className="mt-2 space-y-2">
              {uniqueProjectTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filters.projectType.includes(type)}
                    onCheckedChange={(checked) => 
                      handleProjectTypeChange(type, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`type-${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {projectTypeLabels[type] || type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div>
            <Label className="text-sm font-semibold">Date Range</Label>
            <div className="mt-2 space-y-2">
              <Select 
                value={filters.dateRange.field} 
                onValueChange={(value: 'created' | 'updated' | 'due') => 
                  onFiltersChange({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange, field: value } 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="updated">Updated Date</SelectItem>
                  <SelectItem value="due">Due Date</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date inputs would go here - simplified for now */}
              <p className="text-xs text-muted-foreground">
                Date range selection coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}