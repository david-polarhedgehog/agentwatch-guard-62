// Real API Response Types - matching the actual API response
export interface SessionSummary {
  session_id: string;
  created_at: string;
  current_task: string;
}

export interface ApiSessionResponse {
  session_id: string;
  created_at: string;
  current_task: string;
  primary_agent_id: string;
  chat_history: ChatMessage[];
  agent_responses: AgentResponse[];
  agents_involved: Record<string, AgentInfo>;
  agent_names: Record<string, string>; // Add this field
  tools_used: string[];
  handoffs: any[];
  summary: SessionSummary;
  detections: any[];
  telemetry_enabled: boolean;
  database_source: boolean;
  exported_at: string;
  visualization_metadata: VisualizationMetadata;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  request_id?: string;
  response_id?: string;
  message_id: string;
  correlates_to?: string;
}

export interface AgentResponse {
  timestamp: string;
  agent: string;
  input: string;
  response: string;
  duration_seconds: number;
  outer_agent: string;
  handoff_occurred: boolean;
  tools_used: ToolUsage[];
  request_id: string;
  response_id: string;
  agent_metadata: {
    outer_agent: AgentMetadata;
    actual_agent: AgentMetadata;
  };
  handoff_details?: {
    from_agent: string;
    to_agent: string;
    reason: string;
    handoff_type: string;
  };
}

export interface ToolUsage {
  tool_name: string;
  parameters: Record<string, any>;
  result: Record<string, any>;
  success: boolean;
  timestamp: string;
}

export interface AgentMetadata {
  name: string;
  model: string;
  instructions: string;
  tools: string[];
  handoffs: string[];
}

export interface AgentInfo {
  agent_id: string;
  name: string;
  system_prompt_hash: string;
  tool_functions: Record<string, any>;
  last_updated: string;
  message_count: number;
  handoff_capabilities: string[];
}

export interface VisualizationMetadata {
  total_events: number;
  timeline_duration_minutes: number;
  complexity_score: number;
  interaction_patterns: {
    user_to_agent: number;
    agent_to_agent: number;
    agent_to_tool: number;
    violations_detected: number;
  };
}

// Processed types for UI components
export interface ProcessedEvent {
  id: string;
  timestamp: string;
  type: 'user_message' | 'agent_response' | 'handoff' | 'tool_call' | 'violation';
  agent: string;
  content: string;
  duration?: number;
  detections?: any[]; // Security violations/detections for this event
  severity?: 'low' | 'medium' | 'high' | 'critical'; // For violation events
  details?: {
    from_agent?: string;
    to_agent?: string;
    reason?: string;
    handoff_type?: string;
    tool_name?: string;
    parameters?: Record<string, any>;
    result?: Record<string, any>;
    handoff_occurred?: boolean;
    handoff_details?: {
      from_agent: string;
      to_agent: string;
    };
    // Violation-specific details
    detection_type?: string;
    context?: string;
    matches?: string[];
    violation_id?: number;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'user_message' | 'agent_response' | 'handoff' | 'tool_call' | 'violation';
  agent: string;
  content: string;
  x: number; // Position on timeline (0-100%)
  severity?: 'low' | 'medium' | 'high' | 'critical'; // For violation events
  hasViolations?: boolean; // To show warning icon on regular events
}