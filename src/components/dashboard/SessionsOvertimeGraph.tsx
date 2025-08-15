import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDate } from 'date-fns';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SessionsOvertimeGraphProps {
  totalSessions?: number;
}

export function SessionsOvertimeGraph({ totalSessions = 0 }: SessionsOvertimeGraphProps) {
  // Generate more accurate mock data for the last 7 days
  // In a real implementation, this would fetch actual session data
  const generateMockData = () => {
    const days = [];
    const dailyAverage = Math.floor(totalSessions / 30); // Assume data spans ~30 days
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic daily session counts with some variation
      const variation = Math.random() * 0.6 + 0.7; // 70-130% of average
      const sessions = Math.max(Math.floor(dailyAverage * variation), 1);
      
      days.push({
        date: formatDate(date, 'MMM dd'),
        fullDate: formatDate(date, 'MMM dd, yyyy'),
        sessions: sessions,
      });
    }
    
    return days;
  };

  const data = generateMockData();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-md p-2 shadow-md">
          <p className="text-xs font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-xs text-primary">
            Sessions: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (totalSessions === 0) {
    return (
      <Card className="p-6 h-[120px] flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </Card>
    );
  }

  return (
    <Card className="p-6 h-[120px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Sessions Overtime</h3>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>
      </div>
      
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ 
                fill: "hsl(var(--primary))", 
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
                r: 4 
              }}
              activeDot={{ 
                r: 6, 
                fill: "hsl(var(--primary))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}