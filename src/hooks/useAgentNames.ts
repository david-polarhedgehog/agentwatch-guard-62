import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgentNameService } from '@/services/agentNameService';

/**
 * Hook for resolving a single agent name
 */
export function useAgentName(agentId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agentName', agentId],
    queryFn: () => agentId ? AgentNameService.getAgentName(agentId) : Promise.resolve(''),
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    agentName: data || '',
    isLoading,
    error,
    agentId: agentId || ''
  };
}

/**
 * Hook for resolving multiple agent names
 */
export function useAgentNames(agentIds: string[]) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agentNames', agentIds.sort()], // Sort for consistent cache keys
    queryFn: () => AgentNameService.getAgentNames(agentIds),
    enabled: agentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    agentNames: data || {},
    isLoading,
    error
  };
}

/**
 * Hook for agent display info (name + navigation ID)
 * Returns both the display name and the ID for navigation
 */
export function useAgentDisplayInfo(agentId: string | undefined) {
  const { agentName, isLoading, error } = useAgentName(agentId);

  return useMemo(() => ({
    displayName: agentName,
    navigationId: agentId || '',
    isLoading,
    error
  }), [agentName, agentId, isLoading, error]);
}

/**
 * Hook for batch agent display info
 */
export function useAgentsDisplayInfo(agentIds: string[]) {
  const { agentNames, isLoading, error } = useAgentNames(agentIds);

  return useMemo(() => {
    const displayInfo: Record<string, { displayName: string; navigationId: string }> = {};
    
    agentIds.forEach(agentId => {
      displayInfo[agentId] = {
        displayName: agentNames[agentId] || '',
        navigationId: agentId
      };
    });

    return {
      agentsDisplayInfo: displayInfo,
      isLoading,
      error
    };
  }, [agentNames, agentIds, isLoading, error]);
}

/**
 * Utility hook to get cached agent name immediately (no API call)
 * Useful for components that need immediate display
 */
export function useCachedAgentName(agentId: string | undefined) {
  const [cachedName, setCachedName] = useState<string>('');

  useEffect(() => {
    if (agentId) {
      const cached = AgentNameService.getCachedAgentName(agentId);
      if (cached) {
        setCachedName(cached);
      }
    }
  }, [agentId]);

  return cachedName;
}