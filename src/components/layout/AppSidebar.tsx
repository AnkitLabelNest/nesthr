import { useLocation, Link } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
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

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('hr' | 'manager' | 'employee')[];
}

const navItems: NavItem[] = [
  // Common items
  { title: 'Attendance', href: '/app/attendance', icon: Clock, roles: ['hr', 'manager', 'employee'] },
  { title: 'Efficiency', href: '/app/efficiency', icon: TrendingUp, roles: ['hr', 'manager', 'employee'] },
  { title: 'Profile', href: '/app/profile', icon: User, roles: ['hr', 'manager', 'employee'] },
  { title: 'Documents', href: '/app/documents', icon: FileText, roles: ['hr', 'manager', 'employee'] },
  { title: 'Salary', href: '/app/salary', icon: DollarSign, roles: ['hr', 'manager', 'employee'] },
  { title: 'Engagement', href: '/app/engagement', icon: Users, roles: ['hr', 'manager', 'employee'] },
  
  // Employee specific
  { title: 'My Leaves', href: '/app/leaves', icon: Calendar, roles: ['employee'] },
  
  // Manager specific
  { title: 'My Team', href: '/app/team', icon: Users, roles: ['manager'] },
  { title: 'Team Efficiency', href: '/app/team-efficiency', icon: BarChart3, roles: ['manager'] },
  { title: 'Expectations', href: '/app/expectations', icon: Target, roles: ['manager'] },
  { title: 'Attendance Overview', href: '/app/attendance-overview', icon: Clock, roles: ['manager'] },
  { title: 'Leave Approvals', href: '/app/leave-approvals', icon: CheckCircle, roles: ['manager'] },
  { title: 'Probation Reviews', href: '/app/probation', icon: AlertCircle, roles: ['manager'] },
  { title: 'Resignations', href: '/app/resignations', icon: LogOut, roles: ['manager'] },
  
  // HR specific
  { title: 'Employee Directory', href: '/app/directory', icon: FolderOpen, roles: ['hr'] },
  { title: 'Add Employee', href: '/app/add-employee', icon: UserPlus, roles: ['hr'] },
  { title: 'Bulk Upload', href: '/app/bulk-upload', icon: Upload, roles: ['hr'] },
  { title: 'Onboarding', href: '/app/onboarding', icon: UserPlus, roles: ['hr'] },
  { title: 'Offboarding', href: '/app/offboarding', icon: LogOut, roles: ['hr'] },
  { title: 'Attendance Control', href: '/app/attendance-control', icon: Shield, roles: ['hr'] },
  { title: 'Approvals', href: '/app/approvals', icon: CheckCircle, roles: ['hr'] },
  { title: 'Settings', href: '/app/settings', icon: Settings, roles: ['hr'] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { currentRole } = useRole();

  const filteredItems = navItems.filter(item => item.roles.includes(currentRole));

  // Group items by category
  const commonItems = filteredItems.filter(item => 
    ['Attendance', 'Efficiency', 'Profile', 'Documents', 'Salary'].includes(item.title)
  );
  
  const roleSpecificItems = filteredItems.filter(item => 
    !['Attendance', 'Efficiency', 'Profile', 'Documents', 'Salary'].includes(item.title)
  );

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
              {currentRole === 'hr' ? 'HR Management' : currentRole === 'manager' ? 'Team Management' : 'Personal'}
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
            <span className="text-sm font-medium text-sidebar-foreground">AJ</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Alex Johnson</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Software Engineer</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
