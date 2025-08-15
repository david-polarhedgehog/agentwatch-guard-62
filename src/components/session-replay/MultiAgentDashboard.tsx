import React, { useState, useMemo } from 'react';
import { ApiSessionResponse } from '@/types/session';
import { processSessionData } from '@/utils/sessionProcessor';
import SessionFlowGraph from './SessionFlowGraph';
import EventFeed from './EventFeed';
import Timeline from './Timeline';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
interface MultiAgentDashboardProps {
  session: ApiSessionResponse;
  scrollToTraceId?: string;
}
const MultiAgentDashboard: React.FC<MultiAgentDashboardProps> = ({
  session,
  scrollToTraceId
}) => {
  const {
    events,
    timelineEvents
  } = useMemo(() => processSessionData(session), [session]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [showGraph, setShowGraph] = useState(true);
  const handleEventClick = (index: number) => {
    setCurrentEventIndex(index);
  };
  const handleTimelineClick = (index: number) => {
    setCurrentEventIndex(index);
  };
  return <div className="h-full flex flex-col bg-background">
      {/* Header */}
      

      {/* Main content area with resizable panels - takes remaining space minus timeline */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <PanelGroup direction="horizontal">
            {showGraph && <>
                <Panel defaultSize={70} minSize={30}>
                  <div className="h-full w-full">
                    <SessionFlowGraph events={events} currentEventIndex={currentEventIndex} />
                  </div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-border hover:bg-accent transition-colors" />
              </>}
            
            <Panel defaultSize={showGraph ? 30 : 100} minSize={20}>
              <EventFeed 
                events={events} 
                currentEventIndex={currentEventIndex} 
                onEventClick={handleEventClick} 
                sessionId={session.session_id}
                scrollToTraceId={scrollToTraceId}
              />
            </Panel>
          </PanelGroup>
        </div>

        {/* Timeline footer - always visible at bottom */}
        <div className="shrink-0">
          <Timeline timelineEvents={timelineEvents} currentEventIndex={currentEventIndex} onTimelineClick={handleTimelineClick} />
        </div>
      </div>
    </div>;
};
export default MultiAgentDashboard;