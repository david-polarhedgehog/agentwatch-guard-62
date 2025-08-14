import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Agent,
  Session,
  Detection,
  SystemStats,
  User,
  FilterState,
  GraphLayout,
  SeverityLevel
} from '@/types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Global data
  stats: SystemStats | null;
  lastStatsUpdate: number | null;
  
  // UI State
  selectedAgent: string | null;
  selectedSession: string | null;
  selectedViolation: number | null;
  graphLayout: GraphLayout;
  
  // Filters
  filters: FilterState;
  
  // Real-time alerts
  recentViolations: Detection[];
  alertCount: number;
  
  // Loading states
  isLoadingStats: boolean;
  isLoadingAgents: boolean;
  isLoadingSessions: boolean;
  isLoadingViolations: boolean;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
  }>;
}

interface AppActions {
  // Auth actions
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  
  // Stats actions
  setStats: (stats: SystemStats) => void;
  updateStatsTimestamp: () => void;
  
  // Selection actions
  setSelectedAgent: (id: string | null) => void;
  setSelectedSession: (id: string | null) => void;
  setSelectedViolation: (id: number | null) => void;
  setGraphLayout: (layout: GraphLayout) => void;
  
  // Filter actions
  updateAgentFilters: (filters: Partial<FilterState['agents']>) => void;
  updateSessionFilters: (filters: Partial<FilterState['sessions']>) => void;
  updateViolationFilters: (filters: Partial<FilterState['violations']>) => void;
  resetFilters: () => void;
  
  // Real-time actions
  addRecentViolation: (violation: Detection) => void;
  clearRecentViolations: () => void;
  incrementAlertCount: () => void;
  resetAlertCount: () => void;
  
  // Loading actions
  setLoadingStats: (loading: boolean) => void;
  setLoadingAgents: (loading: boolean) => void;
  setLoadingSessions: (loading: boolean) => void;
  setLoadingViolations: (loading: boolean) => void;
  
  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const initialFilters: FilterState = {
  agents: {
    search: '',
    has_violations: undefined,
    tool_types: [],
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  sessions: {
    agent_id: undefined,
    has_detections: undefined,
    severity: undefined,
    date_from: undefined,
    date_to: undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  violations: {
    session_id: undefined,
    agent_id: undefined,
    severity: undefined,
    detection_type: undefined,
    date_from: undefined,
    date_to: undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      stats: null,
      lastStatsUpdate: null,
      selectedAgent: null,
      selectedSession: null,
      selectedViolation: null,
      graphLayout: 'hierarchical',
      filters: initialFilters,
      recentViolations: [],
      alertCount: 0,
      isLoadingStats: false,
      isLoadingAgents: false,
      isLoadingSessions: false,
      isLoadingViolations: false,
      notifications: [],

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // Stats actions
      setStats: (stats) => set({ stats }),
      updateStatsTimestamp: () => set({ lastStatsUpdate: Date.now() }),

      // Selection actions
      setSelectedAgent: (id) => set({ selectedAgent: id }),
      setSelectedSession: (id) => set({ selectedSession: id }),
      setSelectedViolation: (id) => set({ selectedViolation: id }),
      setGraphLayout: (layout) => set({ graphLayout: layout }),

      // Filter actions
      updateAgentFilters: (newFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            agents: { ...state.filters.agents, ...newFilters },
          },
        })),
      updateSessionFilters: (newFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            sessions: { ...state.filters.sessions, ...newFilters },
          },
        })),
      updateViolationFilters: (newFilters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            violations: { ...state.filters.violations, ...newFilters },
          },
        })),
      resetFilters: () => set({ filters: initialFilters }),

      // Real-time actions
      addRecentViolation: (violation) =>
        set((state) => ({
          recentViolations: [violation, ...state.recentViolations.slice(0, 9)],
          alertCount: state.alertCount + 1,
        })),
      clearRecentViolations: () => set({ recentViolations: [] }),
      incrementAlertCount: () => set((state) => ({ alertCount: state.alertCount + 1 })),
      resetAlertCount: () => set({ alertCount: 0 }),

      // Loading actions
      setLoadingStats: (loading) => set({ isLoadingStats: loading }),
      setLoadingAgents: (loading) => set({ isLoadingAgents: loading }),
      setLoadingSessions: (loading) => set({ isLoadingSessions: loading }),
      setLoadingViolations: (loading) => set({ isLoadingViolations: loading }),

      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              read: false,
            },
            ...state.notifications,
          ],
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ai-agent-security-store',
    }
  )
);

// Utility hooks
export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAppStore();
  return { user, isAuthenticated, login, logout };
};

export const useFilters = () => {
  const {
    filters,
    updateAgentFilters,
    updateSessionFilters,
    updateViolationFilters,
    resetFilters,
  } = useAppStore();
  return {
    filters,
    updateAgentFilters,
    updateSessionFilters,
    updateViolationFilters,
    resetFilters,
  };
};

export const useSelection = () => {
  const {
    selectedAgent,
    selectedSession,
    selectedViolation,
    setSelectedAgent,
    setSelectedSession,
    setSelectedViolation,
  } = useAppStore();
  return {
    selectedAgent,
    selectedSession,
    selectedViolation,
    setSelectedAgent,
    setSelectedSession,
    setSelectedViolation,
  };
};

export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    markNotificationRead,
    clearNotifications,
  } = useAppStore();
  return {
    notifications,
    addNotification,
    markNotificationRead,
    clearNotifications,
  };
};

export default useAppStore;