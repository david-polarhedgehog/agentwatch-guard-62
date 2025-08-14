import { Agent } from '@/types';
import { api } from '@/lib/api';

// Cache for agent names to avoid repeated API calls
const agentNameCache = new Map<string, { name: string; cached_at: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Service for resolving agent names from agent IDs
 * Provides caching and batch resolution capabilities
 */
export class AgentNameService {
  /**
   * Get display name for an agent ID
   * Returns cached name if available, otherwise fetches from API
   */
  static async getAgentName(agentId: string): Promise<string> {
    // Check cache first
    const cached = agentNameCache.get(agentId);
    if (cached && Date.now() - cached.cached_at < CACHE_DURATION) {
      return cached.name;
    }

    try {
      const agent = await api.agents.get(agentId);
      const displayName = agent.agent_name || this.getCleanAgentName(agentId);
      
      // Cache the result
      agentNameCache.set(agentId, {
        name: displayName,
        cached_at: Date.now()
      });
      
      return displayName;
    } catch (error) {
      console.warn(`Failed to fetch agent name for ${agentId}:`, error);
      // Return cleaned ID as fallback
      const fallbackName = this.getCleanAgentName(agentId);
      
      // Cache the fallback to avoid repeated failed requests
      agentNameCache.set(agentId, {
        name: fallbackName,
        cached_at: Date.now()
      });
      
      return fallbackName;
    }
  }

  /**
   * Get display names for multiple agent IDs in batch
   * Optimizes for multiple agent name resolutions
   */
  static async getAgentNames(agentIds: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const uncachedIds: string[] = [];

    // Check cache for all IDs first
    for (const agentId of agentIds) {
      const cached = agentNameCache.get(agentId);
      if (cached && Date.now() - cached.cached_at < CACHE_DURATION) {
        results[agentId] = cached.name;
      } else {
        uncachedIds.push(agentId);
      }
    }

    // Fetch uncached agent names
    if (uncachedIds.length > 0) {
      const fetchPromises = uncachedIds.map(async (agentId) => {
        try {
          const agent = await api.agents.get(agentId);
          const displayName = agent.agent_name || this.getCleanAgentName(agentId);
          
          // Cache the result
          agentNameCache.set(agentId, {
            name: displayName,
            cached_at: Date.now()
          });
          
          return { agentId, name: displayName };
        } catch (error) {
          console.warn(`Failed to fetch agent name for ${agentId}:`, error);
          const fallbackName = this.getCleanAgentName(agentId);
          
          // Cache the fallback
          agentNameCache.set(agentId, {
            name: fallbackName,
            cached_at: Date.now()
          });
          
          return { agentId, name: fallbackName };
        }
      });

      const fetchedResults = await Promise.all(fetchPromises);
      fetchedResults.forEach(({ agentId, name }) => {
        results[agentId] = name;
      });
    }

    return results;
  }

  /**
   * Clear cached agent names
   * Useful for refreshing data
   */
  static clearCache(): void {
    agentNameCache.clear();
  }

  /**
   * Get cached agent name without API call
   * Returns null if not cached
   */
  static getCachedAgentName(agentId: string): string | null {
    const cached = agentNameCache.get(agentId);
    if (cached && Date.now() - cached.cached_at < CACHE_DURATION) {
      return cached.name;
    }
    return null;
  }

  /**
   * Fallback method to create readable names from agent IDs
   * Used when API calls fail or agent_name is not available
   */
  private static getCleanAgentName(agentId: string): string {
    // Convert agent IDs to readable names
    if (agentId.includes('Customer Service Agent') || agentId.includes('customer_service')) {
      return 'Customer Service Agent';
    }
    if (agentId.includes('File System Agent') || agentId.includes('file_system')) {
      return 'File System Agent';
    }
    if (agentId.includes('Web Search Agent') || agentId.includes('web_search')) {
      return 'Web Search Agent';
    }
    if (agentId.includes('summarizer')) {
      return 'Summarizer Agent';
    }
    
    // Generic cleanup for unknown agent types
    return agentId
      .replace(/^agent_/, '') // Remove agent_ prefix
      .replace(/_agent_[a-f0-9]+$/, '') // Remove _agent_<hash> suffix
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Title case
  }
}