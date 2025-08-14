import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AgentsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  hasViolationsFilter: boolean;
  onFilterToggle: () => void;
}

export function AgentsFilters({
  searchQuery,
  onSearchChange,
  onSearch,
  hasViolationsFilter,
  onFilterToggle
}: AgentsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          variant={hasViolationsFilter ? "default" : "outline"}
          size="sm"
          onClick={onFilterToggle}
        >
          <Filter className="mr-2 h-4 w-4" />
          With Violations
        </Button>
        
        <Button variant="outline" size="sm" onClick={onSearch}>
          Search
        </Button>
      </div>
    </div>
  );
}