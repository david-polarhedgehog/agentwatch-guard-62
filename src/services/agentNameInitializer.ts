import { AgentNameService } from './agentNameService';
import { api } from '@/lib/api';

/**
 * Service to pre-populate agent name cache on app initialization
 * This ensures agent names are available immediately for display
 */
export class AgentNameInitializer {
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize agent name cache with current agents
   * Should be called on app startup
   */
  static async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return;
    }

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private static async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing agent name cache...');
      
      // Fetch all agents to populate cache
      const agentsResponse = await api.agents.list({ per_page: 100 }); // Get first 100 agents
      const agents = agentsResponse.agents || [];

      if (agents.length > 0) {
        // Extract agent IDs
        const agentIds = agents.map(agent => agent.agent_id);
        
        // Pre-populate cache with batch request
        await AgentNameService.getAgentNames(agentIds);
        
        console.log(`✅ Agent name cache initialized with ${agents.length} agents`);
      } else {
        console.log('ℹ️ No agents found to initialize cache');
      }

      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ Failed to initialize agent name cache:', error);
      // Don't throw error to prevent app startup failure
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Re-initialize the cache (useful after new agents are added)
   */
  static async refresh(): Promise<void> {
    this.initialized = false;
    AgentNameService.clearCache();
    return this.initialize();
  }

  /**
   * Check if initialization has completed
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}