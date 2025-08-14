import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, X } from 'lucide-react';
import { useTeamContext } from '@/contexts/TeamContext';

interface FilterState {
  search?: string;
  status?: string;
  type?: string;
  industry?: string;
  dateRange?: { start: Date; end: Date };
}

interface TeamDataFilterProps {
  filterType: 'projects' | 'content' | 'competitors';
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

export function TeamDataFilter({ filterType, onFiltersChange, className }: TeamDataFilterProps) {
  const { currentTeam } = useTeamContext();
  const [filters, setFilters] = useState<FilterState>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  const getStatusOptions = () => {
    switch (filterType) {
      case 'projects':
        return [
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'on_hold', label: 'On Hold' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' }
        ];
      case 'content':
        return [
          { value: 'draft', label: 'Draft' },
          { value: 'review', label: 'In Review' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' }
        ];
      case 'competitors':
        return [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'monitoring', label: 'Monitoring' }
        ];
      default:
        return [];
    }
  };

  const getTypeOptions = () => {
    switch (filterType) {
      case 'projects':
        return [
          { value: 'competitive_analysis', label: 'Competitive Analysis' },
          { value: 'market_research', label: 'Market Research' },
          { value: 'brand_monitoring', label: 'Brand Monitoring' },
          { value: 'content_strategy', label: 'Content Strategy' }
        ];
      case 'content':
        return [
          { value: 'blog_post', label: 'Blog Post' },
          { value: 'social_media', label: 'Social Media' },
          { value: 'video', label: 'Video' },
          { value: 'infographic', label: 'Infographic' },
          { value: 'report', label: 'Report' }
        ];
      case 'competitors':
        return [
          { value: 'direct', label: 'Direct' },
          { value: 'indirect', label: 'Indirect' },
          { value: 'substitute', label: 'Substitute' }
        ];
      default:
        return [];
    }
  };

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'automotive', label: 'Automotive' }
  ];

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key as keyof FilterState]).length;

  if (!currentTeam) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Team Data Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={`Search ${filterType}...`}
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => clearFilter('search')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status || ''}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {getStatusOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {filterType === 'projects' ? 'Project Type' : 
             filterType === 'content' ? 'Content Type' : 'Competitive Tier'}
          </label>
          <Select
            value={filters.type || ''}
            onValueChange={(value) => updateFilter('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {getTypeOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={filters.industry || ''}
                onValueChange={(value) => updateFilter('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All industries</SelectItem>
                  {industryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Search: {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => clearFilter('search')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Status: {getStatusOptions().find(o => o.value === filters.status)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => clearFilter('status')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              {filters.type && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Type: {getTypeOptions().find(o => o.value === filters.type)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => clearFilter('type')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              {filters.industry && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Industry: {industryOptions.find(o => o.value === filters.industry)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => clearFilter('industry')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}