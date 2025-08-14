import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Bot, 
  MessageSquare, 
  AlertTriangle, 
  BarChart3,
  X,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/hooks/useReactQuery';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home,
    exact: true,
  },
  {
    title: 'Agents',
    href: '/agents',
    icon: Bot,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: MessageSquare,
  },
  {
    title: 'Violations',
    href: '/violations',
    icon: AlertTriangle,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
];

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { data: stats } = useStats();

  const getItemBadge = (href: string) => {
    if (!stats) return null;
    
    switch (href) {
      case '/agents':
        return stats.agents_count;
      case '/sessions':
        return stats.active_sessions_count;
      case '/violations':
        return stats.detection_results_count;
      default:
        return null;
    }
  };

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 h-full bg-surface border-r border-border transition-all duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-foreground">Menu</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="hidden lg:flex"
              >
                <ChevronLeft className={cn(
                  'h-4 w-4 transition-transform',
                  isCollapsed && 'rotate-180'
                )} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = isActiveRoute(item.href, item.exact);
              const badge = getItemBadge(item.href);
              
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    // Close mobile sidebar on navigation
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {badge !== null && badge > 0 && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className="ml-auto text-xs"
                        >
                          {badge > 999 ? '999+' : badge}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Stats Summary (when not collapsed) */}
          {!isCollapsed && stats && (
            <div className="p-4 border-t border-border">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  System Status
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Active Sessions</p>
                    <p className="font-medium text-session-green">
                      {stats.active_sessions_count}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-muted-foreground">High Alerts</p>
                    <p className="font-medium text-severity-high">
                      {stats.high_severity_count}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}