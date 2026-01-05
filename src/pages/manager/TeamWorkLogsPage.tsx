import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { sendWorkLogEmail } from '@/lib/emailService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Timer,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO, differenceInHours, differenceInMinutes, subWeeks, subDays } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface WorkLog {
  id: string;
  employee_id: string;
  log_date: string;
  work_type: string;
  description: string;
  minutes_spent: number;
  blockers: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  employee?: {
    full_name: string;
    employee_code: string;
  };
}

interface WorkLogComment {
  id: string;
  work_log_id: string;
  manager_id: string;
  comment: string;
  action: string | null;
  created_at: string;
  manager?: {
    full_name: string;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
  employee_code: string;
}

interface WeekSubmission {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  weekStart: Date;
  weekEnd: Date;
  logs: WorkLog[];
  comments: WorkLogComment[];
  totalMinutes: number;
  daysLogged: number;
  status: string;
  submittedAt: string | null;
  workTypeCounts: Record<string, number>;
}

const getMonday = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

const getSunday = (date: Date): Date => {
  return endOfWeek(date, { weekStartsOn: 1 });
};

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Draft':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'Submitted':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Approved':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'Rework':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const TeamWorkLogsPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [comments, setComments] = useState<WorkLogComment[]>([]);
  const [expandedSubmissions, setExpandedSubmissions] = useState<string[]>([]);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('Submitted');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [sortBy, setSortBy] = useState<string>('deadline');
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<WeekSubmission | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [reworkComment, setReworkComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchTeamMembers();
    }
  }, [employee?.id]);

  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchWorkLogs();
    }
  }, [teamMembers, selectedWeek]);

  const fetchTeamMembers = async () => {
    if (!employee?.id) return;
    
    try {
      // For managers, get their direct reports
      // For admins, get all employees
      let query = supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .eq('status', 'Active');
      
      if (role !== 'Admin') {
        query = query.eq('manager_id', employee.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch team members',
        variant: 'destructive',
      });
    }
  };

  const fetchWorkLogs = async () => {
    if (teamMembers.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const teamMemberIds = teamMembers.map(m => m.id);
      
      // Calculate date range based on selected week filter
      let startDate: Date;
      let endDate: Date = getSunday(new Date());
      
      switch (selectedWeek) {
        case 'current':
          startDate = getMonday(new Date());
          break;
        case 'last':
          startDate = getMonday(subWeeks(new Date(), 1));
          endDate = getSunday(subWeeks(new Date(), 1));
          break;
        case 'last2':
          startDate = getMonday(subWeeks(new Date(), 2));
          break;
        case 'month':
          startDate = getMonday(subWeeks(new Date(), 4));
          break;
        default:
          startDate = getMonday(new Date());
      }
      
      const { data: logs, error } = await supabase
        .from('hr_work_logs')
        .select(`
          *,
          employee:hr_employees!employee_id(full_name, employee_code)
        `)
        .in('employee_id', teamMemberIds)
        .gte('log_date', format(startDate, 'yyyy-MM-dd'))
        .lte('log_date', format(endDate, 'yyyy-MM-dd'))
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      setWorkLogs(logs || []);
      
      // Fetch comments for these logs
      if (logs && logs.length > 0) {
        const logIds = logs.map(l => l.id);
        const { data: commentsData } = await supabase
          .from('hr_work_log_comments')
          .select(`
            *,
            manager:hr_employees!manager_id(full_name)
          `)
          .in('work_log_id', logIds)
          .order('created_at', { ascending: false });
        
        setComments(commentsData || []);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error('Error fetching work logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Group logs into week submissions
  const submissions = useMemo((): WeekSubmission[] => {
    const grouped = new Map<string, WeekSubmission>();
    
    workLogs.forEach(log => {
      const logDate = parseISO(log.log_date);
      const weekStart = getMonday(logDate);
      const weekEnd = getSunday(logDate);
      const key = `${log.employee_id}-${format(weekStart, 'yyyy-MM-dd')}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          employeeId: log.employee_id,
          employeeName: log.employee?.full_name || 'Unknown',
          employeeCode: log.employee?.employee_code || '',
          weekStart,
          weekEnd,
          logs: [],
          comments: [],
          totalMinutes: 0,
          daysLogged: 0,
          status: 'Draft',
          submittedAt: null,
          workTypeCounts: {},
        });
      }
      
      const submission = grouped.get(key)!;
      submission.logs.push(log);
      submission.totalMinutes += log.minutes_spent;
      submission.workTypeCounts[log.work_type] = (submission.workTypeCounts[log.work_type] || 0) + 1;
      
      if (log.submitted_at && (!submission.submittedAt || log.submitted_at > submission.submittedAt)) {
        submission.submittedAt = log.submitted_at;
      }
    });
    
    // Calculate status and days logged for each submission
    grouped.forEach(submission => {
      // Get unique workdays
      const uniqueDays = new Set(submission.logs.map(l => l.log_date));
      submission.daysLogged = uniqueDays.size;
      
      // Determine overall status
      if (submission.logs.some(l => l.status === 'Rework')) {
        submission.status = 'Rework';
      } else if (submission.logs.some(l => l.status === 'Submitted')) {
        submission.status = 'Submitted';
      } else if (submission.logs.every(l => l.status === 'Approved')) {
        submission.status = 'Approved';
      } else {
        submission.status = 'Draft';
      }
      
      // Get comments for this submission's logs
      const logIds = submission.logs.map(l => l.id);
      submission.comments = comments.filter(c => logIds.includes(c.work_log_id));
    });
    
    // Convert to array and filter
    let result = Array.from(grouped.values());
    
    // Apply filters
    if (selectedEmployee !== 'all') {
      result = result.filter(s => s.employeeId === selectedEmployee);
    }
    
    if (selectedStatus !== 'all') {
      result = result.filter(s => s.status === selectedStatus);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          // Prioritize by deadline (submitted oldest first)
          if (a.submittedAt && b.submittedAt) {
            return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          }
          return a.submittedAt ? -1 : 1;
        case 'newest':
          return (b.submittedAt ? new Date(b.submittedAt).getTime() : 0) - 
                 (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
        case 'oldest':
          return (a.submittedAt ? new Date(a.submittedAt).getTime() : 0) - 
                 (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [workLogs, comments, selectedEmployee, selectedStatus, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    
    const pending = submissions.filter(s => s.status === 'Submitted').length;
    const deadlineSoon = submissions.filter(s => {
      if (s.status !== 'Submitted' || !s.submittedAt) return false;
      const deadline = new Date(s.submittedAt);
      deadline.setHours(deadline.getHours() + 48);
      const hoursLeft = differenceInHours(deadline, now);
      return hoursLeft <= 2 && hoursLeft >= 0;
    }).length;
    
    // Approved this week
    const weekStart = getMonday(now);
    const approvedThisWeek = submissions.filter(s => {
      if (s.status !== 'Approved') return false;
      const latestComment = s.comments.find(c => c.action === 'Approved');
      if (!latestComment) return false;
      return new Date(latestComment.created_at) >= weekStart;
    }).length;
    
    const rework = submissions.filter(s => s.status === 'Rework').length;
    
    return { pending, deadlineSoon, approvedThisWeek, rework };
  }, [submissions]);

  const getDeadlineInfo = (submittedAt: string | null): { text: string; color: string } => {
    if (!submittedAt) return { text: '', color: '' };
    
    const deadline = new Date(submittedAt);
    deadline.setHours(deadline.getHours() + 48);
    const now = new Date();
    const hoursLeft = differenceInHours(deadline, now);
    const minutesLeft = differenceInMinutes(deadline, now) % 60;
    
    if (hoursLeft < 0) {
      return { text: 'Deadline passed', color: 'text-destructive' };
    } else if (hoursLeft < 2) {
      return { text: `${hoursLeft}h ${minutesLeft}m remaining`, color: 'text-destructive' };
    } else if (hoursLeft < 24) {
      return { text: `${hoursLeft}h ${minutesLeft}m remaining`, color: 'text-orange-600' };
    } else {
      return { text: `${hoursLeft}h remaining`, color: 'text-green-600' };
    }
  };

  const toggleSubmissionExpanded = (key: string) => {
    setExpandedSubmissions(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleApprove = async () => {
    if (!selectedSubmission || !employee?.id) return;
    
    setProcessing(true);
    try {
      const weekStartStr = format(selectedSubmission.weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(selectedSubmission.weekEnd, 'yyyy-MM-dd');
      const weekRange = `${format(selectedSubmission.weekStart, 'MMM d')} - ${format(selectedSubmission.weekEnd, 'MMM d, yyyy')}`;
      
      // Update all logs in that week to Approved
      const { error: updateError } = await supabase
        .from('hr_work_logs')
        .update({ status: 'Approved' })
        .eq('employee_id', selectedSubmission.employeeId)
        .gte('log_date', weekStartStr)
        .lte('log_date', weekEndStr)
        .eq('status', 'Submitted');
      
      if (updateError) throw updateError;
      
      // Add comment if provided
      if (approveComment.trim()) {
        await supabase
          .from('hr_work_log_comments')
          .insert({
            work_log_id: selectedSubmission.logs[0].id,
            manager_id: employee.id,
            comment: approveComment.trim(),
            action: 'Approved',
          });
      }

      // Create notification for employee
      await supabase.from('hr_notifications').insert({
        employee_id: selectedSubmission.employeeId,
        type: 'work_log_approved',
        title: 'Work Log Approved',
        message: `Your work log for week ${weekRange} has been approved`,
        link: '/app/work-log',
      });

      // Send email notification
      sendWorkLogEmail(
        selectedSubmission.employeeId,
        employee.full_name,
        weekRange,
        true,
        approveComment.trim() || undefined
      );
      
      toast({
        title: 'Success',
        description: `Work logs approved for ${selectedSubmission.employeeName}`,
      });
      
      setShowApproveModal(false);
      setApproveComment('');
      setSelectedSubmission(null);
      fetchWorkLogs();
    } catch (error: any) {
      console.error('Error approving logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve work logs',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRework = async () => {
    if (!selectedSubmission || !employee?.id || reworkComment.trim().length < 10) return;
    
    setProcessing(true);
    try {
      const weekStartStr = format(selectedSubmission.weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(selectedSubmission.weekEnd, 'yyyy-MM-dd');
      const weekRange = `${format(selectedSubmission.weekStart, 'MMM d')} - ${format(selectedSubmission.weekEnd, 'MMM d, yyyy')}`;
      
      // Update all logs in that week to Rework (works for both Submitted and Approved)
      const { error: updateError } = await supabase
        .from('hr_work_logs')
        .update({ status: 'Rework' })
        .eq('employee_id', selectedSubmission.employeeId)
        .gte('log_date', weekStartStr)
        .lte('log_date', weekEndStr)
        .in('status', ['Submitted', 'Approved']);
      
      if (updateError) throw updateError;
      
      // Add rework comment (required)
      await supabase
        .from('hr_work_log_comments')
        .insert({
          work_log_id: selectedSubmission.logs[0].id,
          manager_id: employee.id,
          comment: reworkComment.trim(),
          action: 'Rework',
        });

      // Create notification for employee
      await supabase.from('hr_notifications').insert({
        employee_id: selectedSubmission.employeeId,
        type: 'work_log_rework',
        title: 'Rework Requested',
        message: `Your manager requested changes to your work log for week ${weekRange}`,
        link: '/app/work-log',
      });

      // Send email notification
      sendWorkLogEmail(
        selectedSubmission.employeeId,
        employee.full_name,
        weekRange,
        false,
        reworkComment.trim()
      );
      
      toast({
        title: 'Success',
        description: `Rework requested for ${selectedSubmission.employeeName}`,
      });
      
      setShowReworkModal(false);
      setReworkComment('');
      setSelectedSubmission(null);
      fetchWorkLogs();
    } catch (error: any) {
      console.error('Error requesting rework:', error);
      toast({
        title: 'Error',
        description: 'Failed to request rework',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const clearFilters = () => {
    setSelectedEmployee('all');
    setSelectedStatus('Submitted');
    setSelectedWeek('current');
    setSortBy('deadline');
  };

  if (loading && teamMembers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Work Log Review</h1>
        <p className="text-muted-foreground">Review and approve team members' weekly work logs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.deadlineSoon}</p>
                <p className="text-sm text-muted-foreground">Deadline Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approvedThisWeek}</p>
                <p className="text-sm text-muted-foreground">Approved This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <RefreshCw className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.rework}</p>
                <p className="text-sm text-muted-foreground">Rework Requested</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[180px]">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 min-w-[150px]">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rework">Rework</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 min-w-[150px]">
              <Label>Week</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Current Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Week</SelectItem>
                  <SelectItem value="last">Last Week</SelectItem>
                  <SelectItem value="last2">Last 2 Weeks</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 min-w-[150px]">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Deadline Soon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Deadline Soon</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Showing {submissions.length} work log submission{submissions.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Team Members</h3>
            <p className="text-muted-foreground">
              You don't have any team members assigned yet.
            </p>
          </CardContent>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              No work logs match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map(submission => {
            const key = `${submission.employeeId}-${format(submission.weekStart, 'yyyy-MM-dd')}`;
            const isExpanded = expandedSubmissions.includes(key);
            const deadlineInfo = getDeadlineInfo(submission.submittedAt);
            const latestComment = submission.comments[0];
            
            return (
              <Card key={key} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleSubmissionExpanded(key)}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{submission.employeeName}</h3>
                            <span className="text-sm text-muted-foreground">({submission.employeeCode})</span>
                            <Badge className={getStatusColor(submission.status)}>
                              {submission.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(submission.weekStart, 'MMM d')} - {format(submission.weekEnd, 'MMM d, yyyy')}
                            </span>
                            {submission.submittedAt && (
                              <span>Submitted {format(parseISO(submission.submittedAt), 'MMM d, h:mm a')}</span>
                            )}
                          </div>
                          {submission.status === 'Submitted' && deadlineInfo.text && (
                            <div className={`flex items-center gap-1 mt-1 text-sm ${deadlineInfo.color}`}>
                              <Timer className="h-4 w-4" />
                              <span>{deadlineInfo.text}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {submission.status === 'Submitted' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(submission);
                              setShowApproveModal(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {(submission.status === 'Submitted' || submission.status === 'Approved') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(submission);
                              setShowReworkModal(true);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {submission.status === 'Approved' ? 'Reopen for Rework' : 'Request Rework'}
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    
                    {/* Summary stats */}
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{submission.daysLogged}</span> days logged
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatMinutes(submission.totalMinutes)}</span> total
                      </span>
                      <span className="text-muted-foreground">
                        {Object.entries(submission.workTypeCounts)
                          .map(([type, count]) => `${type}: ${count}`)
                          .join(', ')}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Manager Comment */}
                      {latestComment && (
                        <div className={`p-3 rounded-lg mb-4 ${
                          latestComment.action === 'Approved' 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-orange-500/10 border border-orange-500/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              {latestComment.manager?.full_name || 'Manager'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {latestComment.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(latestComment.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm">{latestComment.comment}</p>
                        </div>
                      )}
                      
                      {/* Daily Logs Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Date</th>
                              <th className="text-left p-3 font-medium">Work Type</th>
                              <th className="text-left p-3 font-medium">Description</th>
                              <th className="text-left p-3 font-medium">Time</th>
                              <th className="text-left p-3 font-medium">Blockers</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {submission.logs
                              .sort((a, b) => a.log_date.localeCompare(b.log_date))
                              .map(log => (
                                <tr key={log.id} className="hover:bg-muted/30">
                                  <td className="p-3 whitespace-nowrap">
                                    {format(parseISO(log.log_date), 'EEE, MMM d')}
                                  </td>
                                  <td className="p-3">
                                    <Badge variant="outline">{log.work_type}</Badge>
                                  </td>
                                  <td className="p-3 max-w-md">
                                    <p className="line-clamp-2">{log.description}</p>
                                  </td>
                                  <td className="p-3 whitespace-nowrap">
                                    {formatMinutes(log.minutes_spent)}
                                  </td>
                                  <td className="p-3 max-w-xs">
                                    {log.blockers ? (
                                      <p className="line-clamp-2 text-muted-foreground">{log.blockers}</p>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Week - {selectedSubmission?.employeeName}</DialogTitle>
            <DialogDescription>
              Approving {selectedSubmission?.daysLogged} days of work ({formatMinutes(selectedSubmission?.totalMinutes || 0)} total)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-comment">Feedback (optional)</Label>
              <Textarea
                id="approve-comment"
                placeholder="Great work this week! Keep it up."
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{approveComment.length}/500 characters</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rework Modal */}
      <Dialog open={showReworkModal} onOpenChange={setShowReworkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission?.status === 'Approved' ? 'Reopen for Rework' : 'Request Rework'} - {selectedSubmission?.employeeName}
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission?.status === 'Approved' 
                ? 'This will move the approved log back to rework. The employee will need to make changes and resubmit.'
                : 'This will send the logs back to the employee for corrections.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-600">
                {selectedSubmission?.status === 'Approved'
                  ? 'This will reopen the previously approved logs. The employee will be notified to make changes.'
                  : 'The employee will be able to edit their logs and resubmit for review.'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rework-comment">What needs to be changed? *</Label>
              <Textarea
                id="rework-comment"
                placeholder="Please add more details about the tasks completed..."
                value={reworkComment}
                onChange={(e) => setReworkComment(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {reworkComment.length}/500 characters (min 10 required)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReworkModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRework} 
              disabled={processing || reworkComment.trim().length < 10}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processing ? 'Sending...' : 'Request Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamWorkLogsPage;
