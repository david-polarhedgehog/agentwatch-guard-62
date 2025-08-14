import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AgentsHeader } from '@/components/agents/AgentsHeader';
import { AgentsFilters } from '@/components/agents/AgentsFilters';
import { AgentsList } from '@/components/agents/AgentsList';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useAgents } from '@/hooks/useReactQuery';
import { useFilters } from '@/store';

export default function Agents() {
  const { filters, updateAgentFilters } = useFilters();
  const [searchQuery, setSearchQuery] = useState(filters.agents.search || '');
  
  const { data, isLoading, error } = useAgents({
    ...filters.agents,
    search: searchQuery,
    page: 1,
    per_page: 20
  });

  const handleSearch = () => {
    updateAgentFilters({ search: searchQuery });
  };

  const handleFilterToggle = () => {
    updateAgentFilters({ 
      has_violations: filters.agents.has_violations ? undefined : true 
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    updateAgentFilters({ 
      search: '', 
      has_violations: undefined 
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <LoadingSpinner text="Loading agents..." className="mt-20" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <EmptyState
            title="Failed to load agents"
            description="There was an error loading agent data."
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        </div>
      </MainLayout>
    );
  }

  const agents = data?.agents || [];

  return (
    <MainLayout>
      <AgentsHeader totalAgents={agents.length} />

      <div className="p-6 space-y-6">
        <AgentsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          hasViolationsFilter={!!filters.agents.has_violations}
          onFilterToggle={handleFilterToggle}
        />

        <AgentsList
          agents={agents}
          onClearFilters={handleClearFilters}
        />
      </div>
    </MainLayout>
  );
}