import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, TrendingUp, Download, UserPlus, Camera, BarChart3 } from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import { useTranslation } from 'react-i18next';

interface TeacherStats {
  totalClasses: number;
  studentsTotal: number;
  averageAttendance: number;
  todayPresent: number;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      const data = await mockAPI.getDashboardStats('teacher') as TeacherStats;
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
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

  const classes = [
    { id: '10A', name: 'Class 10A', subject: 'Mathematics', students: 45, present: 42, attendance: 93.3 },
    { id: '10B', name: 'Class 10B', subject: 'Mathematics', students: 38, present: 35, attendance: 92.1 },
    { id: '11A', name: 'Class 11A', subject: 'Physics', students: 32, present: 29, attendance: 90.6 },
  ];

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
              <h1 className="text-xl font-semibold">{t('Teacher Dashboard')}</h1>
              <p className="text-sm text-muted-foreground">{t('Goverment of Punjab')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 animate-fade-in">
          {/* Welcome Section */}
          <div className="card-teacher rounded-2xl p-4 sm:p-6 text-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto bg-gradient-to-br from-teacher to-teacher/80 rounded-full flex items-center justify-center shadow-lg mb-4">
              <BookOpen className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">{t('Mr. Alok Kumar Jena', { name: 'Mrs. Sunita Devi' })}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">{t('Computer Science Professor')}</p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="inline-flex items-center justify-center px-3 py-1.5 bg-background/20 rounded-full">
                <span className="text-xs sm:text-sm font-medium">{t('Department of Computer Science')}</span>
              </div>
              <div className="inline-flex items-center justify-center px-3 py-1.5 bg-background/20 rounded-full">
                <span className="text-xs sm:text-sm font-medium">{t('Experience : 15 Years', { years: 12 })}</span>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 text-teacher" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{stats?.totalClasses}</span>
              </div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base">{t('Total Classes')}</h3>
              <p className="text-xs text-muted-foreground">{t('Active Classes')}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 text-primary" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{stats?.studentsTotal}</span>
              </div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base">{t('Total Students')}</h3>
              <p className="text-xs text-muted-foreground">{t('Across all Classes')}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 text-success" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-success">{stats?.averageAttendance}%</span>
              </div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base">{t('avg_attendance')}</h3>
              <p className="text-xs text-muted-foreground">{t('this_month')}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8 text-accent" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-accent">{stats?.todayPresent}</span>
              </div>
              <h3 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base">{t('present_today')}</h3>
              <p className="text-xs text-muted-foreground">{t('students_in_school')}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold">{t('Quick Actions')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button 
                onClick={() => navigate('/manual-attendance')}
                className={`btn-primary text-left p-3 sm:p-4 h-auto group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 ${isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isOnline}
              >
                <UserPlus className="w-4 sm:w-5 h-4 sm:h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm sm:text-base">{t('Mark Attendance')}</p>
                  <p className="text-xs opacity-80">{t('manual_attendance_entry')}</p>
                  {!isOnline && <p className="text-xs text-secondary-foreground mt-1">{t('offline_mode')}</p>}
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/camera-attendance-location')}
                className="btn-secondary text-left p-3 sm:p-4 h-auto group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300"
              >
                <Camera className="w-4 sm:w-5 h-4 sm:h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm sm:text-base">{t('Camera Attendance')}</p>
                  <p className="text-xs opacity-80">{t('face_recognition_mode')}</p>
                </div>
              </button>

              <button className="btn-secondary text-left p-3 sm:p-4 h-auto group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300">
                <Download className="w-4 sm:w-5 h-4 sm:h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm sm:text-base">{t('export_data_button')}</p>
                  <p className="text-xs opacity-80">{t('download_csv_reports')}</p>
                </div>
              </button>

              <button className="btn-secondary text-left p-3 sm:p-4 h-auto group hover:shadow-lg hover:shadow-secondary/20 transition-all duration-300">
                <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5 mb-2 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm sm:text-base">{t('analytics_button')}</p>
                  <p className="text-xs opacity-80">{t('view_detailed_reports')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Classes Overview */}
          <div className="bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-semibold">{t('my_classes_title')}</h3>
              <button className="btn-secondary text-sm">
                <Download className="w-4 h-4 mr-2" />
                {t('export_all_button')}
              </button>
            </div>

            <div className="space-y-4">
              {classes.map((classInfo) => (
                <div
                  key={classInfo.id}
                  className="border border-border rounded-lg p-3 sm:p-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm sm:text-base">{classInfo.name}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">{classInfo.subject}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('students_label')}: </span>
                            <span className="font-medium">{classInfo.students}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('present_label')}: </span>
                            <span className="font-medium text-success">{classInfo.present}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('attendance_label')}: </span>
                            <span className="font-medium text-primary">{classInfo.attendance}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-shrink-0">
                      <button className="btn-secondary text-xs sm:text-sm py-2 px-3 flex-1 sm:flex-none">
                        {t('view_details_button')}
                      </button>
                      <button className="btn-primary text-xs sm:text-sm py-2 px-3 flex-1 sm:flex-none">
                        {t('take_attendance_button')}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{t('todays_attendance')}</span>
                      <span>{classInfo.present}/{classInfo.students}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teacher to-teacher/80 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(classInfo.present / classInfo.students) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{t('recent_activity_title')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('attendance_marked_for_class', { class: '10A' })}</p>
                  <p className="text-xs text-muted-foreground">{t('today_time_present', { time: '9:15 AM', present: 42, total: 45 })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('csv_report_exported')}</p>
                  <p className="text-xs text-muted-foreground">{t('yesterday_time_monthly_data', { time: '4:30 PM' })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('low_attendance_alert_class', { class: '11A' })}</p>
                  <p className="text-xs text-muted-foreground">{t('date_only_present_total', { date: 'Jan 13', present: 29, total: 32 })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;