// Core Types for AI Agent Security Monitoring Dashboard

export interface SystemStats {
  agents_count: number;
  sessions_count: number;
  detection_results_count: number;
  detections_count?: number; // Optional field for total violations count
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  active_sessions_count: number;
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface Agent {
  agent_id: string;
  agent_name?: string; // Display name from API
  system_prompt: string;
  tool_functions: Record<string, ToolFunction>;
  session_ids: string[];
  created_at: string;
  message_count: number;
  last_updated?: string;
  violation_count?: number;
  max_severity?: SeverityLevel;
  has_violations?: boolean;
}

export interface Session {
  session_id: string;
  agent_id: string; // Keep for backward compatibility
  agents?: Record<string, string>; // New field: { "Agent Name": "agent_id" }
  created_at: string;
  message_count: number;
  detection_count: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  has_detections: boolean;
  max_severity?: SeverityLevel;
  last_activity?: string;
}

export type SeverityLevel = 'high' | 'medium' | 'low';

export interface Detection {
  id: number;
  session_id: string;
  agent_id?: string;
  agent_name?: string;
  trace_id: string;
  detection_type: string;
  severity: SeverityLevel;
  context: string;
  matches: string[];
  created_at: string;
  message_index?: number;
  message_id?: string; // Add this property
  request_id?: string; // Add this property  
  response_id?: string; // Add this property
  violation_confidence?: number;
  violation_description?: string;
  mitigation_suggestion?: Record<string, {
    code_suggestion: string;
    configuration_suggestion: string;
    active_guardrails: string;
  }>;
}

export interface Message {
  trace_id: string;
  user_content: string;
  assistant_response: string;
  start_time: string;
  end_time?: string;
  tool_calls: ToolCall[];
  tool_responses: ToolResponse[];
  violations?: Detection[];
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  call_id: string;
}

export interface ToolResponse {
  call_id: string;
  result: any;
  error?: string;
  execution_time?: number;
}

export interface GraphMetadata {
  node_count: number;
  edge_count: number;
  layout: GraphLayout;
  generated_at: string;
}

export type GraphLayout = 'hierarchical' | 'circular' | 'organic';

export interface Pagination {
  page: number;
  per_page?: number;
  limit?: number;
  total?: number; // Legacy field
  total_items: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
  metadata?: Record<string, any>;
}

// Filter types
export interface AgentFilters {
  search?: string;
  has_violations?: boolean;
  tool_types?: string[];
  sort_by?: 'created_at' | 'message_count' | 'violation_count';
  sort_order?: 'asc' | 'desc';
}

export interface SessionFilters {
  agent_id?: string;
  has_detections?: boolean;
  severity?: SeverityLevel;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'message_count' | 'detection_count';
  sort_order?: 'asc' | 'desc';
}

export interface ViolationFilters {
  session_id?: string;
  agent_id?: string;
  severity?: SeverityLevel;
  detection_type?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'severity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  limit?: number;
}

// UI State types
export interface FilterState {
  agents: AgentFilters;
  sessions: SessionFilters;
  violations: ViolationFilters;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
}

// Real-time types
export interface WebSocketMessage {
  type: 'violation' | 'session' | 'stats';
  data: Detection | Session | SystemStats;
  timestamp: string;
}

// Graph types
export interface GraphNode {
  id: string;
  label: string;
  type: 'agent' | 'session' | 'tool' | 'user';
  data: Agent | Session | ToolFunction | any;
  violations?: number;
  severity?: SeverityLevel;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'uses' | 'contains' | 'calls' | 'belongs_to';
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

// Session Replay Types
export interface SystemGraph {
  agents_count: number;
  total_sessions: number;
  format: string;
  architecture_type: string;
  graph: {
    nodes: SystemGraphNode[];
    edges: SystemGraphEdge[];
  };
}

export interface SystemGraphNode {
  id: string;
  type: 'user' | 'agent' | 'tool';
  label: string;
  metadata: Record<string, any>;
}

export interface SystemGraphEdge {
  source: string;
  target: string;
  type: 'user_to_agent' | 'agent_to_tool' | 'agent_to_agent';
  metadata: Record<string, any>;
}

export interface SessionMapping {
  session_id: string;
  agent_id: string;
  message_count: number;
  edges_used: string[];
  session_mapping: {
    session_id: string;
    message_mappings: MessageMapping[];
    communication_pattern: CommunicationPattern;
  };
}

export interface MessageMapping {
  message_index: number;
  trace_id: string;
  source: string;
  target: string;
  primary_edge: string;
  timestamp: string;
  user_content: string;
  assistant_response: string;
  tools_used: string[];
  tool_edges_used: string[];
  has_tool_calls: boolean;
  detections: Detection[];
}

export interface CommunicationPattern {
  primary_flow: string;
  tools_involved: string[];
  interaction_type: string;
}

// Timeline Event for UI
export interface TimelineEvent {
  messageIndex: number;
  timestamp: Date;
  userContent: string;
  assistantResponse: string;
  sourceNode?: SystemGraphNode;
  targetNode?: SystemGraphNode;
  primaryEdge?: SystemGraphEdge;
  toolsUsed: SystemGraphNode[];
  toolEdges: SystemGraphEdge[];
  detections: Detection[];
  hasDetections: boolean;
  type?: 'request' | 'response';
  content?: string;
  originalIndex?: number;
  eventIndex?: number;
}
