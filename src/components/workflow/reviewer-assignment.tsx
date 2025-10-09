'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, WorkflowState, WorkflowAction } from '@/types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  User, 
  UserPlus, 
  UserMinus, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  MoreHorizontal,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  Award,
  Target,
  Loader2,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  X
} from 'lucide-react';

/**
 * User information for reviewer assignment
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  location?: string;
  phone?: string;
  isActive: boolean;
  lastActive?: string;
  reviewCount?: number;
  averageReviewTime?: number; // in hours
  rating?: number; // 1-5 stars
  specialties?: string[];
  workload?: {
    current: number;
    max: number;
  };
  timezone?: string;
  languages?: string[];
}

/**
 * Assignment information
 */
export interface AssignmentInfo {
  id: string;
  productId: string;
  productName: string;
  productState: WorkflowState;
  reviewerId: string;
  reviewerName: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
}

/**
 * Assignment statistics
 */
export interface AssignmentStats {
  totalAssignments: number;
  pendingAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  averageCompletionTime: number;
  reviewerUtilization: number;
}

/**
 * Props for the ReviewerAssignment component
 */
export interface ReviewerAssignmentProps {
  /** Current user role */
  userRole: UserRole;
  /** Product ID for assignment */
  productId?: string;
  /** Product name for display */
  productName?: string;
  /** Current product state */
  productState?: WorkflowState;
  /** Available reviewers */
  reviewers?: UserInfo[];
  /** Current assignments */
  assignments?: AssignmentInfo[];
  /** Assignment statistics */
  stats?: AssignmentStats;
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Whether the component is in saving state */
  saving?: boolean;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when assignment is created */
  onAssign?: (assignment: Omit<AssignmentInfo, 'id' | 'assignedAt'>) => void;
  /** Callback when assignment is updated */
  onUpdate?: (assignmentId: string, updates: Partial<AssignmentInfo>) => void;
  /** Callback when assignment is removed */
  onRemove?: (assignmentId: string) => void;
  /** Callback when reviewer is selected */
  onReviewerSelect?: (reviewerId: string) => void;
  /** Callback when assignments are refreshed */
  onRefresh?: () => void;
  /** Whether to show assignment history */
  showHistory?: boolean;
  /** Whether to show reviewer details */
  showReviewerDetails?: boolean;
  /** Whether to show workload information */
  showWorkload?: boolean;
  /** Maximum assignments per reviewer */
  maxAssignmentsPerReviewer?: number;
}

/**
 * Priority configuration
 */
const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800', icon: Clock },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800', icon: Target },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

/**
 * Status configuration
 */
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Edit },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: X },
};

/**
 * ReviewerAssignment component for managing product reviewer assignments
 */
