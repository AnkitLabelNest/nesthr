// Work Log Types

export interface WorkLogWeek {
  id: string;
  employee_id: string;
  week_start_date: string;
  week_end_date: string;
  total_minutes: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rework';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rework_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLogTask {
  id: string;
  week_log_id: string;
  employee_id: string;
  log_date: string;
  day_status: 'Draft' | 'Submitted' | 'Approved' | 'Rework';
  task_title: string;
  category: TaskCategory;
  duration_minutes: number;
  assigned_by_type: 'Self' | 'Employee' | 'Manager' | 'Admin';
  assigned_by_id: string | null;
  description: string | null;
  rework_comment: string | null;
  created_at: string;
  updated_at: string;
  assigned_by?: {
    full_name: string;
  };
}

export type TaskCategory = 
  | 'Meeting' 
  | 'Development' 
  | 'Support' 
  | 'Learning' 
  | 'Documentation' 
  | 'Design' 
  | 'Review' 
  | 'Planning' 
  | 'Admin' 
  | 'Other';

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'Meeting', label: 'Meeting', icon: '📅' },
  { value: 'Development', label: 'Development', icon: '💻' },
  { value: 'Support', label: 'Support', icon: '🐛' },
  { value: 'Learning', label: 'Learning', icon: '📚' },
  { value: 'Documentation', label: 'Documentation', icon: '📝' },
  { value: 'Design', label: 'Design', icon: '🎨' },
  { value: 'Review', label: 'Review', icon: '🔍' },
  { value: 'Planning', label: 'Planning', icon: '📊' },
  { value: 'Admin', label: 'Admin', icon: '📧' },
  { value: 'Other', label: 'Other', icon: '🎯' },
];

export const getCategoryIcon = (category: TaskCategory): string => {
  return TASK_CATEGORIES.find(c => c.value === category)?.icon || '🎯';
};

export interface DayTasks {
  date: Date;
  dateStr: string;
  dayName: string;
  tasks: WorkLogTask[];
  totalMinutes: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rework' | 'NoEntry';
  reworkComment?: string | null;
}

export interface WeekSummary {
  totalMinutes: number;
  targetMinutes: number;
  categoryBreakdown: Record<TaskCategory, number>;
  daysWithEntries: number;
}
