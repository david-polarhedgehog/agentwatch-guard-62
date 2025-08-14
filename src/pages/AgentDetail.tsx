import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, MessageSquare, AlertTriangle, Wrench, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDateTime } from '@/lib/utils';
import { useAgent, useAgentSessions, useAgentViolations, useAgentTools } from '@/hooks/useReactQuery';
import { AgentToolsCard } from '@/components/agents/AgentToolsCard';
import { EntityBadge } from '@/components/ui/entity-badge';
export default function AgentDetail() {
  const {
    agentId
  } = useParams();
  const navigate = useNavigate();

  // Fetch real data from API
  const {
    data: agent,
    isLoading: agentLoading,
    error: agentError
  } = useAgent(agentId!);
  const {
    data: sessionsData,
    isLoading: sessionsLoading
  } = useAgentSessions(agentId!, { page: 1, limit: 1000 }); // Fetch with high limit to get total count
  const {
    data: violationsData,
    isLoading: violationsLoading
  } = useAgentViolations(agentId!);
  const {
    data: toolsData
  } = useAgentTools(agentId!);
  const isLoading = agentLoading || sessionsLoading || violationsLoading;
  if (isLoading) {
    return <MainLayout>
        <div className="p-6">
          <LoadingSpinner text="Loading agent..." className="mt-20" />
        </div>
      </MainLayout>;
  }
  if (agentError || !agent) {
    return <MainLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load agent details</p>
            <Button variant="outline" onClick={() => navigate('/agents')} className="mt-4">
              Back to Agents
            </Button>
          </div>
        </div>
      </MainLayout>;
  }

  // Calculate stats from real API data
  const toolsCount = toolsData?.tools?.length || 0;
  const sessionsCount = sessionsData?.pagination?.total || 0;
  const messagesCount = agent.message_count || 0;
  const violationsCount = violationsData?.pagination?.total || 0;
  return <MainLayout>
      <ModernHeader title={agentId?.slice(0, 20) + '...' || 'Agent Details'} subtitle="AI Agent Configuration and Activity">
        <Button variant="outline" onClick={() => navigate('/agents')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Button>
      </ModernHeader>
      
      <div className="p-6 space-y-6">
        {/* Agent Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Only show tools card if agent has tools */}
          {toolsCount > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tools</span>
                </div>
                <p className="text-2xl font-bold mt-1">{toolsCount}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/sessions?agent=${agentId}`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Sessions</span>
              </div>
              <p className="text-2xl font-bold mt-1">{sessionsCount}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Messages</span>
              </div>
              <p className="text-2xl font-bold mt-1">{messagesCount}</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/violations?agent_id=${agentId}`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-open" />
                <span className="text-sm font-medium">Violations</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-status-open">{violationsCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap break-words">
                {agent.system_prompt}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Tools - Only show if agent has tools */}
        {toolsCount > 0 && <AgentToolsCard agentId={agentId!} />}

        {/* Activity Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span className="font-medium">
                  {agent.last_updated ? formatDateTime(agent.last_updated) : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDateTime(agent.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={agent.has_violations ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-status-open/10 text-status-open border-status-open/20"}>
                  {agent.has_violations ? 'Has Violations' : 'Active'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>;
}