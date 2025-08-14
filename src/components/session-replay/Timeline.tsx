import React from 'react';
import { TimelineEvent } from '@/types/session';
import { getAgentColorClass } from '@/utils/sessionProcessor';
import { AlertTriangle } from 'lucide-react';
interface TimelineProps {
  timelineEvents: TimelineEvent[];
  currentEventIndex: number;
  onTimelineClick: (index: number) => void;
}
const Timeline: React.FC<TimelineProps> = ({
  timelineEvents,
  currentEventIndex,
  onTimelineClick
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  return <div className="h-32 bg-background border-t border-border p-4">
      <div className="h-full flex flex-col">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Session Start</span>
          
          <span>Session End</span>
        </div>
        
        <div className="relative flex-1 bg-background rounded border">
          {/* Timeline background line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border transform -translate-y-1/2" />
          
          {/* Current position indicator */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-20" style={{
          left: timelineEvents[currentEventIndex]?.x ? `${timelineEvents[currentEventIndex].x}%` : '0%'
        }} />
          
          {/* Event markers */}
          {timelineEvents.map((event, index) => {
          const colorClass = getAgentColorClass(event.agent);
          const isPast = index <= currentEventIndex;
          const isCurrent = index === currentEventIndex;

          // Calculate dynamic spacing to prevent overlap
          const nextEvent = timelineEvents[index + 1];
          const prevEvent = timelineEvents[index - 1];
          const spacing = nextEvent ? Math.abs(nextEvent.x - event.x) : 100;
          const prevSpacing = prevEvent ? Math.abs(event.x - prevEvent.x) : 100;
          const minSpacing = Math.min(spacing, prevSpacing);

          // Only show label if there's enough space or if it's the current event
          const showLabel = isCurrent || minSpacing > 8;
          return <div key={event.id} className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10 transition-all duration-200 ${isCurrent ? 'scale-150' : isPast ? 'scale-110' : 'scale-100'}`} style={{
            left: `${event.x}%`
          }} onClick={() => onTimelineClick(index)} title={`${event.agent} - ${event.type} - ${formatTime(event.timestamp)}`}>
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full border-2 border-background ${isPast ? 'opacity-100' : 'opacity-50'} ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''} ${
                    event.severity ? (
                      event.severity === 'critical' ? 'bg-red-600' :
                      event.severity === 'high' ? 'bg-red-400' :
                      event.severity === 'medium' ? 'bg-orange-400' :
                      'bg-yellow-400'
                    ) : ''
                  }`} style={!event.severity ? {
                backgroundColor: `hsl(var(--${colorClass}))`
              } : {}} />
                  
                  {/* Warning icon for events with violations */}
                  {(event.hasViolations || event.type === 'violation') && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-2 w-2 text-destructive-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Event type indicator - only show when there's space or current */}
                {showLabel && <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap pointer-events-none">
                    <div className={`text-xs px-1 py-0.5 rounded text-center min-w-[16px] ${isPast ? 'opacity-100' : 'opacity-50'} ${
                      event.severity ? (
                        event.severity === 'critical' ? 'bg-red-600/10 text-red-600' :
                        event.severity === 'high' ? 'bg-red-400/10 text-red-400' :
                        event.severity === 'medium' ? 'bg-orange-400/10 text-orange-400' :
                        'bg-yellow-400/10 text-yellow-600'
                      ) : ''
                    }`} style={!event.severity ? {
                backgroundColor: `hsl(var(--${colorClass}) / 0.1)`,
                color: `hsl(var(--${colorClass}))`
              } : {}}>
                      {event.type === 'user_message' && 'U'}
                      {event.type === 'agent_response' && 'A'}
                      {event.type === 'handoff' && 'H'}
                      {event.type === 'tool_call' && 'T'}
                      {event.type === 'violation' && 'V'}
                    </div>
                  </div>}
              </div>;
        })}
          
          {/* Click areas for timeline scrubbing */}
          <div className="absolute inset-0 flex">
            {timelineEvents.map((_, index) => <div key={index} className="flex-1 cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => onTimelineClick(index)} />)}
          </div>
        </div>
        
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-4 mx-[33px]">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>User</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Agent</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>Tool</span>
            </span>
          </div>
          <span>
            Event {currentEventIndex + 1} of {timelineEvents.length}
          </span>
        </div>
      </div>
    </div>;
};
export default Timeline;