import { AlertTriangle, Shield, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SeverityLevel } from '@/types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  count?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SeverityBadge({
  severity,
  count,
  showIcon = true,
  size = 'md',
  className
}: SeverityBadgeProps) {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'high':
        return {
          label: 'High',
          icon: AlertTriangle,
          className: 'bg-severity-high/10 text-severity-high border-severity-high/20 hover:bg-severity-high/20',
          pulse: true,
        };
      case 'medium':
        return {
          label: 'Medium',
          icon: Shield,
          className: 'bg-severity-medium/10 text-severity-medium border-severity-medium/20 hover:bg-severity-medium/20',
          pulse: false,
        };
      case 'low':
        return {
          label: 'Low',
          icon: Info,
          className: 'bg-severity-low/10 text-severity-low border-severity-low/20 hover:bg-severity-low/20',
          pulse: false,
        };
      default:
        // Fallback for invalid severity values
        return {
          label: 'Unknown',
          icon: Info,
          className: 'bg-muted/10 text-muted-foreground border-muted/20 hover:bg-muted/20',
          pulse: false,
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-5 px-1.5 text-xs';
      case 'lg':
        return 'h-7 px-3 text-sm';
      default:
        return 'h-6 px-2 text-xs';
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors border',
        config.className,
        getSizeClasses(),
        config.pulse && 'animate-pulse-ring',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {showIcon && (
          <Icon className={cn(
            size === 'sm' ? 'h-3 w-3' : 
            size === 'lg' ? 'h-4 w-4' : 
            'h-3 w-3'
          )} />
        )}
        <span>
          {config.label}
          {count !== undefined && ` (${count})`}
        </span>
      </div>
    </Badge>
  );
}