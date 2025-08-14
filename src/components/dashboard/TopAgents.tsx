import { Bot, ExternalLink, MessageSquare, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAgents } from '@/hooks/useReactQuery';
import { useNavigate } from 'react-router-dom';
import { formatNumber, truncateText } from '@/lib/utils';
import { useAgentsDisplayInfo } from '@/hooks/useAgentNames';

interface TopAgentsProps {
  limit?: number;
}

export function TopAgents({ limit = 5 }: TopAgentsProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAgents({ 
    sort_by: 'message_count', 
    sort_order: 'desc',
    per_page: limit 
  });

  // Get agent display names
  const agentIds = data?.agents?.map(agent => agent.agent_id) || [];
  const { agentsDisplayInfo, isLoading: namesLoading } = useAgentsDisplayInfo(agentIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-agent-blue" />
            Top Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading agents..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-agent-blue" />
            Top Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load agents"
            description="There was an error loading agent data."
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const agents = data?.agents || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-agent-blue" />
          Top Active Agents
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/agents')}
        >
          View all
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {agents.length === 0 ? (
          <EmptyState
            title="No agents found"
            description="No AI agents have been detected yet."
          />
        ) : (
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <div
                key={agent.agent_id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/agents/${agent.agent_id}`)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-agent-blue/10 text-agent-blue font-mono text-sm">
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground">
                        {agentsDisplayInfo[agent.agent_id]?.displayName || agent.agent_name || 'Loading...'}
                      </p>
                      {agent.has_violations && (
                        <SeverityBadge 
                          severity={agent.max_severity || 'low'} 
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {agent.agent_id}
                    </p>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {truncateText(agent.system_prompt, 100)}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{formatNumber(agent.message_count)} messages</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        <span>{agent.session_ids.length} sessions</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span>{Object.keys(agent.tool_functions).length} tools</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {agent.violation_count && agent.violation_count > 0 && (
                  <div className="flex items-center gap-1 text-severity-high">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {agent.violation_count}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}