import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Wrench, Workflow } from 'lucide-react';
import { SystemGraphNode, SystemGraphEdge } from '@/types';

// Custom Node Components
const UserNode = ({ data }: { data: Record<string, any> }) => {
  const nodeData = data as SystemGraphNode;
  return (
    <div className="bg-primary/10 border-2 border-primary rounded-lg p-3 min-w-[120px]">
      <div className="flex items-center gap-2 mb-1">
        <User className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">User</span>
      </div>
      <p className="text-xs text-muted-foreground">{nodeData.metadata?.description}</p>
    </div>
  );
};

const AgentNode = ({ data }: { data: Record<string, any> }) => {
  const nodeData = data as SystemGraphNode;
  return (
    <div className="bg-primary border-2 border-primary rounded-lg p-3 min-w-[160px] max-w-[200px] shadow-md">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-4 w-4 text-primary-foreground" />
        <span className="text-sm font-semibold text-primary-foreground">Agent</span>
      </div>
      <p className="text-xs text-primary-foreground font-mono truncate" title={nodeData.id}>
        {nodeData.id.split('_').slice(-2).join('_')}
      </p>
      <div className="flex gap-1 mt-2">
        <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
          {nodeData.metadata?.session_count || 0} sessions
        </Badge>
      </div>
    </div>
  );
};

const ToolNode = ({ data }: { data: Record<string, any> }) => {
  const nodeData = data as SystemGraphNode;
  return (
    <div className="bg-tool-call border-2 border-tool-call rounded-lg p-3 min-w-[120px] shadow-md">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="h-4 w-4 text-tool-call-foreground" />
        <span className="text-sm font-semibold text-tool-call-foreground">Tool</span>
      </div>
      <p className="text-xs text-tool-call-foreground font-mono">{nodeData.label}</p>
      <p className="text-xs text-tool-call-foreground/90 mt-1">{nodeData.metadata?.description}</p>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  user: UserNode,
  agent: AgentNode,
  tool: ToolNode,
};

interface SystemArchitectureGraphProps {
  nodes: SystemGraphNode[];
  edges: SystemGraphEdge[];
  highlightedNodes?: string[];
  highlightedEdges?: string[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

export function SystemArchitectureGraph({
  nodes,
  edges,
  highlightedNodes = [],
  highlightedEdges = [],
  onNodeClick,
  onEdgeClick
}: SystemArchitectureGraphProps) {
  // Convert system graph data to React Flow format
  const reactFlowNodes: Node[] = useMemo(() => {
    return nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { 
        x: (index % 3) * 250 + 100, 
        y: Math.floor(index / 3) * 180 + 100 
      },
      data: node as Record<string, any>,
      style: {
        opacity: highlightedNodes.length === 0 || highlightedNodes.includes(node.id) ? 1 : 0.3,
        transition: 'opacity 0.2s ease-in-out',
      },
    }));
  }, [nodes, highlightedNodes]);

  const reactFlowEdges: Edge[] = useMemo(() => {
    return edges.map((edge, index) => {
      const edgeKey = `${edge.source} -> ${edge.target}`;
      const isHighlighted = highlightedEdges.includes(edgeKey);
      
      return {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isHighlighted,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
          width: 20,
          height: 20,
        },
        style: {
          stroke: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
          strokeWidth: isHighlighted ? 4 : 2,
          opacity: highlightedEdges.length === 0 || isHighlighted ? 1 : 0.6,
          transition: 'all 0.2s ease-in-out',
        },
        label: edge.type.replace('_', ' → '),
        labelStyle: {
          fontSize: '12px',
          fontWeight: 600,
          fill: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid hsl(var(--border))',
        },
      };
    });
  }, [edges, highlightedEdges]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Update nodes and edges when props change
  useMemo(() => {
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [reactFlowNodes, reactFlowEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const edgeKey = `${edge.source} -> ${edge.target}`;
    onEdgeClick?.(edgeKey);
  }, [onEdgeClick]);

  return (
    <Card className="h-[500px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          System Architecture
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[420px] w-full">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-background"
          >
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls position="top-right" />
            <MiniMap 
              nodeColor="#94a3b8"
              maskColor="rgba(255, 255, 255, 0.8)"
              position="bottom-right"
              style={{ backgroundColor: '#f8fafc' }}
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}