import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Building, MapPin, Briefcase, Hash, UserCog } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeWithDetails {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string;
  role: string;
  status: string;
  org_id: string;
  manager_id: string | null;
  joining_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  date_of_birth: string | null;
  employment_type: string | null;
  location: string | null;
  address: string | null;
  manager_name: string | null;
}

interface EmployeeDetailModalProps {
  employee: EmployeeWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onUpdate: () => void;
}

export const EmployeeDetailModal = ({
  employee,
  open,
  onOpenChange,
  isAdmin,
  onUpdate,
}: EmployeeDetailModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!employee) return null;

  const handleToggleStatus = async () => {
    setLoading(true);
    const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    
    const { error } = await supabase
      .from('hr_employees')
      .update({ status: newStatus })
      .eq('id', employee.id);

    if (error) {
      toast.error('Failed to update status: ' + error.message);
    } else {
      toast.success(`Employee ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      onUpdate();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from('hr_employees')
      .delete()
      .eq('id', employee.id);

    if (error) {
      toast.error('Failed to delete employee: ' + error.message);
    } else {
      toast.success('Employee deleted successfully');
      onUpdate();
      onOpenChange(false);
    }
    setLoading(false);
    setShowDeleteDialog(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin': return 'default';
      case 'Manager': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-500 hover:bg-purple-600';
      case 'Manager': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-green-500 hover:bg-green-600 text-white';
    }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <DialogTitle className="text-xl">{employee.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getRoleBadgeClass(employee.role)}>{employee.role}</Badge>
                  <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Personal Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={User} label="Full Name" value={employee.full_name} />
                <InfoRow icon={Mail} label="Email" value={employee.email} />
                <InfoRow icon={Phone} label="Phone" value={employee.phone} />
                <InfoRow icon={Calendar} label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd MMM yyyy') : null} />
              </div>
            </div>

            <Separator />

            {/* Employment Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Employment Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={Hash} label="Employee Code" value={employee.employee_code} />
                <InfoRow icon={UserCog} label="Role" value={employee.role} />
                <InfoRow icon={Building} label="Department" value={employee.department} />
                <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
                <InfoRow icon={User} label="Manager" value={employee.manager_name} />
                <InfoRow icon={Calendar} label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'dd MMM yyyy') : null} />
              </div>
            </div>

            <Separator />

            {/* Work Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Work Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={Briefcase} label="Employment Type" value={employee.employment_type} />
                <InfoRow icon={MapPin} label="Location" value={employee.location} />
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Address</h4>
              <InfoRow icon={MapPin} label="Full Address" value={employee.address} />
            </div>
          </div>

          {isAdmin && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/app/employees/edit/${employee.id}`)}
              >
                Edit
              </Button>
              <Button
                variant={employee.status === 'Active' ? 'secondary' : 'default'}
                onClick={handleToggleStatus}
                disabled={loading}
              >
                {employee.status === 'Active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employee.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
