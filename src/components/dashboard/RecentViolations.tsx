import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRecentViolations } from '@/hooks/useReactQuery';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getCompleteSession } from '@/lib/sessionApi';

interface RecentViolationsProps {
  limit?: number;
}

export function RecentViolations({ limit = 5 }: RecentViolationsProps) {
  const navigate = useNavigate();
  const { data: violations, isLoading, error } = useRecentViolations(limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-critical" />
            Recent Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading violations..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-critical" />
            Recent Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load violations"
            description="There was an error loading recent violations."
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-critical" />
          Recent Violations
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/violations')}
          className="text-sm"
        >
          View all
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="pt-0">
        {!violations || violations.length === 0 ? (
          <EmptyState
            title="No recent violations"
            description="No security violations detected in the last 24 hours."
          />
        ) : (
          <div className="space-y-3">
            {violations.map((violation) => (
              <ViolationItem key={violation.id} violation={violation} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Separate component for each violation item to handle individual session data fetching
function ViolationItem({ violation }: { violation: any }) {
  const navigate = useNavigate();
  
  // Fetch session data for this violation to get the message content
  const { data: sessionData } = useQuery({
    queryKey: ['violation-session', violation.session_id],
    queryFn: () => getCompleteSession(violation.session_id),
    enabled: !!violation.session_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Find the related message based on message_index
  const relatedMessage = sessionData?.chat_history?.find((msg, index) => 
    violation?.message_index !== undefined && index === violation.message_index
  );

  const getMessageContent = () => {
    if (!relatedMessage) return null;
    
    // Determine if it's user or assistant content based on context
    if (violation.context === 'user_message' || violation.context === 'user') {
      return relatedMessage.role === 'user' ? relatedMessage.content : null;
    } else {
      // Default to assistant response for most violations
      return relatedMessage.role === 'assistant' ? relatedMessage.content : 
             sessionData?.agent_responses?.find(r => r.request_id === relatedMessage?.request_id)?.response;
    }
  };

  const messageContent = getMessageContent();

  return (
    <div
      className="flex gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/violations/${violation.id}`)}
    >
      <div className="flex-shrink-0 pt-0.5">
        <SeverityBadge 
          severity={violation.severity as any} 
          showIcon={true}
          size="sm"
        />
      </div>
      
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-foreground capitalize">
            {violation.detection_type.replace(/_/g, ' ')}
          </p>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {violation.session_id.slice(0, 11)}...
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {violation.context || 'assistant_response'}
        </p>
        
        {/* Message content */}
        {messageContent && (
          <div className="bg-muted/30 border border-border/50 p-2 rounded text-xs">
            <p className="text-muted-foreground line-clamp-2">
              {messageContent.length > 150 ? `${messageContent.slice(0, 150)}...` : messageContent}
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1">
          {violation.matches?.map((match, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs font-mono">
              {match.length > 15 ? `${match.slice(0, 15)}...` : match}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="flex-shrink-0 text-xs text-muted-foreground self-start pt-0.5">
        {formatRelativeTime(violation.created_at)}
      </div>
    </div>
  );
}