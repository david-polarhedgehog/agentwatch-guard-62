import { NavLink } from 'react-router-dom';
import { Home, Shield, Users, MessageSquare, AlertTriangle, BarChart3, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
interface ModernSidebarProps {
  className?: string;
}
const navItems = [{
  title: 'Dashboard',
  href: '/',
  icon: Home,
  exact: true
}, {
  title: 'Agents',
  href: '/agents',
  icon: Users
}, {
  title: 'Sessions',
  href: '/sessions',
  icon: MessageSquare
}, {
  title: 'Violations',
  href: '/violations',
  icon: AlertTriangle
}];
const bottomItems = [{
  title: 'Settings',
  href: '/settings',
  icon: Settings
}, {
  title: 'Help',
  href: '/help',
  icon: HelpCircle
}];
export function ModernSidebar({
  className
}: ModernSidebarProps) {
  return <aside className={cn('fixed left-0 top-0 w-16 h-screen bg-background border-r border-border flex flex-col z-50', className)}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4">
        <div className="space-y-1">
          {navItems.map(item => <NavLink key={item.href} to={item.href} end={item.exact} className={({
          isActive
        }) => cn('w-12 h-12 mx-2 rounded-lg flex items-center justify-center transition-colors group relative', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')} title={item.title}>
              <item.icon className="h-5 w-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.title}
              </div>
            </NavLink>)}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="pb-4">
        <div className="space-y-1">
          {bottomItems.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                'w-12 h-12 mx-2 rounded-lg flex items-center justify-center transition-colors group relative',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={item.title}
            >
              <item.icon className="h-5 w-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.title}
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>;
}