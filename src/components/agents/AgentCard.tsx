import { Bot, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { EntityBadge } from '@/components/ui/entity-badge';
import { Button } from '@/components/ui/button';
import { useAgentTools, useAgentViolationCount } from '@/hooks/useReactQuery';
import { formatRelativeTime, truncateText } from '@/lib/utils';
import { useAgentDisplayInfo } from '@/hooks/useAgentNames';
interface AgentCardProps {
  agent: any;
  onClick: () => void;
}
export function AgentCard({
  agent,
  onClick
}: AgentCardProps) {
  const { data: toolsData } = useAgentTools(agent.agent_id);
  const { data: violationData } = useAgentViolationCount(agent.agent_id);
  const navigate = useNavigate();
  const {
    displayName,
    navigationId,
    isLoading: nameLoading
  } = useAgentDisplayInfo(agent.agent_id);

  // Use API data for violations if available, otherwise fallback to agent data
  const violationCount = violationData?.count ?? agent.violation_count ?? 0;
  const hasViolations = violationCount > 0;
  const maxSeverity = violationData?.severity_breakdown?.high > 0 ? 'high' : 
                     violationData?.severity_breakdown?.medium > 0 ? 'medium' : 
                     violationData?.severity_breakdown?.low > 0 ? 'low' : 
                     agent.max_severity || 'low';
  return <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border hover:border-primary/30" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-agent-blue/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-agent-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium truncate">
                {displayName || agent.agent_name || 'Loading...'}
              </h3>
              
            </div>
          </div>
          
          {hasViolations && <SeverityBadge severity={maxSeverity} size="sm" />}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* System Prompt Preview */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">System Prompt</p>
          <p className="text-sm line-clamp-3 text-foreground">
            {truncateText(agent.system_prompt, 120)}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Tools</p>
            <p className="font-medium">
              {Object.keys(agent.tool_functions).length}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground">Sessions</p>
            <p className="font-medium">{agent.session_ids.length}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground">Messages</p>
            <p className="font-medium">{agent.message_count}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-muted-foreground">Violations</p>
            <div className="flex items-center gap-2">
              <p className={`font-medium ${hasViolations ? 'text-severity-high' : 'text-muted-foreground'}`}>
                {violationCount}
              </p>
              {hasViolations && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive/80" 
                  onClick={e => {
                    e.stopPropagation();
                    navigate(`/violations?agent_id=${navigationId}`);
                  }}
                >
                  <AlertTriangle className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Available Tools */}
        {toolsData?.tools && toolsData.tools.length > 0 && <div>
            <p className="text-xs text-muted-foreground mb-2">Available Tools</p>
            <div className="flex flex-wrap gap-1">
              {toolsData.tools.slice(0, 3).map((tool: any) => <EntityBadge key={tool.name} type="tool" label={tool.name} size="sm" />)}
              {toolsData.tools.length > 3 && <EntityBadge type="tool" label={`+${toolsData.tools.length - 3} more`} size="sm" />}
            </div>
          </div>}
        
        {/* Last Activity */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last activity</span>
            <span>{formatRelativeTime(agent.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>;
}