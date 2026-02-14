import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import { AnimatePresence, motion } from "framer-motion";

// Import pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ManualAttendance from "./pages/ManualAttendance";
import CameraAttendance from "./pages/CameraAttendance";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import NotFound from "./pages/NotFound";
import LocationCheckPage from "./pages/LocationCheckPage";
import UserManagementPage from "./pages/UserManagementPage";
import Selection from "./pages/Selection";
import { SyncManager } from "./components/SyncManager";

const queryClient = new QueryClient();

const AuthHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        const role = parsedUser.role || parsedUser.userType;

        // If user is logged in and on landing or login page, redirect to dashboard
        if (location.pathname === "/" || location.pathname === "/login") {
          if (role) {
            navigate(`/dashboard/${role}`);
          }
        }
      } catch (e) {
        console.error("Failed to parse user session", e);
        localStorage.removeItem("currentUser");
      }
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/selection" element={<PageWrapper><Selection /></PageWrapper>} />
        <Route path="/manual-attendance" element={<PageWrapper><ManualAttendance /></PageWrapper>} />
        <Route path="/camera-attendance-location" element={<PageWrapper><LocationCheckPage /></PageWrapper>} />
        <Route path="/camera-attendance" element={<PageWrapper><CameraAttendance /></PageWrapper>} />
        <Route path="/dashboard/teacher" element={<PageWrapper><TeacherDashboard /></PageWrapper>} />
        <Route path="/dashboard/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        <Route path="/user-management" element={<PageWrapper><UserManagementPage /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToastProvider>
        <Toaster />
        <Sonner />
        <SyncManager />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthHandler>
            <AppRoutes />
          </AuthHandler>
        </BrowserRouter>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
