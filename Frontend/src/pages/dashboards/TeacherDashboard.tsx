import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, Download, UserPlus, Camera, BarChart3, RefreshCw } from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import PeriodAttendanceManager from "../../components/PeriodAttendanceManager";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SearchBar from "../../components/SearchBar";
import NotificationCenter from "../../components/NotificationCenter";

interface TeacherStats {
  totalClasses: number;
  studentsTotal: number;
  averageAttendance: number;
  todayPresent: number;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPeriodAttendance, setShowPeriodAttendance] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    loadDashboardData();
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    setLoadingRecords(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/period-attendance?date=${today}`);
      const result = await response.json();
      if (result.success && result.data) {
        setAttendanceRecords(result.data.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/stats`);
      const result = await response.json();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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
            <LoadingSkeleton type="card" count={4} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
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
              <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Praesentix</p>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#db2777] rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-400/20 rounded-full -ml-20 -mb-20 blur-2xl"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-[#7c3aed] rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{user?.fullName || 'Teacher'}</h2>
                  <p className="text-purple-100 font-medium tracking-wide uppercase text-xs mt-1">
                    Faculty Access • Secure Data Node
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                      <Users className="w-4 h-4 mr-1.5 text-blue-200" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{stats?.studentsTotal} Students</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-5xl font-black tracking-tighter mb-1">{stats?.totalClasses}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-100 opacity-80">
                  Active Periods
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats?.studentsTotal}</div>
                <p className="text-sm text-gray-600">Total Students</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats?.averageAttendance}%</div>
                <p className="text-sm text-gray-600">Avg Attendance</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats?.todayPresent}</div>
                <p className="text-sm text-gray-600">Present Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <SearchBar
                placeholder="Search students, classes..."
                onSearch={(query) => console.log('Search:', query)}
                filters={[
                  { key: 'class', label: 'Class', options: ['10A', '10B', '11A'] },
                  { key: 'subject', label: 'Subject', options: ['Math', 'Science', 'English'] }
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/manual-attendance')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <UserPlus className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Mark Attendance</p>
                  <p className="text-xs opacity-90">Manual entry</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/camera-attendance')}
                className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <Camera className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Face Recognition</p>
                  <p className="text-xs opacity-90">AI powered</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/attendance-reports')}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <BarChart3 className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Reports</p>
                  <p className="text-xs opacity-90">View analytics</p>
                </div>
              </button>

              <button
                onClick={() => setShowPeriodAttendance(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <Download className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Download</p>
                  <p className="text-xs opacity-90">Export data</p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Today's Attendance Records</h3>
              <button
                onClick={loadAttendanceRecords}
                disabled={loadingRecords}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingRecords ? (
              <div className="text-center py-8 text-gray-500">Loading records...</div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attendance records yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Student Name</th>
                      <th className="text-left py-2 px-2">Period</th>
                      <th className="text-left py-2 px-2">Time</th>
                      <th className="text-left py-2 px-2">Emotion</th>
                      <th className="text-left py-2 px-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{record.name || 'Unknown'}</td>
                        <td className="py-2 px-2">{record.period}</td>
                        <td className="py-2 px-2">{record.time}</td>
                        <td className="py-2 px-2">{record.emotion || 'N/A'}</td>
                        <td className="py-2 px-2">{record.recognitionConfidence ? `${record.recognitionConfidence.toFixed(1)}%` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showPeriodAttendance && (
            <PeriodAttendanceManager />
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
