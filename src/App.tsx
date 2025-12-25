import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// App Layout
import { AppLayout } from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import EfficiencyPage from "./pages/EfficiencyPage";
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import SalaryPage from "./pages/SalaryPage";
import MyLeavesPage from "./pages/MyLeavesPage";
import EngagementPage from "./pages/EngagementPage";
import ContactsPage from "./pages/ContactsPage";

// Manager Pages
import MyTeamPage from "./pages/manager/MyTeamPage";
import ExpectationsPage from "./pages/manager/ExpectationsPage";
import TeamEfficiencyPage from "./pages/manager/TeamEfficiencyPage";

// HR Pages
import EmployeeDirectoryPage from "./pages/hr/EmployeeDirectoryPage";
import AddEmployeePage from "./pages/hr/AddEmployeePage";
import EditEmployeePage from "./pages/hr/EditEmployeePage";
import ApprovalsPage from "./pages/hr/ApprovalsPage";
import BulkUploadPage from "./pages/hr/BulkUploadPage";
import OnboardingPage from "./pages/hr/OnboardingPage";
import OffboardingPage from "./pages/hr/OffboardingPage";
import SettingsPage from "./pages/hr/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected App Routes - All authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="efficiency" element={<EfficiencyPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="salary" element={<SalaryPage />} />
                <Route path="leaves" element={<MyLeavesPage />} />
                <Route path="engagement" element={<EngagementPage />} />
                <Route path="contacts" element={<ContactsPage />} />
              </Route>
            </Route>
            
            {/* Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Manager', 'Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="team" element={<MyTeamPage />} />
                <Route path="team-efficiency" element={<TeamEfficiencyPage />} />
                <Route path="expectations" element={<ExpectationsPage />} />
                <Route path="attendance-overview" element={<AttendancePage />} />
                <Route path="leave-approvals" element={<ApprovalsPage />} />
                <Route path="probation" element={<DashboardPage />} />
                <Route path="resignations" element={<DashboardPage />} />
              </Route>
            </Route>
            
            {/* Admin (HR) Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="directory" element={<EmployeeDirectoryPage />} />
                <Route path="add-employee" element={<AddEmployeePage />} />
                <Route path="employees/edit/:id" element={<EditEmployeePage />} />
                <Route path="bulk-upload" element={<BulkUploadPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="offboarding" element={<OffboardingPage />} />
                <Route path="attendance-control" element={<AttendancePage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
