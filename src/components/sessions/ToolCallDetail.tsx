import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Code, FileText, Settings } from 'lucide-react';

interface ToolCall {
  name: string;
  arguments?: any;
  response?: any;
  description?: string;
  parameters?: any;
}

interface ToolCallDetailProps {
  toolCalls: ToolCall[];
  agentToolFunctions?: Record<string, {
    name: string;
    description: string;
    parameters: any;
    usage_count: number;
    first_seen?: string;
  }>;
}

export const ToolCallDetail: React.FC<ToolCallDetailProps> = ({ 
  toolCalls, 
  agentToolFunctions 
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const getToolSchema = (toolName: string) => {
    return agentToolFunctions?.[toolName];
  };

  const formatParameters = (params: any) => {
    if (!params) return 'No parameters';
    return JSON.stringify(params, null, 2);
  };

  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall, index) => {
        const schema = getToolSchema(toolCall.name);
        
        return (
          <Dialog key={index}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs hover:bg-muted/50"
              >
                <Settings className="h-3 w-3 mr-1" />
                {toolCall.name}
                {schema && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {schema.usage_count} uses
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Tool: {toolCall.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Tool Description */}
                {schema?.description && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {schema.description || 'No description available'}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Parameters Schema */}
                {schema?.parameters && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Parameters Schema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {formatParameters(schema.parameters)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                
                {/* Tool Arguments (this execution) */}
                {toolCall.arguments && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Arguments (This Execution)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {formatParameters(toolCall.arguments)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                
                {/* Tool Response (this execution) */}
                {toolCall.response && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Response (This Execution)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {formatParameters(toolCall.response)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                
                {/* Usage Statistics */}
                {schema && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Usage Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline">
                          Total Uses: {schema.usage_count}
                        </Badge>
                        <Badge variant="outline">
                          First Seen: {schema.first_seen ? new Date(schema.first_seen).toLocaleDateString() : 'Unknown'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
};