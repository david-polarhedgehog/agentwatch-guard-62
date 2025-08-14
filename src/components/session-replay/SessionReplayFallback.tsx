import { useMemo } from 'react';
import { useSessionMessages } from '@/hooks/useReactQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import type { SessionMapping, MessageMapping, SystemGraphNode, SystemGraphEdge } from '@/types';

interface SessionReplayFallbackProps {
  sessionId: string;
  systemGraph?: {
    graph: {
      nodes: SystemGraphNode[];
      edges: SystemGraphEdge[];
    };
  };
}

export function SessionReplayFallback({ sessionId, systemGraph }: SessionReplayFallbackProps) {
  const { data: messagesData, isLoading, error } = useSessionMessages(sessionId, 1, 50);

  // Create fallback session mapping from available data
  const fallbackMapping: SessionMapping | null = useMemo(() => {
    if (!messagesData?.messages || !systemGraph?.graph) {
      return null;
    }

    const messages = messagesData.messages;
    const userNode = systemGraph.graph.nodes.find(n => n.type === 'user');
    const agentNodes = systemGraph.graph.nodes.filter(n => n.type === 'agent');
    const primaryAgent = agentNodes[0]; // Use first agent as primary

    if (!userNode || !primaryAgent) {
      return null;
    }

    const messageMappings: MessageMapping[] = messages.map((message, index) => ({
      message_index: index,
      trace_id: message.message_id,
      source: userNode.id,
      target: primaryAgent.id,
      primary_edge: `${userNode.id} -> ${primaryAgent.id}`,
      timestamp: message.timestamp,
      user_content: message.role === 'user' ? message.content : '',
      assistant_response: message.role === 'assistant' ? message.content : '',
      tools_used: [], // Could be enhanced with tool detection
      tool_edges_used: [],
      has_tool_calls: false, // Will be enhanced with agent response data
      detections: [] // Will be derived from agent responses
    }));

    return {
      session_id: sessionId,
      agent_id: primaryAgent.id,
      message_count: messages.length,
      edges_used: [`${userNode.id} -> ${primaryAgent.id}`],
      session_mapping: {
        session_id: sessionId,
        message_mappings: messageMappings,
        communication_pattern: {
          primary_flow: `${userNode.id} -> ${primaryAgent.id}`,
          tools_involved: [],
          interaction_type: 'direct_conversation'
        }
      }
    };
  }, [messagesData, systemGraph, sessionId]);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Building session replay from available data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load session messages. Cannot create fallback replay.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!fallbackMapping) {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Insufficient data to create session replay. System graph or session messages are missing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Using fallback session replay mode. Limited functionality compared to full session mapping API.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Session Replay (Fallback Mode)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Session ID:</strong> {fallbackMapping.session_id}
              </div>
              <div>
                <strong>Agent ID:</strong> {fallbackMapping.agent_id}
              </div>
              <div>
                <strong>Messages:</strong> {fallbackMapping.message_count}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Message Flow:</h4>
              {fallbackMapping.session_mapping.message_mappings.map((mapping, index) => (
                <div key={mapping.trace_id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Message {mapping.message_index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(mapping.timestamp).toLocaleString()}
                    </span>
                    {mapping.detections.length > 0 && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                        {mapping.detections.length} violation(s)
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>User:</strong> {mapping.user_content || 'No content'}
                    </div>
                    <div>
                      <strong>Assistant:</strong> {mapping.assistant_response || 'No response'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Flow: {mapping.source} → {mapping.target}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}