import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreateClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}
export function ModernHeader({
  title,
  subtitle,
  showCreateButton = false,
  createButtonText = "Create New Report",
  onCreateClick,
  children,
  className
}: ModernHeaderProps) {
  return <div className={cn("bg-background border-b border-border", className)}>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          
          <div className="flex items-center gap-3">
            {children}
            
            {showCreateButton}
          </div>
        </div>
      </div>
    </div>;
}