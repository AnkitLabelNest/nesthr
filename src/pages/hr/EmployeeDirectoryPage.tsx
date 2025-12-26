import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeDetailModal } from '@/components/hr/EmployeeDetailModal';
import { Search, Users, Building, UserCheck, UserPlus, CalendarPlus } from 'lucide-react';

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
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

const EmployeeDirectoryPage = () => {
  const navigate = useNavigate();
  const { employee: currentEmployee, role } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isAdmin = role === 'Admin';

  const fetchEmployees = async () => {
    if (!currentEmployee?.org_id) return;

    setLoading(true);
    
    // Fetch employees with their details
    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
        id,
        employee_code,
        full_name,
        email,
        role,
        status,
        org_id,
        manager_id,
        joining_date,
        created_at,
        updated_at,
        user_id
      `)
      .eq('org_id', currentEmployee.org_id)
      .order('full_name');

    if (error) {
      console.error('Error fetching employees:', error);
      setLoading(false);
      return;
    }

    // Fetch employee details
    const { data: detailsData } = await supabase
      .from('hr_employee_details')
      .select('*');

    // Create maps
    const detailsMap = new Map(
      (detailsData || []).map(d => [d.employee_id, d])
    );

    const nameMap = new Map(
      (data || []).map(e => [e.id, e.full_name])
    );

    // Combine the data
    const combinedData: EmployeeWithDetails[] = (data || []).map(emp => {
      const details = detailsMap.get(emp.id);
      return {
        ...emp,
        department: details?.department || null,
        designation: details?.designation || null,
        phone: details?.phone || null,
        date_of_birth: details?.date_of_birth || null,
        employment_type: details?.employment_type || null,
        location: details?.location || null,
        address: details?.address || null,
        manager_name: emp.manager_id ? nameMap.get(emp.manager_id) || null : null,
        emergency_contact_name: details?.emergency_contact_name || null,
        emergency_contact_phone: details?.emergency_contact_phone || null,
        emergency_contact_relationship: details?.emergency_contact_relationship || null,
      };
    });

    setEmployees(combinedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentEmployee?.org_id]);

  // Get unique departments and employment types for filters
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [employees]);

  const employmentTypes = useMemo(() => {
    const types = new Set(employees.map(e => e.employment_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.full_name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        (emp.employee_code?.toLowerCase().includes(searchLower) ?? false) ||
        (emp.department?.toLowerCase().includes(searchLower) ?? false);
      
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesType = employmentTypeFilter === 'all' || emp.employment_type === employmentTypeFilter;

      return matchesSearch && matchesRole && matchesDept && matchesStatus && matchesType;
    });
  }, [employees, searchQuery, roleFilter, departmentFilter, statusFilter, employmentTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const newThisMonth = employees.filter(e => {
      if (!e.joining_date) return false;
      const joinDate = new Date(e.joining_date);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;

    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'Active').length,
      departments: departments.length,
      newThisMonth,
    };
  }, [employees, departments]);

  const handleCardClick = (emp: EmployeeWithDetails) => {
    setSelectedEmployee(emp);
    setModalOpen(true);
  };

  const getRoleBadgeClass = (empRole: string) => {
    switch (empRole) {
      case 'Admin': return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'Manager': return 'bg-blue-500 hover:bg-blue-600 text-white';
      default: return 'bg-green-500 hover:bg-green-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Employee Directory</h1>
            <p className="text-muted-foreground">View and manage all employees</p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground">View and manage all employees</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/app/employees/add')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active Employees</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.departments}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <CalendarPlus className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              <p className="text-sm text-muted-foreground">New This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 glass-card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employmentTypeFilter} onValueChange={setEmploymentTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {employmentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <Card className="p-8 text-center glass-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <Card 
              key={emp.id} 
              className="p-4 glass-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleCardClick(emp)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary-foreground">
                    {emp.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground truncate">{emp.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{emp.employee_code || 'No Code'}</p>
                    </div>
                    <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'}>
                      {emp.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground truncate">{emp.email}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getRoleBadgeClass(emp.role)}>{emp.role}</Badge>
                      {emp.department && (
                        <span className="text-xs text-muted-foreground">{emp.department}</span>
                      )}
                    </div>
                    {emp.designation && (
                      <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    )}
                  </div>

                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        open={modalOpen}
        onOpenChange={setModalOpen}
        isAdmin={isAdmin}
        onUpdate={fetchEmployees}
      />
    </div>
  );
};

export default EmployeeDirectoryPage;
