import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FilterTag {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onRemove: () => void;
}

interface SearchWithFiltersProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  filters?: FilterTag[];
}

export const SearchWithFilters = React.forwardRef<HTMLInputElement, SearchWithFiltersProps>(
  ({ placeholder, value, onChange, className, filters = [], ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle keyboard events for filter deletion
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && value === '' && filters.length > 0) {
        // Remove the last filter when backspace is pressed and input is empty
        filters[filters.length - 1].onRemove();
      }
    };

    // Focus the input when container is clicked
    const handleContainerClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn(
          "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "cursor-text",
          className
        )}
        onClick={handleContainerClick}
      >
        <Search className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
        
        {/* Filter Tags */}
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant="secondary"
            className="mr-2 font-mono text-xs h-6 flex items-center gap-1"
          >
            {filter.icon}
            <span>{filter.label}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                filter.onRemove();
              }}
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 shrink-0 flex items-center justify-center rounded-sm hover:text-destructive transition-colors"
              type="button"
              aria-label="Remove filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          className={cn(
            "flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            "min-w-0" // Allows input to shrink
          )}
          placeholder={filters.length === 0 ? placeholder : ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </div>
    );
  }
);

SearchWithFilters.displayName = "SearchWithFilters";