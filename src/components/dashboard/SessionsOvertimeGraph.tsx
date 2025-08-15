import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { formatDate } from 'date-fns';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SessionsOvertimeGraphProps {
  totalSessions?: number;
}

export function SessionsOvertimeGraph({ totalSessions = 0 }: SessionsOvertimeGraphProps) {
  // Generate mock data for the last 7 days
  // In a real implementation, this would fetch actual session data
  const generateMockData = () => {
    const days = [];
    const baseValue = Math.floor(totalSessions / 30); // Assume data spans ~30 days
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate realistic variation
      const variation = Math.random() * 0.4 + 0.8; // 80-120% of base
      const sessions = Math.floor(baseValue * variation);
      
      days.push({
        date: formatDate(date, 'MMM dd'),
        sessions: Math.max(1, sessions), // Ensure at least 1 session
      });
    }
    
    return days;
  };

  const data = generateMockData();

  if (totalSessions === 0) {
    return (
      <Card className="p-4 h-24 flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </Card>
    );
  }

  return (
    <Card className="p-4 h-24">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Sessions Overtime</h3>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>
      </div>
      
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis hide />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}