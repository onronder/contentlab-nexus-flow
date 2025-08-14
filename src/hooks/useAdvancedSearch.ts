import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useCurrentUserId } from './useCurrentUserId';
import { 
  advancedSearchService,
  SearchFilters,
  SearchResult,
  VisualSearchResult,
  SavedSearch
} from '@/services/advancedSearchService';

export interface SearchConfig {
  query: string;
  filters: SearchFilters;
  limit?: number;
  offset?: number;
}

export const useAdvancedSearch = () => {
  const { toast } = useToast();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  
  const [searchConfig, setSearchConfig] = useState<SearchConfig>({
    query: '',
    filters: {},
    limit: 50,
    offset: 0
  });
  
  const [isSearching, setIsSearching] = useState(false);

  // Main content search
  const contentSearchQuery = useQuery({
    queryKey: ['contentSearch', searchConfig],
    queryFn: async () => {
      if (!searchConfig.query.trim() && Object.keys(searchConfig.filters).length === 0) {
        return [];
      }
      
      setIsSearching(true);
      try {
        const results = await advancedSearchService.searchContent(
          searchConfig.query,
          'current-project-id', // This would come from context
          searchConfig.filters,
          searchConfig.limit,
          searchConfig.offset
        );
        return results;
      } finally {
        setIsSearching(false);
      }
    },
    enabled: false, // Manual trigger
    staleTime: 30000 // Results valid for 30 seconds
  });

  // Visual similarity search
  const visualSearchMutation = useMutation({
    mutationFn: async ({
      referenceImageId,
      projectId,
      threshold = 0.8,
      limit = 20
    }: {
      referenceImageId: string;
      projectId: string;
      threshold?: number;
      limit?: number;
    }) => {
      return advancedSearchService.searchSimilarImages(
        referenceImageId,
        projectId,
        threshold,
        limit
      );
    },
    onError: (error: any) => {
      toast({
        title: "Visual search failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Content recommendations
  const recommendationsQuery = useQuery({
    queryKey: ['contentRecommendations', userId],
    queryFn: () => {
      if (!userId) return [];
      return advancedSearchService.getContentRecommendations(
        userId,
        'current-project-id', // This would come from context
        10
      );
    },
    enabled: !!userId,
    staleTime: 300000 // Results valid for 5 minutes
  });

  // Saved searches
  const savedSearchesQuery = useQuery({
    queryKey: ['savedSearches', userId],
    queryFn: () => {
      if (!userId) return [];
      return advancedSearchService.getSavedSearches(userId);
    },
    enabled: !!userId
  });

  const saveSearchMutation = useMutation({
    mutationFn: async ({
      name,
      description
    }: {
      name: string;
      description?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');
      
      return advancedSearchService.saveSearch(
        name,
        searchConfig.query,
        searchConfig.filters,
        userId,
        description
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      toast({
        title: "Search saved",
        description: "Your search has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save search",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteSavedSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      if (!userId) throw new Error('User not authenticated');
      return advancedSearchService.deleteSavedSearch(searchId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      toast({
        title: "Search deleted",
        description: "Saved search has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete search",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Search methods
  const performSearch = useCallback((newConfig: Partial<SearchConfig>) => {
    const updatedConfig = { ...searchConfig, ...newConfig, offset: 0 };
    setSearchConfig(updatedConfig);
    contentSearchQuery.refetch();
  }, [searchConfig, contentSearchQuery]);

  const loadMoreResults = useCallback(() => {
    const newOffset = (searchConfig.offset || 0) + (searchConfig.limit || 50);
    setSearchConfig(prev => ({ ...prev, offset: newOffset }));
    contentSearchQuery.refetch();
  }, [searchConfig, contentSearchQuery]);

  const clearSearch = useCallback(() => {
    setSearchConfig({
      query: '',
      filters: {},
      limit: 50,
      offset: 0
    });
    queryClient.removeQueries({ queryKey: ['contentSearch'] });
  }, [contentSearchQuery]);

  const updateQuery = useCallback((query: string) => {
    setSearchConfig(prev => ({ ...prev, query, offset: 0 }));
  }, []);

  const updateFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
      offset: 0
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchConfig(prev => ({ ...prev, filters: {}, offset: 0 }));
  }, []);

  const applyFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setSearchConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      offset: 0
    }));
  }, []);

  const removeFilter = useCallback((key: keyof SearchFilters) => {
    setSearchConfig(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[key];
      return { ...prev, filters: newFilters, offset: 0 };
    });
  }, []);

  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setSearchConfig({
      query: savedSearch.query,
      filters: savedSearch.filters,
      limit: 50,
      offset: 0
    });
    contentSearchQuery.refetch();
  }, [contentSearchQuery]);

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return Object.keys(searchConfig.filters).length > 0;
  }, [searchConfig.filters]);

  const hasSearchQuery = useMemo(() => {
    return searchConfig.query.trim().length > 0;
  }, [searchConfig.query]);

  const canLoadMore = useMemo(() => {
    const results = contentSearchQuery.data || [];
    return results.length >= (searchConfig.limit || 50) && !contentSearchQuery.isFetching;
  }, [contentSearchQuery.data, contentSearchQuery.isFetching, searchConfig.limit]);

  const searchSummary = useMemo(() => {
    const resultCount = contentSearchQuery.data?.length || 0;
    const hasQuery = hasSearchQuery;
    const hasFilters = hasActiveFilters;
    
    if (hasQuery && hasFilters) {
      return `Found ${resultCount} results for "${searchConfig.query}" with filters applied`;
    } else if (hasQuery) {
      return `Found ${resultCount} results for "${searchConfig.query}"`;
    } else if (hasFilters) {
      return `Found ${resultCount} results with filters applied`;
    } else {
      return `${resultCount} items`;
    }
  }, [contentSearchQuery.data, hasSearchQuery, hasActiveFilters, searchConfig.query]);

  return {
    // Search state
    searchConfig,
    isSearching: isSearching || contentSearchQuery.isFetching,
    results: contentSearchQuery.data || [],
    error: contentSearchQuery.error,
    
    // Visual search
    visualSearch: visualSearchMutation.mutate,
    visualSearchResults: visualSearchMutation.data || [],
    isVisualSearching: visualSearchMutation.isPending,
    
    // Recommendations
    recommendations: recommendationsQuery.data || [],
    isLoadingRecommendations: recommendationsQuery.isFetching,
    
    // Saved searches
    savedSearches: savedSearchesQuery.data || [],
    saveSearch: saveSearchMutation.mutate,
    deleteSavedSearch: deleteSavedSearchMutation.mutate,
    isSavingSearch: saveSearchMutation.isPending,
    
    // Search actions
    performSearch,
    loadMoreResults,
    clearSearch,
    updateQuery,
    updateFilters,
    clearFilters,
    applyFilter,
    removeFilter,
    loadSavedSearch,
    
    // Computed state
    hasActiveFilters,
    hasSearchQuery,
    canLoadMore,
    searchSummary,
    
    // Status flags
    isEmpty: !contentSearchQuery.data || contentSearchQuery.data.length === 0,
    isInitialLoad: contentSearchQuery.isLoading,
    hasError: !!contentSearchQuery.error
  };
};

// Hook for quick search functionality
export const useQuickSearch = (projectId: string) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const quickSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await advancedSearchService.searchContent(
        searchQuery,
        projectId,
        {},
        10 // Limit for quick search
      );
      setResults(searchResults);
    } catch (error) {
      console.error('Quick search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [projectId]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (newQuery.trim()) {
      quickSearch(newQuery);
    } else {
      setResults([]);
    }
  }, [quickSearch]);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return {
    query,
    results,
    isSearching,
    updateQuery,
    clearResults,
    performQuickSearch: quickSearch
  };
};