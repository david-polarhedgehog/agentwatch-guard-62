import { Bot } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';

interface AgentsListProps {
  agents: any[];
  onClearFilters: () => void;
}

export function AgentsList({ agents, onClearFilters }: AgentsListProps) {
  const navigate = useNavigate();

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No agents found"
        description="No AI agents match your current filters."
        action={{
          label: "Clear filters",
          onClick: onClearFilters
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.agent_id}
          agent={agent}
          onClick={() => navigate(`/agents/${agent.agent_id}`)}
        />
      ))}
    </div>
  );
}