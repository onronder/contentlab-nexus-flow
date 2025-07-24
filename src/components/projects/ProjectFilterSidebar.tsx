import React, { useState, useMemo } from 'react';
import { X, Calendar, Filter, RefreshCw, Search, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Project } from '@/types/projects';
import { AdvancedProjectFilters, DateRange, QuickDateFilter } from '@/hooks/useAdvancedProjectFilters';

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface ProjectFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedProjectFilters;
  onFiltersChange: (filters: AdvancedProjectFilters) => void;
  projects: Project[];
  activeFilterCount: number;
  quickDateFilters: QuickDateFilter[];
  onApplyQuickDateFilter: (filter: QuickDateFilter, dateType: 'created' | 'updated' | 'due') => void;
  filterOptions: {
    industries: FilterOption[];
    projectTypes: FilterOption[];
    statusOptions: FilterOption[];
    priorityOptions: FilterOption[];
  };
  currentUserId?: string;
}

export function ProjectFilterSidebar({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  projects,
  activeFilterCount,
  quickDateFilters,
  onApplyQuickDateFilter,
  filterOptions,
  currentUserId
}: ProjectFilterSidebarProps) {
  const [industrySearch, setIndustrySearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const projectTypeLabels: Record<string, string> = {
    competitive_analysis: 'Competitive Analysis',
    market_research: 'Market Research',
    brand_monitoring: 'Brand Monitoring',
    content_strategy: 'Content Strategy',
    seo_analysis: 'SEO Analysis'
  };

  const teamFilterOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'owned', label: 'Projects I Own' },
    { value: 'member', label: 'Projects I\'m Member Of' },
    { value: 'no_team', label: 'Solo Projects' }
  ];

  // Filter industries based on search
  const filteredIndustries = useMemo(() => {
    return filterOptions.industries.filter(industry =>
      industry.value.toLowerCase().includes(industrySearch.toLowerCase())
    );
  }, [filterOptions.industries, industrySearch]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const handleTeamFilterChange = (type: string) => {
    onFiltersChange({
      ...filters,
      teamFilter: { type: type as any }
    });
  };

  const handleDateRangeChange = (dateType: 'created' | 'updated' | 'due', range: DateRange) => {
    onFiltersChange({
      ...filters,
      dateRanges: {
        ...filters.dateRanges,
        [dateType]: range
      }
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      priority: [],
      industry: [],
      projectType: [],
      teamFilter: { type: 'all' },
      dateRanges: {},
      search: {
        query: '',
        fields: ['name', 'description', 'industry'],
        operators: {
          exact: false,
          wildcard: false,
          caseSensitive: false
        }
      }
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
        
        <ScrollArea className="h-[calc(100vh-8rem)] lg:h-auto">
          <CardContent className="space-y-4 p-4">
            {/* Status Filter */}
            <Collapsible
              open={!collapsedSections.status}
              onOpenChange={() => toggleSection('status')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                  </span>
                  {collapsedSections.status ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {filterOptions.statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
                    <Badge variant="outline" className="text-xs">
                      {option.count}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Priority Filter */}
            <Collapsible
              open={!collapsedSections.priority}
              onOpenChange={() => toggleSection('priority')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Priority
                  </span>
                  {collapsedSections.priority ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {filterOptions.priorityOptions.map((option) => (
                  <div key={option.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
                    <Badge variant="outline" className="text-xs">
                      {option.count}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Team Filter */}
            <Collapsible
              open={!collapsedSections.team}
              onOpenChange={() => toggleSection('team')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team
                  </span>
                  {collapsedSections.team ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <Select
                  value={filters.teamFilter.type}
                  onValueChange={handleTeamFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Industry Filter */}
            <Collapsible
              open={!collapsedSections.industry}
              onOpenChange={() => toggleSection('industry')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Industry
                  </span>
                  {collapsedSections.industry ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                  <Input
                    placeholder="Search industries..."
                    value={industrySearch}
                    onChange={(e) => setIndustrySearch(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {filteredIndustries.map((industry) => (
                      <div key={industry.value} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`industry-${industry.value}`}
                            checked={filters.industry.includes(industry.value)}
                            onCheckedChange={(checked) => 
                              handleIndustryChange(industry.value, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`industry-${industry.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {industry.value}
                          </Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {industry.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Project Type Filter */}
            <Collapsible
              open={!collapsedSections.projectType}
              onOpenChange={() => toggleSection('projectType')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Project Type
                  </span>
                  {collapsedSections.projectType ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {filterOptions.projectTypes.map((type) => (
                  <div key={type.value} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={filters.projectType.includes(type.value)}
                        onCheckedChange={(checked) => 
                          handleProjectTypeChange(type.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`type-${type.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {projectTypeLabels[type.value] || type.value}
                      </Label>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {type.count}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Date Range Filters */}
            <Collapsible
              open={!collapsedSections.dateRanges}
              onOpenChange={() => toggleSection('dateRanges')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Ranges
                  </span>
                  {collapsedSections.dateRanges ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                {/* Quick Date Filters */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Quick Filters</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {quickDateFilters.map((filter) => (
                      <Button
                        key={filter.value}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => onApplyQuickDateFilter(filter, 'created')}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Created Date Range */}
                <DateRangeSelector
                  label="Created"
                  value={filters.dateRanges.created}
                  onChange={(range) => handleDateRangeChange('created', range)}
                />

                {/* Updated Date Range */}
                <DateRangeSelector
                  label="Updated"
                  value={filters.dateRanges.updated}
                  onChange={(range) => handleDateRangeChange('updated', range)}
                />

                {/* Due Date Range */}
                <DateRangeSelector
                  label="Due"
                  value={filters.dateRanges.due}
                  onChange={(range) => handleDateRangeChange('due', range)}
                />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

// Date Range Selector Component
interface DateRangeSelectorProps {
  label: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
}

function DateRangeSelector({
  label,
  value,
  onChange
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      onChange({
        from: range.from,
        to: range.to
      });
    }
  };

  const handleClear = () => {
    onChange({});
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!value?.from && !value?.to) return `Select ${label.toLowerCase()} range`;
    if (value.from && value.to) {
      return `${format(value.from, 'MMM dd')} - ${format(value.to, 'MMM dd')}`;
    }
    if (value.from) {
      return `From ${format(value.from, 'MMM dd')}`;
    }
    if (value.to) {
      return `Until ${format(value.to, 'MMM dd')}`;
    }
    return `Select ${label.toLowerCase()} range`;
  };

  const hasValue = value?.from || value?.to;

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label} Date</Label>
      <div className="flex gap-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal text-xs h-8",
                !hasValue && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-3 w-3" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={{
                from: value?.from,
                to: value?.to
              }}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {hasValue && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}