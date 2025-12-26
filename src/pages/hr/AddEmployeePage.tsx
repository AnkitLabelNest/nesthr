import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, CalendarIcon, User, Briefcase, MapPin, Phone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Manager {
  id: string;
  full_name: string;
  role: string;
}

const AddEmployeePage = () => {
  const navigate = useNavigate();
  const { employee: currentEmployee, session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [emailError, setEmailError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    location: '',
    employmentType: '',
    dateOfBirth: undefined as Date | undefined,
    joiningDate: undefined as Date | undefined,
    role: '',
    managerId: '',
    address: '',
    status: true,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  // Fetch managers/admins for dropdown
  useEffect(() => {
    const fetchManagers = async () => {
      if (!currentEmployee?.org_id) return;

      const { data } = await supabase
        .from('hr_employees')
        .select('id, full_name, role')
        .eq('org_id', currentEmployee.org_id)
        .in('role', ['Admin', 'Manager'])
        .eq('status', 'Active')
        .order('full_name');

      setManagers(data || []);
    };

    fetchManagers();
  }, [currentEmployee?.org_id]);

  const validateEmail = async (email: string): Promise<boolean> => {
    if (!email) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format');
      return false;
    }

    // Check if email already exists in hr_employees
    const { data } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (data) {
      setEmailError('Email already exists');
      return false;
    }

    setEmailError('');
    return true;
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee?.org_id) {
      toast.error('Session not found. Please re-login.');
      return;
    }

    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.department || 
        !formData.designation || !formData.employmentType || !formData.joiningDate || !formData.role) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate email
    const isEmailValid = await validateEmail(formData.email);
    if (!isEmailValid) {
      toast.error(emailError || 'Invalid email');
      return;
    }

    // Validate joining date not in future
    if (formData.joiningDate && formData.joiningDate > new Date()) {
      toast.error('Joining date cannot be in the future');
      return;
    }

    // Validate phone numbers
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Invalid phone number format (10-15 digits)');
      return;
    }

    if (formData.emergencyContactPhone && !validatePhone(formData.emergencyContactPhone)) {
      toast.error('Invalid emergency contact phone format (10-15 digits)');
      return;
    }

    setSaving(true);

    try {
      // Step 1: Insert into hr_employees (user_id = null for now, will be linked manually later)
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .insert({
          org_id: currentEmployee.org_id,
          user_id: null,
          full_name: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          role: formData.role,
          manager_id: formData.managerId || null,
          status: formData.status ? 'Active' : 'Inactive',
          joining_date: formData.joiningDate ? format(formData.joiningDate, 'yyyy-MM-dd') : null,
        })
        .select('id, employee_code')
        .single();

      if (employeeError) {
        throw new Error(`Employee creation failed: ${employeeError.message}`);
      }

      // Step 2: Insert into hr_employee_details
      const { error: detailsError } = await supabase
        .from('hr_employee_details')
        .insert({
          employee_id: employeeData.id,
          phone: formData.phone?.trim() || null,
          department: formData.department,
          designation: formData.designation.trim(),
          location: formData.location?.trim() || null,
          employment_type: formData.employmentType,
          date_of_birth: formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : null,
          address: formData.address?.trim() || null,
          emergency_contact_name: formData.emergencyContactName?.trim() || null,
          emergency_contact_phone: formData.emergencyContactPhone?.trim() || null,
          emergency_contact_relationship: formData.emergencyContactRelationship || null,
        });

      if (detailsError) {
        // Rollback: delete employee record
        await supabase.from('hr_employees').delete().eq('id', employeeData.id);
        throw new Error(`Details creation failed: ${detailsError.message}`);
      }

      // Step 3: Initialize Leave Balances
      const currentYear = new Date().getFullYear();
      const leaveTypes = [
        { type: 'Earned Leave', total: 18 },
        { type: 'Casual Leave', total: 6 },
        { type: 'Sick Leave', total: 6 },
      ];

      for (const leave of leaveTypes) {
        await supabase.from('hr_leave_entitlements').insert({
          org_id: currentEmployee.org_id,
          employee_id: employeeData.id,
          leave_type: leave.type,
          total_leaves: leave.total,
          used_leaves: 0,
          year: currentYear,
        });
      }

      toast.success(
        `Employee added successfully! Employee Code: ${employeeData.employee_code}. To enable login, invite this user via Supabase Dashboard → Authentication → Users.`,
        { duration: 10000 }
      );
      navigate('/app/directory');
    } catch (error: any) {
      toast.error('An error occurred: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailError('');
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
      <Icon className="w-4 h-4" />
      <span>{title}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Add Employee</h1>
        <p className="text-muted-foreground">Create a new employee record with login credentials</p>
      </div>

      <Card className="max-w-4xl p-6 glass-card">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">New Employee Details</h2>
              <p className="text-sm text-muted-foreground">Fill in the information below. Login credentials must be created separately via Supabase Dashboard.</p>
            </div>
          </div>

          {/* Basic Info Section */}
          <div>
            <SectionHeader icon={User} title="Basic Information" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input 
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="John Doe"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  onBlur={() => formData.email && validateEmail(formData.email)}
                  placeholder="john.doe@company.com"
                  required
                  className={emailError ? 'border-destructive' : ''}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 9876543210"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dateOfBirth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateOfBirth}
                      onSelect={(date) => updateField('dateOfBirth', date)}
                      disabled={(date) => date > new Date() || date < new Date("1940-01-01")}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Employment Details Section */}
          <div>
            <SectionHeader icon={Briefcase} title="Employment Details" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={(value) => updateField('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(value) => updateField('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input 
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  placeholder="Software Engineer"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Type *</Label>
                <Select value={formData.employmentType} onValueChange={(value) => updateField('employmentType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reporting Manager {formData.role !== 'Admin' && '*'}</Label>
                <Select 
                  value={formData.managerId || 'none'} 
                  onValueChange={(value) => updateField('managerId', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name} ({manager.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Joining Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.joiningDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.joiningDate ? format(formData.joiningDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.joiningDate}
                      onSelect={(date) => updateField('joiningDate', date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Location Section */}
          <div>
            <SectionHeader icon={MapPin} title="Work Location & Status" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Office Location</Label>
                <Input 
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Bangalore, India"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch 
                    checked={formData.status}
                    onCheckedChange={(checked) => updateField('status', checked)}
                  />
                  <span className={formData.status ? 'text-green-600' : 'text-muted-foreground'}>
                    {formData.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Enter full address..."
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact Section */}
          <div>
            <SectionHeader icon={Phone} title="Emergency Contact" />
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input 
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input 
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="+91 9876543210"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select 
                  value={formData.emergencyContactRelationship} 
                  onValueChange={(value) => updateField('emergencyContactRelationship', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Employee...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/app/directory')}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddEmployeePage;
