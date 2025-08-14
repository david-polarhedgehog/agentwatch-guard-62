import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ProcessedEvent } from '@/types/session';
import { getAgentColorClass } from '@/utils/sessionProcessor';

interface MultiAgentFlowProps {
  events: ProcessedEvent[];
  currentEventIndex: number;
}

// Session Replay Language - Defines the visual grammar for representing session flows
interface SessionConnection {
  type: 'user-outer' | 'outer-actual' | 'agent-tool' | 'response-chain';
  from: string;
  to: string;
  events: Array<{ index: number; type: string; direction?: 'forward' | 'backward' }>;
  isBidirectional: boolean;
}

interface SessionFlowState {
  outerAgents: Set<string>;
  actualAgents: Set<string>;
  toolCalls: Set<string>;
  connections: Map<string, SessionConnection>;
}

const MultiAgentFlowComponent: React.FC<MultiAgentFlowProps> = ({ events, currentEventIndex }) => {
  const { fitView } = useReactFlow();
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Session Flow State Machine - Analyzes events to build logical flow representation
  const sessionFlowState = useMemo((): SessionFlowState => {
    const state: SessionFlowState = {
      outerAgents: new Set(),
      actualAgents: new Set(),
      toolCalls: new Set(),
      connections: new Map(),
    };

    // Filter out violation events for graph state calculations - they should only be visual indicators
    const nonViolationEvents = events.filter(event => event.type !== 'violation');

    // Phase 1: Identify agent roles and tool calls
    const handoffMap = new Map<string, string>(); // actual -> outer mapping
    
    nonViolationEvents.forEach((event, index) => {
      if (event.type === 'handoff' && event.details) {
        const { from_agent, to_agent } = event.details;
        state.outerAgents.add(from_agent);
        state.actualAgents.add(to_agent);
        handoffMap.set(to_agent, from_agent);
      } else if (event.type === 'tool_call' && event.details?.tool_name) {
        state.toolCalls.add(event.details.tool_name);
      } else if (event.type === 'user_message' || event.type === 'agent_response') {
        // If agent isn't marked as actual, it's likely an outer agent
        if (event.agent !== 'User' && !state.actualAgents.has(event.agent)) {
          state.outerAgents.add(event.agent);
        }
      }
    });

    // Phase 2: Build logical connections based on session flow grammar
    const addConnection = (type: SessionConnection['type'], from: string, to: string, eventIndex: number, eventType: string, direction?: 'forward' | 'backward') => {
      const key = `${from}-${to}`;
      const reverseKey = `${to}-${from}`;
      
      // Check if bidirectional connection already exists
      const existingKey = state.connections.has(key) ? key : 
                         state.connections.has(reverseKey) ? reverseKey : key;
      
      if (state.connections.has(existingKey)) {
        state.connections.get(existingKey)!.events.push({ index: eventIndex, type: eventType, direction });
      } else {
        state.connections.set(existingKey, {
          type,
          from,
          to,
          events: [{ index: eventIndex, type: eventType, direction }],
          isBidirectional: type === 'user-outer' || type === 'outer-actual',
        });
      }
    };

    // Phase 3: Process events in sequence to establish connections
    nonViolationEvents.forEach((event, index) => {
      switch (event.type) {
        case 'user_message':
          // User -> Outer Agent (forward direction)
          const nextAgentResponse = nonViolationEvents.slice(index + 1).find(e => e.type === 'agent_response');
          if (nextAgentResponse) {
            const outerAgent = handoffMap.get(nextAgentResponse.agent) || nextAgentResponse.agent;
            addConnection('user-outer', 'User', outerAgent, index, 'user_message', 'forward');
          }
          break;

        case 'handoff':
          if (event.details) {
            // Outer Agent -> Actual Agent (forward direction)
            addConnection('outer-actual', event.details.from_agent, event.details.to_agent, index, 'handoff', 'forward');
          }
          break;

        case 'tool_call':
          if (event.details?.tool_name) {
            // Agent -> Tool (unidirectional, no return)
            const toolKey = `${event.agent}-${event.details.tool_name}`;
            state.connections.set(toolKey, {
              type: 'agent-tool',
              from: event.agent,
              to: event.details.tool_name,
              events: [{ index, type: 'tool_call' }],
              isBidirectional: false,
            });
          }
          break;

        case 'agent_response':
          // Response follows the reverse path: Actual Agent -> Outer Agent -> User
          const outerAgent = handoffMap.get(event.agent);
          if (outerAgent) {
            // Actual Agent -> Outer Agent (backward direction)
            addConnection('outer-actual', outerAgent, event.agent, index, 'agent_response', 'backward');
            // Outer Agent -> User (backward direction)
            addConnection('user-outer', 'User', outerAgent, index, 'agent_response', 'backward');
          } else {
            // Direct response: Agent -> User (backward direction)
            addConnection('user-outer', 'User', event.agent, index, 'agent_response', 'backward');
          }
          break;
      }
    });

    return state;
  }, [events]);

  // Create nodes and edges based on the session flow state
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const allAgents = new Set([
      'User',
      ...sessionFlowState.outerAgents,
      ...sessionFlowState.actualAgents,
      ...sessionFlowState.toolCalls,
    ]);

    // Enhanced layout with logical grouping
    const nodePositions: Record<string, { x: number; y: number }> = {
      'User': { x: 600, y: 50 },
      'Customer Service Agent': { x: 300, y: 200 },
      'File System Agent': { x: 100, y: 400 },
      'Web Search Agent': { x: 500, y: 400 },
      'Summarizer Agent': { x: 900, y: 400 },
      // Tool positions (lower tier)
      'write_file': { x: 50, y: 600 },
      'read_file': { x: 200, y: 600 },
      'search_files': { x: 350, y: 600 },
      'search_web': { x: 500, y: 600 },
      'web_search': { x: 650, y: 600 },
      'summarize': { x: 800, y: 600 },
    };

    // Position unknown agents in a grid
    let unknownAgentX = 150;
    let unknownAgentY = 750;
    let agentsInRow = 0;
    const maxAgentsPerRow = 4;
    
    Array.from(allAgents).forEach(agent => {
      if (!nodePositions[agent]) {
        nodePositions[agent] = { x: unknownAgentX, y: unknownAgentY };
        unknownAgentX += 200;
        agentsInRow++;
        
        if (agentsInRow >= maxAgentsPerRow) {
          unknownAgentX = 150;
          unknownAgentY += 150;
          agentsInRow = 0;
        }
      }
    });

    // Create nodes with proper categorization
    const nodes: Node[] = Array.from(allAgents).map((agent) => {
      const colorClass = getAgentColorClass(agent);
      const isActive = events.slice(0, currentEventIndex + 1).some(e => 
        e.agent === agent || e.details?.tool_name === agent
      );
      
      // Check if this agent has violations in current session
      const hasViolations = events.some(e => 
        (e.agent === agent || e.details?.tool_name === agent) && 
        e.detections && e.detections.length > 0
      );
      
      // Check if this node is selected and has violations for special glow effect
      const isSelected = selectedNodeId === agent;
      const shouldGlow = isSelected && hasViolations;
      
      // Determine node category for styling
      let nodeCategory = 'default';
      if (agent === 'User') nodeCategory = 'user';
      else if (sessionFlowState.outerAgents.has(agent)) nodeCategory = 'outer-agent';
      else if (sessionFlowState.actualAgents.has(agent)) nodeCategory = 'actual-agent';
      else if (sessionFlowState.toolCalls.has(agent)) nodeCategory = 'tool';
      
      return {
        id: agent,
        type: 'default',
        position: nodePositions[agent] || { x: 400, y: 400 },
        data: { 
          label: agent,
          category: nodeCategory,
        },
        style: {
          backgroundColor: `hsl(var(--${colorClass}))`,
          color: `hsl(var(--${colorClass}-foreground))`,
          border: '2px solid',
          borderColor: hasViolations ? 'hsl(var(--destructive))' : isActive ? `hsl(var(--${colorClass}))` : `hsl(var(--muted))`,
          opacity: isActive ? 1 : 0.6,
          fontWeight: isActive ? 'bold' : 'normal',
          boxShadow: shouldGlow 
            ? '0 0 20px hsl(var(--destructive) / 0.6), 0 0 40px hsl(var(--destructive) / 0.3), 0 0 60px hsl(var(--destructive) / 0.1)' 
            : hasViolations 
            ? '0 0 15px hsl(var(--destructive) / 0.4)' 
            : 'none',
          animation: shouldGlow ? 'subtle-glow 3s ease-in-out infinite alternate' : 'none',
        },
        className: `transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`,
      };
    });

  // Create edges based on session connections
  const edges: Edge[] = [];
  
  // Determine if current event is a tool call and build path for highlighting
  const currentEvent = events[currentEventIndex];
  const isCurrentEventToolCall = currentEvent?.type === 'tool_call';
  
  // Build tool call path when tool call is selected
  const toolCallPath = new Set<string>();
  if (isCurrentEventToolCall && currentEvent.details?.tool_name) {
    const toolName = currentEvent.details.tool_name;
    const agentName = currentEvent.agent;
    
    // Add the tool call connection
    toolCallPath.add(`${agentName}-${toolName}`);
    
    // Find the outer agent for this actual agent (if exists)
    const outerAgent = Array.from(sessionFlowState.connections.entries()).find(([_, conn]) => 
      conn.type === 'outer-actual' && conn.to === agentName
    )?.[1]?.from;
    
    if (outerAgent) {
      // Add outer-actual connection
      const outerActualKey = Array.from(sessionFlowState.connections.keys()).find(key => 
        sessionFlowState.connections.get(key)?.type === 'outer-actual' && 
        sessionFlowState.connections.get(key)?.to === agentName
      );
      if (outerActualKey) toolCallPath.add(outerActualKey);
      
      // Add user-outer connection
      const userOuterKey = Array.from(sessionFlowState.connections.keys()).find(key => 
        sessionFlowState.connections.get(key)?.type === 'user-outer' && 
        sessionFlowState.connections.get(key)?.to === outerAgent
      );
      if (userOuterKey) toolCallPath.add(userOuterKey);
    } else {
      // Direct connection from user to agent
      const userAgentKey = Array.from(sessionFlowState.connections.keys()).find(key => 
        sessionFlowState.connections.get(key)?.type === 'user-outer' && 
        sessionFlowState.connections.get(key)?.to === agentName
      );
      if (userAgentKey) toolCallPath.add(userAgentKey);
    }
  }
  
  Array.from(sessionFlowState.connections.entries()).forEach(([key, connection], edgeIndex) => {
    // Determine edge activity based on current event
    const currentEventMatch = connection.events.find(e => e.index === currentEventIndex);
    const hasPastEvents = connection.events.some(e => e.index <= currentEventIndex);
    
    // Check if this edge is part of tool call path
    const isPartOfToolCallPath = isCurrentEventToolCall && toolCallPath.has(key);
    
    const isActive = !!currentEventMatch || isPartOfToolCallPath;
    const isGrayDotted = hasPastEvents && !isActive;
    
    // Determine edge direction for active connections
    let markerEnd = undefined;
    let source = connection.from;
    let target = connection.to;
    
    if (isActive) {
      if (connection.type === 'agent-tool') {
        // Always unidirectional for tool calls
        markerEnd = {
          type: MarkerType.ArrowClosed,
          color: `hsl(var(--${getAgentColorClass(connection.from)}))`,
        };
      } else if (connection.isBidirectional) {
        if (currentEventMatch) {
          // Show arrow direction based on event direction
          const isForward = currentEventMatch.direction === 'forward';
          if (!isForward) {
            // Flip source and target for backward direction (responses)
            source = connection.to;
            target = connection.from;
          }
          markerEnd = {
            type: MarkerType.ArrowClosed,
            color: `hsl(var(--${getAgentColorClass(isForward ? connection.from : connection.to)}))`,
          };
        } else if (isPartOfToolCallPath) {
          // For tool call path highlighting, show forward direction
          markerEnd = {
            type: MarkerType.ArrowClosed,
            color: `hsl(var(--${getAgentColorClass(connection.from)}))`,
          };
        }
      }
    }
    // CRITICAL: No arrows for gray dotted lines (inactive connections)
    
    edges.push({
      id: `edge-${edgeIndex}`,
      source,
      target,
      type: 'smoothstep',
      style: {
        stroke: isActive 
          ? `hsl(var(--${getAgentColorClass(currentEventMatch?.direction === 'forward' ? connection.from : connection.to) || getAgentColorClass(connection.from)}))` 
          : `hsl(var(--muted-foreground))`,
        strokeWidth: isActive ? 4 : 2,
        strokeOpacity: isActive ? 1 : 0.3,
        strokeDasharray: isActive ? '0' : '5,5',
      },
      animated: isActive,
      markerEnd,
    });
  });

    return { nodes, edges };
  }, [events, currentEventIndex, sessionFlowState]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when the computed values change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({}), []);

  // Handle node click for selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
  }, [selectedNodeId]);

  // Auto-fit view when initialized or when events change
  useEffect(() => {
    if (!isInitialized && nodes.length > 0) {
      setTimeout(() => {
        fitView({ 
          padding: 0.3,
          minZoom: 0.1,
          maxZoom: 1.5
        });
        setIsInitialized(true);
      }, 100);
    }
  }, [fitView, nodes.length, isInitialized]);

  return (
    <div className="h-full w-full bg-background relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ 
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 2
        }}
        className="bg-background w-full h-full"
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="hsl(var(--muted))"
          size={1}
          gap={20}
        />
        <Controls 
          className="bg-card border border-border"
        />
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className="bg-card border border-border text-muted-foreground hover:text-foreground px-2 py-1 rounded text-xs transition-colors"
            title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
          >
            {showMiniMap ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        {showMiniMap && (
          <MiniMap 
            className="bg-card border border-border"
            maskColor="rgb(240, 240, 240, 0.6)"
          />
        )}
      </ReactFlow>
    </div>
  );
};

const MultiAgentFlow: React.FC<MultiAgentFlowProps> = (props) => (
  <ReactFlowProvider>
    <MultiAgentFlowComponent {...props} />
  </ReactFlowProvider>
);

export default MultiAgentFlow;