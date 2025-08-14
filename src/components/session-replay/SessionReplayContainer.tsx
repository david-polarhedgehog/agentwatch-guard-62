import { useMemo, useState, useCallback, useEffect } from 'react';
import { SystemArchitectureGraph } from './SystemArchitectureGraph';
import { SessionMessages } from './SessionMessages';

import { SessionReplayFallback } from './SessionReplayFallback';
import { useSystemGraph, useSessionMapping } from '@/hooks/useReactQuery';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import type { 
  SystemGraphNode, 
  SystemGraphEdge, 
  TimelineEvent, 
  MessageMapping, 
  SystemGraph,
  SessionMapping 
} from '@/types';

interface SessionReplayContainerProps {
  sessionId: string;
}

export function SessionReplayContainer({ sessionId }: SessionReplayContainerProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [highlightedEdges, setHighlightedEdges] = useState<string[]>([]);

  // Fetch data
  const { data: systemGraphData, isLoading: systemLoading, error: systemError } = useSystemGraph();
  const { data: sessionMappingData, isLoading: sessionLoading, error: sessionError } = useSessionMapping(sessionId);

  // Build correlation maps
  const { nodeMap, edgeMap } = useMemo(() => {
    if (!systemGraphData?.data?.graph) {
      return { nodeMap: new Map(), edgeMap: new Map() };
    }

    const systemGraph = systemGraphData.data as SystemGraph;
    
    const nodeMap = new Map<string, SystemGraphNode>();
    systemGraph.graph.nodes.forEach(node => nodeMap.set(node.id, node));
    
    const edgeMap = new Map<string, SystemGraphEdge>();
    systemGraph.graph.edges.forEach(edge => {
      const edgeKey = `${edge.source} -> ${edge.target}`;
      edgeMap.set(edgeKey, edge);
    });

    return { nodeMap, edgeMap };
  }, [systemGraphData]);

  // Build timeline with graph correlation
  const timeline: TimelineEvent[] = useMemo(() => {
    if (!sessionMappingData?.data?.session_mapping?.message_mappings) {
      return [];
    }

    const sessionMapping = sessionMappingData.data as SessionMapping;
    
    return sessionMapping.session_mapping.message_mappings.map((mapping: MessageMapping) => ({
      messageIndex: mapping.message_index,
      timestamp: new Date(mapping.timestamp),
      userContent: mapping.user_content,
      assistantResponse: mapping.assistant_response,
      
      // Graph correlation
      sourceNode: nodeMap.get(mapping.source),
      targetNode: nodeMap.get(mapping.target),
      primaryEdge: edgeMap.get(mapping.primary_edge),
      
      // Tool correlations
      toolsUsed: mapping.tools_used.map(toolName => {
        const toolNodeId = `${mapping.target}_${toolName}`;
        return nodeMap.get(toolNodeId);
      }).filter(Boolean) as SystemGraphNode[],
      
      // Tool edges used
      toolEdges: mapping.tool_edges_used.map(edgeKey => edgeMap.get(edgeKey)).filter(Boolean) as SystemGraphEdge[],
      
      // Security detections
      detections: mapping.detections || [],
      hasDetections: (mapping.detections || []).length > 0
    }));
  }, [sessionMappingData, nodeMap, edgeMap]);

  // Event click handler with edge direction highlighting
  const handleEventClick = useCallback((event: TimelineEvent, index: number) => {
    setCurrentEventIndex(index);
    
    // Highlight nodes involved in this communication
    const nodesToHighlight = [
      event.sourceNode?.id,
      event.targetNode?.id,
      ...event.toolsUsed.map(tool => tool?.id)
    ].filter(Boolean) as string[];
    
    // Determine edge direction based on event type
    let edgesToHighlight: string[] = [];
    
    if (event.type === 'request' && event.primaryEdge) {
      // User request: highlight edge from user to agent (normal direction)
      edgesToHighlight = [`${event.primaryEdge.source} -> ${event.primaryEdge.target}`];
    } else if (event.type === 'response' && event.primaryEdge) {
      // Assistant response: highlight edge from agent to user (reverse direction)
      edgesToHighlight = [`${event.primaryEdge.target} -> ${event.primaryEdge.source}`];
    } else if (event.primaryEdge) {
      // Default case: use original edge direction for backward compatibility
      edgesToHighlight = [`${event.primaryEdge.source} -> ${event.primaryEdge.target}`];
    }
    
    // Add tool edges (these always maintain their original direction)
    edgesToHighlight.push(...event.toolEdges.map(edge => `${edge.source} -> ${edge.target}`));
    
    setHighlightedNodes(nodesToHighlight);
    setHighlightedEdges(edgesToHighlight);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    // Find events that involve this node
    const relatedEvents = timeline
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => 
        event.sourceNode?.id === nodeId || 
        event.targetNode?.id === nodeId ||
        event.toolsUsed.some(tool => tool?.id === nodeId)
      );
    
    if (relatedEvents.length > 0) {
      const { event, index } = relatedEvents[0];
      handleEventClick(event, index);
    }
  }, [timeline, handleEventClick]);

  // Handle edge click
  const handleEdgeClick = useCallback((edgeKey: string) => {
    // Find events that use this edge
    const relatedEvents = timeline
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => {
        const primaryEdgeKey = event.primaryEdge ? 
          `${event.primaryEdge.source} -> ${event.primaryEdge.target}` : null;
        const toolEdgeKeys = event.toolEdges.map(edge => 
          `${edge.source} -> ${edge.target}`
        );
        
        return primaryEdgeKey === edgeKey || toolEdgeKeys.includes(edgeKey);
      });
    
    if (relatedEvents.length > 0) {
      const { event, index } = relatedEvents[0];
      handleEventClick(event, index);
    }
  }, [timeline, handleEventClick]);

  // Loading state
  if (systemLoading || sessionLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading session replay..." />
      </div>
    );
  }

  // System error - can't proceed without system graph
  if (systemError) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system architecture graph. Session replay requires the system graph to function.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Session mapping error - use fallback mode
  if (sessionError) {
    const is404Error = (sessionError as any).response?.status === 404;
    
    if (is404Error && systemGraphData?.data?.graph) {
      // Use fallback mode when session mapping API doesn't exist but system graph is available
      return (
        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Session mapping API not available. Using fallback mode with limited functionality.
            </AlertDescription>
          </Alert>
          <SessionReplayFallback 
            sessionId={sessionId} 
            systemGraph={systemGraphData.data as SystemGraph}
          />
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load session mapping data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!systemGraphData?.data?.graph) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No system graph data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If session mapping data is missing but no error, also use fallback
  if (!sessionMappingData?.data) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Session mapping data not available. Using fallback mode.
          </AlertDescription>
        </Alert>
        <SessionReplayFallback 
          sessionId={sessionId} 
          systemGraph={systemGraphData.data as SystemGraph}
        />
      </div>
    );
  }

  const systemGraph = systemGraphData.data as SystemGraph;

  return (
    <div className="h-screen flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph - Main Feature */}
        <div className="flex-1 p-4">
          <SystemArchitectureGraph
            nodes={systemGraph.graph.nodes}
            edges={systemGraph.graph.edges}
            highlightedNodes={highlightedNodes}
            highlightedEdges={highlightedEdges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </div>
        
        {/* Session Messages - Right Sidebar */}
        <div className="w-80 border-l bg-background/50">
          <SessionMessages
            timeline={timeline}
            currentEventIndex={currentEventIndex}
            onEventClick={handleEventClick}
          />
        </div>
      </div>
    </div>
  );
}