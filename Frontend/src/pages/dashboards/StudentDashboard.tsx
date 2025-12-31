import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Calendar, TrendingUp, Award, Download } from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import { enhancedApi } from "../../utils/enhancedApi";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import NotificationCenter from "../../components/NotificationCenter";
import Tooltip from "../../components/Tooltip";

interface StudentStats {
  attendancePercentage: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  rank: number;
  records?: any[];
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      loadDashboardData(parsedUser.studentId);
    } else {
      navigate('/login');
    }
  }, []);

  const loadDashboardData = async (studentId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/student/${studentId}/stats`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    const csvContent = `Student Attendance Report
Generated on,${new Date().toLocaleDateString()}

Summary
Attendance Percentage,${stats?.attendancePercentage}%
Total Days,${stats?.totalDays}
Present Days,${stats?.presentDays}
Absent Days,${stats?.absentDays}
Class Rank,#${stats?.rank}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <LoadingSkeleton type="text" count={1} />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <LoadingSkeleton type="card" count={3} />
          </div>
        </main>
      </div>
    );
  }

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 90) return { status: "Excellent", color: "text-green-600" };
    if (percentage >= 75) return { status: "Good", color: "text-yellow-600" };
    return { status: "Needs Improvement", color: "text-red-600" };
  };

  const attendanceStatus = getAttendanceStatus(stats?.attendancePercentage || 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold dark:text-white">Student Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Praesentix</p>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-[#1e3a8a] via-[#3b82f6] to-[#60a5fa] rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-16 -mb-16 blur-2xl"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner overflow-hidden">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-[#3b82f6] rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{user?.fullName || 'Student'}</h2>
                  <p className="text-blue-100 font-medium tracking-wide uppercase text-xs mt-1">
                    Student ID: {user?.studentId} • Verification Level: Gold
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                      <Award className="w-4 h-4 mr-1.5 text-yellow-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Rank #{stats?.rank}</span>
                    </div>
                    <div className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                      <Calendar className="w-4 h-4 mr-1.5 text-blue-200" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Semester 2</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-5xl font-black tracking-tighter mb-1">{stats?.attendancePercentage}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 opacity-80">
                  Real-time Attendance
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className={`text-2xl font-bold ${attendanceStatus.color}`}>
                  {stats?.attendancePercentage}%
                </div>
                <p className="text-sm text-gray-600">Attendance</p>
                <p className="text-xs text-gray-500">{attendanceStatus.status}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats?.totalDays}</div>
                <p className="text-sm text-gray-600">Total Days</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats?.presentDays}</div>
                <p className="text-sm text-gray-600">Present</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats?.absentDays}</div>
                <p className="text-sm text-gray-600">Absent</p>
              </div>
            </div>
          </div>

          {/* Attendance Progress */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Attendance Progress</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Progress</span>
                <span className="font-medium">{stats?.presentDays}/{stats?.totalDays} days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.attendancePercentage}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Target: 75% minimum</span>
                <span className={`font-medium ${(stats?.attendancePercentage || 0) >= 75 ? "text-green-600" : "text-red-600"}`}>
                  {(stats?.attendancePercentage || 0) >= 75 ? "Target Met ✓" : "Below Target"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Tooltip content="View your attendance calendar (Ctrl+C)">
                <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors w-full">
                  <Calendar className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-medium">View Calendar</p>
                    <p className="text-xs opacity-90">Check attendance history</p>
                  </div>
                </button>
              </Tooltip>
              <Tooltip content="Download attendance report (Ctrl+D)">
                <button
                  onClick={downloadReport}
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left transition-colors w-full"
                >
                  <Download className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-medium">Download Report</p>
                    <p className="text-xs opacity-90">Get detailed summary</p>
                  </div>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;