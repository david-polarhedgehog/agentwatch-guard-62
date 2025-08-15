import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MessageSquare, Bot, AlertTriangle, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';
import { Button } from '@/components/ui/button';
import { SearchWithFilters } from '@/components/ui/search-with-filters';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { EntityBadge } from '@/components/ui/entity-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSessions } from '@/hooks/useReactQuery';
import { useFilters } from '@/store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatRelativeTime, formatDateTime } from '@/lib/utils';

type SortField = 'message_count' | 'detection_count' | 'high_severity_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function Sessions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { filters, updateSessionFilters } = useFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Handle agent filter from URL query parameter and reset page when filters change
  useEffect(() => {
    const agentId = searchParams.get('agent');
    if (agentId && agentId !== filters.sessions.agent_id) {
      updateSessionFilters({ agent_id: agentId });
      setCurrentPage(1);
    }
  }, [searchParams, filters.sessions.agent_id, updateSessionFilters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.sessions.severity, filters.sessions.has_detections]);
  
  const { data, isLoading, error } = useSessions({
    ...filters.sessions,
    page: currentPage,
    limit: itemsPerPage,
    sort_field: sortField || undefined,
    sort_direction: sortDirection
  });

  const handleSeverityFilter = (severity: string) => {
    updateSessionFilters({ 
      severity: severity === 'all' ? undefined : severity as any
    });
  };

  const handleClearAgentFilter = () => {
    updateSessionFilters({ agent_id: undefined });
    // Also update the URL to remove the agent parameter
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('agent');
    const newUrl = newSearchParams.toString() ? 
      `${window.location.pathname}?${newSearchParams.toString()}` : 
      window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const handleDetectionFilter = (hasDetections: string) => {
    updateSessionFilters({ 
      has_detections: hasDetections === 'all' ? undefined : hasDetections === 'true'
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-1 h-4 w-4" /> : 
      <ArrowDown className="ml-1 h-4 w-4" />;
  };

  // Move data processing before conditional returns
  const sessions = data?.sessions || [];
  const totalItems = data?.pagination?.total_items || 0;
  const totalPages = data?.pagination?.total_pages || 1;
  
  // Remove client-side sorting since it's now handled server-side
  const sortedSessions = sessions;

  return (
    <MainLayout>
      <ModernHeader 
        title="Sessions" 
        subtitle={`${totalItems} conversation sessions`}
      />

        <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchWithFilters
              placeholder="Search by session ID or agent ID..."
              value={searchQuery}
              onChange={setSearchQuery}
              filters={filters.sessions.agent_id ? [{
                id: 'agent',
                label: `${filters.sessions.agent_id.slice(0, 12)}...`,
                icon: <Bot className="h-3 w-3" />,
                onRemove: handleClearAgentFilter
              }] : []}
            />
          </div>
          
          <div className="flex gap-2">
            <Select 
              value={filters.sessions.severity || 'all'} 
              onValueChange={handleSeverityFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={
                filters.sessions.has_detections === undefined ? 'all' : 
                filters.sessions.has_detections ? 'true' : 'false'
              } 
              onValueChange={handleDetectionFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Violations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="true">With Violations</SelectItem>
                <SelectItem value="false">Clean Sessions</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {/* Top Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                {/* Previous 5 button */}
                {currentPage > 5 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.max(1, currentPage - 5));
                      }}
                    >
                      «
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {/* Show page numbers - limit to 5 visible pages */}
                {(() => {
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                  
                  return pages.map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ));
                })()}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {/* Next 5 button */}
                {currentPage < totalPages - 4 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.min(totalPages, currentPage + 5));
                      }}
                    >
                      »
                    </PaginationLink>
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
        </div>

        {/* Sessions Table */}
        {isLoading ? (
          <div className="rounded-md border">
            <LoadingSpinner text="Loading sessions..." className="py-20" />
          </div>
        ) : error ? (
          <EmptyState
            title="Failed to load sessions"
            description="There was an error loading session data."
            action={{
              label: "Try again",
              onClick: () => window.location.reload()
            }}
          />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No sessions found"
            description="No conversation sessions match your current filters."
          />
        ) : (
          <TooltipProvider>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Agents</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('message_count')}
                    >
                      <div className="flex items-center">
                        Messages
                        {getSortIcon('message_count')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('detection_count')}
                    >
                      <div className="flex items-center">
                        Violations
                        {getSortIcon('detection_count')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('high_severity_count')}
                    >
                      <div className="flex items-center">
                        High Severity
                        {getSortIcon('high_severity_count')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date Created
                        {getSortIcon('created_at')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Last Active
                        {getSortIcon('created_at')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSessions.map((session) => (
                    <TableRow
                      key={session.session_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/sessions/${session.session_id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {session.session_id}
                          {session.has_detections && (
                            <AlertTriangle className="h-4 w-4 text-severity-high" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {session.agents ? (
                            Object.entries(session.agents).map(([agentName, agentId]) => (
                              <div
                                key={agentId}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/agents/${agentId}`);
                                }}
                              >
                                <EntityBadge
                                  type="agent"
                                  label={agentName}
                                  className="hover:bg-muted/50 transition-colors"
                                  size="sm"
                                />
                              </div>
                            ))
                          ) : (
                            // Fallback for sessions without the new agents field
                            <div
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/agents/${session.agent_id}`);
                              }}
                            >
                              <EntityBadge
                                type="agent"
                                label={session.agent_id}
                                className="hover:bg-muted/50 transition-colors"
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.message_count}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          session.detection_count > 0 
                            ? 'text-severity-high' 
                            : 'text-muted-foreground'
                        }`}>
                          {session.detection_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-severity-high">
                          {session.high_severity_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(session.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatRelativeTime(session.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                {/* Previous 5 button */}
                {currentPage > 5 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.max(1, currentPage - 5));
                      }}
                    >
                      «
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {/* Show page numbers - limit to 5 visible pages */}
                {(() => {
                  const startPage = Math.max(1, currentPage - 2);
                  const endPage = Math.min(totalPages, startPage + 4);
                  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                  
                  return pages.map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ));
                })()}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {/* Next 5 button */}
                {currentPage < totalPages - 4 && (
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.min(totalPages, currentPage + 5));
                      }}
                    >
                      »
                    </PaginationLink>
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </MainLayout>
  );
}