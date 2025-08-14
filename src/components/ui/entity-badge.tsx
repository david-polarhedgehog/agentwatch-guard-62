import { Bot, MessageSquare, User, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EntityBadgeProps {
  type: 'agent' | 'session' | 'user' | 'tool';
  label?: string;
  count?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EntityBadge({
  type,
  label,
  count,
  className,
  size = 'md'
}: EntityBadgeProps) {
  const getEntityConfig = () => {
    switch (type) {
      case 'agent':
        return {
          icon: Bot,
          label: label || 'Agent',
          className: 'bg-agent-blue/10 text-agent-blue border-agent-blue/20',
        };
      case 'session':
        return {
          icon: MessageSquare,
          label: label || 'Session',
          className: 'bg-session-green/10 text-session-green border-session-green/20',
        };
      case 'user':
        return {
          icon: User,
          label: label || 'User',
          className: 'bg-user-purple/10 text-user-purple border-user-purple/20',
        };
      case 'tool':
        return {
          icon: Wrench,
          label: label || 'Tool',
          className: 'bg-tool-light-green/10 text-tool-light-green border-tool-light-green/20',
        };
    }
  };

  const config = getEntityConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-h-5 px-1.5 py-0.5 text-xs';
      case 'lg':
        return 'min-h-7 px-3 py-1 text-sm';
      default:
        return 'min-h-6 px-2 py-0.5 text-xs';
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors border',
        config.className,
        getSizeClasses(),
        className
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <Icon className={cn(
          'flex-shrink-0',
          size === 'sm' ? 'h-3 w-3' : 
          size === 'lg' ? 'h-4 w-4' : 
          'h-3 w-3'
        )} />
        <span className="truncate">
          {config.label}
          {count !== undefined && ` (${count})`}
        </span>
      </div>
    </Badge>
  );
}