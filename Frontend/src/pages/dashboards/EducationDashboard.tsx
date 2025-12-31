import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, School, Users, TrendingDown, BarChart3, Download, Search, Eye, Filter, Camera, UserPlus } from "lucide-react";
import { mockAPI, School as SchoolType } from "../../utils/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import Logo from "../../components/Logo";

// Use SchoolType directly since we've made all properties optional in the base interface
type ExtendedSchoolType = SchoolType;

interface EducationStats {
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  averageDropoutRate: number;
}

const EducationDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EducationStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [schools, setSchools] = useState<ExtendedSchoolType[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<ExtendedSchoolType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<ExtendedSchoolType | null>(null);
  const [showSchoolDetails, setShowSchoolDetails] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showCustomReportDialog, setShowCustomReportDialog] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('');
  const { t } = useTranslation();

  // Toggle charts visibility
  const toggleCharts = () => {
    setShowCharts(!showCharts);
  };

  // Export district data to CSV
  const exportDistrictData = (): void => {
    try {
      if (!schools || schools.length === 0) {
        console.error('No school data available to export');
        return;
      }

      // Create CSV header
      const headers = ['School Name', 'ID', 'Location', 'Total Students', 'Current Students', 'Teachers', 'Attendance %', 'Dropout Rate %', 'Last Updated'];

      // Create CSV rows with null checks
      const rows = schools.map(school => {
        const currentStudents = school.currentStudents ?? (school.totalStudents ?? 0);
        const totalStudents = school.totalStudents ?? 0;
        const totalTeachers = school.totalTeachers ?? 0;
        const lastUpdated = typeof school.lastUpdated === 'string'
          ? school.lastUpdated.split('T')[0]
          : new Date().toISOString().split('T')[0];

        return {
          name: `"${school.name || 'N/A'}"`,
          id: school.id?.toString() || 'N/A',
          location: `"${school.location || 'N/A'}"`,
          totalStudents,
          currentStudents,
          teachers: totalTeachers,
          attendance: school.attendanceRate?.toFixed(1) || 'N/A',
          dropout: school.dropoutRate?.toFixed(1) || 'N/A',
          lastUpdated
        };
      });

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...rows.map(row => `${row.name},${row.id},${row.location},${row.totalStudents},${row.currentStudents},${row.teachers},${row.attendance},${row.dropout},${row.lastUpdated}`)
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `district_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Filter schools by high dropout rate
  const analyzeDropout = (): void => {
    try {
      const highDropoutSchools = schools.filter(school =>
        (school.dropoutRate || 0) > 3 // Threshold of 3% with fallback to 0 if undefined
      );
      setFilteredSchools(highDropoutSchools);

      // Show alert with analysis
      alert(`Found ${highDropoutSchools.length} schools with dropout rate above 3%`);
    } catch (error) {
      console.error('Error analyzing dropout rates:', error);
      alert('Failed to analyze dropout rates. Please try again.');
    }
  };

  // Generate custom report
  const generateCustomReport = (type: string): void => {
    setSelectedReportType(type);
    // Here you would typically make an API call to generate the report
    console.log(`Generating ${type} report...`);
    // Show dialog to confirm report generation
    setShowCustomReportDialog(true);

    // Close the dialog after a short delay
    setTimeout(() => {
      setShowCustomReportDialog(false);
    }, 1500);
  };

  const attendanceData = [
    { name: 'Jan', 'Avg. Attendance': 85, 'Target': 90 },
    { name: 'Feb', 'Avg. Attendance': 88, 'Target': 90 },
    { name: 'Mar', 'Avg. Attendance': 82, 'Target': 90 },
    { name: 'Apr', 'Avg. Attendance': 91, 'Target': 90 },
    { name: 'May', 'Avg. Attendance': 87, 'Target': 90 },
    { name: 'Jun', 'Avg. Attendance': 89, 'Target': 90 },
  ];

  const dropoutData = [
    { name: 'Jan', 'Dropout Rate': 3.5, 'Target': 2.0 },
    { name: 'Feb', 'Dropout Rate': 3.2, 'Target': 2.0 },
    { name: 'Mar', 'Dropout Rate': 4.1, 'Target': 2.0 },
    { name: 'Apr', 'Dropout Rate': 2.8, 'Target': 2.0 },
    { name: 'May', 'Dropout Rate': 3.0, 'Target': 2.0 },
    { name: 'Jun', 'Dropout Rate': 2.5, 'Target': 2.0 },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = schools.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [searchQuery, schools]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, schoolsData] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/education/stats`),
        mockAPI.getSchools()
      ]);

      const statsJson = await statsRes.json();
      const statsData = statsJson.data;

      // Ensure all schools have the required properties with defaults
      const processedSchools = (schoolsData || []).map(school => ({
        ...school,
        totalStudents: school.totalStudents || 0,
        totalTeachers: school.totalTeachers || 0,
        currentStudents: school.currentStudents || school.totalStudents || 0,
        attendanceRate: school.attendanceRate || 0,
        dropoutRate: school.dropoutRate || 0,
        lastUpdated: school.lastUpdated || new Date().toISOString().split('T')[0]
      }));

      setStats({
        totalSchools: processedSchools.length,
        totalStudents: processedSchools.reduce((sum, school) => sum + (school.totalStudents || 0), 0),
        totalTeachers: processedSchools.reduce((sum, school) => sum + (school.totalTeachers || 0), 0),
        averageAttendance: processedSchools.length > 0
          ? processedSchools.reduce((sum, school) => sum + (school.attendanceRate || 0), 0) / processedSchools.length
          : 0,
        averageDropoutRate: processedSchools.length > 0
          ? processedSchools.reduce((sum, school) => sum + (school.dropoutRate || 0), 0) / processedSchools.length
          : 0
      });

      setSchools(processedSchools);
      setFilteredSchools(processedSchools);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewSchoolDetails = (school: SchoolType) => {
    setSelectedSchool(school);
    setShowSchoolDetails(true);
  };

  const getDropoutColor = (rate: number | undefined) => {
    if (!rate) return 'text-muted-foreground';
    if (rate <= 2) return 'text-success';
    if (rate <= 5) return 'text-warning';
    return 'text-destructive';
  };

  const getAttendanceColor = (rate: number | undefined) => {
    if (!rate) return 'text-muted-foreground';
    if (rate >= 90) return 'text-success';
    if (rate >= 75) return 'text-warning';
    return 'text-destructive';
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm py-3">
        <div className="container mx-auto px-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4">
              <Logo size="sm" showText={false} />
              <div>
                <h1 className="text-lg font-semibold">{t('Education Dashboard')}</h1>
                <p className="text-xs text-muted-foreground">{t('Key performance metrics for schools in the Amritsar District')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4">
        <div className="space-y-4 animate-fade-in">
          {/* Welcome Section */}
          <div className="bg-gradient-to-br from-[#065f46] via-[#10b981] to-[#34d399] rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-400/20 rounded-full -ml-20 -mb-20 blur-2xl"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <BarChart3 className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{user?.fullName || 'Distict Officer'}</h2>
                  <p className="text-emerald-100 font-medium tracking-wide uppercase text-xs mt-1">
                    Amritsar District • Education Management Node
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                      <School className="w-4 h-4 mr-1.5 text-blue-200" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{stats?.totalSchools} Schools</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-5xl font-black tracking-tighter mb-1">{stats?.averageAttendance?.toFixed(1)}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 opacity-80">
                  District Attendance
                </div>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-lg hover:shadow-education/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center justify-between mb-2">
                <School className="w-7 h-7 text-education group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl font-bold text-foreground group-hover:text-education transition-colors duration-300">{stats?.totalSchools}</span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{t('Total Schools')}</h3>
              <p className="text-xs text-muted-foreground">{t('Active Institutions')}</p>
              <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                <div className="bg-education h-1 rounded-full transition-all duration-500 group-hover:w-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-7 h-7 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{stats?.totalStudents?.toLocaleString()}</span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{t('Total Students')}</h3>
              <p className="text-xs text-muted-foreground">{t('enrolled across')}</p>
              <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                <div className="bg-primary h-1 rounded-full transition-all duration-500 group-hover:w-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center justify-between mb-2">
                <UserPlus className="w-7 h-7 text-accent group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">{stats?.totalTeachers}</span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{t('Total Teachers')}</h3>
              <p className="text-xs text-muted-foreground">{t('Teaching Staff')}</p>
              <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                <div className="bg-accent h-1 rounded-full transition-all duration-500 group-hover:w-full" style={{ width: '78%' }}></div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-lg hover:shadow-success/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-7 h-7 text-success group-hover:scale-110 transition-transform duration-300" />
                <span className={`text-xl font-bold transition-colors duration-300 ${getAttendanceColor(stats?.averageAttendance || 0)} group-hover:text-success`}>
                  {stats?.averageAttendance?.toFixed(1)}%
                </span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{t('Average Attendance')}</h3>
              <p className="text-xs text-muted-foreground">{t('District Average ')}</p>
              <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                <div className="bg-success h-1 rounded-full transition-all duration-500 group-hover:w-full" style={{ width: `${stats?.averageAttendance || 0}%` }}></div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-lg hover:shadow-destructive/10 transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-7 h-7 text-destructive group-hover:scale-110 transition-transform duration-300" />
                <span className={`text-xl font-bold transition-colors duration-300 ${getDropoutColor(stats?.averageDropoutRate || 0)} group-hover:text-destructive`}>
                  {stats?.averageDropoutRate?.toFixed(1)}%
                </span>
              </div>
              <h3 className="font-semibold text-sm text-foreground">{t('Dropout Rate ')}</h3>
              <p className="text-xs text-muted-foreground">{t('District Average Dropout')}</p>
              <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                <div className="bg-destructive h-1 rounded-full transition-all duration-500 group-hover:w-full" style={{ width: `${(stats?.averageDropoutRate || 0) * 10}%` }}></div>
              </div>
            </div>
          </div>

          {/* Mid-Day Meal Prediction for District */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('Predicted Mid Day Meal')}</p>
              <p className="text-2xl font-bold text-foreground">15000</p>
            </div>
            <School className="w-8 h-8 text-education" />
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">{t('Quick Actions Title')}</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <button
                onClick={exportDistrictData}
                className="btn-primary text-left p-3 h-auto group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                <Download className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm">{t('Export District Data')}</p>
                  <p className="text-xs opacity-80">{t('Download as CSV')}</p>
                </div>
              </button>

              <button
                onClick={toggleCharts}
                className="btn-secondary text-left p-3 h-auto group hover:shadow-lg hover:shadow-secondary/20 transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm">
                    {showCharts ? t('Hide Charts') : t('Show Charts')}
                  </p>
                  <p className="text-xs opacity-80">{t('Visual Analytics')}</p>
                </div>
              </button>

              <button
                onClick={analyzeDropout}
                className="btn-secondary text-left p-3 h-auto group hover:shadow-lg hover:shadow-destructive/20 transition-all duration-300"
              >
                <TrendingDown className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm">{t('Dropout Analysis')}</p>
                  <p className="text-xs opacity-80">{t('Identify at-risk Schools')}</p>
                </div>
              </button>

              <button
                onClick={() => setShowCustomReportDialog(true)}
                className="btn-secondary text-left p-3 h-auto group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300"
              >
                <Filter className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-sm">{t('Custom Reports')}</p>
                  <p className="text-xs opacity-80">{t('Generate Custom Reports')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Schools List */}
          <div className="bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm">
            <div className="flex flex-col gap-4 mb-4">
              <h3 className="text-base sm:text-lg font-semibold">{t('Schools Overview')}</h3>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('Search Schools')}
                    className="input-field pl-10 w-full text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="btn-secondary text-sm whitespace-nowrap">
                  <Download className="w-4 h-4 mr-2" />
                  {t('Export')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[800px] px-4 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('School Name')}</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Location')}</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Students')}</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Teachers')}</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Attendance')}</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Dropout Rate')}</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 font-medium text-muted-foreground text-xs sm:text-sm">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((school) => (
                      <tr key={school.id} className="border-b border-border/50 hover:bg-secondary/20 transition-all duration-200 group">
                        <td className="py-3 sm:py-4 px-1 sm:px-2">
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200 text-xs sm:text-sm">{school.name}</p>
                            <p className="text-xs text-muted-foreground">{t('', { date: school.lastUpdated })}</p>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm text-muted-foreground">
                          {school.location}
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-right">
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors duration-200 text-xs sm:text-sm">{school.currentStudents}</p>
                            <p className="text-xs text-muted-foreground">{t('Active', { totalStudents: school.totalStudents })}</p>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-right font-medium group-hover:text-accent transition-colors duration-200 text-xs sm:text-sm">
                          {school.totalTeachers}
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-right">
                          <span className={`font-medium transition-all duration-200 text-xs sm:text-sm ${getAttendanceColor(school.attendanceRate)} group-hover:scale-105`}>
                            {school.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-right">
                          <span className={`font-medium transition-all duration-200 text-xs sm:text-sm ${getDropoutColor(school.dropoutRate)} group-hover:scale-105`}>
                            {school.dropoutRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-2 text-right">
                          <button
                            onClick={() => viewSchoolDetails(school)}
                            className="btn-secondary text-xs py-1 px-2 hover:scale-105 transition-transform duration-200"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">{t('view')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* School Performance Chart Placeholder */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <h3 className="text-lg font-semibold mb-4">{t('Performance Trends')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Attendance Trend Chart */}
              <div className="h-64">
                <h4 className="text-md font-medium text-foreground mb-2">{t('Monthly Average Attendance Chart')}</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={attendanceData}
                    margin={{
                      top: 5, right: 5, left: 0, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Avg. Attendance" stroke="hsl(var(--success))" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="Target" stroke="hsl(var(--primary))" strokeDasharray="3 4 5 2" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Dropout Analysis Chart */}
              <div className="h-64">
                <h4 className="text-md font-medium text-foreground mb-2">{t('Monthly Dropout Rate')}</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dropoutData}
                    margin={{
                      top: 5, right: 5, left: 0, bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Dropout Rate" stroke="hsl(var(--destructive))" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="Target" stroke="hsl(var(--primary))" strokeDasharray="3 4 5 2" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* School Details Modal */}
      {showSchoolDetails && selectedSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedSchool.name}</h3>
                <button
                  onClick={() => setShowSchoolDetails(false)}
                  className="btn-secondary py-2 px-4"
                >
                  {t('close')}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">{t('School Information')}</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">{t('Location')}:</span> {selectedSchool.location}</p>
                      <p><span className="text-muted-foreground">{t('Last Updated')}:</span> {selectedSchool.lastUpdated}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-2">{t('Key Metrics of School')}</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">{t('Attendance Rate')}:</span>
                        <span className={`ml-1 font-medium ${getAttendanceColor(selectedSchool.attendanceRate)}`}>
                          {selectedSchool.attendanceRate.toFixed(1)}%
                        </span>
                      </p>
                      <p><span className="text-muted-foreground">{t('Droput Rate')}:</span>
                        <span className={`ml-1 font-medium ${getDropoutColor(selectedSchool.dropoutRate)}`}>
                          {selectedSchool.dropoutRate.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mid-Day Meal Prediction for School */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">{t('Mid Day Meal Prediction for School')}</h4>
                  <div className="bg-secondary/20 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('predicted_meals_tomorrow')}</p>
                      <p className="text-2xl font-bold text-primary">{Math.round(selectedSchool.attendanceRate * selectedSchool.currentStudents / 100 * 0.95)}</p>
                    </div>
                    <School className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">{t('Student Staff Details')}</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-secondary/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{selectedSchool.totalStudents}</div>
                      <div className="text-sm text-muted-foreground">{t('Total Enrolled')}</div>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-success">{selectedSchool.currentStudents}</div>
                      <div className="text-sm text-muted-foreground">{t('Currently Active')}</div>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-accent">{selectedSchool.totalTeachers}</div>
                      <div className="text-sm text-muted-foreground">{t('Teaching Staff')}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="btn-primary flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    {t('Export School Report')}
                  </button>
                  <button className="btn-secondary flex-1">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t('View Analytics')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationDashboard;