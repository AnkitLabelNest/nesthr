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
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import MySalaryPage from "./pages/MySalaryPage";
import MyLeavesPage from "./pages/MyLeavesPage";
import ContactsPage from "./pages/ContactsPage";
import HolidaysPage from "./pages/HolidaysPage";
import MyOnboardingPage from "./pages/MyOnboardingPage";
import MyOffboardingPage from "./pages/MyOffboardingPage";
import AttendanceRegularizationPage from "./pages/AttendanceRegularizationPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import WorkLogPage from "./pages/WorkLogPage";

// Manager Pages
import MyTeamPage from "./pages/manager/MyTeamPage";

// HR Pages
import EmployeeDirectoryPage from "./pages/hr/EmployeeDirectoryPage";
import AddEmployeePage from "./pages/hr/AddEmployeePage";
import EditEmployeePage from "./pages/hr/EditEmployeePage";
import ApprovalsPage from "./pages/hr/ApprovalsPage";
import OnboardingPage from "./pages/hr/OnboardingPage";
import OffboardingPage from "./pages/hr/OffboardingPage";
import SettingsPage from "./pages/hr/SettingsPage";
import AttendanceRegularizationAdminPage from "./pages/hr/AttendanceRegularizationAdminPage";
import SalaryOverviewPage from "./pages/hr/SalaryOverviewPage";
import AttendanceRecordsPage from "./pages/hr/AttendanceRecordsPage";

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
                <Route path="profile" element={<ProfilePage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="salary" element={<MySalaryPage />} />
                <Route path="leaves" element={<MyLeavesPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="holidays" element={<HolidaysPage />} />
                <Route path="my-onboarding" element={<MyOnboardingPage />} />
                <Route path="my-offboarding" element={<MyOffboardingPage />} />
                <Route path="attendance-regularization" element={<AttendanceRegularizationPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="work-log" element={<WorkLogPage />} />
              </Route>
            </Route>
            
            {/* Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Manager', 'Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="team" element={<MyTeamPage />} />
                <Route path="leave-approvals" element={<ApprovalsPage />} />
              </Route>
            </Route>
            
            {/* Admin (HR) Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="directory" element={<EmployeeDirectoryPage />} />
                <Route path="add-employee" element={<AddEmployeePage />} />
                <Route path="edit-employee/:id" element={<EditEmployeePage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="offboarding" element={<OffboardingPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin/attendance-records" element={<AttendanceRecordsPage />} />
                <Route path="admin/attendance-regularization" element={<AttendanceRegularizationAdminPage />} />
                <Route path="admin/salary-overview" element={<SalaryOverviewPage />} />
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