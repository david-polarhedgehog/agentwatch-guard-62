import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCompleteSession } from '@/lib/sessionApi';
import { processSessionData } from '@/utils/sessionProcessor';
import type {
  AgentFilters,
  SessionFilters,
  ViolationFilters,
  GraphLayout,
} from '@/types';

// Query keys
export const queryKeys = {
  stats: ['stats'] as const,
  agents: ['agents'] as const,
  agent: (id: string) => ['agents', id] as const,
  agentSessions: (id: string) => ['agents', id, 'sessions'] as const,
  agentViolations: (id: string) => ['agents', id, 'violations'] as const,
  agentGraph: (id: string, layout: string) => ['agents', id, 'graph', layout] as const,
  sessions: ['sessions'] as const,
  session: (id: string) => ['sessions', id] as const,
  sessionMessages: (id: string) => ['sessions', id, 'messages'] as const,
  sessionDetections: (id: string) => ['sessions', id, 'detections'] as const,
  sessionGraph: (id: string) => ['sessions', id, 'graph'] as const,
  violations: ['violations'] as const,
  violation: (id: number) => ['violations', id] as const,
  recentViolations: ['violations', 'recent'] as const,
  // Session Replay
  systemGraph: ['system', 'graph'] as const,
  sessionMapping: (id: string) => ['sessions', id, 'mapping'] as const,
};

