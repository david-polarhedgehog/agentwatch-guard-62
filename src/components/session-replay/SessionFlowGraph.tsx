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

interface SessionFlowGraphProps {
  events: ProcessedEvent[];
  currentEventIndex: number;
}

// Represents the session flow structure
interface SessionFlow {
  agents: Set<string>;
  tools: Map<string, string>; // tool -> agent that uses it
  handoffs: Array<{ from: string; to: string; eventIndex: number }>;
  userInteractions: Array<{ agent: string; eventIndex: number; type: 'request' | 'response' }>;
  toolCalls: Array<{ agent: string; tool: string; eventIndex: number }>;
}

const SessionFlowGraphComponent: React.FC<SessionFlowGraphProps> = ({ events, currentEventIndex }) => {
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Analyze session flow to understand the actual conversation structure
  const sessionFlow = useMemo((): SessionFlow => {
    const flow: SessionFlow = {
      agents: new Set(['User']), // Always start with User
      tools: new Map(),
      handoffs: [],
      userInteractions: [],
      toolCalls: [],
    };

    // Filter out violation events for flow analysis
    const nonViolationEvents = events.filter(event => event.type !== 'violation');

    nonViolationEvents.forEach((event, index) => {
      switch (event.type) {
        case 'user_message':
          // User is asking/requesting something from an agent
          if (event.agent !== 'User') {
            // Find the next agent response to determine target agent
            const nextResponse = nonViolationEvents.slice(index + 1).find(e => e.type === 'agent_response');
            if (nextResponse && nextResponse.agent !== 'User') {
              flow.agents.add(nextResponse.agent);
              flow.userInteractions.push({
                agent: nextResponse.agent,
                eventIndex: index,
                type: 'request'
              });
            }
          }
          break;

        case 'agent_response':
          // Agent is responding back to user or another agent
          if (event.agent !== 'User') {
            flow.agents.add(event.agent);
            flow.userInteractions.push({
              agent: event.agent,
              eventIndex: index,
              type: 'response'
            });
          }
          break;

        case 'handoff':
          // Agent is handing off to another agent
          if (event.details?.from_agent && event.details?.to_agent) {
            flow.agents.add(event.details.from_agent);
            flow.agents.add(event.details.to_agent);
            flow.handoffs.push({
              from: event.details.from_agent,
              to: event.details.to_agent,
              eventIndex: index
            });
          }
          break;

        case 'tool_call':
          // Agent is using a tool (tools are NOT separate agents)
          if (event.agent !== 'User' && event.details?.tool_name) {
            flow.agents.add(event.agent);
            flow.tools.set(event.details.tool_name, event.agent);
            flow.toolCalls.push({
              agent: event.agent,
              tool: event.details.tool_name,
              eventIndex: index
            });
          }
          break;
      }
    });

    return flow;
  }, [events]);

  // Generate nodes and edges based on session flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const agents = Array.from(sessionFlow.agents);
    const tools = Array.from(sessionFlow.tools.keys());

    // Position agents in a logical flow layout
    const agentPositions: Record<string, { x: number; y: number }> = {
      'User': { x: 400, y: 50 },
    };

    // Position other agents based on handoff flow or discovery order
    let agentX = 100;
    let agentY = 200;
    agents.forEach((agent, index) => {
      if (agent !== 'User' && !agentPositions[agent]) {
        agentPositions[agent] = { x: agentX, y: agentY };
        agentX += 300;
        if (agentX > 900) {
          agentX = 100;
          agentY += 200;
        }
      }
    });

    // Position tools near their associated agents
    const toolPositions: Record<string, { x: number; y: number }> = {};
    tools.forEach((tool, index) => {
      const parentAgent = sessionFlow.tools.get(tool);
      if (parentAgent && agentPositions[parentAgent]) {
        const basePos = agentPositions[parentAgent];
        toolPositions[tool] = {
          x: basePos.x + (index % 2 === 0 ? -150 : 150),
          y: basePos.y + 120
        };
      }
    });

    // Create agent nodes
    const nodes: Node[] = agents.map((agent) => {
      const colorClass = getAgentColorClass(agent);
      const isActive = events.slice(0, currentEventIndex + 1).some(e => e.agent === agent);
      const hasViolations = events.some(e => e.agent === agent && e.detections && e.detections.length > 0);

      return {
        id: agent,
        type: 'default',
        position: agentPositions[agent] || { x: 400, y: 400 },
        data: { 
          label: agent,
          category: agent === 'User' ? 'user' : 'agent',
        },
        style: {
          backgroundColor: `hsl(var(--${colorClass}))`,
          color: `hsl(var(--${colorClass}-foreground))`,
          border: '3px solid',
          borderColor: hasViolations ? 'hsl(var(--destructive))' : `hsl(var(--${colorClass}))`,
          opacity: isActive ? 1 : 0.7,
          fontWeight: 'bold',
          fontSize: '14px',
          padding: '16px 20px',
          borderRadius: '12px',
          minWidth: '140px',
          textAlign: 'center',
          boxShadow: hasViolations 
            ? '0 0 15px hsl(var(--destructive) / 0.4)' 
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        className: `transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`,
      };
    });

    // Create tool nodes (smaller, connected to their agents)
    tools.forEach((tool) => {
      const colorClass = 'tool-call';
      const parentAgent = sessionFlow.tools.get(tool);
      const isActive = events.slice(0, currentEventIndex + 1).some(e => 
        e.type === 'tool_call' && e.details?.tool_name === tool
      );

      nodes.push({
        id: tool,
        type: 'default',
        position: toolPositions[tool] || { x: 600, y: 600 },
        data: { 
          label: tool,
          category: 'tool',
          parentAgent,
        },
        style: {
          backgroundColor: `hsl(var(--${colorClass}))`,
          color: `hsl(var(--${colorClass}-foreground))`,
          border: '2px solid',
          borderColor: `hsl(var(--${colorClass}))`,
          opacity: isActive ? 1 : 0.6,
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
          minWidth: '100px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
        className: `transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100'}`,
      });
    });

    // Create edges based on session flow
    const edges: Edge[] = [];

    // 1. User interactions (User <-> Agent)
    const processedUserInteractions = new Set<string>();
    sessionFlow.userInteractions.forEach((interaction) => {
      const edgeKey = `User-${interaction.agent}`;
      if (!processedUserInteractions.has(edgeKey)) {
        processedUserInteractions.add(edgeKey);
        
        const isActive = interaction.eventIndex <= currentEventIndex;
        const colorClass = getAgentColorClass(interaction.agent);

        edges.push({
          id: `user-${interaction.agent}`,
          source: 'User',
          target: interaction.agent,
          type: 'smoothstep',
          animated: isActive,
          style: {
            stroke: `hsl(var(--${colorClass}))`,
            strokeWidth: isActive ? 4 : 2,
            strokeOpacity: isActive ? 1 : 0.6,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: `hsl(var(--${colorClass}))`,
            width: 20,
            height: 20,
          },
          label: 'conversation',
          labelStyle: {
            fontSize: '12px',
            fontWeight: 600,
            fill: `hsl(var(--${colorClass}))`,
            backgroundColor: 'hsl(var(--background))',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid hsl(var(--border))',
          },
        });
      }
    });

    // 2. Handoffs (Agent -> Agent)
    sessionFlow.handoffs.forEach((handoff, index) => {
      const isActive = handoff.eventIndex <= currentEventIndex;
      const colorClass = getAgentColorClass(handoff.from);

      edges.push({
        id: `handoff-${index}`,
        source: handoff.from,
        target: handoff.to,
        type: 'smoothstep',
        animated: isActive,
        style: {
          stroke: `hsl(var(--${colorClass}))`,
          strokeWidth: isActive ? 5 : 3,
          strokeOpacity: isActive ? 1 : 0.6,
          strokeDasharray: '10,5',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: `hsl(var(--${colorClass}))`,
          width: 24,
          height: 24,
        },
        label: 'handoff',
        labelStyle: {
          fontSize: '12px',
          fontWeight: 700,
          fill: `hsl(var(--${colorClass}))`,
          backgroundColor: 'hsl(var(--background))',
          padding: '4px 8px',
          borderRadius: '6px',
          border: `2px solid hsl(var(--${colorClass}))`,
        },
      });
    });

    // 3. Tool calls (Agent -> Tool)
    sessionFlow.toolCalls.forEach((toolCall, index) => {
      const isActive = toolCall.eventIndex <= currentEventIndex;
      const colorClass = getAgentColorClass(toolCall.agent);

      edges.push({
        id: `tool-${index}`,
        source: toolCall.agent,
        target: toolCall.tool,
        type: 'smoothstep',
        animated: isActive,
        style: {
          stroke: 'hsl(var(--tool-call))',
          strokeWidth: isActive ? 3 : 2,
          strokeOpacity: isActive ? 1 : 0.5,
          strokeDasharray: '5,3',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--tool-call))',
          width: 16,
          height: 16,
        },
        label: 'uses',
        labelStyle: {
          fontSize: '10px',
          fontWeight: 500,
          fill: 'hsl(var(--tool-call))',
          backgroundColor: 'hsl(var(--background))',
          padding: '2px 4px',
          borderRadius: '4px',
        },
      });
    });

    return { nodes, edges };
  }, [events, currentEventIndex, sessionFlow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when the computed values change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click for selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
  }, [selectedNodeId]);

  // Auto-fit view on initialization
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.1, duration: 800 }), 100);
    }
  }, [fitView, nodes.length]);

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        className="session-flow-graph"
      >
        <Background gap={20} size={1} color="hsl(var(--muted) / 0.3)" />
        <Controls position="top-right" />
        <MiniMap 
          nodeColor="hsl(var(--muted))"
          maskColor="rgba(255, 255, 255, 0.8)"
          position="bottom-right"
          style={{ backgroundColor: 'hsl(var(--card))' }}
        />
      </ReactFlow>
    </div>
  );
};

const SessionFlowGraph: React.FC<SessionFlowGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SessionFlowGraphComponent {...props} />
    </ReactFlowProvider>
  );
};

export default SessionFlowGraph;