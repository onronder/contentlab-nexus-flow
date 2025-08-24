import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  Filter, 
  Calendar, 
  FileType, 
  Tag, 
  Star, 
  Archive, 
  Eye,
  ChevronDown,
  X,
  Save,
  History
} from 'lucide-react';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { SearchFilters } from '@/services/advancedSearchService';
import { cn } from '@/lib/utils';

interface AdvancedSearchPanelProps {
  projectId: string;
  className?: string;
  onResultsChange?: (results: any[]) => void;
}

export const AdvancedSearchPanel = ({ projectId, className, onResultsChange }: AdvancedSearchPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilterSections, setActiveFilterSections] = useState<Set<string>>(new Set(['basic']));
  
  const {
    searchConfig,
    isSearching,
    results,
    performSearch,
    updateQuery,
    updateFilters,
    clearFilters,
    applyFilter,
    removeFilter,
    hasActiveFilters,
    hasSearchQuery,
    searchSummary,
    savedSearches,
    saveSearch,
    loadSavedSearch
  } = useAdvancedSearch(projectId);

  const toggleFilterSection = (section: string) => {
    const newSections = new Set(activeFilterSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setActiveFilterSections(newSections);
  };

  const handleSearch = () => {
    performSearch({});
    onResultsChange?.(results);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    applyFilter(key, value);
    if (hasSearchQuery || hasActiveFilters) {
      performSearch({});
    }
  };

  const contentTypes = [
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'document', label: 'Documents' },
    { value: 'social', label: 'Social Media' },
    { value: 'blog_post', label: 'Blog Posts' },
    { value: 'presentation', label: 'Presentations' },
    { value: 'infographic', label: 'Infographics' },
    { value: 'podcast', label: 'Podcasts' },
    { value: 'ebook', label: 'eBooks' },
    { value: 'whitepaper', label: 'Whitepapers' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Under Review' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' }
  ];

  const storageTiers = [
    { value: 'hot', label: 'Hot (Frequently Accessed)' },
    { value: 'warm', label: 'Warm (Occasionally Accessed)' },
    { value: 'cold', label: 'Cold (Rarely Accessed)' },
    { value: 'archive', label: 'Archive (Long-term Storage)' }
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Advanced Search
            </CardTitle>
            <CardDescription>
              Find content with powerful filters and AI-powered recommendations
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {isExpanded ? 'Simple' : 'Advanced'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Search Input */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content by title, description, or tags..."
              value={searchConfig.query}
              onChange={(e) => updateQuery(e.target.value)}
              className="pl-10"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              size="sm"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            
            {(hasActiveFilters || hasSearchQuery) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
              >
                Clear All
              </Button>
            )}
            
            {savedSearches.length > 0 && (
              <Select onValueChange={(value) => {
                const saved = savedSearches.find(s => s.id === value);
                if (saved) loadSavedSearch(saved);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Saved" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(searchConfig.filters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                
                return (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeFilter(key as keyof SearchFilters)} 
                    />
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Basic Filters */}
            <Collapsible 
              open={activeFilterSections.has('basic')}
              onOpenChange={() => toggleFilterSection('basic')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                <div className="flex items-center gap-2">
                  <FileType className="h-4 w-4" />
                  <span className="font-medium">Content Type & Status</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2 pl-6">
                <div className="space-y-2">
                  <Label>Content Types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {contentTypes.map((type) => (
                      <label key={type.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={searchConfig.filters.contentTypes?.includes(type.value) || false}
                          onChange={(e) => {
                            const current = searchConfig.filters.contentTypes || [];
                            const updated = e.target.checked
                              ? [...current, type.value]
                              : current.filter(t => t !== type.value);
                            handleFilterChange('contentTypes', updated);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((status) => (
                      <label key={status.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={searchConfig.filters.status?.includes(status.value) || false}
                          onChange={(e) => {
                            const current = searchConfig.filters.status || [];
                            const updated = e.target.checked
                              ? [...current, status.value]
                              : current.filter(s => s !== status.value);
                            handleFilterChange('status', updated);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Date & Size Filters */}
            <Collapsible 
              open={activeFilterSections.has('datesize')}
              onOpenChange={() => toggleFilterSection('datesize')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Date & Size</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2 pl-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={searchConfig.filters.dateRange?.start.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const start = new Date(e.target.value);
                        const end = searchConfig.filters.dateRange?.end || new Date();
                        handleFilterChange('dateRange', { start, end });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={searchConfig.filters.dateRange?.end.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const end = new Date(e.target.value);
                        const start = searchConfig.filters.dateRange?.start || new Date(0);
                        handleFilterChange('dateRange', { start, end });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>File Size Range (MB)</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[
                        (searchConfig.filters.sizeRange?.min || 0) / (1024 * 1024),
                        (searchConfig.filters.sizeRange?.max || 100 * 1024 * 1024) / (1024 * 1024)
                      ]}
                      onValueChange={([min, max]) => {
                        handleFilterChange('sizeRange', {
                          min: min * 1024 * 1024,
                          max: max * 1024 * 1024
                        });
                      }}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{((searchConfig.filters.sizeRange?.min || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>{((searchConfig.filters.sizeRange?.max || 100 * 1024 * 1024) / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Quality & AI Filters */}
            <Collapsible 
              open={activeFilterSections.has('quality')}
              onOpenChange={() => toggleFilterSection('quality')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span className="font-medium">Quality & AI Features</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2 pl-6">
                <div className="space-y-2">
                  <Label>Content Quality Score</Label>
                  <Slider
                    value={[
                      searchConfig.filters.qualityScore?.min || 0,
                      searchConfig.filters.qualityScore?.max || 1
                    ]}
                    onValueChange={([min, max]) => {
                      handleFilterChange('qualityScore', { min, max });
                    }}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{(searchConfig.filters.qualityScore?.min || 0).toFixed(1)}</span>
                    <span>{(searchConfig.filters.qualityScore?.max || 1).toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={searchConfig.filters.hasAITags || false}
                      onCheckedChange={(checked) => handleFilterChange('hasAITags', checked)}
                    />
                    <Label>Has AI-generated tags</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={searchConfig.filters.hasDuplicates || false}
                      onCheckedChange={(checked) => handleFilterChange('hasDuplicates', checked)}
                    />
                    <Label>Has duplicate variants</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Storage Tier</Label>
                  <Select
                    value={searchConfig.filters.storageTier?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('storageTier', value ? [value] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All tiers</SelectItem>
                      {storageTiers.map((tier) => (
                        <SelectItem key={tier.value} value={tier.value}>
                          {tier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Search Results Summary */}
        {(hasSearchQuery || hasActiveFilters) && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{searchSummary}</p>
              {(hasSearchQuery || hasActiveFilters) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => saveSearch({ name: 'Untitled Search' })}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Search
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};