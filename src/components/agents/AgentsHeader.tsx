import { ModernHeader } from '@/components/layout/ModernHeader';

interface AgentsHeaderProps {
  totalAgents: number;
}

export function AgentsHeader({ totalAgents }: AgentsHeaderProps) {
  return (
    <ModernHeader 
      title="AI Agents" 
      subtitle={`${totalAgents} agents monitored`}
      showCreateButton={true}
      createButtonText="Add Agent"
    />
  );
}