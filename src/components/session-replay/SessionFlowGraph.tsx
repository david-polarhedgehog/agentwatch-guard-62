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
    
    // Find the primary agent (the one user directly interacts with)
    let primaryAgent: string | null = null;
    const agentFirstResponse = new Map<string, number>();

    // First pass: identify all agents and find the primary one
    nonViolationEvents.forEach((event, index) => {
      if (event.type === 'agent_response' && event.agent !== 'User') {
        flow.agents.add(event.agent);
        if (!agentFirstResponse.has(event.agent)) {
          agentFirstResponse.set(event.agent, index);
        }
      }
    });

    // The primary agent is the first one to respond to user
    if (agentFirstResponse.size > 0) {
      primaryAgent = Array.from(agentFirstResponse.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
    }

    nonViolationEvents.forEach((event, index) => {
      switch (event.type) {
        case 'user_message':
          // User only directly interacts with the primary agent
          if (primaryAgent && event.agent !== 'User') {
            const nextResponse = nonViolationEvents.slice(index + 1).find(e => e.type === 'agent_response');
            if (nextResponse && nextResponse.agent === primaryAgent) {
              flow.userInteractions.push({
                agent: primaryAgent,
                eventIndex: index,
                type: 'request'
              });
            }
          }
          break;

        case 'agent_response':
          // Only primary agent responds directly to user
          if (event.agent === primaryAgent) {
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

    // Find primary agent (first to respond to user)
    const agentFirstResponse = new Map<string, number>();
    const nonViolationEvents = events.filter(event => event.type !== 'violation');
    
    nonViolationEvents.forEach((event, index) => {
      if (event.type === 'agent_response' && event.agent !== 'User') {
        if (!agentFirstResponse.has(event.agent)) {
          agentFirstResponse.set(event.agent, index);
        }
      }
    });

    const primaryAgent = agentFirstResponse.size > 0 
      ? Array.from(agentFirstResponse.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : null;

    // Clean hierarchical layout with proper spacing to avoid overlaps
    const agentPositions: Record<string, { x: number; y: number }> = {};
    
    // User at top center
    agentPositions['User'] = { x: 500, y: 80 };
    
    // Primary agent directly below user with adequate spacing
    if (primaryAgent) {
      agentPositions[primaryAgent] = { x: 500, y: 220 };
    }
    
    // Sub-agents in horizontal row below primary agent with proper spacing
    const subAgents = agents.filter(agent => agent !== 'User' && agent !== primaryAgent);
    
    // Sort sub-agents for consistent ordering (File System, Web Search, Summarizer pattern)
    const agentOrder = ['File System Agent', 'Web Search Agent', 'Summarizer Agent'];
    const sortedSubAgents = subAgents.sort((a, b) => {
      const aIndex = agentOrder.findIndex(name => a.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
      const bIndex = agentOrder.findIndex(name => b.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    // Calculate spacing to ensure no overlaps - minimum 300px between agents
    const minAgentSpacing = 300;
    const totalSubAgentWidth = Math.max((sortedSubAgents.length - 1) * minAgentSpacing, 0);
    const subAgentStartX = 500 - (totalSubAgentWidth / 2);
    
    sortedSubAgents.forEach((agent, index) => {
      agentPositions[agent] = { 
        x: subAgentStartX + (index * minAgentSpacing), 
        y: 400 
      };
    });

    // Position tools directly below their associated agents with extra spacing
    const toolPositions: Record<string, { x: number; y: number }> = {};
    const agentToolCounts = new Map<string, number>();
    
    // Count tools per agent
    tools.forEach((tool) => {
      const parentAgent = sessionFlow.tools.get(tool);
      if (parentAgent) {
        agentToolCounts.set(parentAgent, (agentToolCounts.get(parentAgent) || 0) + 1);
      }
    });
    
    tools.forEach((tool) => {
      const parentAgent = sessionFlow.tools.get(tool);
      if (parentAgent && agentPositions[parentAgent]) {
        const basePos = agentPositions[parentAgent];
        const toolsForAgent = tools.filter(t => sessionFlow.tools.get(t) === parentAgent);
        const toolIndex = toolsForAgent.indexOf(tool);
        const totalTools = toolsForAgent.length;
        
        // Calculate horizontal offset for multiple tools under same agent with wider spacing
        let xOffset = 0;
        if (totalTools > 1) {
          const toolSpacing = 180; // Increased from 120 to prevent overlap
          const totalToolWidth = (totalTools - 1) * toolSpacing;
          xOffset = -totalToolWidth / 2 + (toolIndex * toolSpacing);
        }
        
        toolPositions[tool] = {
          x: basePos.x + xOffset,
          y: basePos.y + 180  // Increased from 160 to create more vertical space
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

    // Create edges based on session flow - only show arrows for current event
    const edges: Edge[] = [];
    const currentEvent = events[currentEventIndex];

    // Helper function to check if edge should show arrow based on current event
    const shouldShowArrow = (sourceId: string, targetId: string, edgeType: string): boolean => {
      if (!currentEvent) return false;
      
      switch (currentEvent.type) {
        case 'user_message':
          // User asks question - show arrow from user to target agent
          const nextResponse = events.slice(currentEventIndex + 1).find(e => e.type === 'agent_response');
          return edgeType === 'user_interaction' && 
                 sourceId === 'User' && 
                 targetId === nextResponse?.agent;
                 
        case 'tool_call':
          // Agent uses tool - show arrow from agent to tool
          return edgeType === 'tool_call' && 
                 sourceId === currentEvent.agent && 
                 targetId === currentEvent.details?.tool_name;
                 
        case 'agent_response':
          // Agent responds - show arrow from agent to user
          return edgeType === 'user_interaction' && 
                 sourceId === currentEvent.agent && 
                 targetId === 'User';
                 
        case 'handoff':
          // Agent handoff - show arrow from source to target agent
          return edgeType === 'handoff' && 
                 sourceId === currentEvent.details?.from_agent && 
                 targetId === currentEvent.details?.to_agent;
                 
        default:
          return false;
      }
    };

    // 1. User interactions (User <-> Agent) - bidirectional connections
    const processedUserInteractions = new Set<string>();
    sessionFlow.userInteractions.forEach((interaction) => {
      const edgeKey = `User-${interaction.agent}`;
      if (!processedUserInteractions.has(edgeKey)) {
        processedUserInteractions.add(edgeKey);
        
        const isActive = interaction.eventIndex <= currentEventIndex;
        const colorClass = getAgentColorClass(interaction.agent);
        const showArrowToAgent = shouldShowArrow('User', interaction.agent, 'user_interaction');
        const showArrowToUser = shouldShowArrow(interaction.agent, 'User', 'user_interaction');

        edges.push({
          id: `user-${interaction.agent}`,
          source: 'User',
          target: interaction.agent,
          type: 'smoothstep',
          animated: isActive && (showArrowToAgent || showArrowToUser),
          style: {
            stroke: `hsl(var(--${colorClass}))`,
            strokeWidth: isActive ? 3 : 2,
            strokeOpacity: isActive ? 1 : 0.4,
          },
          markerEnd: showArrowToAgent ? {
            type: MarkerType.ArrowClosed,
            color: `hsl(var(--${colorClass}))`,
            width: 20,
            height: 20,
          } : undefined,
          markerStart: showArrowToUser ? {
            type: MarkerType.ArrowClosed,
            color: `hsl(var(--${colorClass}))`,
            width: 20,
            height: 20,
          } : undefined,
          label: isActive ? 'conversation' : undefined,
          labelStyle: isActive ? {
            fontSize: '12px',
            fontWeight: 600,
            fill: `hsl(var(--${colorClass}))`,
            backgroundColor: 'hsl(var(--background))',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid hsl(var(--border))',
          } : undefined,
        });
      }
    });

    // 2. Handoffs (Agent -> Agent)
    sessionFlow.handoffs.forEach((handoff, index) => {
      const isActive = handoff.eventIndex <= currentEventIndex;
      const colorClass = getAgentColorClass(handoff.from);
      const showArrow = shouldShowArrow(handoff.from, handoff.to, 'handoff');

      edges.push({
        id: `handoff-${index}`,
        source: handoff.from,
        target: handoff.to,
        type: 'smoothstep',
        animated: isActive && showArrow,
        style: {
          stroke: `hsl(var(--${colorClass}))`,
          strokeWidth: isActive ? 4 : 2,
          strokeOpacity: isActive ? 1 : 0.4,
          strokeDasharray: showArrow ? '10,5' : undefined,
        },
        markerEnd: showArrow ? {
          type: MarkerType.ArrowClosed,
          color: `hsl(var(--${colorClass}))`,
          width: 24,
          height: 24,
        } : undefined,
        label: showArrow ? 'handoff' : undefined,
        labelStyle: showArrow ? {
          fontSize: '12px',
          fontWeight: 700,
          fill: `hsl(var(--${colorClass}))`,
          backgroundColor: 'hsl(var(--background))',
          padding: '4px 8px',
          borderRadius: '6px',
          border: `2px solid hsl(var(--${colorClass}))`,
        } : undefined,
      });
    });

    // 3. Tool calls (Agent -> Tool)
    sessionFlow.toolCalls.forEach((toolCall, index) => {
      const isActive = toolCall.eventIndex <= currentEventIndex;
      const colorClass = getAgentColorClass(toolCall.agent);
      const showArrow = shouldShowArrow(toolCall.agent, toolCall.tool, 'tool_call');

      edges.push({
        id: `tool-${index}`,
        source: toolCall.agent,
        target: toolCall.tool,
        type: 'smoothstep',
        animated: isActive && showArrow,
        style: {
          stroke: 'hsl(var(--tool-call))',
          strokeWidth: isActive ? 3 : 2,
          strokeOpacity: isActive ? 1 : 0.3,
          strokeDasharray: showArrow ? '5,3' : undefined,
        },
        markerEnd: showArrow ? {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--tool-call))',
          width: 16,
          height: 16,
        } : undefined,
        label: showArrow ? 'uses' : undefined,
        labelStyle: showArrow ? {
          fontSize: '10px',
          fontWeight: 500,
          fill: 'hsl(var(--tool-call))',
          backgroundColor: 'hsl(var(--background))',
          padding: '2px 4px',
          borderRadius: '4px',
        } : undefined,
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
          position="top-left"
          style={{ 
            backgroundColor: 'hsl(var(--card))',
            width: '120px',
            height: '80px',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
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