import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Clock, LogIn, LogOut, Calendar as CalendarIcon, Loader2, List, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  punch_in_time: string;
  punch_out_time: string | null;
  total_hours: number | null;
  status: string | null;
  notes: string | null;
}

interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
}

const AttendancePage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>([]);
  const [monthHolidays, setMonthHolidays] = useState<Holiday[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance and history
  useEffect(() => {
    if (!employee?.id) return;

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        // Fetch today's record
        const { data: todayData, error: todayError } = await supabase
          .from('hr_attendance')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('attendance_date', today)
          .maybeSingle();

        if (todayError) throw todayError;
        setTodayRecord(todayData);

        // Fetch last 30 days history
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: historyData, error: historyError } = await supabase
          .from('hr_attendance')
          .select('*')
          .eq('employee_id', employee.id)
          .gte('attendance_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
          .order('attendance_date', { ascending: false });

        if (historyError) throw historyError;
        setAttendanceHistory(historyData || []);

        // Calculate monthly hours
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        
        const { data: monthData, error: monthError } = await supabase
          .from('hr_attendance')
          .select('total_hours')
          .eq('employee_id', employee.id)
          .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));

        if (monthError) throw monthError;
        
        const totalHours = (monthData || []).reduce(
          (sum, record) => sum + (record.total_hours || 0), 
          0
        );
        setMonthlyHours(totalHours);

      } catch (error: any) {
        console.error('Error fetching attendance:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendance data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();

    // Set up realtime subscription
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_attendance',
          filter: `employee_id=eq.${employee.id}`,
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id, today, toast]);

  // Fetch calendar data when month changes
  useEffect(() => {
    if (!employee?.id) return;

    const fetchCalendarData = async () => {
      const monthStart = startOfMonth(calendarMonth);
      const monthEnd = endOfMonth(calendarMonth);

      try {
        // Fetch attendance for the month
        const { data: attendance } = await supabase
          .from('hr_attendance')
          .select('*')
          .eq('employee_id', employee.id)
          .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));

        setMonthAttendance(attendance || []);

        // Fetch holidays for the month
        const { data: holidays } = await supabase
          .from('hr_holidays')
          .select('id, holiday_date, holiday_name')
          .gte('holiday_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('holiday_date', format(monthEnd, 'yyyy-MM-dd'));

        setMonthHolidays(holidays || []);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }
    };

    fetchCalendarData();
  }, [employee?.id, calendarMonth]);

  const handlePunchIn = async () => {
    if (!employee?.id) return;

    setPunching(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('hr_attendance')
        .insert({
          employee_id: employee.id,
          attendance_date: today,
          punch_in_time: now,
          status: 'present',
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Punched In',
            description: 'You have already punched in today',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Punched In',
        description: `Successfully punched in at ${format(new Date(), 'HH:mm')}`,
      });

    } catch (error: any) {
      console.error('Error punching in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to punch in',
        variant: 'destructive',
      });
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!employee?.id || !todayRecord) return;

    setPunching(true);
    try {
      const now = new Date();
      const punchIn = new Date(todayRecord.punch_in_time);
      const hoursWorked = (now.getTime() - punchIn.getTime()) / (1000 * 60 * 60);
      
      const status = hoursWorked >= 8 ? 'present' : hoursWorked >= 4 ? 'partial' : 'absent';

      const { error } = await supabase
        .from('hr_attendance')
        .update({
          punch_out_time: now.toISOString(),
          total_hours: parseFloat(hoursWorked.toFixed(2)),
          status,
        })
        .eq('id', todayRecord.id);

      if (error) throw error;

      toast({
        title: 'Punched Out',
        description: `Successfully punched out. Total hours: ${hoursWorked.toFixed(2)}h`,
      });

    } catch (error: any) {
      console.error('Error punching out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to punch out',
        variant: 'destructive',
      });
    } finally {
      setPunching(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(new Date(isoString), 'HH:mm');
  };

  const getStatus = (): 'present' | 'absent' | 'partial' => {
    if (!todayRecord) return 'absent';
    if (todayRecord.status === 'present') return 'present';
    if (todayRecord.status === 'partial') return 'partial';
    if (todayRecord.punch_in_time && !todayRecord.punch_out_time) return 'present';
    return 'absent';
  };

  const isPunchedIn = todayRecord && !todayRecord.punch_out_time;

  // Stats calculations
  const presentDays = attendanceHistory.filter(r => r.status === 'present').length;
  const partialDays = attendanceHistory.filter(r => r.status === 'partial').length;

  // Calendar helper functions
  const getDateStatus = (date: Date): 'present' | 'absent' | 'partial' | 'holiday' | 'leave' | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if holiday
    const holiday = monthHolidays.find(h => h.holiday_date === dateStr);
    if (holiday) return 'holiday';
    
    // Check attendance
    const attendance = monthAttendance.find(a => a.attendance_date === dateStr);
    if (attendance) {
      if (attendance.status === 'present') return 'present';
      if (attendance.status === 'partial') return 'partial';
      if (attendance.status === 'absent') return 'absent';
      if (attendance.status === 'leave') return 'leave';
    }
    
    return null;
  };

  const getDateClassName = (date: Date): string => {
    const status = getDateStatus(date);
    switch (status) {
      case 'present':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200';
      case 'absent':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200';
      case 'partial':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200';
      case 'holiday':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';
      case 'leave':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200';
      default:
        return '';
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
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Track your daily punch in and punch out times</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Present Days (30 Days)" 
          value={presentDays} 
          icon={CalendarIcon}
        />
        <StatCard 
          title="Partial Days" 
          value={partialDays} 
          icon={Clock}
        />
        <StatCard 
          title="Monthly Hours" 
          value={`${monthlyHours.toFixed(1)}h`} 
          icon={Clock}
        />
        <StatCard 
          title="Avg Hours/Day" 
          value={attendanceHistory.length > 0 
            ? `${(monthlyHours / Math.max(presentDays + partialDays, 1)).toFixed(1)}h` 
            : '--'} 
          icon={Clock}
        />
      </div>

      {/* Today's Attendance */}
      <Card className="p-8 glass-card">
        <div className="text-center space-y-6">
          {/* Current Date & Time */}
          <div>
            <p className="text-4xl font-mono font-bold text-primary mb-2">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-lg font-medium text-foreground">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Status */}
          <div>
            <StatusBadge status={getStatus()} className="text-base px-4 py-1" />
            {isPunchedIn && (
              <p className="text-sm text-muted-foreground mt-2">
                Punched in at {formatTime(todayRecord?.punch_in_time ?? null)}
              </p>
            )}
          </div>

          {/* Punch Buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              onClick={handlePunchIn}
              disabled={!!todayRecord || punching}
              className="min-w-40 bg-green-600 hover:bg-green-700 text-white"
            >
              {punching && !todayRecord ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              Punch In
            </Button>
            <Button 
              onClick={handlePunchOut}
              disabled={!isPunchedIn || punching}
              className="min-w-40 bg-red-600 hover:bg-red-700 text-white"
            >
              {punching && isPunchedIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              Punch Out
            </Button>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Punch In</p>
              <p className="text-2xl font-mono font-semibold text-foreground">
                {formatTime(todayRecord?.punch_in_time ?? null)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Punch Out</p>
              <p className="text-2xl font-mono font-semibold text-foreground">
                {formatTime(todayRecord?.punch_out_time ?? null)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Hours</p>
              <p className="text-2xl font-mono font-semibold text-primary">
                {todayRecord?.total_hours ? `${todayRecord.total_hours}h` : '--:--'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance History - Tabbed View */}
      <Card className="glass-card overflow-hidden">
        <Tabs defaultValue="list" className="w-full">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-semibold text-foreground">Attendance History</h2>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="m-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.attendance_date), 'EEE, MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatTime(record.punch_in_time)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatTime(record.punch_out_time)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.total_hours ? `${record.total_hours}h` : '--'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={record.status as 'present' | 'absent' | 'partial' || 'absent'} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="m-0 p-4">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Legend */}
              <Card className="p-4 lg:w-48 flex-shrink-0">
                <h3 className="font-semibold text-sm mb-3">Legend</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 border border-green-200"></div>
                    <span className="text-sm">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40 border border-red-200"></div>
                    <span className="text-sm">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200"></div>
                    <span className="text-sm">Half Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-200"></div>
                    <span className="text-sm">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-200"></div>
                    <span className="text-sm">On Leave</span>
                  </div>
                </div>
              </Card>

              {/* Calendar */}
              <div className="flex-1">
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  className="pointer-events-auto"
                  modifiers={{
                    present: (date) => getDateStatus(date) === 'present',
                    absent: (date) => getDateStatus(date) === 'absent',
                    partial: (date) => getDateStatus(date) === 'partial',
                    holiday: (date) => getDateStatus(date) === 'holiday',
                    leave: (date) => getDateStatus(date) === 'leave',
                  }}
                  modifiersClassNames={{
                    present: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
                    absent: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
                    partial: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200',
                    holiday: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
                    leave: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200',
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AttendancePage;