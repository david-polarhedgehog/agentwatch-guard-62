import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Bot, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

interface SessionMessagesProps {
  timeline: TimelineEvent[];
  currentEventIndex: number;
  onEventClick: (event: TimelineEvent, index: number) => void;
}

export function SessionMessages({ timeline, currentEventIndex, onEventClick }: SessionMessagesProps) {
  // Convert timeline events to separate request/response events
  const messageEvents = timeline.flatMap((event, originalIndex) => {
    const events = [];
    
    // Add user request event
    if (event.userContent) {
      events.push({
        ...event,
        type: 'request' as const,
        content: event.userContent,
        originalIndex,
        eventIndex: events.length
      });
    }
    
    // Add assistant response event
    if (event.assistantResponse) {
      events.push({
        ...event,
        type: 'response' as const, 
        content: event.assistantResponse,
        originalIndex,
        eventIndex: events.length
      });
    }
    
    return events;
  });

  const formatTime = (timestamp: Date) => {
    const minutes = Math.floor(timestamp.getTime() / 60000);
    const seconds = Math.floor((timestamp.getTime() % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Session Messages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 p-4">
            {messageEvents.map((event, index) => (
              <div
                key={`${event.originalIndex}-${event.type}`}
                onClick={() => onEventClick(event, event.originalIndex)}
                className={cn(
                  "flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
                  currentEventIndex === event.originalIndex && "bg-accent border-primary"
                )}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  event.type === 'request' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {event.type === 'request' ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={event.type === 'request' ? 'default' : 'secondary'}>
                      {event.type === 'request' ? 'User Request' : 'Assistant Response'}
                    </Badge>
                    {event.hasDetections && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Violation
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                  
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {event.content || 'No content available'}
                  </p>
                  
                  {event.detections && event.detections.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {event.detections.map((detection, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {typeof detection === 'string' ? detection : detection.detection_type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}