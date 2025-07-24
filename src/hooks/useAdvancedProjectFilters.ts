import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Project } from '@/types/projects';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface AdvancedProjectFilters {
  status: string[];
  priority: string[];
  industry: string[];
  projectType: string[];
  teamFilter: {
    type: 'all' | 'owned' | 'member' | 'no_team' | 'specific_member';
    memberId?: string;
  };
  dateRanges: {
    created?: DateRange;
    updated?: DateRange;
    due?: DateRange;
  };
  search: {
    query: string;
    fields: string[];
    operators: {
      exact: boolean;
      wildcard: boolean;
      caseSensitive: boolean;
    };
  };
}

export interface QuickDateFilter {
  label: string;
  value: string;
  getDates: () => DateRange;
}

const quickDateFilters: QuickDateFilter[] = [
  {
    label: 'Last 7 days',
    value: 'last_7_days',
    getDates: () => ({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date()
    })
  },
  {
    label: 'Last 30 days',
    value: 'last_30_days',
    getDates: () => ({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    })
  },
  {
    label: 'Last 3 months',
    value: 'last_3_months',
    getDates: () => ({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date()
    })
  },
  {
    label: 'This year',
    value: 'this_year',
    getDates: () => ({
      from: new Date(new Date().getFullYear(), 0, 1),
      to: new Date()
    })
  }
];

const defaultFilters: AdvancedProjectFilters = {
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
};