// Stats hooks
export const useStats = () => {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: api.stats.getStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

// Agent hooks
export const useAgents = (filters?: AgentFilters & { page?: number; per_page?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.agents, filters],
    queryFn: () => api.agents.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAgent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.agent(id),
    queryFn: () => api.agents.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAgentSessions = (id: string, filters?: SessionFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.agentSessions(id), filters],
    queryFn: () => api.agents.getSessions(id, filters),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAgentViolations = (id: string, filters?: ViolationFilters) => {
  return useQuery({
    queryKey: [...queryKeys.agentViolations(id), filters],
    queryFn: () => api.agents.getDetections(id, filters),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute for violations
  });
};

// New hook for getting agent violation count
export const useAgentViolationCount = (id: string) => {
  return useQuery({
    queryKey: ['agents', id, 'violation-count'],
    queryFn: () => api.agents.getViolationCount(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAgentTools = (id: string) => {
  return useQuery({
    queryKey: ['agents', id, 'tools'],
    queryFn: async () => {
      console.log('🔧 Fetching agent tools for:', id);
      const result = await api.agents.getTools(id);
      console.log('🔧 Agent tools result:', result);
      return result;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAgentTool = (agentId: string, toolId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['agents', agentId, 'tools', toolId],
    queryFn: () => api.agents.getTool(agentId, toolId),
    enabled: !!agentId && !!toolId && (options?.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAgentGraph = (id: string, layout: GraphLayout = 'hierarchical') => {
  return useQuery({
    queryKey: queryKeys.agentGraph(id, layout),
    queryFn: () => api.graphs.getAgentGraph(id, { 
      format: 'dot', 
      layout,
      include_detections: true 
    }),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - graphs change less frequently
  });
};

// Add new session graph hook
export const useSessionGraph = (id: string, layout?: string) => {
  return useQuery({
    queryKey: [...queryKeys.sessionGraph(id), layout],
    queryFn: async () => {
      try {
        const result = await api.graphs.getSessionGraph(id, { 
          format: 'dot', 
          layout: layout as any,
          include_detections: true 
        });
        console.log('🔍 API Graph Response:', {
          sessionId: id,
          layout,
          result,
          contentLength: result?.content?.length
        });
        return result;
      } catch (error) {
        console.error('🔍 API Graph Error:', {
          sessionId: id,
          layout,
          error,
          errorMessage: (error as any).message,
          errorResponse: (error as any).response?.data
        });
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log('🔍 Graph API Retry:', { failureCount, error: (error as any).message });
      return failureCount < 2; // Only retry twice
    }
  });
};

// Session hooks
export const useSessions = (filters?: SessionFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.sessions, filters],
    queryFn: () => api.sessions.list(filters),
    staleTime: 2 * 60 * 1000,
  });
};

// Shared complete session data hook to avoid multiple calls
export const useSessionComplete = (id: string) => {
  return useQuery({
    queryKey: ['session-complete', id],
    queryFn: () => getCompleteSession(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSession = (id: string) => {
  const { data: completeSession, isLoading, error } = useSessionComplete(id);
  
  return {
    data: completeSession ? {
      session_id: completeSession.session_id,
      agent_id: completeSession.primary_agent_id,
      primary_agent_id: completeSession.primary_agent_id,
      created_at: completeSession.created_at,
      updated_at: completeSession.exported_at,
      status: 'active',
      total_messages: completeSession.chat_history?.length || 0,
      has_detections: completeSession.detections && completeSession.detections.length > 0,
      detection_count: completeSession.detections?.length || 0,
      agent_names: completeSession.agent_names || {},
      agents_involved: completeSession.agents_involved,
      recent_messages: completeSession.chat_history,
      agent_responses: completeSession.agent_responses,
      // Pass through the complete session for convenience
      ...completeSession,
    } : undefined,
    isLoading,
    error
  };
};

export const useSessionMessages = (id: string, page?: number, per_page?: number) => {
  const { data: completeSession, isLoading, error } = useSessionComplete(id);
  
  const processedData = completeSession ? (() => {
    const messages = completeSession.chat_history || [];
    
    // Apply pagination if specified
    let paginatedMessages = messages;
    if (page && per_page) {
      const startIndex = (page - 1) * per_page;
      paginatedMessages = messages.slice(startIndex, startIndex + per_page);
    }
    
    return {
      messages: paginatedMessages,
      pagination: {
        page: page || 1,
        per_page: per_page || messages.length,
        total: messages.length,
        total_pages: per_page ? Math.ceil(messages.length / per_page) : 1,
      }
    };
  })() : undefined;
  
  return {
    data: processedData,
    isLoading,
    error
  };
};

export const useSessionDetections = (id: string) => {
  const { data: completeSession, isLoading, error } = useSessionComplete(id);
  
  const processedData = completeSession ? (() => {
    const detections = completeSession.detections || [];
    
    // Create summary
    const summary = {
      total: detections.length,
      high_severity: detections.filter(d => d.severity === 'high').length,
      medium_severity: detections.filter(d => d.severity === 'medium').length,
      low_severity: detections.filter(d => d.severity === 'low').length,
    };
    
    return { detections, summary };
  })() : undefined;
  
  return {
    data: processedData,
    isLoading,
    error
  };
};

// Violation hooks
export const useViolations = (filters?: ViolationFilters & { page?: number; per_page?: number }) => {
  return useQuery({
    queryKey: [...queryKeys.violations, filters],
    queryFn: () => api.detections.list(filters),
    staleTime: 1 * 60 * 1000,
  });
};

export const useViolation = (id: number) => {
  return useQuery({
    queryKey: queryKeys.violation(id),
    queryFn: () => api.detections.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useViolationDetails = (id: number) => {
  return useQuery({
    queryKey: [...queryKeys.violation(id), 'details'],
    queryFn: () => api.detections.getViolationDetails(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSessionViolations = (sessionId: string) => {
  return useQuery({
    queryKey: ['session-violations', sessionId],
    queryFn: async () => {
      try {
        // Try the session violations endpoint first
        return await api.detections.getSessionViolations(sessionId);
      } catch (error) {
        console.warn('Session violations endpoint failed, trying detections filter:', error);
        // Fallback to detections list with session filter
        return await api.detections.list({ session_id: sessionId });
      }
    },
    enabled: !!sessionId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useRecentViolations = (limit?: number) => {
  return useQuery({
    queryKey: [...queryKeys.recentViolations, limit],
    queryFn: () => api.detections.getRecent(limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh
  });
};

// Real-time data invalidation hook
export const useRealtimeInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateStats = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const invalidateRecentViolations = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recentViolations });
  };

  const invalidateAgentData = (agentId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.agent(agentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.agentSessions(agentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.agentViolations(agentId) });
  };

  const invalidateSessionData = (sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionMessages(sessionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionDetections(sessionId) });
  };

  const invalidateAllViolations = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.violations });
    queryClient.invalidateQueries({ queryKey: queryKeys.recentViolations });
  };

  return {
    invalidateStats,
    invalidateRecentViolations,
    invalidateAgentData,
    invalidateSessionData,
    invalidateAllViolations,
  };
};

// Session Replay hooks
export const useSystemGraph = () => {
  return useQuery({
    queryKey: queryKeys.systemGraph,
    queryFn: async () => {
      try {
        console.log('🔍 System Graph API Call - Starting');
        const result = await api.system.getMultiAgentGraph();
        console.log('🔍 System Graph API Call - Success:', {
          result,
          dataStructure: result?.data ? {
            hasGraph: !!result.data.graph,
            nodeCount: result.data.graph?.nodes?.length,
            edgeCount: result.data.graph?.edges?.length
          } : null
        });
        return result;
      } catch (error) {
        console.error('🔍 System Graph API Call - Error:', {
          error,
          message: (error as any).message,
          status: (error as any).response?.status,
          data: (error as any).response?.data
        });
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - system architecture changes less frequently
  });
};

export const useSessionMapping = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.sessionMapping(sessionId),
    queryFn: async () => {
      try {
        console.log('🔍 Session Mapping API Call - Starting:', { sessionId });
        const result = await api.sessionMapping.getSessionMapping(sessionId, true);
        console.log('🔍 Session Mapping API Call - Success:', {
          sessionId,
          result,
          dataStructure: result?.data ? {
            hasSessionMapping: !!result.data.session_mapping,
            hasMappings: !!result.data.session_mapping?.message_mappings,
            mappingCount: result.data.session_mapping?.message_mappings?.length
          } : null
        });
        return result;
      } catch (error) {
        console.error('🔍 Session Mapping API Call - Error:', {
          sessionId,
          error,
          message: (error as any).message,
          status: (error as any).response?.status,
          data: (error as any).response?.data,
          isNotFound: (error as any).response?.status === 404
        });
        throw error;
      }
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry 404 errors - the endpoint might not exist
      if ((error as any).response?.status === 404) {
        console.log('🔍 Session Mapping - Not retrying 404 error');
        return false;
      }
      return failureCount < 2;
    }
  });
};