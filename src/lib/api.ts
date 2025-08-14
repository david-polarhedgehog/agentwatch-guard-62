import axios from 'axios';
import type {
  SystemStats,
  Agent,
  Session,
  Detection,
  Message,
  ApiResponse,
  AgentFilters,
  SessionFilters,
  ViolationFilters,
  GraphMetadata,
  Pagination
} from '@/types';

const API_BASE_URL = 'https://tryme.tendry.net:8080/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.warn('Resource not found, this might be expected for new data');
    }
    return Promise.reject(error);
  }
);

// System stats API
export const statsApi = {
  getStats: async (): Promise<SystemStats> => {
    try {
      const response = await apiClient.get('/stats');
      console.log('📊 Stats API Response:', response.data);
      
      // Ensure we have proper fallback values
      const stats = {
        agents_count: response.data.agents_count || 0,
        sessions_count: response.data.sessions_count || 0,
        detection_results_count: response.data.detection_results_count || 0,
        detections_count: response.data.detections_count || response.data.detection_results_count || 0,
        high_severity_count: response.data.severity_counts?.high || response.data.high_severity_count || 0,
        medium_severity_count: response.data.severity_counts?.medium || response.data.medium_severity_count || 0,
        low_severity_count: response.data.severity_counts?.low || response.data.low_severity_count || 0,
        active_sessions_count: response.data.active_sessions_count || 0,
      };
      
      console.log('📊 Processed stats:', stats);
      return stats;
    } catch (error) {
      console.error('📊 Stats API Error:', error);
      throw error;
    }
  },
};

// Agents API
export const agentsApi = {
  list: async (filters?: AgentFilters & { page?: number; per_page?: number; limit?: number }): Promise<{
    agents: Agent[];
    pagination: Pagination;
  }> => {
    const params = new URLSearchParams();
    
    // Map filters to API parameters
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.per_page || filters?.limit) {
      params.append('limit', String(filters.per_page || filters.limit));
    }
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('order', filters.sort_order);
    
    const response = await apiClient.get(`/agents?${params}`);
    return response.data;
  },

  get: async (id: string): Promise<Agent> => {
    const response = await apiClient.get(`/agents/${id}`);
    return response.data;
  },

  getSessions: async (id: string, filters?: SessionFilters & { page?: number; limit?: number }): Promise<{
    sessions: Session[];
    pagination: Pagination;
  }> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    const response = await apiClient.get(`/agents/${id}/sessions?${params}`);
    return response.data;
  },

  // Get violations/detections for a specific agent
  getDetections: async (id: string, filters?: ViolationFilters): Promise<{
    detections: Detection[];
    pagination: Pagination;
  }> => {
    const params = new URLSearchParams();
    params.append('agent_id', id); // Filter detections by agent
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.detection_type) params.append('detection_type', filters.detection_type);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.per_page) params.append('limit', String(filters.per_page));
    
    const response = await apiClient.get(`/detections?${params}`);
    return response.data;
  },

  // Get violation count for a specific agent
  getViolationCount: async (id: string): Promise<{ count: number; severity_breakdown: { high: number; medium: number; low: number } }> => {
    try {
      const params = new URLSearchParams();
      params.append('agent_id', id);
      params.append('count_only', 'true');
      params.append('limit', '1000'); // Set a high limit to ensure we get all violations
      
      const response = await apiClient.get(`/detections?${params}`);
      // If the API returns a count field, use it; otherwise count the detections array
      if (response.data.count !== undefined) {
        return response.data;
      } else {
        const detections = response.data.detections || [];
        const severityBreakdown = {
          high: detections.filter((d: Detection) => d.severity === 'high').length,
          medium: detections.filter((d: Detection) => d.severity === 'medium').length,
          low: detections.filter((d: Detection) => d.severity === 'low').length,
        };
        return {
          count: detections.length,
          severity_breakdown: severityBreakdown
        };
      }
    } catch (error) {
      console.warn(`Failed to get violation count for agent ${id}:`, error);
      return { count: 0, severity_breakdown: { high: 0, medium: 0, low: 0 } };
    }
  },

  getTools: async (id: string): Promise<{
    agent_id: string;
    summary: {
      unique_tools_used: number;
      total_tool_calls: number;
      successful_calls: number;
      failed_calls: number;
      success_rate: number;
      avg_duration: number;
      first_tool_use: string;
      last_tool_use: string;
      most_used_tool: string;
    };
    tools: Array<{
      id: number;
      name: string;
      description: string;
      schema: any;
      created_at: string;
      last_updated: string;
      global_stats: {
        total_calls: number;
        successful_calls: number;
        failed_calls: number;
        last_called: string;
        success_rate: number;
        avg_duration_seconds: number;
        total_duration_seconds: number;
      };
      agent_stats: {
        usage_count: number;
        successful_calls: number;
        failed_calls: number;
        success_rate: number;
        avg_duration_seconds: number;
        last_used: string;
      };
    }>;
  }> => {
    const response = await apiClient.get(`/agents/${id}/tools`);
    return response.data;
  },

  getTool: async (agentId: string, toolId: string): Promise<{
    tool_info: {
      name: string;
      description: string;
      schema: any;
    };
    recent_runs: Array<{
      execution_id: string;
      input_parameters: any;
      output_result: any;
      success: boolean;
      duration: number;
      timestamp: string;
      session_id: string;
    }>;
    error_examples: Array<{
      input_parameters: any;
      error_message: string;
      timestamp: string;
      session_id: string;
    }>;
  }> => {
    const response = await apiClient.get(`/agents/${agentId}/tools/${toolId}`);
    return response.data;
  },
};

