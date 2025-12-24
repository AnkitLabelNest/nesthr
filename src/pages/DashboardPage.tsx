import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { 
  Clock, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { 
  employees, 
  getAverageEfficiency, 
  currentUser,
  leaveRequests,
  profileEditRequests
} from '@/data/mockData';
import { Button } from '@/components/ui/button';

const DashboardPage = () => {
  const { role, employee } = useAuth();
  const navigate = useNavigate();
  
  // Map role to display format
  const currentRole = role === 'Admin' ? 'hr' : role === 'Manager' ? 'manager' : 'employee';

  const pendingApprovals = leaveRequests.filter(r => r.status === 'pending').length + 
                          profileEditRequests.filter(r => r.status === 'pending').length;

  const avgEfficiency = getAverageEfficiency(currentUser.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {employee?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here's your {currentRole === 'hr' ? 'HR' : currentRole === 'manager' ? 'team' : 'personal'} overview for today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="My Efficiency" 
          value={`${avgEfficiency}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard 
          title="Attendance Streak" 
          value="12 days"
          icon={Clock}
        />
        {currentRole === 'manager' && (
          <StatCard 
            title="Team Members" 
            value="4"
            icon={Users}
          />
        )}
        {currentRole === 'hr' && (
          <>
            <StatCard 
              title="Total Employees" 
              value={employees.length}
              icon={Users}
            />
            <StatCard 
              title="Pending Approvals" 
              value={pendingApprovals}
              icon={AlertCircle}
            />
          </>
        )}
        {currentRole === 'employee' && (
          <StatCard 
            title="Leave Balance" 
            value="12 days"
            icon={CheckCircle}
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="p-6 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/attendance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Attendance</h3>
                <p className="text-sm text-muted-foreground">Punch in/out for today</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        <Card 
          className="p-6 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/efficiency')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-efficiency-high/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-efficiency-high" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Efficiency</h3>
                <p className="text-sm text-muted-foreground">View your performance</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        {currentRole === 'manager' && (
          <Card 
            className="p-6 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/team')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Team</h3>
                  <p className="text-sm text-muted-foreground">Manage team members</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        )}

        {currentRole === 'hr' && (
          <Card 
            className="p-6 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/approvals')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-status-partial/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-status-partial" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Approvals</h3>
                  <p className="text-sm text-muted-foreground">{pendingApprovals} pending</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        )}
      </div>

      {/* Role-specific content */}
      {currentRole === 'hr' && (
        <Card className="p-6 glass-card">
          <h2 className="font-semibold text-foreground mb-4">HR Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/app/directory')}>View Directory</Button>
            <Button onClick={() => navigate('/app/add-employee')} variant="outline">Add Employee</Button>
            <Button onClick={() => navigate('/app/approvals')} variant="outline">Review Approvals</Button>
          </div>
        </Card>
      )}

      {currentRole === 'manager' && (
        <Card className="p-6 glass-card">
          <h2 className="font-semibold text-foreground mb-4">Manager Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/app/team')}>View Team</Button>
            <Button onClick={() => navigate('/app/expectations')} variant="outline">Set Expectations</Button>
            <Button onClick={() => navigate('/app/team-efficiency')} variant="outline">Team Efficiency</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
