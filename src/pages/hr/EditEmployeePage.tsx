import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCog, CalendarIcon, User, Briefcase, MapPin, FileText, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Manager {
  id: string;
  full_name: string;
  role: string;
}

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { employee: currentEmployee } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);

  const [formData, setFormData] = useState({
    employeeCode: '',
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
  });

  // Fetch employee data and managers
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !currentEmployee?.org_id) return;

      setLoading(true);

      // Fetch employee data
      const { data: empData, error: empError } = await supabase
        .from('hr_employees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (empError || !empData) {
        toast.error('Employee not found');
        navigate('/app/directory');
        return;
      }

      // Fetch employee details
      const { data: detailsData } = await supabase
        .from('hr_employee_details')
        .select('*')
        .eq('employee_id', id)
        .maybeSingle();

      // Fetch managers
      const { data: managersData } = await supabase
        .from('hr_employees')
        .select('id, full_name, role')
        .eq('org_id', currentEmployee.org_id)
        .in('role', ['Admin', 'Manager'])
        .eq('status', 'Active')
        .neq('id', id) // Cannot select self as manager
        .order('full_name');

      setManagers(managersData || []);

      // Set form data
      setFormData({
        employeeCode: empData.employee_code || '',
        fullName: empData.full_name,
        email: empData.email,
        phone: detailsData?.phone || '',
        department: detailsData?.department || '',
        designation: detailsData?.designation || '',
        location: detailsData?.location || '',
        employmentType: detailsData?.employment_type || '',
        dateOfBirth: detailsData?.date_of_birth ? new Date(detailsData.date_of_birth) : undefined,
        joiningDate: empData.joining_date ? new Date(empData.joining_date) : undefined,
        role: empData.role,
        managerId: empData.manager_id || '',
        address: detailsData?.address || '',
        status: empData.status === 'Active',
      });

      setLoading(false);
    };

    fetchData();
  }, [id, currentEmployee?.org_id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    // Validate required fields
    if (!formData.fullName || !formData.department || !formData.designation || 
        !formData.employmentType || !formData.joiningDate || !formData.role) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);

    try {
      // Update hr_employees
      const { error: empError } = await supabase
        .from('hr_employees')
        .update({
          full_name: formData.fullName.trim(),
          role: formData.role,
          manager_id: formData.managerId || null,
          status: formData.status ? 'Active' : 'Inactive',
          joining_date: formData.joiningDate ? format(formData.joiningDate, 'yyyy-MM-dd') : null,
        })
        .eq('id', id);

      if (empError) {
        toast.error('Failed to update employee: ' + empError.message);
        setSaving(false);
        return;
      }

      // Check if employee details exist
      const { data: existingDetails } = await supabase
        .from('hr_employee_details')
        .select('id')
        .eq('employee_id', id)
        .maybeSingle();

      const detailsPayload = {
        phone: formData.phone?.trim() || null,
        department: formData.department,
        designation: formData.designation.trim(),
        location: formData.location?.trim() || null,
        employment_type: formData.employmentType,
        date_of_birth: formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : null,
        address: formData.address?.trim() || null,
      };

      if (existingDetails) {
        // Update existing details
        const { error: detailsError } = await supabase
          .from('hr_employee_details')
          .update(detailsPayload)
          .eq('employee_id', id);

        if (detailsError) {
          toast.error('Failed to update employee details: ' + detailsError.message);
          setSaving(false);
          return;
        }
      } else {
        // Insert new details
        const { error: detailsError } = await supabase
          .from('hr_employee_details')
          .insert({ ...detailsPayload, employee_id: id });

        if (detailsError) {
          toast.error('Failed to create employee details: ' + detailsError.message);
          setSaving(false);
          return;
        }
      }

      toast.success('Employee updated successfully');
      navigate('/app/directory');
    } catch (error: any) {
      toast.error('An error occurred: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);

    // Check if employee has team members reporting to them
    const { data: teamMembers } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('manager_id', id)
      .limit(1);

    if (teamMembers && teamMembers.length > 0) {
      toast.error('Cannot delete: This employee has team members reporting to them. Please reassign them first.');
      setDeleting(false);
      setShowDeleteDialog(false);
      return;
    }

    const { error } = await supabase
      .from('hr_employees')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete employee: ' + error.message);
    } else {
      toast.success('Employee deleted successfully');
      navigate('/app/directory');
    }

    setDeleting(false);
    setShowDeleteDialog(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
      <Icon className="w-4 h-4" />
      <span>{title}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Card className="max-w-4xl p-6">
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Edit Employee</h1>
        <p className="text-muted-foreground">Update employee information</p>
      </div>

      <Card className="max-w-4xl p-6 glass-card">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{formData.fullName}</h2>
              <p className="text-sm text-muted-foreground">{formData.employeeCode || 'Employee Code Pending'}</p>
            </div>
          </div>

          {/* Basic Info Section */}
          <div>
            <SectionHeader icon={User} title="Basic Information" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <Input 
                  id="employeeCode"
                  value={formData.employeeCode}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
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
                <Label>Reporting Manager</Label>
                <Select value={formData.managerId} onValueChange={(value) => updateField('managerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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
            <SectionHeader icon={MapPin} title="Work Location" />
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
            </div>
          </div>

          <Separator />

          {/* Personal Info Section */}
          <div>
            <SectionHeader icon={FileText} title="Personal Information" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="address">Address</Label>
                <span className="text-xs text-muted-foreground">{formData.address.length}/500</span>
              </div>
              <Textarea 
                id="address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Enter full address..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={saving || deleting}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserCog className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/app/directory')}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
          </div>

          {/* Delete Section */}
          <div className="pt-4 border-t border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
              <Button 
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Employee
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{formData.fullName}</strong>? This will permanently remove all employee records including attendance, leaves, and other associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditEmployeePage;
