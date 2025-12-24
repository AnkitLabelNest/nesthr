import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock,
  TrendingUp,
  User,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  Target,
  Calendar,
  CheckCircle,
  AlertCircle,
  LogOut,
  Settings,
  FolderOpen,
  UserPlus,
  Upload,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarRole = 'Admin' | 'Manager' | 'Employee';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SidebarRole[];
}

const navItems: NavItem[] = [
  // Common items
  { title: 'Attendance', href: '/app/attendance', icon: Clock, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Efficiency', href: '/app/efficiency', icon: TrendingUp, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Profile', href: '/app/profile', icon: User, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Documents', href: '/app/documents', icon: FileText, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Salary', href: '/app/salary', icon: DollarSign, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Engagement', href: '/app/engagement', icon: Users, roles: ['Admin', 'Manager', 'Employee'] },
  
  // Employee specific
  { title: 'My Leaves', href: '/app/leaves', icon: Calendar, roles: ['Employee'] },
  
  // Manager specific
  { title: 'My Team', href: '/app/team', icon: Users, roles: ['Manager'] },
  { title: 'Team Efficiency', href: '/app/team-efficiency', icon: BarChart3, roles: ['Manager'] },
  { title: 'Expectations', href: '/app/expectations', icon: Target, roles: ['Manager'] },
  { title: 'Attendance Overview', href: '/app/attendance-overview', icon: Clock, roles: ['Manager'] },
  { title: 'Leave Approvals', href: '/app/leave-approvals', icon: CheckCircle, roles: ['Manager'] },
  { title: 'Probation Reviews', href: '/app/probation', icon: AlertCircle, roles: ['Manager'] },
  { title: 'Resignations', href: '/app/resignations', icon: LogOut, roles: ['Manager'] },
  
  // Admin (HR) specific
  { title: 'Employee Directory', href: '/app/directory', icon: FolderOpen, roles: ['Admin'] },
  { title: 'Add Employee', href: '/app/add-employee', icon: UserPlus, roles: ['Admin'] },
  { title: 'Bulk Upload', href: '/app/bulk-upload', icon: Upload, roles: ['Admin'] },
  { title: 'Onboarding', href: '/app/onboarding', icon: UserPlus, roles: ['Admin'] },
  { title: 'Offboarding', href: '/app/offboarding', icon: LogOut, roles: ['Admin'] },
  { title: 'Attendance Control', href: '/app/attendance-control', icon: Shield, roles: ['Admin'] },
  { title: 'Approvals', href: '/app/approvals', icon: CheckCircle, roles: ['Admin'] },
  { title: 'Settings', href: '/app/settings', icon: Settings, roles: ['Admin'] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { employee, role } = useAuth();

  const currentRole = role || 'Employee';
  const filteredItems = navItems.filter(item => item.roles.includes(currentRole));

  // Group items by category
  const commonItems = filteredItems.filter(item => 
    ['Attendance', 'Efficiency', 'Profile', 'Documents', 'Salary', 'Engagement'].includes(item.title)
  );
  
  const roleSpecificItems = filteredItems.filter(item => 
    !['Attendance', 'Efficiency', 'Profile', 'Documents', 'Salary', 'Engagement'].includes(item.title)
  );

  // Get initials from employee name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">N</span>
          </div>
          <div>
            <span className="font-display font-bold text-sidebar-foreground">NestHR</span>
            <span className="text-xs text-sidebar-foreground/50 block">by LabelNest</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Common Section */}
        <div>
          <h3 className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-3">
            Overview
          </h3>
          <ul className="space-y-1">
            {commonItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      'nav-link',
                      isActive && 'nav-link-active'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Role Specific Section */}
        {roleSpecificItems.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-3">
              {currentRole === 'Admin' ? 'HR Management' : currentRole === 'Manager' ? 'Team Management' : 'Personal'}
            </h3>
            <ul className="space-y-1">
              {roleSpecificItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'nav-link',
                        isActive && 'nav-link-active'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {employee ? getInitials(employee.full_name) : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {employee?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {employee?.role || 'Employee'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
