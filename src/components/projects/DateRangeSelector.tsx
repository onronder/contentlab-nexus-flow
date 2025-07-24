import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from '@/hooks/useAdvancedProjectFilters';

interface DateRangeSelectorProps {
  label: string;
  value?: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({
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