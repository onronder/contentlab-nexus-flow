import React, { useState } from 'react';
import { Search, History, X, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdvancedProjectFilters } from '@/hooks/useAdvancedProjectFilters';

interface AdvancedSearchDialogProps {
  filters: AdvancedProjectFilters;
  onFiltersChange: (filters: AdvancedProjectFilters) => void;
  searchHistory: string[];
  onSearchFromHistory: (query: string) => void;
  onClearHistory: () => void;
}

const searchFields = [
  { value: 'name', label: 'Project Name' },
  { value: 'description', label: 'Description' },
  { value: 'industry', label: 'Industry' },
  { value: 'targetMarket', label: 'Target Market' },
  { value: 'tags', label: 'Tags' }
];

const searchOperators = [
  {
    key: 'exact' as const,
    label: 'Exact phrase',
    description: 'Search for exact phrases using quotes'
  },
  {
    key: 'wildcard' as const,
    label: 'Wildcard',
    description: 'Use * for wildcard matching'
  },
  {
    key: 'caseSensitive' as const,
    label: 'Case sensitive',
    description: 'Match exact case'
  }
];

export function AdvancedSearchDialog({
  filters,
  onFiltersChange,
  searchHistory,
  onSearchFromHistory,
  onClearHistory
}: AdvancedSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(filters.search.query);
  const [localFields, setLocalFields] = useState(filters.search.fields);
  const [localOperators, setLocalOperators] = useState(filters.search.operators);

  const handleApplySearch = () => {
    onFiltersChange({
      ...filters,
      search: {
        query: localQuery,
        fields: localFields,
        operators: localOperators
      }
    });
    setOpen(false);
  };

  const handleFieldToggle = (field: string, checked: boolean) => {
    setLocalFields(prev => 
      checked 
        ? [...prev, field]
        : prev.filter(f => f !== field)
    );
  };

  const handleOperatorToggle = (operator: keyof typeof localOperators, checked: boolean) => {
    setLocalOperators(prev => ({
      ...prev,
      [operator]: checked
    }));
  };

  const handleHistoryClick = (query: string) => {
    setLocalQuery(query);
    onSearchFromHistory(query);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Advanced Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Project Search
          </DialogTitle>
          <DialogDescription>
            Configure advanced search options to find projects more precisely
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Search Query */}
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Enter your search terms..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Search Fields */}
            <div className="space-y-3">
              <Label>Search In Fields</Label>
              <div className="grid grid-cols-2 gap-2">
                {searchFields.map((field) => (
                  <div key={field.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.value}`}
                      checked={localFields.includes(field.value)}
                      onCheckedChange={(checked) => 
                        handleFieldToggle(field.value, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`field-${field.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Search Operators */}
            <div className="space-y-3">
              <Label>Search Options</Label>
              <div className="space-y-2">
                {searchOperators.map((operator) => (
                  <div key={operator.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`operator-${operator.key}`}
                      checked={localOperators[operator.key]}
                      onCheckedChange={(checked) => 
                        handleOperatorToggle(operator.key, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`operator-${operator.key}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      {operator.label}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{operator.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Recent Searches
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearHistory}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Clear History
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((query, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-muted-foreground/20 transition-colors"
                        onClick={() => handleHistoryClick(query)}
                      >
                        {query}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Search Tips */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <Label className="text-sm font-semibold">Search Tips:</Label>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use quotes for exact phrases: "mobile app"</li>
                <li>• Use * for wildcards: tech* matches technology, technical, etc.</li>
                <li>• Combine multiple fields for broader searches</li>
                <li>• Use case-sensitive search for precise matching</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplySearch}
            disabled={localFields.length === 0}
          >
            Apply Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}