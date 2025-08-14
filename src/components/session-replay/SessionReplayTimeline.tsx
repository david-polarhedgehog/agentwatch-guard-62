import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  Bot, 
  AlertTriangle, 
  Wrench, 
  ArrowRight,
  Play,
  Pause
} from 'lucide-react';
import { TimelineEvent } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useState } from 'react';

interface SessionReplayTimelineProps {
  timeline: TimelineEvent[];
  currentEventIndex?: number;
  onEventClick: (event: TimelineEvent, index: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
}

export function SessionReplayTimeline({
  timeline,
  currentEventIndex = -1,
  onEventClick,
  onPlayPause,
  isPlaying = false
}: SessionReplayTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No timeline events available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeline ({timeline.length} events)
          </div>
          {onPlayPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPlayPause}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.map((event, index) => {
            const isActive = index === currentEventIndex;
            const isExpanded = expandedEvents.has(index);
            
            return (
              <div 
                key={index}
                className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => onEventClick(event, index)}
              >
                {/* Event Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{event.messageIndex}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(event.timestamp.toISOString())}
                    </span>
                    {event.hasDetections && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {event.detections.length} violation(s)
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(index);
                    }}
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </div>

                {/* Communication Flow */}
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {event.sourceNode?.label || 'Unknown'}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {event.targetNode?.label || 'Unknown'}
                    </span>
                  </div>
                  {event.toolsUsed.length > 0 && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <div className="flex items-center gap-1">
                        <Wrench className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 text-xs">
                          {event.toolsUsed.length} tool(s)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Message Preview */}
                <div className="space-y-2">
                  <div className="bg-blue-50 border-l-4 border-blue-200 p-2 rounded">
                    <p className="text-sm text-blue-900 line-clamp-2">
                      <strong>User:</strong> {event.userContent || 'No content'}
                    </p>
                  </div>
                  
                  {isExpanded && (
                    <>
                      <div className="bg-gray-50 border-l-4 border-gray-200 p-2 rounded">
                        <p className="text-sm text-gray-900">
                          <strong>Assistant:</strong> {event.assistantResponse || 'No response'}
                        </p>
                      </div>

                      {/* Tool Usage */}
                      {event.toolsUsed.length > 0 && (
                        <div className="bg-green-50 border-l-4 border-green-200 p-2 rounded">
                          <p className="text-sm text-green-900 mb-1">
                            <strong>Tools Used:</strong>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {event.toolsUsed.map((tool, toolIndex) => (
                              <Badge key={toolIndex} variant="outline" className="text-xs">
                                <Wrench className="h-3 w-3 mr-1" />
                                {tool?.label || 'Unknown Tool'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Security Detections */}
                      {event.detections.map((detection, detIndex) => (
                        <div 
                          key={detIndex}
                          className="bg-red-50 border-l-4 border-red-200 p-2 rounded"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <Badge 
                              variant="destructive" 
                              className={`text-xs ${
                                detection.severity === 'high' ? 'bg-red-600' :
                                detection.severity === 'medium' ? 'bg-orange-500' :
                                'bg-yellow-500'
                              }`}
                            >
                              {detection.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-red-900">
                            <strong>{detection.detection_type}:</strong> {detection.matches?.join(', ')}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}