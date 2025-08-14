import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernHeader } from '@/components/layout/ModernHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ViolationRow } from '@/components/violations/ViolationRow';
import { useViolations } from '@/hooks/useReactQuery';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDateTime } from '@/lib/utils';
import type { Detection } from '@/types';
export default function Violations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Get URL params for initial filters
  const agentParam = searchParams.get('agent') || searchParams.get('agent_id');
  const violationParam = searchParams.get('violationId');
  
  useEffect(() => {
    if (agentParam) {
      setAgentFilter(agentParam);
    }
  }, [agentParam]);
  
  // Build API filters
  const apiFilters = {
    ...(severityFilter !== 'all' && severityFilter && { severity: severityFilter as 'high' | 'medium' | 'low' }),
    ...(typeFilter !== 'all' && { detection_type: typeFilter }),
    ...(agentFilter && { agent_id: agentFilter }),
    page: currentPage,
    per_page: itemsPerPage
  };
  
  const {
    data,
    isLoading,
    error
  } = useViolations(apiFilters);

  const totalItems = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Filter violations based on search query and other filters
  const filteredViolations = (data?.detections || []).filter((violation: Detection) => {
    // If a specific violation ID is in URL, show only that violation
    if (violationParam) {
      return violation.id.toString() === violationParam;
    }
    
    // Text search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesType = violation.detection_type?.toLowerCase().includes(searchLower);
      const matchesAgent = violation.agent_name?.toLowerCase().includes(searchLower) || 
                          violation.agent_id?.toLowerCase().includes(searchLower);
      const matchesSession = violation.session_id?.toLowerCase().includes(searchLower);
      const matchesContext = violation.context?.toLowerCase().includes(searchLower);
      const matchesId = violation.id.toString().includes(searchLower);
      
      if (!matchesType && !matchesAgent && !matchesSession && !matchesContext && !matchesId) {
        return false;
      }
    }
    
    // Status filter (client-side since API doesn't support it)
    if (statusFilter !== 'all') {
      // Since all violations are currently 'open', only show if 'open' is selected
      if (statusFilter !== 'open') {
        return false;
      }
    }
    
    // Time filter (client-side)
    if (timeFilter !== 'all') {
      const now = new Date();
      const violationDate = new Date(violation.created_at);
      
      switch (timeFilter) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (violationDate < today) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (violationDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (violationDate < monthAgo) return false;
          break;
      }
    }
    
    return true;
  });
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSeverityFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setTimeFilter('all');
    setAgentFilter('');
    setCurrentPage(1);
    setSearchParams({});
  };
  
  const hasActiveFilters = searchQuery || severityFilter !== 'all' || typeFilter !== 'all' || 
                          statusFilter !== 'all' || timeFilter !== 'all' || agentFilter || violationParam;
  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return <Badge className={`${variants[severity] || variants.low} text-xs font-medium`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>;
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'in progress': 'bg-purple-100 text-purple-800 border-purple-200',
      'resolved': 'bg-blue-100 text-blue-800 border-blue-200',
      'open': 'bg-green-100 text-green-800 border-green-200'
    };
    return <Badge className={`${variants[status] || variants.open} text-xs font-medium`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>;
  };
  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      compliance: 'bg-purple-100 text-purple-800 border-purple-200',
      threat: 'bg-teal-100 text-teal-800 border-teal-200',
      access: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return <Badge className={`${variants[type] || variants.threat} text-xs font-medium`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>;
  };
  if (isLoading) {
    return <MainLayout>
        <div className="p-6">
          <LoadingSpinner text="Loading violations..." className="mt-20" />
        </div>
      </MainLayout>;
  }
  if (error) {
    return <MainLayout>
        <div className="p-6">
          <EmptyState title="Failed to load violations" description="There was an error loading violation data." action={{
          label: "Try again",
          onClick: () => window.location.reload()
        }} />
        </div>
      </MainLayout>;
  }
  return <MainLayout>
      <ModernHeader title="Violations" showCreateButton={true} createButtonText="Create New Report" />

        <div className="p-6 space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search violations by type, agent, session, or message..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-10" 
                  />
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="threat">Threat</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="px-3"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex gap-2 flex-wrap">
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchQuery}"
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setSearchQuery('')}
                    />
                  </Badge>
                )}
                {agentFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Agent: {agentFilter.slice(0, 8)}...
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setAgentFilter('')}
                    />
                  </Badge>
                )}
                {severityFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Severity: {severityFilter}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setSeverityFilter('all')}
                    />
                  </Badge>
                )}
                {typeFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Type: {typeFilter}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setTypeFilter('all')}
                    />
                  </Badge>
                )}
                {violationParam && (
                  <Badge variant="secondary" className="text-xs">
                    Violation ID: {violationParam}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => setSearchParams({})}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
              {violationParam ? (
                `Showing violation ${violationParam}`
              ) : (
                `Showing ${filteredViolations.length} of ${totalItems} violations (page ${currentPage} of ${totalPages})`
              )}
            </div>
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                <Filter className="h-4 w-4 inline mr-1" />
                {violationParam ? 'Specific violation' : 'Filters applied'}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium text-muted-foreground">ID</TableHead>
                  <TableHead className="font-medium text-muted-foreground">NAME</TableHead>
                  <TableHead className="font-medium text-muted-foreground">ORIGIN</TableHead>
                  <TableHead className="font-medium text-muted-foreground">MESSAGE</TableHead>
                  <TableHead className="font-medium text-muted-foreground">LAST SEEN</TableHead>
                  <TableHead className="font-medium text-muted-foreground">SEVERITY</TableHead>
                  <TableHead className="font-medium text-muted-foreground">CONFIDENCE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredViolations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <EmptyState 
                        title={hasActiveFilters ? "No violations match your filters" : "No violations found"} 
                        description={hasActiveFilters ? "Try adjusting your search criteria or clear filters to see all violations." : "No security violations have been detected yet."} 
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViolations.map(violation => (
                    <ViolationRow 
                      key={violation.id} 
                      violation={violation} 
                      getSeverityBadge={getSeverityBadge} 
                      isHighlighted={violationParam === violation.id.toString()}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
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
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
    </MainLayout>;
}