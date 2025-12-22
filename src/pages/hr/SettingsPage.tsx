import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Clock, 
  Calendar, 
  Bell, 
  Shield, 
  Building2,
  Mail,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { toast } = useToast();
  
  const [attendanceSettings, setAttendanceSettings] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    graceMinutes: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    weekends: ['saturday', 'sunday'],
    trackBreaks: true,
  });

  const [leaveSettings, setLeaveSettings] = useState({
    annualLeaveQuota: 20,
    sickLeaveQuota: 12,
    personalLeaveQuota: 5,
    carryForwardLimit: 5,
    requireApproval: true,
    notifyManager: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    leaveApprovalReminders: true,
    attendanceAlerts: true,
    birthdayReminders: true,
    probationReminders: true,
  });

  const [companySettings, setCompanySettings] = useState({
    companyName: 'LabelNest',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  });

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your changes have been saved successfully.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure HR policies and system preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Leave Policy
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Attendance Settings */}
        <TabsContent value="attendance">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Attendance Policy
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Work Start Time</Label>
                  <Input 
                    type="time" 
                    value={attendanceSettings.workStartTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, workStartTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work End Time</Label>
                  <Input 
                    type="time" 
                    value={attendanceSettings.workEndTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, workEndTime: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Grace Period (minutes)</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.graceMinutes}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, graceMinutes: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Late arrival tolerance</p>
                </div>
                <div className="space-y-2">
                  <Label>Half Day Hours</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.halfDayHours}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, halfDayHours: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Day Hours</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.fullDayHours}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, fullDayHours: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Track Break Times</p>
                  <p className="text-sm text-muted-foreground">Allow employees to log break in/out times</p>
                </div>
                <Switch 
                  checked={attendanceSettings.trackBreaks}
                  onCheckedChange={(checked) => setAttendanceSettings({ ...attendanceSettings, trackBreaks: checked })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Leave Settings */}
        <TabsContent value="leave">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Leave Policy
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Annual Leave Quota</Label>
                  <Input 
                    type="number" 
                    value={leaveSettings.annualLeaveQuota}
                    onChange={(e) => setLeaveSettings({ ...leaveSettings, annualLeaveQuota: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Days per year</p>
                </div>
                <div className="space-y-2">
                  <Label>Sick Leave Quota</Label>
                  <Input 
                    type="number" 
                    value={leaveSettings.sickLeaveQuota}
                    onChange={(e) => setLeaveSettings({ ...leaveSettings, sickLeaveQuota: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Days per year</p>
                </div>
                <div className="space-y-2">
                  <Label>Personal Leave Quota</Label>
                  <Input 
                    type="number" 
                    value={leaveSettings.personalLeaveQuota}
                    onChange={(e) => setLeaveSettings({ ...leaveSettings, personalLeaveQuota: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Days per year</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Carry Forward Limit</Label>
                <Input 
                  type="number" 
                  value={leaveSettings.carryForwardLimit}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, carryForwardLimit: parseInt(e.target.value) })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Maximum days that can be carried to next year</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Require Manager Approval</p>
                    <p className="text-sm text-muted-foreground">Leave requests need manager approval before HR</p>
                  </div>
                  <Switch 
                    checked={leaveSettings.requireApproval}
                    onCheckedChange={(checked) => setLeaveSettings({ ...leaveSettings, requireApproval: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Notify Manager</p>
                    <p className="text-sm text-muted-foreground">Send email to manager when leave is requested</p>
                  </div>
                  <Switch 
                    checked={leaveSettings.notifyManager}
                    onCheckedChange={(checked) => setLeaveSettings({ ...leaveSettings, notifyManager: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch 
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Leave Approval Reminders</p>
                  <p className="text-sm text-muted-foreground">Remind about pending leave approvals</p>
                </div>
                <Switch 
                  checked={notificationSettings.leaveApprovalReminders}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, leaveApprovalReminders: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Attendance Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when employees miss punch in/out</p>
                </div>
                <Switch 
                  checked={notificationSettings.attendanceAlerts}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, attendanceAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Birthday Reminders</p>
                  <p className="text-sm text-muted-foreground">Notify about upcoming employee birthdays</p>
                </div>
                <Switch 
                  checked={notificationSettings.birthdayReminders}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, birthdayReminders: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Probation Reminders</p>
                  <p className="text-sm text-muted-foreground">Notify before probation period ends</p>
                </div>
                <Switch 
                  checked={notificationSettings.probationReminders}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, probationReminders: checked })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={companySettings.timezone} onValueChange={(v) => setCompanySettings({ ...companySettings, timezone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={companySettings.dateFormat} onValueChange={(v) => setCompanySettings({ ...companySettings, dateFormat: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={companySettings.currency} onValueChange={(v) => setCompanySettings({ ...companySettings, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
