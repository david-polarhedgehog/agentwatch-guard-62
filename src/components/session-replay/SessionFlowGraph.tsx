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
import { AgentNameService } from '@/services/agentNameService';

// Import the getCleanAgentName function from sessionProcessor
const getCleanAgentName = (agentId: string): string => {
  // Convert agent IDs to readable names (fallback for when API names are not available)
  if (agentId.includes('Customer Service Agent') || agentId.includes('customer_service')) return 'Customer Service Agent';
  if (agentId.includes('File System Agent') || agentId.includes('file_system')) return 'File System Agent';
  if (agentId.includes('Web Search Agent') || agentId.includes('web_search')) return 'Web Search Agent';
  if (agentId.includes('summarizer')) return 'Summarizer Agent';
  
  // Generic cleanup for unknown agent types
  return agentId
    .replace(/^agent_/, '') // Remove agent_ prefix
    .replace(/_agent_[a-f0-9]+$/, '') // Remove _agent_<hash> suffix
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Title case
};

interface SessionFlowGraphProps {
  events: ProcessedEvent[];
  currentEventIndex: number;
}

// Represents the session flow structure - using agent_id for node keying
interface SessionFlow {
  agents: Map<string, string>; // agent_id -> display_name mapping
  tools: Map<string, string>; // tool -> agent_id that uses it
  handoffs: Array<{ from: string; to: string; eventIndex: number }>; // using agent_ids
  userInteractions: Array<{ agent: string; eventIndex: number; type: 'request' | 'response' }>; // using agent_ids
  toolCalls: Array<{ agent: string; tool: string; eventIndex: number }>; // using agent_ids
}

