import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useViolationDetails } from '@/hooks/useReactQuery';
import { formatDateTime } from '@/lib/utils';
import type { Detection } from '@/types';
import { useAgentDisplayInfo } from '@/hooks/useAgentNames';

interface ViolationRowProps {
  violation: Detection;
  getSeverityBadge: (severity: string) => React.ReactNode;
  isHighlighted?: boolean;
}

export function ViolationRow({ 
  violation, 
  getSeverityBadge, 
  isHighlighted = false
}: ViolationRowProps) {
  const navigate = useNavigate();
  const { data: violationDetails } = useViolationDetails(violation.id);
  
  // Get agent display info - try violation data first, then fallback to violation details
  const agentId = violation.agent_id || violationDetails?.agent_info?.agent_id || violationDetails?.session_info?.agent_id;
  const agentName = violation.agent_name || violationDetails?.agent_info?.agent_name;
  const { displayName: agentDisplayName, navigationId: agentNavigationId } = useAgentDisplayInfo(agentId);

  const handleAgentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agentNavigationId) {
      navigate(`/agents/${agentNavigationId}`);
    }
  };

  const handleSessionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionId = violationDetails?.session_info?.session_id || violation.session_id;
    if (sessionId) {
      navigate(`/sessions/${sessionId}`);
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionId = violationDetails?.session_info?.session_id || violation.session_id;
    const traceId = violation.trace_id;
    const messageIndex = violation.message_index;
    
    if (sessionId && traceId) {
      // Navigate to session with specific trace_id to scroll to correct event
      navigate(`/sessions/${sessionId}?traceId=${traceId}`);
    } else if (sessionId && messageIndex !== undefined) {
      // Use message_index if trace_id is not available
      navigate(`/sessions/${sessionId}?messageIndex=${messageIndex}`);
    } else if (sessionId) {
      // Fallback to just session navigation
      navigate(`/sessions/${sessionId}`);
    }
  };

  // Get the display values with better fallbacks
  const sessionId = violationDetails?.session_info?.session_id || violation.session_id;
  const messageId = violation.trace_id;

  return (
    <TableRow 
      className={`hover:bg-muted/50 cursor-pointer transition-colors ${
        isHighlighted ? 'bg-primary/10 border-primary/20' : ''
      }`}
      onClick={() => navigate(`/violations/${violation.id}`)}
    >
      <TableCell className="font-mono text-sm text-muted-foreground">
        #{violation.id}
      </TableCell>
      <TableCell className="font-medium">
        {violation.detection_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Violation'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          {sessionId ? (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={handleSessionClick}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {sessionId.slice(0, 8)}...
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Session: N/A
            </Badge>
          )}
          <span className="text-muted-foreground">→</span>
          {agentId ? (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-agent-blue/10 transition-colors"
              onClick={handleAgentClick}
            >
              <Bot className="h-3 w-3 mr-1" />
              {agentName || agentDisplayName || agentId.slice(0, 12) + '...'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Bot className="h-3 w-3 mr-1" />
              N/A
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {messageId ? (
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-green-50 transition-colors"
            onClick={handleMessageClick}
          >
            <Hash className="h-3 w-3 mr-1" />
            {messageId.slice(0, 8)}...
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Message: N/A
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateTime(violation.created_at)}
      </TableCell>
      <TableCell>
        {getSeverityBadge(violation.severity || 'medium')}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {violation.violation_confidence ? violation.violation_confidence.toFixed(2) : 'N/A'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}