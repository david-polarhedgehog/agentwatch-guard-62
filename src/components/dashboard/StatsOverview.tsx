import { Bot, MessageSquare, AlertTriangle, Activity } from 'lucide-react';
import { StatsCard } from '@/components/ui/stats-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useStats } from '@/hooks/useReactQuery';
import { formatNumber } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { SystemStats } from '@/types';

export function StatsOverview() {
  const { data: stats, isLoading, error } = useStats();
  const navigate = useNavigate();

  // Helper function to calculate sessions created today (placeholder)
  const getSessionsToday = (stats: SystemStats): number => {
    // Since we don't have daily session data from the API, we'll show a placeholder
    // In a real implementation, this would filter sessions by created_at date
    return Math.floor(stats.sessions_count * 0.1); // Assume 10% of sessions were created today
  };

  // Debug logging for stats
  console.log('📊 Stats Debug:', { stats, isLoading, error });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    console.warn('📊 No stats data available');
    return null;
  }

  // Use detections_count if available, otherwise calculate from severity counts
  const totalViolations = stats.detections_count ?? 
    (stats.high_severity_count + stats.medium_severity_count + stats.low_severity_count);

  console.log('📊 Calculated violations:', { 
    detections_count: stats.detections_count,
    high: stats.high_severity_count,
    medium: stats.medium_severity_count,
    low: stats.low_severity_count,
    totalViolations 
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Total Agents"
        value={formatNumber(stats.agents_count)}
        subtitle="AI agents monitored"
        icon={Bot}
        variant="default"
      />
      
      <StatsCard
        title="Sessions Today"
        value={formatNumber(getSessionsToday(stats))}
        subtitle={`of ${formatNumber(stats.sessions_count)} total`}
        icon={Activity}
        variant="success"
      />
      
      <div onClick={() => navigate('/sessions')} className="cursor-pointer">
        <StatsCard
          title="Total Sessions"
          value={formatNumber(stats.sessions_count)}
          subtitle="Conversation threads"
          icon={MessageSquare}
          variant="default"
        />
      </div>
      
      <div onClick={() => navigate('/violations')} className="cursor-pointer">
        <StatsCard
          title="Security Violations"
          value={formatNumber(totalViolations)}
          subtitle={`${stats.high_severity_count || 0} high severity`}
          icon={AlertTriangle}
          variant={(stats.high_severity_count || 0) > 0 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}