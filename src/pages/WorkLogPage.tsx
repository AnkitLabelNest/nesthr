import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  ClipboardList, 
  Send, 
  Edit2, 
  Trash2, 
  Lock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  updated_at: string;
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

interface PastWeek {
  weekStart: Date;
  weekEnd: Date;
  logs: WorkLog[];
  comments: WorkLogComment[];
  totalMinutes: number;
  status: string;
}

const WORK_TYPES = [
  { value: 'Task', label: 'Task' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Support', label: 'Support' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Other', label: 'Other' },
];

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

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Submitted':
      return 'secondary';
    case 'Rework':
      return 'destructive';
    default:
      return 'outline';
  }
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

const WorkLogPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekLogs, setWeekLogs] = useState<WorkLog[]>([]);
  const [weekComments, setWeekComments] = useState<WorkLogComment[]>([]);
  const [pastWeeks, setPastWeeks] = useState<PastWeek[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<WorkLog | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    work_type: '',
    description: '',
    minutes_spent: '',
    blockers: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const currentWeekStart = getMonday(new Date());
  const currentWeekEnd = getSunday(new Date());

  useEffect(() => {
    if (employee?.id) {
      fetchWeekLogs();
      fetchPastWeeks();
    }
  }, [employee?.id]);

  useEffect(() => {
    // Load existing log if date changes
    const existingLog = weekLogs.find(log => log.log_date === selectedDate);
    if (existingLog) {
      setEditingLog(existingLog);
      setFormData({
        work_type: existingLog.work_type,
        description: existingLog.description,
        minutes_spent: existingLog.minutes_spent.toString(),
        blockers: existingLog.blockers || '',
      });
    } else {
      setEditingLog(null);
      resetForm();
    }
  }, [selectedDate, weekLogs]);

  const fetchWeekLogs = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(currentWeekEnd, 'yyyy-MM-dd');
      
      const { data: logs, error } = await supabase
        .from('hr_work_logs')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('log_date', weekStartStr)
        .lte('log_date', weekEndStr)
        .order('log_date', { ascending: true });

      if (error) throw error;
      setWeekLogs(logs || []);

      // Fetch comments for these logs
      if (logs && logs.length > 0) {
        const logIds = logs.map(l => l.id);
        const { data: comments } = await supabase
          .from('hr_work_log_comments')
          .select(`
            *,
            manager:hr_employees!manager_id(full_name)
          `)
          .in('work_log_id', logIds)
          .order('created_at', { ascending: false });
        
        setWeekComments(comments || []);
      } else {
        setWeekComments([]);
      }
    } catch (error: any) {
      console.error('Error fetching week logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPastWeeks = async () => {
    if (!employee?.id) return;
    
    try {
      // Get logs from the past 8 weeks (excluding current week)
      const pastWeekStart = addDays(currentWeekStart, -56); // 8 weeks back
      const pastWeekEnd = addDays(currentWeekStart, -1); // Day before current week
      
      const { data: logs, error } = await supabase
        .from('hr_work_logs')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('log_date', format(pastWeekStart, 'yyyy-MM-dd'))
        .lte('log_date', format(pastWeekEnd, 'yyyy-MM-dd'))
        .order('log_date', { ascending: false });

      if (error) throw error;

      // Group logs by week
      const weekGroups = new Map<string, WorkLog[]>();
      (logs || []).forEach(log => {
        const logDate = parseISO(log.log_date);
        const weekStart = getMonday(logDate);
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weekGroups.has(weekKey)) {
          weekGroups.set(weekKey, []);
        }
        weekGroups.get(weekKey)!.push(log);
      });

      // Fetch comments for past logs
      const allLogIds = (logs || []).map(l => l.id);
      let commentsMap = new Map<string, WorkLogComment[]>();
      
      if (allLogIds.length > 0) {
        const { data: comments } = await supabase
          .from('hr_work_log_comments')
          .select(`
            *,
            manager:hr_employees!manager_id(full_name)
          `)
          .in('work_log_id', allLogIds);
        
        (comments || []).forEach(comment => {
          if (!commentsMap.has(comment.work_log_id)) {
            commentsMap.set(comment.work_log_id, []);
          }
          commentsMap.get(comment.work_log_id)!.push(comment);
        });
      }

      // Convert to PastWeek array
      const weeks: PastWeek[] = [];
      weekGroups.forEach((weekLogs, weekKey) => {
        const weekStart = parseISO(weekKey);
        const weekEnd = getSunday(weekStart);
        const totalMinutes = weekLogs.reduce((sum, log) => sum + log.minutes_spent, 0);
        
        // Get the overall status (prioritize: Rework > Submitted > Approved > Draft)
        let status = 'Draft';
        if (weekLogs.some(l => l.status === 'Rework')) status = 'Rework';
        else if (weekLogs.some(l => l.status === 'Submitted')) status = 'Submitted';
        else if (weekLogs.every(l => l.status === 'Approved')) status = 'Approved';

        // Get all comments for this week's logs
        const weekComments: WorkLogComment[] = [];
        weekLogs.forEach(log => {
          const logComments = commentsMap.get(log.id) || [];
          weekComments.push(...logComments);
        });
        
        weeks.push({
          weekStart,
          weekEnd,
          logs: weekLogs,
          comments: weekComments,
          totalMinutes,
          status,
        });
      });

      // Sort by week start date (newest first)
      weeks.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
      setPastWeeks(weeks);
    } catch (error: any) {
      console.error('Error fetching past weeks:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      work_type: '',
      description: '',
      minutes_spent: '',
      blockers: '',
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.work_type) {
      errors.work_type = 'Work type is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    const minutes = parseInt(formData.minutes_spent);
    if (!formData.minutes_spent || isNaN(minutes)) {
      errors.minutes_spent = 'Time spent is required';
    } else if (minutes < 1) {
      errors.minutes_spent = 'Time spent must be at least 1 minute';
    } else if (minutes > 960) {
      errors.minutes_spent = 'Time spent cannot exceed 960 minutes (16 hours)';
    }

    if (formData.blockers && formData.blockers.length > 500) {
      errors.blockers = 'Blockers must be less than 500 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !employee?.id) return;
    
    setSaving(true);
    try {
      const logData = {
        employee_id: employee.id,
        log_date: selectedDate,
        work_type: formData.work_type,
        description: formData.description.trim(),
        minutes_spent: parseInt(formData.minutes_spent),
        blockers: formData.blockers.trim() || null,
        status: 'Draft',
        updated_at: new Date().toISOString(),
      };

      if (editingLog) {
        // Update existing log
        const { error } = await supabase
          .from('hr_work_logs')
          .update(logData)
          .eq('id', editingLog.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Work log updated successfully',
        });
      } else {
        // Insert new log
        const { error } = await supabase
          .from('hr_work_logs')
          .insert(logData);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Work log saved successfully',
        });
      }

      fetchWeekLogs();
      resetForm();
      setEditingLog(null);
    } catch (error: any) {
      console.error('Error saving work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to save work log',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    
    try {
      const { error } = await supabase
        .from('hr_work_logs')
        .delete()
        .eq('id', logToDelete.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Work log deleted successfully',
      });
      
      fetchWeekLogs();
      setLogToDelete(null);
      setShowDeleteDialog(false);
      
      if (editingLog?.id === logToDelete.id) {
        setEditingLog(null);
        resetForm();
      }
    } catch (error: any) {
      console.error('Error deleting work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete work log',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitWeek = async () => {
    if (!employee?.id) return;
    
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(currentWeekEnd, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('hr_work_logs')
        .update({
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('employee_id', employee.id)
        .gte('log_date', weekStartStr)
        .lte('log_date', weekEndStr)
        .in('status', ['Draft', 'Rework']);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Week submitted for manager review!',
      });
      
      fetchWeekLogs();
      setShowSubmitDialog(false);
    } catch (error: any) {
      console.error('Error submitting week:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit week',
        variant: 'destructive',
      });
    }
  };

  const getWeekStatus = (): string => {
    if (weekLogs.length === 0) return 'Draft';
    if (weekLogs.some(l => l.status === 'Rework')) return 'Rework';
    if (weekLogs.some(l => l.status === 'Submitted')) return 'Submitted';
    if (weekLogs.every(l => l.status === 'Approved')) return 'Approved';
    return 'Draft';
  };

  const isWeekEditable = (): boolean => {
    const status = getWeekStatus();
    return status === 'Draft' || status === 'Rework';
  };

  const isDateEditable = (date: string): boolean => {
    if (!isWeekEditable()) return false;
    
    const dateObj = parseISO(date);
    const today = new Date();
    
    // Cannot log future dates
    if (isAfter(dateObj, today)) return false;
    
    // Check if date is within current week
    if (isBefore(dateObj, currentWeekStart) || isAfter(dateObj, currentWeekEnd)) {
      return false;
    }
    
    return true;
  };

  const getDaysLogged = (): number => {
    // Count unique days with logs (Mon-Fri only)
    const workdays = weekLogs.filter(log => {
      const date = parseISO(log.log_date);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude weekends
    });
    return new Set(workdays.map(l => l.log_date)).size;
  };

  const getTotalMinutes = (): number => {
    return weekLogs.reduce((sum, log) => sum + log.minutes_spent, 0);
  };

  const toggleWeekExpanded = (weekKey: string) => {
    setExpandedWeeks(prev => 
      prev.includes(weekKey) 
        ? prev.filter(k => k !== weekKey)
        : [...prev, weekKey]
    );
  };

  const getCommentsForLog = (logId: string): WorkLogComment[] => {
    return weekComments.filter(c => c.work_log_id === logId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const weekStatus = getWeekStatus();
  const canEdit = isWeekEditable();
  const canSubmit = canEdit && weekLogs.length > 0 && weekLogs.some(l => l.status === 'Draft' || l.status === 'Rework');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Work Log</h1>
        <p className="text-muted-foreground">Track your daily work activities</p>
      </div>

      {/* Current Week Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{getDaysLogged()} / 5 workdays logged</span>
                <span>•</span>
                <span>{formatMinutes(getTotalMinutes())} total</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(weekStatus)}>
                {!canEdit && <Lock className="h-3 w-3 mr-1" />}
                {weekStatus}
              </Badge>
              
              {canSubmit && (
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Week for Review
                </Button>
              )}
            </div>
          </div>
          
          {weekStatus === 'Rework' && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-600">Manager requested changes</p>
                <p className="text-sm text-muted-foreground">Please review the comments and update your logs.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Log Entry Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingLog ? 'Edit Log' : 'Add Daily Log'}
            </CardTitle>
            <CardDescription>
              {canEdit ? 'Log your work for the selected date' : 'This week is locked for editing'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Selector */}
            <div className="space-y-2">
              <Label htmlFor="log_date">Date</Label>
              <Input
                id="log_date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                min={format(currentWeekStart, 'yyyy-MM-dd')}
                disabled={!canEdit}
              />
              {!isDateEditable(selectedDate) && canEdit && (
                <p className="text-xs text-muted-foreground">
                  Select a date within the current week
                </p>
              )}
            </div>

            {/* Work Type */}
            <div className="space-y-2">
              <Label htmlFor="work_type">Work Type *</Label>
              <Select
                value={formData.work_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, work_type: value }))}
                disabled={!isDateEditable(selectedDate)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.work_type && (
                <p className="text-xs text-destructive">{formErrors.work_type}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what you worked on today..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={!isDateEditable(selectedDate)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 characters (min 20)
              </p>
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>

            {/* Time Spent */}
            <div className="space-y-2">
              <Label htmlFor="minutes_spent">Time Spent (minutes) *</Label>
              <Input
                id="minutes_spent"
                type="number"
                placeholder="e.g., 480 (8 hours)"
                value={formData.minutes_spent}
                onChange={(e) => setFormData(prev => ({ ...prev, minutes_spent: e.target.value }))}
                disabled={!isDateEditable(selectedDate)}
                min={1}
                max={960}
              />
              <p className="text-xs text-muted-foreground">480 minutes = 8 hours</p>
              {formErrors.minutes_spent && (
                <p className="text-xs text-destructive">{formErrors.minutes_spent}</p>
              )}
            </div>

            {/* Blockers */}
            <div className="space-y-2">
              <Label htmlFor="blockers">Blockers/Issues (optional)</Label>
              <Textarea
                id="blockers"
                placeholder="Any blockers or issues faced?"
                value={formData.blockers}
                onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
                disabled={!isDateEditable(selectedDate)}
                rows={2}
              />
              {formErrors.blockers && (
                <p className="text-xs text-destructive">{formErrors.blockers}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!isDateEditable(selectedDate) || saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : editingLog ? 'Update Log' : 'Save Log'}
              </Button>
              {editingLog && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    setLogToDelete(editingLog);
                    setShowDeleteDialog(true);
                  }}
                  disabled={!isDateEditable(selectedDate)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setEditingLog(null);
                }}
                disabled={!canEdit}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Week View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              This Week's Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weekLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No logs yet for this week.</p>
                <p className="text-sm">Start logging your work!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weekLogs.map((log) => {
                  const logComments = getCommentsForLog(log.id);
                  const isEditable = isDateEditable(log.log_date);
                  
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        editingLog?.id === log.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {format(parseISO(log.log_date), 'EEE, MMM d')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.work_type}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                              {!isEditable && log.status !== 'Draft' && (
                                <Lock className="h-3 w-3 mr-1" />
                              )}
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatMinutes(log.minutes_spent)}
                            </span>
                            {log.blockers && (
                              <span className="flex items-center gap-1 text-orange-600">
                                <AlertCircle className="h-3 w-3" />
                                Has blockers
                              </span>
                            )}
                          </div>
                          
                          {/* Manager Comments */}
                          {logComments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {logComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="flex items-start gap-2 p-2 bg-muted rounded text-sm"
                                >
                                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-medium">{comment.manager?.full_name}</span>
                                    {comment.action && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {comment.action}
                                      </Badge>
                                    )}
                                    <p className="text-muted-foreground mt-1">{comment.comment}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {isEditable && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedDate(log.log_date)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setLogToDelete(log);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Past Weeks History */}
      {pastWeeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Past Weeks</CardTitle>
            <CardDescription>View your work log history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastWeeks.map((week) => {
              const weekKey = format(week.weekStart, 'yyyy-MM-dd');
              const isExpanded = expandedWeeks.includes(weekKey);
              
              return (
                <Collapsible key={weekKey} open={isExpanded} onOpenChange={() => toggleWeekExpanded(weekKey)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-medium">
                            {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d, yyyy')}
                          </span>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{week.logs.length} days logged</span>
                            <span>•</span>
                            <span>{formatMinutes(week.totalMinutes)} total</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(week.status)}>
                          {week.status}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-border pl-4">
                      {week.logs.map((log) => {
                        const logComments = week.comments.filter(c => c.work_log_id === log.id);
                        
                        return (
                          <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {format(parseISO(log.log_date), 'EEE, MMM d')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {log.work_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatMinutes(log.minutes_spent)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{log.description}</p>
                            
                            {logComments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {logComments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="flex items-start gap-2 p-2 bg-background rounded text-xs"
                                  >
                                    <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-medium">{comment.manager?.full_name}</span>
                                      <p className="text-muted-foreground">{comment.comment}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Submit Week Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit week for manager review?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't be able to edit logs after submission until your manager reviews them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitWeek}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Log Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your work log for{' '}
              {logToDelete && format(parseISO(logToDelete.log_date), 'MMMM d, yyyy')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLogToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkLogPage;
