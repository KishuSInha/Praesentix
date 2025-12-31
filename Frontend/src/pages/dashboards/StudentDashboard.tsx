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
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const studentId = "106";

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const enhancedData = await enhancedApi.getStudentAttendance(studentId);
      if (enhancedData.success) {
        setStats(enhancedData.data);
        setIsOnline(true);
      } else {
        throw new Error('Enhanced API failed');
      }
    } catch (error) {
      console.error("Enhanced API failed, using mock data:", error);
      setIsOnline(false);
      const data = await mockAPI.getDashboardStats("student") as StudentStats;
      setStats(data);
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
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Welcome, Utkarsh Sinha</h2>
                  <p className="text-green-100 text-sm">Class XII A • Roll: 106</p>
                  <div className="flex items-center mt-1">
                    <Award className="w-4 h-4 mr-1" />
                    <span className="text-xs">Rank #{stats?.rank} in class</span>
                    {!isOnline && (
                      <span className="ml-2 text-xs bg-yellow-500/20 px-2 py-1 rounded">Demo Mode</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{stats?.attendancePercentage}%</div>
                <div className="text-xs text-green-100">
                  {isOnline ? 'Live Data' : 'Demo Data'}
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