export function useAdvancedProjectFilters(currentUserId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('project-search-history');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize filters from URL params
  const [filters, setFilters] = useState<AdvancedProjectFilters>(() => {
    const urlFilters = { ...defaultFilters };
    
    // Parse URL parameters
    const status = searchParams.get('status');
    if (status) urlFilters.status = status.split(',');
    
    const priority = searchParams.get('priority');
    if (priority) urlFilters.priority = priority.split(',');
    
    const industry = searchParams.get('industry');
    if (industry) urlFilters.industry = industry.split(',');
    
    const projectType = searchParams.get('type');
    if (projectType) urlFilters.projectType = projectType.split(',');
    
    const search = searchParams.get('search');
    if (search) urlFilters.search.query = search;
    
    const teamFilter = searchParams.get('team');
    if (teamFilter) {
      const [type, memberId] = teamFilter.split(':');
      urlFilters.teamFilter = {
        type: type as any,
        memberId: memberId || undefined
      };
    }

    // Parse date ranges
    const createdFrom = searchParams.get('created_from');
    const createdTo = searchParams.get('created_to');
    if (createdFrom || createdTo) {
      urlFilters.dateRanges.created = {
        from: createdFrom ? new Date(createdFrom) : undefined,
        to: createdTo ? new Date(createdTo) : undefined
      };
    }

    const updatedFrom = searchParams.get('updated_from');
    const updatedTo = searchParams.get('updated_to');
    if (updatedFrom || updatedTo) {
      urlFilters.dateRanges.updated = {
        from: updatedFrom ? new Date(updatedFrom) : undefined,
        to: updatedTo ? new Date(updatedTo) : undefined
      };
    }

    const dueFrom = searchParams.get('due_from');
    const dueTo = searchParams.get('due_to');
    if (dueFrom || dueTo) {
      urlFilters.dateRanges.due = {
        from: dueFrom ? new Date(dueFrom) : undefined,
        to: dueTo ? new Date(dueTo) : undefined
      };
    }

    return urlFilters;
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.status.length) params.set('status', filters.status.join(','));
    if (filters.priority.length) params.set('priority', filters.priority.join(','));
    if (filters.industry.length) params.set('industry', filters.industry.join(','));
    if (filters.projectType.length) params.set('type', filters.projectType.join(','));
    if (filters.search.query) params.set('search', filters.search.query);
    
    if (filters.teamFilter.type !== 'all') {
      const teamParam = filters.teamFilter.memberId 
        ? `${filters.teamFilter.type}:${filters.teamFilter.memberId}`
        : filters.teamFilter.type;
      params.set('team', teamParam);
    }

    // Add date range parameters
    if (filters.dateRanges.created?.from) {
      params.set('created_from', filters.dateRanges.created.from.toISOString());
    }
    if (filters.dateRanges.created?.to) {
      params.set('created_to', filters.dateRanges.created.to.toISOString());
    }
    if (filters.dateRanges.updated?.from) {
      params.set('updated_from', filters.dateRanges.updated.from.toISOString());
    }
    if (filters.dateRanges.updated?.to) {
      params.set('updated_to', filters.dateRanges.updated.to.toISOString());
    }
    if (filters.dateRanges.due?.from) {
      params.set('due_from', filters.dateRanges.due.from.toISOString());
    }
    if (filters.dateRanges.due?.to) {
      params.set('due_to', filters.dateRanges.due.to.toISOString());
    }

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Save search to history
  const saveSearchToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('project-search-history', JSON.stringify(newHistory));
  }, [searchHistory]);

  // Filter projects based on current filters
  const filterProjects = useCallback((projects: Project[]): Project[] => {
    return projects.filter(project => {
      // Status filter
      if (filters.status.length && !filters.status.includes(project.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length && !filters.priority.includes(project.priority)) {
        return false;
      }

      // Industry filter
      if (filters.industry.length && !filters.industry.includes(project.industry)) {
        return false;
      }

      // Project type filter
      if (filters.projectType.length && !filters.projectType.includes(project.projectType)) {
        return false;
      }

      // Team filter
      if (filters.teamFilter.type !== 'all' && currentUserId) {
        switch (filters.teamFilter.type) {
          case 'owned':
            if (project.createdBy !== currentUserId) return false;
            break;
          case 'member':
            if (project.createdBy === currentUserId) return false;
            break;
          case 'no_team':
            if (project.teamMemberCount > 1) return false;
            break;
          // Note: 'specific_member' would require additional data
        }
      }

      // Date range filters
      if (filters.dateRanges.created?.from && project.createdAt < filters.dateRanges.created.from) {
        return false;
      }
      if (filters.dateRanges.created?.to && project.createdAt > filters.dateRanges.created.to) {
        return false;
      }
      if (filters.dateRanges.updated?.from && project.updatedAt < filters.dateRanges.updated.from) {
        return false;
      }
      if (filters.dateRanges.updated?.to && project.updatedAt > filters.dateRanges.updated.to) {
        return false;
      }
      if (filters.dateRanges.due?.from && project.targetEndDate && project.targetEndDate < filters.dateRanges.due.from) {
        return false;
      }
      if (filters.dateRanges.due?.to && project.targetEndDate && project.targetEndDate > filters.dateRanges.due.to) {
        return false;
      }

      // Search filter
      if (filters.search.query.trim()) {
        const query = filters.search.operators.caseSensitive 
          ? filters.search.query.trim()
          : filters.search.query.trim().toLowerCase();

        const searchableText = filters.search.fields
          .map(field => {
            const value = project[field as keyof Project] as string || '';
            return filters.search.operators.caseSensitive ? value : value.toLowerCase();
          })
          .join(' ');

        if (filters.search.operators.exact) {
          if (!searchableText.includes(`"${query}"`)) return false;
        } else if (filters.search.operators.wildcard) {
          const regex = new RegExp(query.replace(/\*/g, '.*'), filters.search.operators.caseSensitive ? '' : 'i');
          if (!regex.test(searchableText)) return false;
        } else {
          if (!searchableText.includes(query)) return false;
        }
      }

      return true;
    });
  }, [filters, currentUserId]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.status.length;
    count += filters.priority.length;
    count += filters.industry.length;
    count += filters.projectType.length;
    count += filters.teamFilter.type !== 'all' ? 1 : 0;
    count += filters.dateRanges.created ? 1 : 0;
    count += filters.dateRanges.updated ? 1 : 0;
    count += filters.dateRanges.due ? 1 : 0;
    count += filters.search.query.trim() ? 1 : 0;
    return count;
  }, [filters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Update individual filter
  const updateFilter = useCallback((key: keyof AdvancedProjectFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Apply quick date filter
  const applyQuickDateFilter = useCallback((quickFilter: QuickDateFilter, dateType: 'created' | 'updated' | 'due') => {
    const dateRange = quickFilter.getDates();
    setFilters(prev => ({
      ...prev,
      dateRanges: {
        ...prev.dateRanges,
        [dateType]: dateRange
      }
    }));
  }, []);

  // Get unique values for filter options
  const getFilterOptions = useCallback((projects: Project[]) => {
    const uniqueIndustries = Array.from(new Set(projects.map(p => p.industry))).sort();
    const uniqueProjectTypes = Array.from(new Set(projects.map(p => p.projectType))).sort();
    
    // Calculate project counts per filter
    const industryCounts = uniqueIndustries.map(industry => ({
      value: industry,
      label: industry,
      count: projects.filter(p => p.industry === industry).length
    }));
    
    const projectTypeCounts = uniqueProjectTypes.map(type => ({
      value: type,
      label: type,
      count: projects.filter(p => p.projectType === type).length
    }));

    return {
      industries: industryCounts,
      projectTypes: projectTypeCounts,
      statusOptions: [
        { value: 'planning', label: 'Planning', count: projects.filter(p => p.status === 'planning').length },
        { value: 'active', label: 'Active', count: projects.filter(p => p.status === 'active').length },
        { value: 'paused', label: 'Paused', count: projects.filter(p => p.status === 'paused').length },
        { value: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
        { value: 'archived', label: 'Archived', count: projects.filter(p => p.status === 'archived').length }
      ],
      priorityOptions: [
        { value: 'low', label: 'Low', count: projects.filter(p => p.priority === 'low').length },
        { value: 'medium', label: 'Medium', count: projects.filter(p => p.priority === 'medium').length },
        { value: 'high', label: 'High', count: projects.filter(p => p.priority === 'high').length }
      ]
    };
  }, []);

  return {
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
  };
}