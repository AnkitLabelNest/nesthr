import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Loader2, X } from 'lucide-react';
import { format, differenceInDays, isWeekend, eachDayOfInterval, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LeaveEntitlement {
  id: string;
  leave_type: string;
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
}

const LEAVE_TYPES = [
  { value: 'Earned Leave', label: 'Earned Leave', defaultTotal: 18 },
  { value: 'Casual Leave', label: 'Casual Leave', defaultTotal: 6 },
  { value: 'Sick Leave', label: 'Sick Leave', defaultTotal: 6 },
];

const MyLeavesPage = () => {
  const { employee } = useAuth();
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');

  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    if (!employee?.id) return;

    try {
      // Fetch leave entitlements
      const { data: entData, error: entError } = await supabase
        .from('hr_leave_entitlements')
        .select('id, leave_type, total_leaves, used_leaves, remaining_leaves')
        .eq('employee_id', employee.id)
        .eq('year', currentYear);

      if (entError) throw entError;
      setEntitlements(entData || []);

      // Fetch leave requests
      const { data: reqData, error: reqError } = await supabase
        .from('hr_leave_requests')
        .select('id, leave_type, start_date, end_date, total_days, status, reason, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setLeaveRequests(reqData || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('leave-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_requests',
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_entitlements',
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  const getEntitlement = (type: string) => {
    const ent = entitlements.find((e) => e.leave_type === type);
    const defaultType = LEAVE_TYPES.find((t) => t.value === type);
    return {
      remaining: ent?.remaining_leaves ?? defaultType?.defaultTotal ?? 0,
      total: ent?.total_leaves ?? defaultType?.defaultTotal ?? 0,
    };
  };

  const calculateWorkingDays = (start: Date, end: Date): number => {
    const days = eachDayOfInterval({ start, end });
    return days.filter((day) => !isWeekend(day)).length;
  };

  const totalDays = startDate && endDate ? calculateWorkingDays(startDate, endDate) : 0;

  const resetForm = () => {
    setLeaveType('');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!employee?.id || !leaveType || !startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { remaining } = getEntitlement(leaveType);
    if (totalDays > remaining) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${remaining} ${leaveType} days remaining`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('hr_leave_requests').insert({
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        total_days: totalDays,
        reason: reason || null,
        status: 'Pending',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('hr_leave_requests')
        .update({ status: 'Cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave request cancelled',
      });
      fetchData();
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel leave request',
        variant: 'destructive',
      });
    }
  };

  const getStatusVariant = (status: string): 'pending' | 'approved' | 'rejected' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Leaves</h1>
          <p className="text-muted-foreground">View and request time off</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => {
                      const { remaining, total } = getEntitlement(type.value);
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({remaining}/{total} days)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4}>
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4}>
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => {
                          const minDate = startDate || new Date();
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < minDate || date < today;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total Working Days: <span className="font-semibold text-foreground">{totalDays}</span>
                    <span className="text-xs ml-2">(excluding weekends)</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {LEAVE_TYPES.map((type) => {
          const { remaining, total } = getEntitlement(type.value);
          return (
            <Card key={type.value} className="p-4 glass-card">
              <p className="text-sm text-muted-foreground">{type.label}</p>
              <p className="text-2xl font-bold text-foreground">
                {remaining}{' '}
                <span className="text-sm font-normal text-muted-foreground">/ {total} days</span>
              </p>
            </Card>
          );
        })}
      </div>

      {/* Leave Requests History */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.leave_type}</TableCell>
                  <TableCell>
                    {format(parseISO(request.start_date), 'MMM d')} -{' '}
                    {format(parseISO(request.end_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{request.total_days}</TableCell>
                  <TableCell>
                    <StatusBadge status={getStatusVariant(request.status)} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.reason || '-'}
                  </TableCell>
                  <TableCell>{format(parseISO(request.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {request.status === 'Pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No leave requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Apply Leave" to submit your first request
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MyLeavesPage;
