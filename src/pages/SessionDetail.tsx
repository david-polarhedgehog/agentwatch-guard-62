import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, User, Bot, Clock, AlertTriangle, Workflow, Activity } from 'lucide-react';
import { AgentInfo } from '@/types/session';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSession, useSessionMessages, useSessionGraph, useSessionDetections, useSessionViolations } from '@/hooks/useReactQuery';
import { formatDateTime } from '@/lib/utils';
import { InteractiveDotGraph } from '@/components/graphs/InteractiveDotGraph';
import { ToolCallDetail } from '@/components/sessions/ToolCallDetail';
import { SessionReplayContainer } from '@/components/session-replay/SessionReplayContainer';
import MultiAgentDashboard from '@/components/session-replay/MultiAgentDashboard';
import { useSessionReplay } from '@/hooks/useSessionReplay';
import { useAgentsDisplayInfo } from '@/hooks/useAgentNames';

// Session Replay Viewer Component
const SessionReplayViewer = ({
  sessionId,
  traceId
}: {
  sessionId: string;
  traceId?: string;
}) => {
  const {
    data: sessionData,
    isLoading,
    error
  } = useSessionReplay(sessionId);
  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">
        <LoadingSpinner text="Loading session replay..." />
      </div>;
  }
  if (error || !sessionData) {
    return <Card>
        <CardHeader>
          <CardTitle>Session Replay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Unable to load session replay data</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <MultiAgentDashboard session={sessionData} scrollToTraceId={traceId} />;
};

