import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, UserPlus, Settings, Shield, Activity, Database, Download, Camera, BookOpen, UserCheck } from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import { useTranslation } from 'react-i18next';
import { FaceEnrollment } from '@/components/admin/FaceEnrollment';

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  activeUsers: number;
}

interface UserManagementData {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive';
  lastLogin: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('face-enrollment');
  const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState(true); // Changed to true
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(true);
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(true); // Changed to true to make it enabled
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useTranslation();

  useEffect(() => {
    loadDashboardData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await mockAPI.getDashboardStats('admin') as AdminStats;
      setStats(data);
      
      // Mock user data
      setUsers([
        { id: '1', name: 'Aarav Kumar', email: 'aarav@school.edu', role: 'student', status: 'active', lastLogin: '2024-01-15 10:30' },
        { id: '2', name: 'Mrs. Sunita Devi', email: 'sunita@school.edu', role: 'teacher', status: 'active', lastLogin: '2024-01-15 09:15' },
        { id: '3', name: 'Mr. Rajesh Kumar', email: 'rajesh@school.edu', role: 'teacher', status: 'active', lastLogin: '2024-01-14 16:45' },
        { id: '4', name: 'Dr. Meera Joshi', email: 'meera@school.edu', role: 'teacher', status: 'inactive', lastLogin: '2024-01-10 14:20' },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'text-student bg-student/10 border-student/30';
      case 'teacher': return 'text-teacher bg-teacher/10 border-teacher/30';
      case 'admin': return 'text-admin bg-admin/10 border-admin/30';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'text-success bg-success/10 border-success/30'
      : 'text-destructive bg-destructive/10 border-destructive/30';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleSendSMS = (studentId: string, studentName: string) => {
    alert(`Sending SMS to ${studentName} (ID: ${studentId})`);
    // In a real application, you would integrate with an SMS API here
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{t('Admin Dashboard')}</h1>
              <p className="text-sm text-muted-foreground">{t('Managed by Team Forge')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 animate-fade-in">
          {/* Welcome Section */}
          <div className="card-admin rounded-2xl p-6 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-admin to-admin/80 rounded-full flex items-center justify-center shadow-lg mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('Admin')}</h2>
            <p className="text-muted-foreground">{t('ITER,SOA')}</p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-background/20 rounded-full">
              <span className="text-sm font-medium">{t('Managing Users..', { totalStudents: stats?.totalStudents, totalTeachers: stats?.totalTeachers })}</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-admin" />
                <span className="text-2xl font-bold text-foreground">{stats?.totalStudents}</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('Total Students')}</h3>
              <p className="text-sm text-muted-foreground">{t('Enrolled Students')}</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <UserPlus className="w-8 h-8 text-teacher" />
                <span className="text-2xl font-bold text-foreground">{stats?.totalTeachers}</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('Total Teachers')}</h3>
              <p className="text-sm text-muted-foreground">{t('Teaching Staff')}</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-8 h-8 text-success" />
                <span className="text-2xl font-bold text-success">{stats?.averageAttendance}%</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('Average Attendance')}</h3>
              <p className="text-sm text-muted-foreground">{t('Schoool Average')}</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Database className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">{stats?.activeUsers}</span>
              </div>
              <h3 className="font-semibold text-foreground">{t('Active Users')}</h3>
              <p className="text-sm text-muted-foreground">{t('System Users')}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('Quick Actions')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/user-management')}
                className="btn-primary text-left p-4 h-auto group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                <UserPlus className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium">{t('Add New User')}</p>
                  <p className="text-xs opacity-80">{t('Create User Account')}</p>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/manual-attendance')}
                className={`btn-secondary text-left p-4 h-auto group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300 ${isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isOnline}
              >
                <UserPlus className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium">{t('Mark Attendance')}</p>
                  <p className="text-xs opacity-80">{t('Manual Attendance')}</p>
                  {!isOnline && <p className="text-xs text-secondary-foreground mt-1">{t('Offline Mode Admin')}</p>}
                </div>
              </button>

              <button 
                onClick={() => navigate('/camera-attendance-location')}
                className="btn-secondary text-left p-4 h-auto group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300"
              >
                <Camera className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium">{t('Camera Attendance')}</p>
                  <p className="text-xs opacity-80">{t('Automated Face Recognition')}</p>
                </div>
              </button>

              <button className="btn-secondary text-left p-4 h-auto group hover:shadow-lg hover:shadow-secondary/20 transition-all duration-300">
                <Download className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium">{t('Generate Reports')}</p>
                  <p className="text-xs opacity-80">{t('System Analytics')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="border-b border-border">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setSelectedTab('overview')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === 'overview'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Tab System Overview')}
                </button>
                <button
                  onClick={() => setSelectedTab('users')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === 'users'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Tab User Management')}
                </button>
                <button
                  onClick={() => setSelectedTab('settings')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === 'settings'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Tab System Settings')}
                </button>
                <button
                  onClick={() => setSelectedTab('face-enrollment')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === 'face-enrollment'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
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
                  <h3 className="text-lg font-semibold">{t('System Status')}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">{t('Recent Activity')}</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('New Teacher Created', { name: 'Dr. Meera Joshi' })}</p>
                            <p className="text-xs text-muted-foreground">{t('10 Hours Ago', { time: '2 hours ago', name: 'Dr. Meera Joshi' })}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('System Backup Completed')}</p>
                            <p className="text-xs text-muted-foreground">{t('11:30 PM', { time: '11:30 PM' })}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                          <div className="w-2 h-2 bg-warning rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('Storage Usage Alert')}</p>
                            <p className="text-xs text-muted-foreground">{t('Jan 13', { date: 'Jan 13' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">{t('System Health')}</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t('Database Performance')}</span>
                            <span className="text-success">{t('Excellent')}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-success h-2 rounded-full" style={{ width: '95%' }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t('Storage Usage')}</span>
                            <span className="text-warning">75%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-warning h-2 rounded-full" style={{ width: '75%' }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t('System Uptime')}</span>
                            <span className="text-success">99.9%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-success h-2 rounded-full" style={{ width: '99%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">{t('  Low Students Alerts')}</h3>
                  <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    {/* Mock data for low attendance students */}
                    {[
                      { id: 'S001', name: 'Rahul Sharma', class: '10A', attendance: 68 },
                      { id: 'S002', name: 'Priya Singh', class: '9B', attendance: 72 },
                      { id: 'S003', name: 'Amit Verma', class: '11C', attendance: 60 },
                    ].map(student => (
                      <div key={student.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                        <div>
                          <p className="font-medium">{student.name} ({student.class})</p>
                          <p className="text-sm text-muted-foreground">{t('Low Attendance !!!', { attendance: student.attendance })}</p>
                        </div>
                        <button 
                          onClick={() => handleSendSMS(student.id, student.name)}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          {t('send sms')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('User Management')}</h3>
                    <button className="btn-primary">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t('add_user_button')}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('Name')}</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('Email')}</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('Role')}</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('Status')}</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t('Login')}</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t('Actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                            <td className="py-4 px-2 font-medium text-foreground">{user.name}</td>
                            <td className="py-4 px-2 text-sm text-muted-foreground">{user.email}</td>
                            <td className="py-4 px-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-sm text-muted-foreground">{user.lastLogin}</td>
                            <td className="py-4 px-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button className="btn-secondary text-xs py-1 px-2">
                                  {t('edit')}
                                </button>
                                <button className="btn-danger text-xs py-1 px-2">
                                  {t('delete')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedTab === 'face-enrollment' && (
                <div className="space-y-6">
                  <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                    <FaceEnrollment onClose={() => setSelectedTab('overview')} />
                  </div>
                </div>
              )}
              
              {selectedTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">{t('System Configuration')}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">{t('Application Settings')}</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                          <div>
                            <p className="font-medium">{t('Offline Mode Selection')}</p>
                            <p className="text-sm text-muted-foreground">{t('Offline Mode Setting Description')}</p>
                          </div>
                          <label htmlFor="offline-mode-toggle" className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                id="offline-mode-toggle"
                                className="sr-only peer"
                                checked={isOfflineModeEnabled}
                                onChange={(e) => setIsOfflineModeEnabled(e.target.checked)}
                              />
                              <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-blue-600"></div>
                              <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all duration-300 transform peer-checked:translate-x-full"></div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                          <div>
                            <p className="font-medium">{t('Auto Backup')}</p>
                            <p className="text-sm text-muted-foreground">{t('Auto Backup Setting')}</p>
                          </div>
                          <label htmlFor="auto-backup-toggle" className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                id="auto-backup-toggle"
                                className="sr-only peer"
                                checked={isAutoBackupEnabled}
                                onChange={(e) => setIsAutoBackupEnabled(e.target.checked)}
                              />
                              <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-blue-600"></div>
                              <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all duration-300 transform peer-checked:translate-x-full"></div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                          <div>
                            <p className="font-medium">{t('Notification Settings')}</p>
                            <p className="text-sm text-muted-foreground">{t('show notifiations')}</p>
                          </div>
                          <label htmlFor="notifications-toggle" className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                id="notifications-toggle"
                                className="sr-only peer"
                                checked={areNotificationsEnabled}
                                onChange={(e) => setAreNotificationsEnabled(e.target.checked)}
                              />
                              <div className="block bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-blue-600"></div>
                              <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all duration-300 transform peer-checked:translate-x-full"></div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">{t('Security Settings')}</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('Session Timeout')}</label>
                          <input type="number" value="30" className="input-field w-full" />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('Password Policy')}</label>
                          <select className="input-field w-full">
                            <option>{t('Strong')}</option>
                            <option>{t('Medium')}</option>
                            <option>{t('Basic')}</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('Backup Retention')}</label>
                          <input type="number" value="30" className="input-field w-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button className="btn-primary">{t('Save Settings')}</button>
                    <button className="btn-secondary">{t('Reset to Defaults')}</button>
                  </div>
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