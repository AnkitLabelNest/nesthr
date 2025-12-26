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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCog, CalendarIcon, User, Briefcase, MapPin, Phone, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Manager { id: string; full_name: string; role: string; }

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { employee: currentEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeCode: '', fullName: '', email: '', phone: '', department: '', designation: '',
    location: '', employmentType: '', dateOfBirth: undefined as Date | undefined,
    joiningDate: undefined as Date | undefined, role: '', managerId: '', address: '', status: true,
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !currentEmployee?.org_id) return;
      setLoading(true);

      const { data: empData, error: empError } = await supabase
        .from('hr_employees').select('*').eq('id', id).maybeSingle();

      if (empError || !empData) { toast.error('Employee not found'); navigate('/app/directory'); return; }

      setUserId(empData.user_id);

      const { data: detailsData } = await supabase
        .from('hr_employee_details').select('*').eq('employee_id', id).maybeSingle();

      const { data: managersData } = await supabase
        .from('hr_employees').select('id, full_name, role')
        .eq('org_id', currentEmployee.org_id).in('role', ['Admin', 'Manager'])
        .eq('status', 'Active').neq('id', id).order('full_name');

      setManagers(managersData || []);
      setFormData({
        employeeCode: empData.employee_code || '', fullName: empData.full_name, email: empData.email,
        phone: detailsData?.phone || '', department: detailsData?.department || '',
        designation: detailsData?.designation || '', location: detailsData?.location || '',
        employmentType: detailsData?.employment_type || '',
        dateOfBirth: detailsData?.date_of_birth ? new Date(detailsData.date_of_birth) : undefined,
        joiningDate: empData.joining_date ? new Date(empData.joining_date) : undefined,
        role: empData.role, managerId: empData.manager_id || '', address: detailsData?.address || '',
        status: empData.status === 'Active',
        emergencyContactName: detailsData?.emergency_contact_name || '',
        emergencyContactPhone: detailsData?.emergency_contact_phone || '',
        emergencyContactRelationship: detailsData?.emergency_contact_relationship || '',
      });
      setLoading(false);
    };
    fetchData();
  }, [id, currentEmployee?.org_id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!formData.fullName || !formData.department || !formData.designation || !formData.employmentType || !formData.joiningDate || !formData.role) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      const { error: empError } = await supabase.from('hr_employees').update({
        full_name: formData.fullName.trim(), role: formData.role, manager_id: formData.managerId || null,
        status: formData.status ? 'Active' : 'Inactive',
        joining_date: formData.joiningDate ? format(formData.joiningDate, 'yyyy-MM-dd') : null,
      }).eq('id', id);

      if (empError) { toast.error('Failed to update employee: ' + empError.message); setSaving(false); return; }

      const { data: existingDetails } = await supabase.from('hr_employee_details').select('id').eq('employee_id', id).maybeSingle();
      const detailsPayload = {
        phone: formData.phone?.trim() || null, department: formData.department,
        designation: formData.designation.trim(), location: formData.location?.trim() || null,
        employment_type: formData.employmentType,
        date_of_birth: formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : null,
        address: formData.address?.trim() || null,
        emergency_contact_name: formData.emergencyContactName?.trim() || null,
        emergency_contact_phone: formData.emergencyContactPhone?.trim() || null,
        emergency_contact_relationship: formData.emergencyContactRelationship || null,
      };

      if (existingDetails) {
        await supabase.from('hr_employee_details').update(detailsPayload).eq('employee_id', id);
      } else {
        await supabase.from('hr_employee_details').insert({ ...detailsPayload, employee_id: id });
      }

      toast.success('Employee updated successfully');
      navigate('/app/directory');
    } catch (error: any) { toast.error('An error occurred: ' + error.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);

    const { data: teamMembers } = await supabase.from('hr_employees').select('id').eq('manager_id', id).limit(1);
    if (teamMembers && teamMembers.length > 0) {
      toast.error('Cannot delete: This employee has team members. Reassign them first.');
      setDeleting(false); setShowDeleteDialog(false); return;
    }

    if (userId) {
      await supabase.functions.invoke('admin-manage-user', { body: { action: 'delete', user_id: userId } });
    }

    const { error } = await supabase.from('hr_employees').delete().eq('id', id);
    if (error) { toast.error('Failed to delete: ' + error.message); }
    else { toast.success('Employee deleted successfully'); navigate('/app/directory'); }
    setDeleting(false); setShowDeleteDialog(false);
  };

  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-5 w-64" />
        <Card className="max-w-4xl p-6"><Skeleton className="h-96" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-display font-bold text-foreground">Edit Employee</h1><p className="text-muted-foreground">Update employee information</p></div>

      <Card className="max-w-4xl p-6 glass-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><UserCog className="w-6 h-6 text-primary" /></div>
            <div><h2 className="font-semibold text-foreground">{formData.fullName}</h2><p className="text-sm text-muted-foreground">{formData.employeeCode || 'Employee Code Pending'}</p></div>
          </div>

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Employee Code</Label><Input value={formData.employeeCode} disabled className="bg-muted" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={formData.email} disabled className="bg-muted" /></div>
            <div className="space-y-2"><Label>Full Name *</Label><Input value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} /></div>
          </div>

          <Separator />

          {/* Employment */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Role *</Label><Select value={formData.role} onValueChange={(v) => updateField('role', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Employee">Employee</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Department *</Label><Select value={formData.department} onValueChange={(v) => updateField('department', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Engineering">Engineering</SelectItem><SelectItem value="Design">Design</SelectItem><SelectItem value="Human Resources">Human Resources</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Sales">Sales</SelectItem><SelectItem value="Finance">Finance</SelectItem><SelectItem value="Operations">Operations</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Designation *</Label><Input value={formData.designation} onChange={(e) => updateField('designation', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Employment Type *</Label><Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="Intern">Intern</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Manager</Label><Select value={formData.managerId} onValueChange={(v) => updateField('managerId', v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.role})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={(e) => updateField('location', e.target.value)} /></div>
            <div className="space-y-2"><Label>Status</Label><div className="flex items-center gap-3 h-10"><Switch checked={formData.status} onCheckedChange={(c) => updateField('status', c)} /><span className={formData.status ? 'text-green-600' : 'text-muted-foreground'}>{formData.status ? 'Active' : 'Inactive'}</span></div></div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Emergency Contact Name</Label><Input value={formData.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} /></div>
            <div className="space-y-2"><Label>Emergency Contact Phone</Label><Input value={formData.emergencyContactPhone} onChange={(e) => updateField('emergencyContactPhone', e.target.value)} /></div>
            <div className="space-y-2"><Label>Relationship</Label><Select value={formData.emergencyContactRelationship} onValueChange={(v) => updateField('emergencyContactRelationship', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Parent">Parent</SelectItem><SelectItem value="Sibling">Sibling</SelectItem><SelectItem value="Friend">Friend</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={saving || deleting}>{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/app/directory')} disabled={saving || deleting}>Cancel</Button>
          </div>

          <div className="pt-4 border-t border-destructive/20 flex items-center justify-between">
            <div><h4 className="text-sm font-semibold text-destructive">Danger Zone</h4><p className="text-xs text-muted-foreground">This action cannot be undone</p></div>
            <Button type="button" variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={saving || deleting}><Trash2 className="w-4 h-4 mr-2" />Delete Employee</Button>
          </div>
        </form>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Employee</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete <strong>{formData.fullName}</strong>? This will permanently remove all employee records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditEmployeePage;
