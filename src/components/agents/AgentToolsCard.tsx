import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDateTime } from '@/lib/utils';
import { useAgentTools, useAgentTool } from '@/hooks/useReactQuery';
interface AgentToolsCardProps {
  agentId: string;
}
export function AgentToolsCard({
  agentId
}: AgentToolsCardProps) {
  const {
    data: toolsData,
    isLoading,
    error
  } = useAgentTools(agentId);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  console.log('🔧 AgentToolsCard Debug:', {
    agentId,
    toolsData,
    isLoading,
    error: error?.message,
    hasTools: !!toolsData?.tools?.length
  });
  if (isLoading) {
    return <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading tools..." />
        </CardContent>
      </Card>;
  }
  if (error) {
    console.error('🔧 AgentToolsCard Error:', error);
    return <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">Failed to load tools data</p>
            <p className="text-xs text-muted-foreground mt-2">
              {error?.message || 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  if (!toolsData?.tools?.length) {
    return <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">No tools configured for this agent</p>
          </div>
        </CardContent>
      </Card>;
  }
  const {
    summary,
    tools
  } = toolsData;
  return <Card>
      <CardHeader>
        <CardTitle>Available Tools</CardTitle>
        {summary && <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{summary.unique_tools_used}</p>
              <p className="text-sm text-muted-foreground">Total Tools</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.total_tool_calls}</p>
              <p className="text-sm text-muted-foreground">Tool Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-status-open">
                {Math.round(summary.success_rate || 0)}%
              </p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            
          </div>}
      </CardHeader>
      <CardContent className="space-y-4">
        {tools.map(tool => <ToolCard key={tool.name} tool={tool} agentId={agentId} isExpanded={expandedTool === tool.name} onToggle={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)} />)}
      </CardContent>
    </Card>;
}
interface ToolCardProps {
  tool: any;
  agentId: string;
  isExpanded: boolean;
  onToggle: () => void;
}
function ToolCard({
  tool,
  agentId,
  isExpanded,
  onToggle
}: ToolCardProps) {
  const {
    data: toolDetails,
    isLoading: detailsLoading
  } = useAgentTool(agentId, tool.name, {
    enabled: isExpanded
  });
  return <div className="border rounded-lg p-4">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <div className="text-left">
                <h3 className="font-medium">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {tool.agent_stats.usage_count} uses
              </Badge>
              <Badge variant="outline" className={Math.round(tool.agent_stats.success_rate || 0) > 80 ? "text-status-open" : "text-destructive"}>
                {Math.round(tool.agent_stats.success_rate || 0)}% success
              </Badge>
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-4">
          {detailsLoading && <LoadingSpinner text="Loading tool details..." />}
          
          {/* Show schema from basic tool data first */}
          {tool.schema && (
            <div>
              <h4 className="font-medium mb-2">Tool Schema</h4>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(tool.schema, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {toolDetails && <>
              {/* Additional schema from detailed endpoint if different */}
              {toolDetails.tool_info?.schema && !tool.schema && <div>
                  <h4 className="font-medium mb-2">Tool Schema</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(toolDetails.tool_info.schema, null, 2)}
                    </pre>
                  </div>
                </div>}

              {/* Tool Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Global Usage</p>
                  <p className="font-medium">{tool.global_stats?.total_calls || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="font-medium">{Math.round((tool.agent_stats?.avg_duration_seconds || 0) * 1000)}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Used</p>
                  <p className="font-medium text-sm">
                    {tool.agent_stats?.last_used ? formatDateTime(tool.agent_stats.last_used) : 'Never'}
                  </p>
                </div>
              </div>

              {/* Recent Runs */}
              {toolDetails.recent_runs?.length > 0 && <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent Tool Calls
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {toolDetails.recent_runs.slice(0, 5).map((run: any, index: number) => (
                      <div key={`run-${run.timestamp || index}`} className="p-3 border rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {run.status === 'success' ? (
                              <CheckCircle className="h-3 w-3 text-status-open" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive" />
                            )}
                            <span className="font-medium capitalize">{run.status || 'Unknown'}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(run.timestamp)}
                          </span>
                        </div>
                        
                        {run.duration_seconds && (
                          <div className="text-xs text-muted-foreground">
                            Duration: {Math.round(run.duration_seconds * 1000)}ms
                          </div>
                        )}
                        
                        {run.input_parameters && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-xs mb-1">Input:</p>
                            <code className="text-xs bg-muted p-1 rounded block break-all">
                              {JSON.stringify(run.input_parameters).slice(0, 100)}
                              {JSON.stringify(run.input_parameters).length > 100 && '...'}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>}

              {/* Error Examples */}
              {toolDetails.error_examples?.length > 0 && <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Error Examples
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {toolDetails.error_examples.slice(0, 3).map((error: any, index: number) => <div key={`error-${error.timestamp || index}`} className="p-3 border border-destructive/20 rounded text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-destructive">Error</span>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(error.timestamp)}
                          </span>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-muted-foreground text-xs mb-1">Error:</p>
                          <p className="text-xs text-destructive bg-destructive/5 p-1 rounded">
                            {error.error_message}
                          </p>
                        </div>
                        
                        {error.input_parameters && <div className="mt-2">
                            <p className="text-muted-foreground text-xs mb-1">Input:</p>
                            <code className="text-xs bg-muted p-1 rounded block break-all">
                              {JSON.stringify(error.input_parameters).slice(0, 150)}
                              {JSON.stringify(error.input_parameters).length > 150 && '...'}
                            </code>
                          </div>}
                      </div>)}
                  </div>
                </div>}
            </>}
        </CollapsibleContent>
      </Collapsible>
    </div>;
}