export const ReviewerAssignment: React.FC<ReviewerAssignmentProps> = ({
  userRole,
  productId,
  productName,
  productState = WorkflowState.DRAFT,
  reviewers = [],
  assignments = [],
  stats,
  loading = false,
  saving = false,
  readOnly = false,
  className,
  onAssign,
  onUpdate,
  onRemove,
  onReviewerSelect,
  onRefresh,
  showHistory = true,
  showReviewerDetails = true,
  showWorkload = true,
  maxAssignmentsPerReviewer = 5,
}) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [assignmentPriority, setAssignmentPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState<boolean>(false);

  /**
   * Filter reviewers based on search and role
   */
  const filteredReviewers = useMemo(() => {
    if (!reviewers) return [];
    return reviewers.filter(reviewer => {
      const matchesSearch = reviewer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           reviewer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           reviewer.department?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || reviewer.role === filterRole;
      const isActive = reviewer.isActive;
      const hasCapacity = !showWorkload || !reviewer.workload || reviewer.workload.current < reviewer.workload.max;
      
      return matchesSearch && matchesRole && isActive && hasCapacity;
    });
  }, [reviewers, searchQuery, filterRole, showWorkload]);

  /**
   * Filter assignments based on status
   */
  const filteredAssignments = useMemo(() => {
    if (filterStatus === 'all') return assignments;
    return assignments.filter(assignment => assignment.status === filterStatus);
  }, [assignments, filterStatus]);

  /**
   * Get reviewer by ID
   */
  const getReviewerById = useCallback((reviewerId: string) => {
    return reviewers.find(reviewer => reviewer.id === reviewerId);
  }, [reviewers]);

  /**
   * Get assignment by ID
   */
  const getAssignmentById = useCallback((assignmentId: string) => {
    return assignments.find(assignment => assignment.id === assignmentId);
  }, [assignments]);

  /**
   * Check if reviewer can be assigned
   */
  const canAssignReviewer = useCallback((reviewerId: string) => {
    const reviewer = getReviewerById(reviewerId);
    if (!reviewer) return false;
    
    // Check if reviewer is active
    if (!reviewer.isActive) return false;
    
    // Check workload capacity
    if (showWorkload && reviewer.workload) {
      return reviewer.workload.current < reviewer.workload.max;
    }
    
    // Check if already assigned to this product
    const existingAssignment = assignments.find(
      assignment => assignment.productId === productId && assignment.reviewerId === reviewerId
    );
    
    return !existingAssignment;
  }, [getReviewerById, assignments, productId, showWorkload]);

  /**
   * Handle reviewer assignment
   */
  const handleAssign = useCallback(() => {
    if (!selectedReviewer || !productId || !onAssign) return;

    const reviewer = getReviewerById(selectedReviewer);
    if (!reviewer) return;

    const assignment: Omit<AssignmentInfo, 'id' | 'assignedAt'> = {
      productId,
      productName: productName || 'Unknown Product',
      productState,
      reviewerId: selectedReviewer,
      reviewerName: reviewer.name,
      assignedBy: 'current-user', // This would come from auth context
      priority: assignmentPriority,
      status: 'pending',
      notes: assignmentNotes,
      estimatedHours,
      dueDate: assignmentDueDate || undefined,
    };

    onAssign(assignment);
    
    // Reset form
    setSelectedReviewer('');
    setAssignmentNotes('');
    setAssignmentPriority('medium');
    setAssignmentDueDate('');
    setEstimatedHours(2);
    setShowAssignDialog(false);
  }, [selectedReviewer, productId, productName, productState, onAssign, getReviewerById, assignmentPriority, assignmentNotes, estimatedHours, assignmentDueDate]);

  /**
   * Handle assignment update
   */
  const handleUpdate = useCallback((assignmentId: string, updates: Partial<AssignmentInfo>) => {
    if (onUpdate) {
      onUpdate(assignmentId, updates);
    }
  }, [onUpdate]);

  /**
   * Handle assignment removal
   */
  const handleRemove = useCallback((assignmentId: string) => {
    if (onRemove) {
      onRemove(assignmentId);
    }
  }, [onRemove]);

  /**
   * Handle reviewer selection
   */
  const handleReviewerSelect = useCallback((reviewerId: string) => {
    setSelectedReviewer(reviewerId);
    if (onReviewerSelect) {
      onReviewerSelect(reviewerId);
    }
  }, [onReviewerSelect]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Get reviewer workload percentage
   */
  const getWorkloadPercentage = useCallback((reviewer: UserInfo) => {
    if (!reviewer.workload) return 0;
    return Math.round((reviewer.workload.current / reviewer.workload.max) * 100);
  }, []);

  /**
   * Get reviewer rating display
   */
  const getRatingDisplay = useCallback((rating?: number) => {
    if (!rating) return 'No rating';
    return `${rating.toFixed(1)}/5.0`;
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reviewer Assignment</h2>
          <p className="text-gray-600">
            {productName ? `Assign reviewers for ${productName}` : 'Manage reviewer assignments'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          )}
          {!readOnly && userRole === UserRole.ADMIN && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Reviewer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Reviewer</DialogTitle>
                  <DialogDescription>
                    Select a reviewer and configure assignment details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Reviewer Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reviewer</label>
                    <Select value={selectedReviewer} onValueChange={handleReviewerSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredReviewers.map(reviewer => (
                          <SelectItem 
                            key={reviewer.id} 
                            value={reviewer.id}
                            disabled={!canAssignReviewer(reviewer.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={reviewer.avatar} />
                                <AvatarFallback>{reviewer.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{reviewer.name}</div>
                                <div className="text-sm text-gray-500">{reviewer.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignment Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={assignmentPriority} onValueChange={(value: any) => setAssignmentPriority(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estimated Hours</label>
                      <Select value={estimatedHours.toString()} onValueChange={(value) => setEstimatedHours(Number(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 4, 8, 16, 24].map(hours => (
                            <SelectItem key={hours} value={hours.toString()}>
                              {hours} hours
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <input
                      type="datetime-local"
                      value={assignmentDueDate}
                      onChange={(e) => setAssignmentDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      placeholder="Add assignment notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssign}
                    disabled={!selectedReviewer || saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Reviewer
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalAssignments}</div>
                  <div className="text-sm text-gray-600">Total Assignments</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.pendingAssignments}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.completedAssignments}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overdueAssignments}</div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reviewers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value={UserRole.REVIEWER}>Reviewer</SelectItem>
            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reviewers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Reviewers
          </CardTitle>
          <CardDescription>
            Select a reviewer to assign to this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReviewers.map(reviewer => (
              <div
                key={reviewer.id}
                className={cn(
                  'flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors',
                  selectedReviewer === reviewer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
                  !canAssignReviewer(reviewer.id) && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => canAssignReviewer(reviewer.id) && handleReviewerSelect(reviewer.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={reviewer.avatar} />
                    <AvatarFallback>{reviewer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{reviewer.name}</div>
                    <div className="text-sm text-gray-600">{reviewer.email}</div>
                    {reviewer.department && (
                      <div className="text-xs text-gray-500">{reviewer.department}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {showWorkload && reviewer.workload && (
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {reviewer.workload.current}/{reviewer.workload.max} assignments
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            getWorkloadPercentage(reviewer) > 80 ? 'bg-red-500' :
                            getWorkloadPercentage(reviewer) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                          style={{ width: `${getWorkloadPercentage(reviewer)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {reviewer.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm">{getRatingDisplay(reviewer.rating)}</span>
                    </div>
                  )}
                  <Badge variant="outline">{reviewer.role}</Badge>
                </div>
              </div>
            ))}
            {filteredReviewers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No reviewers found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      {showHistory && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Current Assignments
            </CardTitle>
            <CardDescription>
              Review and manage current reviewer assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAssignments.map(assignment => {
                const reviewer = getReviewerById(assignment.reviewerId);
                const priorityConfig = PRIORITY_CONFIG[assignment.priority];
                const statusConfig = STATUS_CONFIG[assignment.status];
                
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={reviewer?.avatar} />
                        <AvatarFallback>{reviewer?.name.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{assignment.reviewerName}</div>
                        <div className="text-sm text-gray-600">
                          Assigned {formatDate(assignment.assignedAt)}
                        </div>
                        {assignment.notes && (
                          <div className="text-xs text-gray-500 mt-1">{assignment.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityConfig.color}>
                        <priorityConfig.icon className="w-3 h-3 mr-1" />
                        {priorityConfig.label}
                      </Badge>
                      <Badge className={statusConfig.color}>
                        <statusConfig.icon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {assignment.dueDate && (
                        <div className="text-sm text-gray-600">
                          Due: {formatDate(assignment.dueDate)}
                        </div>
                      )}
                      {!readOnly && userRole === UserRole.ADMIN && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(assignment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading assignments...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && assignments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments</h3>
            <p className="text-gray-600 mb-4">
              No reviewers have been assigned to this product yet.
            </p>
            {!readOnly && userRole === UserRole.ADMIN && (
              <Button onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign First Reviewer
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Compact reviewer assignment for smaller spaces
 */
export interface CompactReviewerAssignmentProps {
  userRole: UserRole;
  productId: string;
  reviewers: UserInfo[];
  assignments: AssignmentInfo[];
  onAssign?: (assignment: Omit<AssignmentInfo, 'id' | 'assignedAt'>) => void;
  onRemove?: (assignmentId: string) => void;
  className?: string;
}

export const CompactReviewerAssignment: React.FC<CompactReviewerAssignmentProps> = ({
  userRole,
  productId,
  reviewers,
  assignments,
  onAssign,
  onRemove,
  className,
}) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');

  const handleAssign = () => {
    if (!selectedReviewer || !onAssign) return;

    const reviewer = reviewers.find(r => r.id === selectedReviewer);
    if (!reviewer) return;

    const assignment: Omit<AssignmentInfo, 'id' | 'assignedAt'> = {
      productId,
      productName: 'Product',
      productState: WorkflowState.REVIEW,
      reviewerId: selectedReviewer,
      reviewerName: reviewer.name,
      assignedBy: 'current-user',
      priority: 'medium',
      status: 'pending',
    };

    onAssign(assignment);
    setSelectedReviewer('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reviewers</h3>
        {userRole === UserRole.ADMIN && (
          <div className="flex items-center gap-2">
            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select reviewer" />
              </SelectTrigger>
              <SelectContent>
                {reviewers.map(reviewer => (
                  <SelectItem key={reviewer.id} value={reviewer.id}>
                    {reviewer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAssign} disabled={!selectedReviewer}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {assignments.map(assignment => {
          const reviewer = reviewers.find(r => r.id === assignment.reviewerId);
          return (
            <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={reviewer?.avatar} />
                  <AvatarFallback>{reviewer?.name.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{assignment.reviewerName}</span>
              </div>
              {userRole === UserRole.ADMIN && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(assignment.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewerAssignment;
