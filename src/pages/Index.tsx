import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentViolations } from '@/components/dashboard/RecentViolations';
import { TopAgents } from '@/components/dashboard/TopAgents';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';

const Index = () => {
  return (
    <MainLayout>
      <ModernHeader 
        title="AI Agent Security Dashboard" 
        subtitle="Monitor AI agent interactions, detect security violations, and analyze conversation patterns"
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <StatsOverview />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentViolations limit={5} />
          <TopAgents limit={5} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
