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
    console.log('🔍 [GRAPH DEBUG] Starting sessionFlow analysis with events:', events.length);
    
    const flow: SessionFlow = {
      agents: new Map([['User', 'User']]), // Always start with User - agent_id -> display_name
      tools: new Map(),
      handoffs: [],
      userInteractions: [],
      toolCalls: [],
    };

    // Filter out violation events for flow analysis
    const nonViolationEvents = events.filter(event => event.type !== 'violation');
    console.log('🔍 [GRAPH DEBUG] Non-violation events:', nonViolationEvents.length);
    
    // First pass: Build authoritative agent_id -> display_name mapping from events that have agent_id
    const agentIdToDisplayName = new Map<string, string>();
    const displayNameToAgentId = new Map<string, string>();
    const agentFirstResponse = new Map<string, number>();

    console.log('🔍 [GRAPH DEBUG] First pass: building agent_id mappings...');
    nonViolationEvents.forEach((event, index) => {
      if (event.agent !== 'User' && event.agent_id) {
        // This event has both agent_id and display name - use this as authoritative mapping
        const agentId = event.agent_id;
        const displayName = event.agent;
        
        if (!agentIdToDisplayName.has(agentId)) {
          agentIdToDisplayName.set(agentId, displayName);
          displayNameToAgentId.set(displayName, agentId);
          console.log(`🔍 [GRAPH DEBUG] Authoritative mapping: ${agentId} -> ${displayName}`);
        }
        
        // Track first response for primary agent determination
        if (event.type === 'agent_response' && !agentFirstResponse.has(agentId)) {
          agentFirstResponse.set(agentId, index);
          console.log(`🔍 [GRAPH DEBUG] First response tracked: ${agentId} at index ${index}`);
        }
      }
    });

    // Second pass: Collect all unique agents using consistent agent_id keys
    const uniqueAgents = new Map<string, string>(); // agent_id -> display_name
    
    console.log('🔍 [GRAPH DEBUG] Second pass: collecting unique agents with consistent keys...');
    nonViolationEvents.forEach((event, index) => {
      // Helper function to add an agent (used for all agent sources)
      const addAgent = (agentId: string, displayName: string, source: string) => {
        if (!uniqueAgents.has(agentId)) {
          uniqueAgents.set(agentId, displayName);
          console.log(`🔍 [GRAPH DEBUG] Added unique agent from ${source}: ${agentId} -> ${displayName}`);
        } else {
          console.log(`🔍 [GRAPH DEBUG] Agent already exists from ${source}: ${agentId} (skipping duplicate)`);
        }
      };

      // Collect agents from regular events (non-User)
      if (event.agent !== 'User') {
        let agentId: string;
        let displayName: string;
        
        if (event.agent_id) {
          // Event has agent_id - use it directly
          agentId = event.agent_id;
          displayName = event.agent;
        } else {
          // Event only has display name - try to map back to agent_id
          const mappedAgentId = displayNameToAgentId.get(event.agent);
          if (mappedAgentId) {
            agentId = mappedAgentId;
            displayName = event.agent;
            console.log(`🔍 [GRAPH DEBUG] Mapped display name "${event.agent}" to agent_id "${mappedAgentId}"`);
          } else {
            // No mapping found - use display name as fallback key (shouldn't happen with good data)
            agentId = event.agent;
            displayName = event.agent;
            console.log(`🔍 [GRAPH DEBUG] No mapping found for "${event.agent}", using as fallback key`);
          }
        }
        
        console.log(`🔍 [GRAPH DEBUG] Event ${index}: type=${event.type}, agent="${event.agent}", agent_id="${event.agent_id}", resolved_key="${agentId}"`);
        addAgent(agentId, displayName, `regular_event_${event.type}`);
        
        // Track first response for primary agent determination (update with resolved agent_id)
        if (event.type === 'agent_response' && !agentFirstResponse.has(agentId)) {
          agentFirstResponse.set(agentId, index);
          console.log(`🔍 [GRAPH DEBUG] First response tracked: ${agentId} at index ${index}`);
        }
      }
      
      // Collect agents from handoff events (do this WITHIN the same logic to prevent duplicates)
      if (event.type === 'handoff' && event.details) {
        if (event.details.from_agent_id) {
          const fromDisplayName = event.details.from_agent || event.details.from_agent_id;
          addAgent(event.details.from_agent_id, fromDisplayName, 'handoff_from');
        }
        if (event.details.to_agent_id) {
          const toDisplayName = event.details.to_agent || event.details.to_agent_id;
          addAgent(event.details.to_agent_id, toDisplayName, 'handoff_to');
        }
      }
    });

    // Add all unique agents to flow
    uniqueAgents.forEach((displayName, agentId) => {
      flow.agents.set(agentId, displayName);
    });

    console.log('🔍 [GRAPH DEBUG] Final unique agents map:', Array.from(uniqueAgents.entries()));
    console.log('🔍 [GRAPH DEBUG] Flow agents map:', Array.from(flow.agents.entries()));

    // Find the primary agent (the one user directly interacts with)
    const primaryAgent = agentFirstResponse.size > 0 
      ? Array.from(agentFirstResponse.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : null;
    
    console.log('🔍 [GRAPH DEBUG] Primary agent determined:', primaryAgent);
    console.log('🔍 [GRAPH DEBUG] Agent first responses:', Array.from(agentFirstResponse.entries()));

    // Third pass: build interactions, handoffs, and tool calls using consistent agent resolution
    console.log('🔍 [GRAPH DEBUG] Third pass: building interactions...');
    nonViolationEvents.forEach((event, index) => {
      switch (event.type) {
        case 'user_message':
          // User only directly interacts with the primary agent
          if (primaryAgent && event.agent !== 'User') {
            const nextResponse = nonViolationEvents.slice(index + 1).find(e => e.type === 'agent_response');
            if (nextResponse) {
              // Use same agent resolution logic as in uniqueAgents collection
              let responseAgentId: string;
              if (nextResponse.agent_id) {
                responseAgentId = nextResponse.agent_id;
              } else {
                const mappedAgentId = displayNameToAgentId.get(nextResponse.agent);
                responseAgentId = mappedAgentId || nextResponse.agent;
              }
              
              if (responseAgentId === primaryAgent) {
                flow.userInteractions.push({
                  agent: primaryAgent,
                  eventIndex: index,
                  type: 'request'
                });
                console.log(`🔍 [GRAPH DEBUG] Added user interaction request: ${primaryAgent} at ${index}`);
              }
            }
          }
          break;

        case 'agent_response':
          // Only primary agent responds directly to user - use consistent agent resolution
          let responseAgentId: string;
          if (event.agent_id) {
            responseAgentId = event.agent_id;
          } else {
            const mappedAgentId = displayNameToAgentId.get(event.agent);
            responseAgentId = mappedAgentId || event.agent;
          }
          
          if (responseAgentId === primaryAgent) {
            flow.userInteractions.push({
              agent: responseAgentId,
              eventIndex: index,
              type: 'response'
            });
            console.log(`🔍 [GRAPH DEBUG] Added user interaction response: ${responseAgentId} at ${index}`);
          }
          break;

        case 'handoff':
          // Agent is handing off to another agent - use agent_ids for node keys
          if (event.details?.from_agent_id && event.details?.to_agent_id) {
            flow.handoffs.push({
              from: event.details.from_agent_id,
              to: event.details.to_agent_id,
              eventIndex: index
            });
            console.log(`🔍 [GRAPH DEBUG] Added handoff: ${event.details.from_agent_id} -> ${event.details.to_agent_id} at ${index}`);
          }
          break;

        case 'tool_call':
          // Agent is using a tool (tools are NOT separate agents) - use consistent agent resolution
          if (event.agent !== 'User' && event.details?.tool_name) {
            let toolAgentId: string;
            if (event.agent_id) {
              toolAgentId = event.agent_id;
            } else {
              const mappedAgentId = displayNameToAgentId.get(event.agent);
              toolAgentId = mappedAgentId || event.agent;
            }
            
            flow.tools.set(event.details.tool_name, toolAgentId);
            flow.toolCalls.push({
              agent: toolAgentId,
              tool: event.details.tool_name,
              eventIndex: index
            });
            console.log(`🔍 [GRAPH DEBUG] Added tool call: ${toolAgentId} -> ${event.details.tool_name} at ${index}`);
          }
          break;
      }
    });

    console.log('🔍 [GRAPH DEBUG] Final flow summary:');
    console.log('🔍 [GRAPH DEBUG] - Agents:', flow.agents.size, Array.from(flow.agents.entries()));
    console.log('🔍 [GRAPH DEBUG] - Tools:', flow.tools.size, Array.from(flow.tools.entries()));
    console.log('🔍 [GRAPH DEBUG] - Handoffs:', flow.handoffs.length, flow.handoffs);
    console.log('🔍 [GRAPH DEBUG] - User interactions:', flow.userInteractions.length, flow.userInteractions);
    console.log('🔍 [GRAPH DEBUG] - Tool calls:', flow.toolCalls.length, flow.toolCalls);

    return flow;
  }, [events]);

  // Generate nodes and edges based on session flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    console.log('🔍 [NODE DEBUG] Generating nodes and edges...');
    const agentEntries = Array.from(sessionFlow.agents.entries()); // [agent_id, display_name] pairs
    const tools = Array.from(sessionFlow.tools.keys());
    
    console.log('🔍 [NODE DEBUG] Agent entries for node creation:', agentEntries);
    console.log('🔍 [NODE DEBUG] Tools for node creation:', tools);

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

    // Create agent nodes - use agent_id as node key, display_name as label
    const nodes: Node[] = agentEntries.map(([agentId, displayName]) => {
      const colorClass = getAgentColorClass(displayName);
      const isActive = events.slice(0, currentEventIndex + 1).some(e => (e.agent_id || e.agent) === agentId);
      const hasViolations = events.some(e => (e.agent_id || e.agent) === agentId && e.detections && e.detections.length > 0);

      console.log(`🔍 [NODE DEBUG] Creating node: id="${agentId}", label="${displayName}", position=${JSON.stringify(agentPositions[agentId])}`);

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

    console.log(`🔍 [NODE DEBUG] Created ${nodes.length} agent nodes:`, nodes.map(n => ({ id: n.id, label: n.data.label })));

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
                 targetId === (nextResponse?.agent_id || nextResponse?.agent);
                 
        case 'tool_call':
          // Agent uses tool - show arrow from agent to tool
          return edgeType === 'tool_call' && 
                 sourceId === (currentEvent.agent_id || currentEvent.agent) && 
                 targetId === currentEvent.details?.tool_name;
                 
        case 'agent_response':
          // Agent responds - show arrow from agent to user
          return edgeType === 'user_interaction' && 
                 sourceId === (currentEvent.agent_id || currentEvent.agent) && 
                 targetId === 'User';
                 
        case 'handoff':
          // Agent handoff - show arrow from source to target agent
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