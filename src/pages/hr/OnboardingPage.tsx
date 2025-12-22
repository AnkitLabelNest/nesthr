import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, UserPlus, Monitor, FileText, BookOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { employees } from '@/data/mockData';

interface OnboardingTask {
  id: string;
  title: string;
  category: 'it_setup' | 'document_submission' | 'policy_acknowledgment' | 'other';
  assignedTo: 'employee' | 'manager';
  status: 'pending' | 'in_progress' | 'completed';
  employeeId: string;
  employeeName: string;
}

const mockOnboardingTasks: OnboardingTask[] = [
  { id: 'onb-1', title: 'Set up workstation and laptop', category: 'it_setup', assignedTo: 'manager', status: 'completed', employeeId: 'emp-007', employeeName: 'David Kim' },
  { id: 'onb-2', title: 'Configure email and Slack access', category: 'it_setup', assignedTo: 'manager', status: 'in_progress', employeeId: 'emp-007', employeeName: 'David Kim' },
  { id: 'onb-3', title: 'Submit ID proof and address verification', category: 'document_submission', assignedTo: 'employee', status: 'pending', employeeId: 'emp-007', employeeName: 'David Kim' },
  { id: 'onb-4', title: 'Complete bank details form', category: 'document_submission', assignedTo: 'employee', status: 'completed', employeeId: 'emp-007', employeeName: 'David Kim' },
  { id: 'onb-5', title: 'Read and acknowledge employee handbook', category: 'policy_acknowledgment', assignedTo: 'employee', status: 'pending', employeeId: 'emp-007', employeeName: 'David Kim' },
  { id: 'onb-6', title: 'Complete security policy training', category: 'policy_acknowledgment', assignedTo: 'employee', status: 'pending', employeeId: 'emp-007', employeeName: 'David Kim' },
];

const categoryIcons = {
  it_setup: Monitor,
  document_submission: FileText,
  policy_acknowledgment: BookOpen,
  other: CheckCircle2,
};

const categoryLabels = {
  it_setup: 'IT Setup',
  document_submission: 'Document Submission',
  policy_acknowledgment: 'Policy Acknowledgment',
  other: 'Other',
};

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
};

const OnboardingPage = () => {
  const [tasks, setTasks] = useState<OnboardingTask[]>(mockOnboardingTasks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'it_setup' as OnboardingTask['category'],
    assignedTo: 'employee' as OnboardingTask['assignedTo'],
    employeeId: '',
  });

  const newEmployees = employees.filter(e => e.status === 'probation');

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.employeeId) return;
    
    const employee = employees.find(e => e.id === newTask.employeeId);
    const task: OnboardingTask = {
      id: `onb-${Date.now()}`,
      title: newTask.title,
      category: newTask.category,
      assignedTo: newTask.assignedTo,
      status: 'pending',
      employeeId: newTask.employeeId,
      employeeName: employee?.name || '',
    };
    
    setTasks([...tasks, task]);
    setNewTask({ title: '', category: 'it_setup', assignedTo: 'employee', employeeId: '' });
    setIsDialogOpen(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        return { ...task, status: newStatus };
      }
      return task;
    }));
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.employeeName]) acc[task.employeeName] = [];
    acc[task.employeeName].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground">Manage new employee onboarding tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Onboarding Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input 
                  placeholder="e.g., Set up workstation" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={newTask.employeeId} onValueChange={(v) => setNewTask({ ...newTask, employeeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {newEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v as OnboardingTask['category'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it_setup">IT Setup</SelectItem>
                    <SelectItem value="document_submission">Document Submission</SelectItem>
                    <SelectItem value="policy_acknowledgment">Policy Acknowledgment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={newTask.assignedTo} onValueChange={(v) => setNewTask({ ...newTask, assignedTo: v as 'employee' | 'manager' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateTask}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{newEmployees.length}</p>
              <p className="text-sm text-muted-foreground">New Employees</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed Tasks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Task Lists by Employee */}
      {Object.entries(groupedTasks).map(([employeeName, employeeTasks]) => (
        <Card key={employeeName} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {employeeName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{employeeName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {employeeTasks.filter(t => t.status === 'completed').length}/{employeeTasks.length} tasks completed
                  </p>
                </div>
              </div>
              <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(employeeTasks.filter(t => t.status === 'completed').length / employeeTasks.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {employeeTasks.map(task => {
              const Icon = categoryIcons[task.category];
              return (
                <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                  <Checkbox 
                    checked={task.status === 'completed'} 
                    onCheckedChange={() => toggleTaskStatus(task.id)}
                  />
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assigned to: {task.assignedTo === 'employee' ? 'Employee' : 'Manager'}
                    </p>
                  </div>
                  <Badge variant="outline" className={categoryLabels[task.category] ? '' : ''}>
                    {categoryLabels[task.category]}
                  </Badge>
                  <Badge className={statusColors[task.status]}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {Object.keys(groupedTasks).length === 0 && (
        <Card className="p-12 glass-card text-center">
          <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Onboarding Tasks</h3>
          <p className="text-muted-foreground mb-4">Create tasks for new employees to get started.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Task
          </Button>
        </Card>
      )}
    </div>
  );
};

export default OnboardingPage;
