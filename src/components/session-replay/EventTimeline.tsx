import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Navigation, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

interface EventTimelineProps {
  timeline: TimelineEvent[];
  currentEventIndex: number;
  onEventClick: (event: TimelineEvent, index: number) => void;
}

export function EventTimeline({ timeline, currentEventIndex, onEventClick }: EventTimelineProps) {
  const getEventIcon = (event: TimelineEvent) => {
    if (event.hasDetections) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (event.userContent?.includes('navigation') || event.userContent?.includes('navigate')) {
      return <Navigation className="h-4 w-4 text-primary" />;
    }
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getEventType = (event: TimelineEvent) => {
    if (event.hasDetections) return 'error';
    if (event.userContent?.includes('navigation')) return 'navigation';
    return 'activity';
  };

  const formatTime = (timestamp: Date) => {
    const minutes = Math.floor(timestamp.getTime() / 60000);
    const seconds = Math.floor((timestamp.getTime() % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Session Events</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 p-4">
            {timeline.map((event, index) => (
              <div
                key={index}
                onClick={() => onEventClick(event, index)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
                  currentEventIndex === index && "bg-accent border-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={getEventType(event) === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {getEventType(event)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.timestamp)}
                      </div>
                    </div>
                    
                    {event.userContent && (
                      <p className="text-sm text-foreground mb-1 truncate">
                        {event.userContent}
                      </p>
                    )}
                    
                    {event.assistantResponse && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.assistantResponse}
                      </p>
                    )}
                    
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
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}