import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProcessedEvent } from '@/types/session';
import { getAgentColorClass } from '@/utils/sessionProcessor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, User, Bot, ArrowRight, Wrench, ChevronDown, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
interface EventFeedProps {
  events: ProcessedEvent[];
  currentEventIndex: number;
  onEventClick: (index: number) => void;
  sessionId?: string;
  scrollToTraceId?: string;
}
const EventFeed: React.FC<EventFeedProps> = ({
  events,
  currentEventIndex,
  onEventClick,
  sessionId,
  scrollToTraceId
}) => {
  const navigate = useNavigate();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set());

  // Add keyboard navigation
  useKeyboardNavigation({
    onNext: () => {
      if (currentEventIndex < events.filter(event => event.type !== 'violation').length - 1) {
        onEventClick(currentEventIndex + 1);
      }
    },
    onPrevious: () => {
      if (currentEventIndex > 0) {
        onEventClick(currentEventIndex - 1);
      }
    }
  });

  // Scroll to specific event by trace_id when component mounts or scrollToTraceId changes
  const [hasScrolledToTrace, setHasScrolledToTrace] = React.useState(false);
  React.useEffect(() => {
    if (scrollToTraceId && events.length > 0 && !hasScrolledToTrace) {
      console.log('🔍 Looking for traceId:', scrollToTraceId, 'in', events.length, 'events');

      // Try to find event by ID first, then by content matching
      let targetEventIndex = events.findIndex(event => event.id === scrollToTraceId);

      // If not found by ID, try to find by checking if the scrollToTraceId is in the content or details
      if (targetEventIndex === -1) {
        targetEventIndex = events.findIndex(event => event.content.includes(scrollToTraceId) || event.details && JSON.stringify(event.details).includes(scrollToTraceId));
      }
      console.log('🔍 Found event at index:', targetEventIndex);
      if (targetEventIndex !== -1) {
        onEventClick(targetEventIndex);
        setHasScrolledToTrace(true);
        // Scroll to the event element
        setTimeout(() => {
          const eventElement = document.querySelector(`[data-event-id="${events[targetEventIndex].id}"]`);
          if (eventElement) {
            eventElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 100);
      }
    }
  }, [scrollToTraceId, events, onEventClick, hasScrolledToTrace]);

  // Get severity-based border color
  const getSeverityBorderClass = (severity?: string) => {
    switch (severity) {
      case 'low':
        return 'border-yellow-400';
      case 'medium':
        return 'border-orange-400';
      case 'high':
        return 'border-red-400';
      case 'critical':
        return 'border-red-600';
      default:
        return '';
    }
  };

  // Check if event has violations
  const hasViolations = (event: ProcessedEvent) => {
    return event.detections && event.detections.length > 0;
  };

  // Sort violations by severity (critical > high > medium > low)
  const sortViolationsBySeverity = (violations: any[]) => {
    const severityOrder = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };
    return [...violations].sort((a, b) => {
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
      return aSeverity - bSeverity;
    });
  };
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'user_message':
        return <User className="h-4 w-4" />;
      case 'agent_response':
        return <Bot className="h-4 w-4" />;
      case 'handoff':
        return <ArrowRight className="h-4 w-4" />;
      case 'tool_call':
        return <Wrench className="h-4 w-4" />;
      case 'violation':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };
  const toggleViolationExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedViolations(newExpanded);
  };
  return <div className="h-full flex flex-col bg-background border-l border-border">
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <h2 className="text-lg font-semibold">Event Feed</h2>
        <p className="text-sm text-muted-foreground">
          {events.length} events • Currently at event {currentEventIndex + 1}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Use ← → arrow keys to navigate events
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.filter(event => event.type !== 'violation').map((event, index) => {
        const colorClass = getAgentColorClass(event.agent);
        const isActive = index === currentEventIndex;
        const isPast = index <= currentEventIndex;
        const eventHasViolations = hasViolations(event);
        const severityBorderClass = event.severity ? getSeverityBorderClass(event.severity) : '';
        const finalBorderClass = severityBorderClass || (eventHasViolations ? 'border-destructive/50' : '');
        return <Card key={event.id} data-event-id={event.id} className={`cursor-pointer transition-all duration-200 ${isActive ? 'ring-2 ring-primary shadow-lg' : isPast ? 'opacity-100' : 'opacity-50'} ${isActive ? 'scale-105' : 'scale-100'} ${finalBorderClass ? `border-2 ${finalBorderClass}` : ''}`} onClick={() => onEventClick(index)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`p-2 rounded-full flex-shrink-0 relative`} style={{
                  backgroundColor: `hsl(var(--${colorClass}))`,
                  color: `hsl(var(--${colorClass}-foreground))`
                }}>
                      {getEventIcon(event.type)}
                      {eventHasViolations && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs" title="Security violation detected">
                          <AlertTriangle className="h-2.5 w-2.5" />
                        </div>}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="text-xs px-2 py-1" style={{
                      backgroundColor: `hsl(var(--${colorClass}) / 0.15)`,
                      color: `hsl(var(--${colorClass}))`,
                      borderColor: `hsl(var(--${colorClass}) / 0.3)`
                    }}>
                               {event.agent}
                             </Badge>
                         </div>
                       <span className="text-xs text-muted-foreground ml-auto">
                         {formatTimestamp(event.timestamp)}
                       </span>
                     </div>
                    
                     {event.type === 'tool_call' ? <div className="space-y-2">
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold text-blue-600">Using {event.details?.tool_name || 'Normal Search'}</span>
                        </p>
                      </div> : <div className="text-sm leading-relaxed">
                        {event.content.length > 150 ? <div>
                            <p>
                              {expandedEvents.has(event.id) ? event.content : truncateContent(event.content)}
                            </p>
                            <button onClick={e => {
                      e.stopPropagation();
                      toggleEventExpansion(event.id);
                    }} className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs mt-2">
                              {expandedEvents.has(event.id) ? <>
                                  <ChevronDown className="h-3 w-3" />
                                  Collapse
                                </> : <>
                                  <ChevronRight className="h-3 w-3" />
                                  Expand
                                </>}
                            </button>
                          </div> : <p>{event.content}</p>}
                     </div>}
                     
                      {/* Always show violation section for events with violations */}
                     {eventHasViolations && (() => {
                  const sortedViolations = sortViolationsBySeverity(event.detections || []);
                  const mostSevereViolation = sortedViolations[0];
                  return <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2 cursor-pointer hover:bg-red-100 transition-colors" onClick={e => {
                    e.stopPropagation();
                    toggleViolationExpansion(event.id);
                  }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                {mostSevereViolation && <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className={`text-xs ${mostSevereViolation.severity === 'critical' ? 'bg-red-600' : mostSevereViolation.severity === 'high' ? 'bg-red-500' : mostSevereViolation.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                                      {mostSevereViolation.severity?.toUpperCase()}
                                    </Badge>
                                    <h4 className="text-sm font-medium text-red-800">
                                      {mostSevereViolation.violation_name || mostSevereViolation.type || 'Security Violation'}
                                      {sortedViolations.length > 1 && ` (+${sortedViolations.length - 1} more)`}
                                    </h4>
                                  </div>}
                              </div>
                             <div className="text-red-600 hover:text-red-800 transition-colors">
                               {expandedViolations.has(event.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                             </div>
                           </div>
                           
                           {/* Show all violations sorted by severity when expanded */}
                           {expandedViolations.has(event.id) && <div className="space-y-3">
                               {sortedViolations.map((detection, idx) => <div key={idx} className="border-l-2 border-red-300 pl-3 space-y-2">
                                   
                                   
                                    {detection.violation_confidence && <div className="text-xs text-red-700">
                                        <span className="font-medium">Confidence:</span> {detection.violation_confidence.toFixed(2)}
                                      </div>}
                                   
                                   {detection.violation_description && <div className="text-xs text-red-700">
                                       <span className="font-medium">Description:</span> {detection.violation_description}
                                     </div>}
                                   
                                   <button onClick={e => {
                          e.stopPropagation();
                          const violationId = detection.id || detection.violation_id || detection.detection_id;
                          navigate(`/violations/${violationId}`);
                        }} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:underline mt-2">
                                     <ExternalLink className="h-3 w-3" />
                                     Investigate violation
                                   </button>
                                 </div>)}
                             </div>}
                         </div>;
                })()}
                     
                     {event.type === 'handoff' && event.details && <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <ArrowRight className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-800">Handoff: {event.details.from_agent} → {event.details.to_agent}</span>
                          </div>
                          <div className="text-blue-700">
                            <span className="font-medium">Reason:</span> {event.details.reason || 'Agent transition'}
                          </div>
                          {event.details.handoff_type && <div className="text-blue-700">
                            <span className="font-medium">Type:</span> {event.details.handoff_type}
                          </div>}
                        </div>}
                  </div>
                </div>
              </CardContent>
            </Card>;
      })}
      </div>
    </div>;
};
export default EventFeed;