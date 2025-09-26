import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";

// Import pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ManualAttendance from "./pages/ManualAttendance";
import CameraAttendance from "./pages/CameraAttendance";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import EducationDashboard from "@/pages/dashboards/EducationDashboard";
import NotFound from "./pages/NotFound";
import LocationCheckPage from "./pages/LocationCheckPage";
import UserManagementPage from "./pages/UserManagementPage";
import Selection from "./pages/Selection";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToastProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/selection" element={<Selection />} />
            <Route path="/manual-attendance" element={<ManualAttendance />} />
            <Route path="/camera-attendance-location" element={<LocationCheckPage />} />
            <Route path="/camera-attendance" element={<CameraAttendance />} />
            <Route path="/dashboard/student" element={<StudentDashboard />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/education" element={<EducationDashboard />} />
            <Route path="/user-management" element={<UserManagementPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