const SessionFlowGraphComponent: React.FC<SessionFlowGraphProps> = ({ events, currentEventIndex }) => {
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Analyze session flow to understand the actual conversation structure
  const sessionFlow = useMemo((): SessionFlow => {
    const flow: SessionFlow = {
      agents: new Map([['User', 'User']]), // Always start with User - agent_id -> display_name
      tools: new Map(),
      handoffs: [],
      userInteractions: [],
      toolCalls: [],
    };

    // Filter out violation events for flow analysis
    const nonViolationEvents = events.filter(event => event.type !== 'violation');
    
    // Build response index by request_id using outer_agent_id for user connections
    const respByReq = new Map<string, { outerAgentId: string; index: number }>();

    nonViolationEvents.forEach((event, index) => {
      if (event.type === 'agent_response' && event.request_id) {
        // Use outer_agent_id for user connections as specified
        const outerAgentId = event.outer_agent_id || event.agent;
        respByReq.set(event.request_id, { outerAgentId, index });
        // Add both outer agent and actual agent to nodes - use proper name resolution
        const outerAgentName = AgentNameService.getCachedAgentName(outerAgentId) || getCleanAgentName(outerAgentId);
        flow.agents.set(outerAgentId, outerAgentName); // Use resolved agent name for display
        if (event.agent_id && event.agent_id !== outerAgentId) {
          const actualAgentName = AgentNameService.getCachedAgentName(event.agent_id) || getCleanAgentName(event.agent_id);
          flow.agents.set(event.agent_id, actualAgentName); // Use resolved agent name
        }
      }
    });

    // primary agent = earliest responding outer agent by index
    const primaryAgent = respByReq.size > 0
      ? Array.from(respByReq.values()).sort((a, b) => a.index - b.index)[0].outerAgentId
      : null;

    nonViolationEvents.forEach((event, index) => {
      switch (event.type) {
        case 'user_message': {
          const rec = event.request_id ? respByReq.get(event.request_id) : undefined;
          if (rec) {
            // Only create user → outer_agent_id edges as specified
            flow.userInteractions.push({
              agent: rec.outerAgentId,
              eventIndex: index,
              type: 'request',
            });
          }
          break;
        }
        case 'agent_response': {
          // Only create user → outer_agent_id edges, not agent_id
          const outerAgentId = event.outer_agent_id || event.agent;
          flow.userInteractions.push({
            agent: outerAgentId,
            eventIndex: index,
            type: 'response',
          });
          break;
        }

        case 'handoff':
          // Agent is handing off to another agent - use agent_ids for node keys
          if (event.details?.from_agent_id && event.details?.to_agent_id) {
            const fromAgentName = AgentNameService.getCachedAgentName(event.details.from_agent_id) || 
                                 event.details.from_agent || getCleanAgentName(event.details.from_agent_id);
            const toAgentName = AgentNameService.getCachedAgentName(event.details.to_agent_id) || 
                               event.details.to_agent || getCleanAgentName(event.details.to_agent_id);
            
            flow.agents.set(event.details.from_agent_id, fromAgentName);
            flow.agents.set(event.details.to_agent_id, toAgentName);
            flow.handoffs.push({
              from: event.details.from_agent_id,
              to: event.details.to_agent_id,
              eventIndex: index
            });
          }
          break;

        case 'tool_call':
          // Agent is using a tool (tools are NOT separate agents) - use agent_id for keying
          if (event.agent !== 'User' && event.details?.tool_name) {
            const agentId = event.agent_id || event.agent;
            // Only set agent name if we have an actual agent_id (not just the name)
            if (event.agent_id) {
              const agentName = AgentNameService.getCachedAgentName(event.agent_id) || getCleanAgentName(event.agent_id);
              flow.agents.set(agentId, agentName); // agentId is the ID, use resolved name
            }
            flow.tools.set(event.details.tool_name, agentId);
            flow.toolCalls.push({
              agent: agentId,
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
    const agentEntries = Array.from(sessionFlow.agents.entries()); // [agent_id, display_name] pairs
    const tools = Array.from(sessionFlow.tools.keys());

    // Find primary agent (first to respond to user) - use agent_id for comparison
    const agentFirstResponse = new Map<string, number>();
    const nonViolationEvents = events.filter(event => event.type !== 'violation');
    
    nonViolationEvents.forEach((event, index) => {
      if (event.type === 'agent_response' && event.agent !== 'User') {
        const agentId = event.agent_id || event.agent;
        if (!agentFirstResponse.has(agentId)) {
          agentFirstResponse.set(agentId, index);
        }
      }
    });

    const primaryAgent = agentFirstResponse.size > 0 
      ? Array.from(agentFirstResponse.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : null;

    // Clean hierarchical layout with proper spacing to avoid overlaps - use agent_id for positioning
    const agentPositions: Record<string, { x: number; y: number }> = {};
    
    // User at top center
    agentPositions['User'] = { x: 500, y: 80 };
    
    // Primary agent directly below user with adequate spacing
    if (primaryAgent) {
      agentPositions[primaryAgent] = { x: 500, y: 220 };
    }
    
    // Sub-agents in horizontal row below primary agent with proper spacing
    const subAgents = agentEntries.filter(([agentId, displayName]) => agentId !== 'User' && agentId !== primaryAgent);
    
    // Sort sub-agents for consistent ordering (File System, Web Search, Summarizer pattern)
    const agentOrder = ['File System Agent', 'Web Search Agent', 'Summarizer Agent'];
    const sortedSubAgents = subAgents.sort(([aId, aName], [bId, bName]) => {
      const aIndex = agentOrder.findIndex(name => aName.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
      const bIndex = agentOrder.findIndex(name => bName.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    // Calculate spacing to ensure no overlaps - minimum 300px between agents
    const minAgentSpacing = 300;
    const totalSubAgentWidth = Math.max((sortedSubAgents.length - 1) * minAgentSpacing, 0);
    const subAgentStartX = 500 - (totalSubAgentWidth / 2);
    
    sortedSubAgents.forEach(([agentId, displayName], index) => {
      agentPositions[agentId] = { 
        x: subAgentStartX + (index * minAgentSpacing), 
        y: 400 
      };
    });

    // Position tools directly below their associated agents with extra spacing
    const toolPositions: Record<string, { x: number; y: number }> = {};
    const agentToolCounts = new Map<string, number>();
    
    // Count tools per agent
    tools.forEach((tool) => {
      const parentAgentId = sessionFlow.tools.get(tool); // This returns agent_id now
      if (parentAgentId) {
        agentToolCounts.set(parentAgentId, (agentToolCounts.get(parentAgentId) || 0) + 1);
      }
    });
    
    tools.forEach((tool) => {
      const parentAgentId = sessionFlow.tools.get(tool); // This returns agent_id now
      if (parentAgentId && agentPositions[parentAgentId]) {
        const basePos = agentPositions[parentAgentId];
        const toolsForAgent = tools.filter(t => sessionFlow.tools.get(t) === parentAgentId);
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

    // Create agent nodes - use agent_id as node key, display_name as label
    const nodes: Node[] = agentEntries.map(([agentId, displayName]) => {
      const colorClass = getAgentColorClass(displayName);
      const isActive = events.slice(0, currentEventIndex + 1).some(e => {
        // Check both agent_id and agent fields, and for User check both
        return (e.agent_id === agentId) || (e.agent === agentId) || 
               (agentId === 'User' && e.agent === 'User') ||
               (e.agent === displayName); // Also check display name match
      });
      const hasViolations = events.some(e => {
        return ((e.agent_id === agentId) || (e.agent === agentId) || (e.agent === displayName)) && 
               e.detections && e.detections.length > 0;
      });

      return {
        id: agentId, // Use agent_id as node key
        type: 'default',
        position: agentPositions[agentId] || { x: 400, y: 400 },
        data: { 
          label: displayName, // Use display_name as label
          category: agentId === 'User' ? 'user' : 'agent',
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
      const parentAgentId = sessionFlow.tools.get(tool); // This returns agent_id now
      const parentAgentName = parentAgentId ? sessionFlow.agents.get(parentAgentId) : undefined;
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
          parentAgent: parentAgentName, // Use display name for data
          parentAgentId: parentAgentId, // Store agent_id for reference
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

    // Build response index for arrow logic using outer_agent_id
    const respByReqForArrows = new Map<string, { outerAgentId: string; index: number }>();
    const eventsForArrows = events.filter(event => event.type !== 'violation');
    
    eventsForArrows.forEach((event, index) => {
      if (event.type === 'agent_response' && event.request_id) {
        const outerAgentId = event.outer_agent_id || event.agent;
        respByReqForArrows.set(event.request_id, { outerAgentId, index });
      }
    });

    // Helper function to check if edge should show arrow based on current event
    const shouldShowArrow = (sourceId: string, targetId: string, edgeType: string): boolean => {
      if (!currentEvent) return false;

      switch (currentEvent.type) {
        case 'user_message': {
          const rec = currentEvent.request_id ? respByReqForArrows.get(currentEvent.request_id) : undefined;
          const targetAgent = rec?.outerAgentId;
          return edgeType === 'user_interaction' && sourceId === 'User' && targetId === targetAgent;
        }
        case 'agent_response':
          return edgeType === 'user_interaction' &&
                 sourceId === (currentEvent.outer_agent_id || currentEvent.agent) &&
                 targetId === 'User';
        case 'tool_call':
          return edgeType === 'tool_call' &&
                 sourceId === (currentEvent.agent_id || currentEvent.agent) &&
                 targetId === currentEvent.details?.tool_name;
        case 'handoff':
          return edgeType === 'handoff' &&
                 sourceId === currentEvent.details?.from_agent_id &&
                 targetId === currentEvent.details?.to_agent_id;
        default:
          return false;
      }
    };

    // 1. User interactions (User <-> Agent) - bidirectional connections using agent_id
    const processedUserInteractions = new Set<string>();
    sessionFlow.userInteractions.forEach((interaction) => {
      const edgeKey = `User-${interaction.agent}`;
      if (!processedUserInteractions.has(edgeKey)) {
        processedUserInteractions.add(edgeKey);
        
        const isActive = interaction.eventIndex <= currentEventIndex;
        const agentDisplayName = sessionFlow.agents.get(interaction.agent) || interaction.agent;
        const colorClass = getAgentColorClass(agentDisplayName);
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

    // 2. Handoffs (Agent -> Agent) - using agent_id for connections
    sessionFlow.handoffs.forEach((handoff, index) => {
      const isActive = handoff.eventIndex <= currentEventIndex;
      const fromDisplayName = sessionFlow.agents.get(handoff.from) || handoff.from;
      const colorClass = getAgentColorClass(fromDisplayName);
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

    // 3. Tool calls (Agent -> Tool) - using agent_id for connections
    sessionFlow.toolCalls.forEach((toolCall, index) => {
      const isActive = toolCall.eventIndex <= currentEventIndex;
      const agentDisplayName = sessionFlow.agents.get(toolCall.agent) || toolCall.agent;
      const colorClass = getAgentColorClass(agentDisplayName);
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