// Agent Graph Component - Using Real API
const AgentGraph = ({
  sessionId
}: {
  sessionId: string;
}) => {
  const {
    data: graphData,
    isLoading,
    error
  } = useSessionGraph(sessionId, 'hierarchical');

  // Debug logging
  console.log('🔍 Graph Debug:', {
    sessionId,
    graphData,
    isLoading,
    error,
    errorDetails: (error as any)?.response?.data || error?.message
  });
  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">
        <LoadingSpinner text="Loading graph..." />
      </div>;
  }
  if (error || !graphData?.content) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Agent Interaction Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Unable to load graph visualization</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <InteractiveDotGraph dotContent={graphData.content} title="Agent Interaction Graph" metadata={{
    format: graphData.format,
    layout: graphData.layout,
    node_count: graphData.metadata?.node_count,
    edge_count: graphData.metadata?.edge_count
  }} />;
};
export default function SessionDetail() {
  const {
    sessionId
  } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const traceId = searchParams.get('traceId');
  const messageIndex = searchParams.get('messageIndex');
  const [activeTab, setActiveTab] = useState('replay');

  // Clear traceId and messageIndex after initial load to allow normal event selection
  React.useEffect(() => {
    if (traceId || messageIndex) {
      const timer = setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('traceId');
        newSearchParams.delete('messageIndex');
        setSearchParams(newSearchParams, {
          replace: true
        });
      }, 5000); // Clear after 5 seconds to allow time for navigation

      return () => clearTimeout(timer);
    }
  }, [traceId, messageIndex, searchParams, setSearchParams]);

  // Use consolidated session hooks to avoid multiple /complete requests
  const {
    data: sessionResponse,
    isLoading: sessionLoading,
    error: sessionError
  } = useSession(sessionId || '');
  const {
    data: messagesData
  } = useSessionMessages(sessionId || ''); // Remove pagination to show all messages
  const {
    data: sessionDetections
  } = useSessionDetections(sessionId || '');
  const {
    data: sessionViolations
  } = useSessionViolations(sessionId || '');

  // Extract session from the API response which includes agent data
  const session = sessionResponse as any; // The API returns expanded session data

  // Extract agent IDs from session data - include all sources
  const extractInvolvedAgentIds = () => {
    const agentIds = new Set<string>();

    // Primary agent
    const primaryAgentId = session?.agent_id || session?.primary_agent_id;
    if (primaryAgentId) {
      agentIds.add(primaryAgentId);
    }

    // From agent_names field (most comprehensive)
    if (session?.agent_names) {
      Object.keys(session.agent_names).forEach(agentId => {
        agentIds.add(agentId);
      });
    }

    // From agent_responses (extract agent from response metadata)
    if (session?.agent_responses) {
      session.agent_responses.forEach((response: any) => {
        if (response.agent) {
          agentIds.add(response.agent);
        }
      });
    }

    // From chat_history metadata if available
    if (session?.chat_history) {
      session.chat_history.forEach((message: any) => {
        if (message.agent_id) {
          agentIds.add(message.agent_id);
        }
      });
    }
    return Array.from(agentIds);
  };
  const involvedAgentIds = extractInvolvedAgentIds();
  const {
    agentsDisplayInfo
  } = useAgentsDisplayInfo(involvedAgentIds);

  // Extract all involved agents from all available sources
  const extractInvolvedAgents = () => {
    const agentsMap = new Map();

    // Helper function to get display info
    const getAgentDisplayInfo = (agentId: string) => {
      // Try to get name from agent_names field first, then fallback to agent ID
      const displayName = session?.agent_names?.[agentId] || agentId;

      // Color coding for different agent types
      let className = 'cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs max-w-full';
      if (displayName.toLowerCase().includes('customer service')) {
        className = 'cursor-pointer hover:bg-purple-600 hover:text-white transition-colors text-xs max-w-full bg-purple-100 text-purple-700 border-purple-200';
      } else if (displayName.toLowerCase().includes('file system')) {
        className = 'cursor-pointer hover:bg-green-600 hover:text-white transition-colors text-xs max-w-full bg-green-100 text-green-700 border-green-200';
      }
      return {
        cleanName: displayName,
        variant: 'secondary' as const,
        className
      };
    };

    // Process all agents found in extractInvolvedAgentIds
    involvedAgentIds.forEach(agentId => {
      if (!agentsMap.has(agentId)) {
        const displayInfo = getAgentDisplayInfo(agentId);
        const agentData = {
          name: session?.agent_names?.[agentId] || displayInfo.cleanName,
          id: agentId,
          rawId: agentId,
          variant: displayInfo.variant,
          className: displayInfo.className
        };
        agentsMap.set(agentId, agentData);
      }
    });
    return Array.from(agentsMap.values());
  };
  const involvedAgents = extractInvolvedAgents();

  // Debug logging for agent information
  console.log('🔍 SessionDetail Debug:', {
    session: session,
    primaryAgentId: session?.agent_id || session?.primary_agent_id,
    involvedAgentIds,
    agentsDisplayInfo,
    involvedAgents
  });

  // Calculate actual counts
  const actualMessageCount = session?.recent_messages?.length || messagesData?.messages?.length || 0;
  const eventCount = session?.agent_responses?.length || session?.recent_messages?.length * 2 || 0; // Each message = 2 events (user + assistant)

  // Debug logging to see what we're getting
  console.log('🔍 Session Debug:', {
    session,
    actualMessageCount,
    eventCount,
    recent_messages: session?.recent_messages,
    agent_responses: session?.agent_responses?.length
  });

  // Handle loading and error states
  if (sessionLoading) {
    return <MainLayout>
        <div className="p-6">
          <LoadingSpinner text="Loading session..." className="mt-20" />
        </div>
      </MainLayout>;
  }
  if (sessionError || !session) {
    return <MainLayout>
        <ModernHeader title="Session Not Found" subtitle="The requested session could not be found">
          <Button variant="outline" onClick={() => navigate('/sessions')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
        </ModernHeader>
        <div className="p-6">
          <p className="text-muted-foreground">Session {sessionId} was not found or could not be loaded.</p>
        </div>
      </MainLayout>;
  }
  return <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Compact Combined Header with Session Info */}
        <div className="flex-shrink-0 bg-card border-b border-border p-4 mx-0 my-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold">Session {sessionId}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/sessions')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </Button>
          </div>
          
          {/* Session Overview Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="text-lg font-semibold">{actualMessageCount}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
            </div>
            
            <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors" onClick={() => setActiveTab('violations')}>
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-lg font-semibold text-destructive">{session.detection_count || 0}</div>
                <div className="text-xs text-muted-foreground">Violations</div>
              </div>
            </div>
            
            <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold">{involvedAgents.length}</div>
                <div className="text-xs text-muted-foreground">Agents</div>
              </div>
            </div>
            
            <div className="bg-background rounded-lg border border-border p-3 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{formatDateTime(session.created_at)}</div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs and Content - Fill remaining space */}
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-3 mb-3 flex-shrink-0 h-8">
              <TabsTrigger value="replay" className="text-xs py-1">Session Replay</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs py-1">Messages</TabsTrigger>
              <TabsTrigger value="violations" className="text-xs py-1">Violations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="replay" className="flex-1 min-h-0 mx-0 mt-0">
              <SessionReplayViewer sessionId={sessionId || ''} traceId={traceId || undefined} />
            </TabsContent>
            
            <TabsContent value="messages" className="flex-1 min-h-0 mx-0 mt-0 overflow-hidden">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Conversation Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-y-auto">
                  <div className="space-y-3 pb-6">
                     {messagesData?.messages?.map(message => <div key={message.message_id} className={`flex gap-3 p-3 rounded-lg border border-border`}>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
                           {message.role === 'user' ? <User className="h-3 w-3 text-primary" /> : <Bot className="h-3 w-3 text-muted-foreground" />}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <Badge variant={message.role === 'user' ? 'default' : 'secondary'} className="text-xs">
                               {message.role}
                             </Badge>
                             <span className="text-xs text-muted-foreground ml-auto">
                               {formatDateTime(message.timestamp)}
                             </span>
                           </div>
                           
                           <p className="text-sm break-words whitespace-pre-wrap">
                             {message.content || 'No content available'}
                           </p>
                         </div>
                       </div>)}
                    
                    {/* Empty state */}
                    {(!messagesData?.messages || messagesData.messages.length === 0) && <div className="text-center py-8 text-muted-foreground">
                        No messages found for this session
                      </div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="violations" className="flex-1 min-h-0 mx-0 mt-0 overflow-hidden">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4" />
                    Security Violations
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-y-auto">
                  <div className="space-y-3">
                    {(sessionViolations?.detections || sessionDetections?.detections)?.map((detection: any) => {
                    // Ensure we have a valid detection ID for navigation
                    const detectionId = detection.id || detection.detection_id || detection.violation_id;
                    console.log('Violation detection:', {
                      detection,
                      detectionId
                    });
                    return <div key={detectionId || `detection-${Math.random()}`} className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors" onClick={() => {
                      if (detectionId) {
                        navigate(`/violations?violationId=${detectionId}`);
                      } else {
                        console.error('No valid detection ID found for navigation:', detection);
                      }
                    }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-destructive/10">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive" className="text-xs">
                              {detection.detection_type?.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {detection.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDateTime(detection.created_at)}
                            </span>
                          </div>
                          
                          
                          
                          {detection.matches && detection.matches.length > 0 && <div className="mt-2 flex flex-wrap gap-1">
                              {detection.matches.slice(0, 3).map((match: string, idx: number) => <Badge key={idx} variant="outline" className="text-xs font-mono">
                                  "{match}"
                                </Badge>)}
                              {detection.matches.length > 3 && <Badge variant="outline" className="text-xs">
                                  +{detection.matches.length - 3} more
                                </Badge>}
                            </div>}
                        </div>
                      </div>;
                  })}
                    
                    {!sessionViolations?.detections && !sessionDetections?.detections || (sessionViolations?.detections || []).length === 0 && (sessionDetections?.detections || []).length === 0 ? <div className="text-sm text-muted-foreground text-center py-4">
                        No violations detected in this session
                      </div> : null}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>;
}