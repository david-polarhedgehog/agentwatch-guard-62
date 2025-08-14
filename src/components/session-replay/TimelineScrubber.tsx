import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types';

interface TimelineScrubberProps {
  timeline: TimelineEvent[];
  currentEventIndex: number;
  isPlaying: boolean;
  currentTime: number;
  onEventIndexChange: (index: number) => void;
  onPlayToggle: () => void;
  onTimeChange: (time: number) => void;
}

export function TimelineScrubber({ 
  timeline, 
  currentEventIndex, 
  isPlaying, 
  currentTime,
  onEventIndexChange, 
  onPlayToggle,
  onTimeChange 
}: TimelineScrubberProps) {
  const maxTime = timeline.length > 0 ? timeline[timeline.length - 1].timestamp.getTime() : 0;
  const minTime = timeline.length > 0 ? timeline[0].timestamp.getTime() : 0;
  const duration = maxTime - minTime;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const minutes = Math.floor(date.getTime() / 60000);
    const seconds = Math.floor((date.getTime() % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = useCallback((value: number[]) => {
    const newTime = minTime + (value[0] / 100) * duration;
    onTimeChange(newTime);
    
    // Find closest event to this time
    const closestEventIndex = timeline.reduce((closest, event, index) => {
      const currentDistance = Math.abs(event.timestamp.getTime() - newTime);
      const closestDistance = Math.abs(timeline[closest].timestamp.getTime() - newTime);
      return currentDistance < closestDistance ? index : closest;
    }, 0);
    
    onEventIndexChange(closestEventIndex);
  }, [timeline, minTime, duration, onTimeChange, onEventIndexChange]);

  const handlePrevious = () => {
    if (currentEventIndex > 0) {
      onEventIndexChange(currentEventIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentEventIndex < timeline.length - 1) {
      onEventIndexChange(currentEventIndex + 1);
    }
  };

  const currentSliderValue = duration > 0 ? ((currentTime - minTime) / duration) * 100 : 0;

  return (
    <div className="bg-background border-t p-4">
      <div className="flex items-center gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentEventIndex <= 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={onPlayToggle}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentEventIndex >= timeline.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time Display */}
        <div className="text-sm text-muted-foreground min-w-[60px]">
          {formatTime(currentTime)}
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 relative">
          <Slider
            value={[currentSliderValue]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="w-full"
          />
          
          {/* Event Indicators */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
            {timeline.map((event, index) => {
              const position = duration > 0 ? ((event.timestamp.getTime() - minTime) / duration) * 100 : 0;
              const isError = event.hasDetections;
              const isNavigation = event.userContent?.includes('navigation');
              
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-background",
                    isError ? "bg-destructive" : 
                    isNavigation ? "bg-primary" : "bg-muted-foreground",
                    currentEventIndex === index && "scale-150 ring-2 ring-background"
                  )}
                  style={{ left: `${position}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                />
              );
            })}
          </div>
        </div>

        {/* Duration Display */}
        <div className="text-sm text-muted-foreground min-w-[60px]">
          {formatTime(maxTime)}
        </div>

        {/* Speed Control */}
        <div className="text-sm text-muted-foreground">
          1x
        </div>
      </div>
    </div>
  );
}