// Sessions API
export const sessionsApi = {
  list: async (filters?: SessionFilters & { page?: number; per_page?: number; limit?: number }): Promise<{
    sessions: Session[];
    pagination: Pagination;
  }> => {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.per_page || filters?.limit) {
      params.append('limit', String(filters.per_page || filters.limit));
    }
    if (filters?.agent_id) params.append('agent_id', filters.agent_id);
    if (filters?.has_detections !== undefined) params.append('has_detections', String(filters.has_detections));
    if (filters?.severity) params.append('severity', filters.severity);
    
    const response = await apiClient.get(`/sessions?${params}`);
    return response.data;
  },

  getComplete: async (id: string) => {
    const response = await apiClient.get(`/sessions/${id}/complete`);
    return response.data;
  },
};

// Detections/Violations API
export const detectionsApi = {
  list: async (filters?: ViolationFilters & { page?: number; per_page?: number; limit?: number }): Promise<{
    detections: Detection[];
    pagination: Pagination;
  }> => {
    const params = new URLSearchParams();
    
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.per_page || filters?.limit) {
      params.append('limit', String(filters.per_page || filters.limit));
    }
    if (filters?.session_id) params.append('session_id', filters.session_id);
    if (filters?.agent_id) params.append('agent_id', filters.agent_id);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.detection_type) params.append('detection_type', filters.detection_type);
    
    const response = await apiClient.get(`/detections?${params}`);
    return response.data;
  },

  getRecent: async (limit?: number): Promise<Detection[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    
    const response = await apiClient.get(`/detections/recent?${params}`);
    return response.data.detections;
  },

  get: async (id: number): Promise<Detection> => {
    const response = await apiClient.get(`/detections/${id}`);
    return response.data;
  },

  // Get detailed violation with agent, session, and message info
  getViolationDetails: async (id: number): Promise<{
    violation: Detection;
    agent_info?: Agent;
    session_info?: Session;
    message_info?: Message;
  }> => {
    const response = await apiClient.get(`/violations/${id}`);
    return response.data;
  },

  // Get violations for a specific session
  getSessionViolations: async (sessionId: string): Promise<{
    detections: Detection[];
    pagination: Pagination;
  }> => {
    try {
      // Try the specific session violations endpoint first
      const response = await apiClient.get(`/violations/session/${sessionId}`);
      return response.data;
    } catch (error) {
      // Fallback to filtering detections by session_id
      console.warn(`Session violations endpoint failed for ${sessionId}, falling back to detections filter`);
      const params = new URLSearchParams();
      params.append('session_id', sessionId);
      const response = await apiClient.get(`/detections?${params}`);
      return response.data;
    }
  },
};

// Graphs API
export const graphsApi = {
  getAgentGraph: async (
    agentId: string,
    options?: {
      format?: 'dot' | 'svg' | 'json';
      layout?: 'hierarchical' | 'circular' | 'organic' | 'spring' | 'radial';
      include_detections?: boolean;
    }
  ): Promise<{
    content: string;
    metadata: GraphMetadata;
    format: string;
    layout: string;
  }> => {
    const params = new URLSearchParams();
    if (options?.format) params.append('format', options.format);
    if (options?.layout) params.append('layout', options.layout);
    if (options?.include_detections !== undefined) {
      params.append('include_detections', String(options.include_detections));
    }
    
    const response = await apiClient.get(`/graphs/agent/${agentId}?${params}`);
    return response.data;
  },

  getSessionGraph: async (
    sessionId: string,
    options?: {
      format?: 'dot' | 'svg' | 'json';
      layout?: 'hierarchical' | 'circular' | 'organic' | 'spring' | 'radial';
      include_detections?: boolean;
    }
  ): Promise<{
    content: string;
    metadata: GraphMetadata;
    format: string;
    layout: string;
  }> => {
    const params = new URLSearchParams();
    if (options?.format) params.append('format', options.format);
    if (options?.layout) params.append('layout', options.layout);
    if (options?.include_detections !== undefined) {
      params.append('include_detections', String(options.include_detections));
    }
    
    const response = await apiClient.get(`/graphs/session/${sessionId}?${params}`);
    return response.data;
  },
};

// Export all APIs
// System Architecture API
export const systemApi = {
  getMultiAgentGraph: () => apiClient.get('/graphs/multi-agent'),
};

// Session Mapping API  
export const sessionMappingApi = {
  getSessionMapping: (sessionId: string, includeDetections: boolean = true) =>
    apiClient.get(`/sessions/${sessionId}/mapping`, {
      params: { include_detections: includeDetections }
    }),
};

export const api = {
  stats: statsApi,
  agents: agentsApi,
  sessions: sessionsApi,
  detections: detectionsApi,
  graphs: graphsApi,
  system: systemApi,
  sessionMapping: sessionMappingApi,
};

export default api;