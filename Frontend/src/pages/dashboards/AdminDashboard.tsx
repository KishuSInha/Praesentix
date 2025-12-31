import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Shield, Activity, Database, Download, Camera, UserCheck } from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import { FaceEnrollment } from "../../components/admin/FaceEnrollment";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SystemHealth from "../../components/SystemHealth";
import NotificationCenter from "../../components/NotificationCenter";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/stats`);
      const result = await response.json();
      if (result.success) {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold dark:text-white">Admin Dashboard</h1>
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
          <div className="bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827] rounded-3xl p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group border border-white/5">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full -mr-64 -mt-64 blur-[100px] group-hover:bg-blue-600/20 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full -ml-32 -mb-32 blur-[80px]"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 transform hover:scale-105 transition-transform duration-500">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-[#111827] animate-pulse">
                    LIVE
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">{user?.fullName || 'Administrator'}</h2>
                  <p className="text-gray-400 font-bold tracking-[0.3em] uppercase text-[10px] mt-2 flex items-center">
                    <Database className="w-3 h-3 mr-2 text-blue-500" />
                    Root Access • System Node Control
                  </p>
                  <div className="flex items-center mt-6 space-x-3">
                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl transition-colors cursor-pointer">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Nodes: {stats?.activeUsers}</span>
                    </div>
                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl transition-colors cursor-pointer">
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Security: Stable</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right hidden lg:block">
                <div className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {stats?.averageAttendance}%
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">
                  System Efficiency
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats?.totalStudents}</div>
                <p className="text-sm text-gray-600">Students</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats?.totalTeachers}</div>
                <p className="text-sm text-gray-600">Teachers</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats?.averageAttendance}%</div>
                <p className="text-sm text-gray-600">Avg Attendance</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats?.activeUsers}</div>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/user-management')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <UserPlus className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Add User</p>
                  <p className="text-xs opacity-90">Create new account</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/camera-attendance')}
                className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <Camera className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Face Recognition</p>
                  <p className="text-xs opacity-90">AI attendance</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/attendance-reports')}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <Download className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Reports</p>
                  <p className="text-xs opacity-90">Generate analytics</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedTab('face-enrollment')}
                className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-left transition-colors"
              >
                <UserCheck className="w-5 h-5 mb-2" />
                <div>
                  <p className="font-medium">Face Enrollment</p>
                  <p className="text-xs opacity-90">Register faces</p>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setSelectedTab('overview')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${selectedTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  System Overview
                </button>
                <button
                  onClick={() => setSelectedTab('users')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${selectedTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setSelectedTab('settings')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${selectedTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setSelectedTab('face-enrollment')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${selectedTab === 'face-enrollment'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Face Enrollment</span>
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">System Status</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Recent Activity</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium">New teacher registered</p>
                            <p className="text-xs text-gray-500">2 hours ago</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium">System backup completed</p>
                            <p className="text-xs text-gray-500">11:30 PM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <SystemHealth />
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">User Management</h3>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                      <UserPlus className="w-4 h-4 mr-2 inline" />
                      Add User
                    </button>
                  </div>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>User management interface will be implemented here</p>
                  </div>
                </div>
              )}

              {selectedTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">System Configuration</h3>
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>System settings will be configured here</p>
                  </div>
                </div>
              )}

              {selectedTab === 'face-enrollment' && (
                <div className="space-y-6">
                  <FaceEnrollment onClose={() => setSelectedTab('overview')} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;