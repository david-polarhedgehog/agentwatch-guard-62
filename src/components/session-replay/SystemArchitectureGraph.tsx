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
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 min-w-[160px] max-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">Agent</span>
      </div>
      <p className="text-xs text-blue-700 font-mono truncate" title={nodeData.id}>
        {nodeData.id.split('_').slice(-2).join('_')}
      </p>
      <div className="flex gap-1 mt-2">
        <Badge variant="outline" className="text-xs">
          {nodeData.metadata?.session_count || 0} sessions
        </Badge>
      </div>
    </div>
  );
};

const ToolNode = ({ data }: { data: Record<string, any> }) => {
  const nodeData = data as SystemGraphNode;
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 min-w-[120px]">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-900">Tool</span>
      </div>
      <p className="text-xs text-green-700 font-mono">{nodeData.label}</p>
      <p className="text-xs text-green-600 mt-1">{nodeData.metadata?.description}</p>
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
        style: {
          stroke: isHighlighted ? '#3b82f6' : '#94a3b8',
          strokeWidth: isHighlighted ? 3 : 2,
          opacity: highlightedEdges.length === 0 || isHighlighted ? 1 : 0.3,
          transition: 'all 0.2s ease-in-out',
        },
        label: edge.type.replace('_', ' → '),
        labelStyle: {
          fontSize: '11px',
          fill: isHighlighted ? '#1e40af' : '#64748b',
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