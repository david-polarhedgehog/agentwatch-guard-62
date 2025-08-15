
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield, Clock, User, Bot, ExternalLink } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDateTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { detectionsApi, sessionsApi } from '@/lib/api';

export default function ViolationDetail() {
  const { violationId } = useParams();
  const navigate = useNavigate();

  // Fetch violation details including mitigation suggestions
  const { data: violationDetailsData, isLoading, error } = useQuery({
    queryKey: ['violation-details', violationId],
    queryFn: () => detectionsApi.getViolationDetails(Number(violationId!)),
    retry: false,
    enabled: !!violationId,
  });

  const violation = violationDetailsData?.violation;

  // Fetch complete session data
  const { data: completeSessionData } = useQuery({
    queryKey: ['session-complete', violation?.session_id],
    queryFn: () => violation?.session_id ? sessionsApi.getComplete(violation.session_id) : null,
    enabled: !!violation?.session_id,
  });

  // Find the related message - improved logic with multiple fallback methods
  const findRelatedMessage = () => {
    if (!completeSessionData?.chat_history || !violation) return null;
    
    const chatHistory = completeSessionData.chat_history;
    
    // Method 1: Find by message_id (most reliable)
    if (violation.message_id) {
      const messageById = chatHistory.find(msg => msg.message_id === violation.message_id);
      if (messageById) return messageById;
    }
    
    // Method 2: Find by request_id
    if (violation.request_id) {
      const messageByRequestId = chatHistory.find(msg => msg.request_id === violation.request_id);
      if (messageByRequestId) return messageByRequestId;
    }
    
    // Method 3: Find by message_index
    if (violation.message_index !== undefined && violation.message_index >= 0) {
      const messageByIndex = chatHistory[violation.message_index];
      if (messageByIndex) return messageByIndex;
    }
    
    // Method 4: Find user message that contains any of the violation matches
    if (violation.matches && violation.matches.length > 0) {
      const messageByContent = chatHistory.find(msg => 
        msg.role === 'user' && 
        violation.matches.some(match => msg.content.toLowerCase().includes(match.toLowerCase()))
      );
      if (messageByContent) return messageByContent;
    }
    
    return null;
  };

  // Find the related assistant response
  const findRelatedResponse = () => {
    if (!completeSessionData?.agent_responses || !violation) return null;
    
    const agentResponses = completeSessionData.agent_responses;
    
    // Find response by request_id or response_id
    if (violation.request_id) {
      const responseByRequestId = agentResponses.find(resp => resp.request_id === violation.request_id);
      if (responseByRequestId) return responseByRequestId;
    }
    
    if (violation.response_id) {
      const responseByResponseId = agentResponses.find(resp => resp.response_id === violation.response_id);
      if (responseByResponseId) return responseByResponseId;
    }
    
    return null;
  };

  const relatedMessage = findRelatedMessage();
  const relatedResponse = findRelatedResponse();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <LoadingSpinner text="Loading violation..." className="mt-20" />
        </div>
      </MainLayout>
    );
  }

  if (error || !violation) {
    return (
      <MainLayout>
        <ModernHeader 
          title={`Violation #${violationId}`}
          subtitle="Violation details"
        >
          <Button 
            variant="outline" 
            onClick={() => navigate('/violations')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Violations
          </Button>
        </ModernHeader>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {error ? 'Failed to load violation details. This violation may not exist.' : 'Violation not found.'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/violations')}
                className="mt-4"
              >
                Back to Violations
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'text-status-critical';
      case 'medium':
        return 'text-status-medium';
      case 'low':
        return 'text-status-low';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <ModernHeader 
        title={`Violation #${violationId}`}
        subtitle={violation ? `${violation.detection_type.replace(/_/g, ' ').toUpperCase()} • ${violation.severity.toUpperCase()} severity` : 'Loading...'}
      >
        <Button 
          variant="outline" 
          onClick={() => navigate('/violations')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Violations
        </Button>
      </ModernHeader>
      
      <div className="p-6 space-y-6 max-w-full overflow-hidden">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${getSeverityColor(violation.severity)}`} />
                <span className="text-sm font-medium">Severity</span>
              </div>
              <div className="mt-1">
                <SeverityBadge severity={violation.severity} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Type</span>
              </div>
              <p className="text-sm font-medium mt-1 capitalize truncate">
                {violation.detection_type.replace(/_/g, ' ')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Session</span>
              </div>
              <Button
                variant="link"
                onClick={() => navigate(`/sessions/${violation.session_id}`)}
                className="text-sm font-mono mt-1 p-0 h-auto justify-start text-left hover:text-primary truncate max-w-full"
              >
                <span className="truncate">{violation.session_id.slice(0, 15)}...</span>
                <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
              </Button>
              {completeSessionData?.primary_agent_id && (
                <Button
                  variant="link"
                  onClick={() => navigate(`/agents/${completeSessionData.primary_agent_id}`)}
                  className="text-xs font-mono p-0 h-auto justify-start text-left hover:text-primary mt-1 truncate max-w-full"
                >
                  <span className="truncate">View Agent</span>
                  <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Detected</span>
              </div>
              <p className="text-sm mt-1 truncate">
                {formatDateTime(violation.created_at)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Context and Description */}
        <Card>
          <CardHeader>
            <CardTitle>Violation Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {violation.violation_description || violation.context}
            </p>
          </CardContent>
        </Card>

        {/* Mitigation Suggestion */}
        {violation.mitigation_suggestion && (
          <Card>
            <CardHeader>
              <CardTitle>Mitigation Suggestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(violation.mitigation_suggestion).map(([key, suggestions]) => (
                <div key={key} className="border rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-3 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <div className="grid gap-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Code Suggestion
                      </span>
                      <p className="text-sm mt-1">
                        {(suggestions as any).code_suggestion}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Configuration Suggestion
                      </span>
                      <p className="text-sm mt-1">
                        {(suggestions as any).configuration_suggestion}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Active Guardrails
                      </span>
                      <p className="text-sm mt-1">
                        {(suggestions as any).active_guardrails}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Detected Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">
                  {relatedMessage?.content || 'Original message not found. This may be due to incomplete session data or correlation issues.'}
                </p>
                {relatedMessage && (
                  <div className="mt-3 pt-3 border-t border-red-200/50 text-xs text-muted-foreground">
                    <span className="truncate inline-block max-w-full">Message ID: {relatedMessage.message_id}</span>
                    {relatedMessage.timestamp && (
                      <span className="ml-4 truncate inline-block max-w-full">Time: {formatDateTime(relatedMessage.timestamp)}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Assistant Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">
                  {relatedResponse?.response || 'Assistant response not available for this violation.'}
                </p>
                {relatedResponse && (
                  <div className="mt-3 pt-3 border-t border-green-200/50 text-xs text-muted-foreground">
                    <span className="truncate inline-block max-w-full">Response ID: {relatedResponse.response_id}</span>
                    {relatedResponse.timestamp && (
                      <span className="ml-4 truncate inline-block max-w-full">Time: {formatDateTime(relatedResponse.timestamp)}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detected Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Detected Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
              {violation.matches.map((match, idx) => (
                <Badge 
                  key={idx} 
                  variant="destructive" 
                  className="font-mono break-all max-w-full"
                >
                  "{match}"
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="min-w-0">
                <span className="text-muted-foreground">Violation ID:</span>
                <p className="font-mono truncate">{violation.id}</p>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Trace ID:</span>
                <p className="font-mono truncate" title={violation.trace_id}>{violation.trace_id}</p>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Session ID:</span>
                <p className="font-mono truncate" title={violation.session_id}>{violation.session_id}</p>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Agent ID:</span>
                <p className="font-mono truncate" title={completeSessionData?.primary_agent_id || 'Not available'}>{completeSessionData?.primary_agent_id || 'Not available'}</p>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Message ID:</span>
                <p className="font-mono truncate" title={violation.message_id || 'Not available'}>{violation.message_id || 'Not available'}</p>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Request ID:</span>
                <p className="font-mono truncate" title={violation.request_id || 'Not available'}>{violation.request_id || 'Not available'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
