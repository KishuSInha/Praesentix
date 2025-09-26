import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar as CalendarIcon,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { mockAPI } from "../../utils/mockData";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayPickerSingleProps } from "react-day-picker";

declare module 'react-day-picker' {
  interface DayProps {
    'data-attendance'?: AttendanceRecord[];
  }
}

type AttendanceStatus = 'present' | 'absent' | 'holiday';

interface AttendanceRecord {
  date: string;  // YYYY-MM-DD format
  status: AttendanceStatus;
  subject?: string;
}

// Custom Day component with proper typing
interface CustomDayProps extends Omit<React.HTMLProps<HTMLButtonElement>, 'onClick' | 'onFocus' | 'onBlur' | 'value'> {
  date: Date;
  displayMonth: Date;
  onDayClick: (day: Date, modifiers: DayPickerSingleProps['modifiers']) => void;
  onDayFocus: (day: Date, modifiers: DayPickerSingleProps['modifiers']) => void;
  isDisabled: boolean;
  isSelected: boolean;
  isToday: boolean;
  isOutside: boolean;
  'data-attendance'?: AttendanceRecord[];
}

const CustomDay = ({
  date,
  displayMonth,
  onDayClick,
  onDayFocus,
  isDisabled,
  isSelected,
  isToday,
  isOutside,
  'data-attendance': attendanceRecords = [],
  ...props
}: CustomDayProps) => {
  if (date < new Date('2000-01-01')) return <div></div>;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const record = attendanceRecords?.find((r) => r.date === dateStr);
  
  return (
    <button
      {...props}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onDayClick(date, { selected: isSelected });
      }}
      onFocus={() => onDayFocus(date, { selected: isSelected })}
      disabled={isDisabled}
      className={`relative h-9 w-9 p-0 text-sm font-normal
        ${isSelected ? 'bg-primary text-primary-foreground' : ''}
        ${record?.status === 'present' ? '!bg-green-100 !text-green-900' : ''}
        ${record?.status === 'absent' ? '!bg-red-100 !text-red-900' : ''}
        ${record?.status === 'holiday' ? '!bg-yellow-100 !text-yellow-900' : ''}
        hover:bg-accent hover:text-accent-foreground
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
        ${isOutside ? 'opacity-50' : ''}
        ${isToday ? 'font-bold' : ''}
{{ ... }}
      `}
    >
      {date.getDate()}
    </button>
  );
};

interface StudentStats {
  attendancePercentage: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  rank: number;
  attendanceRecords?: AttendanceRecord[];
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Helper function to safely parse date strings
  const parseDateSafe = (dateStr: string): Date => {
    try {
      return parseISO(dateStr);
    } catch (e) {
      console.warn(`Invalid date string: ${dateStr}`, e);
      return new Date();
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get basic stats
      const data = (await mockAPI.getDashboardStats("student")) as StudentStats;
      
      // Generate sample attendance records if none exist
      const attendanceRecords: AttendanceRecord[] = [];
      const today = new Date();
      
      // Generate records for the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Mark as present for 90% of the time
        const isPresent = Math.random() > 0.1;
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        attendanceRecords.push({
          date: dateStr,
          status: isPresent ? 'present' : 'absent',
          subject: ['Math', 'Science', 'History', 'English', 'Geography'][Math.floor(Math.random() * 5)]
        });
      }
      
      setStats({
        ...data,
        attendanceRecords
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!stats) return;

    try {
      // Prepare detailed attendance data
      const attendanceData = stats.attendanceRecords?.map(record => ({
        date: record.date,
        status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
        subject: record.subject || 'N/A'
      })) || [];

      // Create CSV header and rows
      const headers = ["Date", "Status", "Subject"];
      const csvRows = [
        ["Student Attendance Report"],
        ["Generated on", new Date().toLocaleDateString()],
        [],
        ["Summary"],
        ["Attendance Percentage", `${stats.attendancePercentage}%`],
        ["Total Days", stats.totalDays],
        ["Present Days", stats.presentDays],
        ["Absent Days", stats.absentDays],
        ["Rank", `#${stats.rank}`],
        [],
        ["Detailed Attendance"],
        headers,
        ...attendanceData.map(record => [
          record.date,
          record.status,
          record.subject
        ])
      ];

      // Convert to CSV format
      const csvContent = csvRows.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Create and trigger download
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-success";
    if (percentage >= 75) return "text-warning";
    return "text-destructive";
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 90) return "Excellent";
    if (percentage >= 75) return "Good";
    return "Needs Improvement";
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
              <h1 className="text-xl font-semibold">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Your attendance overview
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 animate-fade-in">
          {/* Welcome Section */}
          <div className="card-student rounded-2xl p-6 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-student to-student/80 rounded-full flex items-center justify-center shadow-lg mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome, Saanjh Nayak
            </h2>
            <p className="text-muted-foreground">
              Class 10A • Roll Number: 2024001
            </p>
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-background/20 rounded-full">
              <Award className="w-4 h-4 mr-2 text-student" />
              <span className="text-sm font-medium">
                Rank #{stats?.rank} in class
              </span>
            </div>
          </div>

          {/* Attendance Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-success" />
                <span
                  className={`text-2xl font-bold ${getAttendanceColor(
                    stats?.attendancePercentage || 0
                  )}`}
                >
                  {stats?.attendancePercentage}%
                </span>
              </div>
              <h3 className="font-semibold text-foreground">Attendance Rate</h3>
              <p className="text-sm text-muted-foreground">
                {getAttendanceStatus(stats?.attendancePercentage || 0)}
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CalendarIcon className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {stats?.totalDays}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">Total Days</h3>
              <p className="text-sm text-muted-foreground">This academic year</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="w-8 h-8 text-accent" />
                <span className="text-2xl font-bold text-accent">
                  {stats?.presentDays}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">Present Days</h3>
              <p className="text-sm text-muted-foreground">Days attended</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Clock className="w-8 h-8 text-destructive" />
                <span className="text-2xl font-bold text-destructive">
                  {stats?.absentDays}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">Absent Days</h3>
              <p className="text-sm text-muted-foreground">Days missed</p>
            </div>
          </div>

          {/* Attendance Progress */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Attendance Progress</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Progress</span>
                <span className="font-medium">
                  {stats?.presentDays}/{stats?.totalDays} days
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-student to-student/80 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.attendancePercentage}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Target: 75% minimum
                </span>
                <span
                  className={`font-medium ${
                    (stats?.attendancePercentage || 0) >= 75
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {(stats?.attendancePercentage || 0) >= 75
                    ? "Target Met ✓"
                    : "Below Target"}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Calendar Modal */}
          <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
              <div className="relative">
                <DialogHeader className="px-6 pt-6 pb-2">
                  <DialogTitle className="text-xl font-semibold text-white">
                    Attendance Calendar
                  </DialogTitle>
                </DialogHeader>

                <div className="p-0 bg-black">
                  <div className="relative p-6 pb-4 bg-black">
                    <CalendarPrimitive
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="w-full p-4 bg-black text-white"
                      classNames={{
                        months: 'w-full',
                        month: 'space-y-4 w-full',
                        caption: 'flex justify-center pt-1 relative items-center pb-4',
                        caption_label: 'text-sm font-semibold text-white',
                        nav: 'space-x-1 flex items-center',
                        nav_button: 'h-8 w-8 bg-gray-900 text-white p-0 rounded-full border border-gray-700 hover:bg-gray-800 transition-colors',
                        nav_button_previous: 'absolute left-4',
                        nav_button_next: 'absolute right-4',
                        table: 'w-full border-collapse space-y-1',
                        head_row: 'flex',
                        head_cell: 'text-gray-400 rounded-md w-9 font-medium text-xs',
                        row: 'flex w-full mt-1.5',
                        cell: 'h-9 w-9 text-center text-sm p-0 relative',
                        day: 'h-9 w-9 p-0 font-normal rounded-full hover:bg-gray-800 hover:text-white transition-colors',
                        day_selected: 'bg-primary text-white hover:bg-primary/90',
                        day_today: 'border border-primary font-semibold',
                        day_outside: 'text-gray-600',
                        day_disabled: 'text-gray-600',
                        day_hidden: 'invisible',
                      }}
                      components={{
                        IconLeft: ({ ...props }) => (
                          <ChevronLeft className="h-4 w-4 text-white" />
                        ),
                        IconRight: ({ ...props }) => (
                          <ChevronRight className="h-4 w-4 text-white" />
                        ),
                        Day: (props) => {
                          const dayProps = props as any;
                          const dateStr = format(dayProps.date, 'yyyy-MM-dd');
                          const record = stats?.attendanceRecords?.find(r => r.date === dateStr);
                          
                          return (
                            <div 
                              {...dayProps}
                              className={`h-9 w-9 flex items-center justify-center rounded-full mx-auto ${
                                dayProps.selected 
                                  ? 'bg-primary text-white' 
                                  : record?.status === 'present' 
                                    ? 'bg-green-600 text-white' 
                                    : record?.status === 'absent' 
                                      ? 'bg-red-600 text-white'
                                      : 'hover:bg-gray-800 text-white'
                              } ${dayProps.today ? 'border border-white' : ''}`}
                              onClick={() => dayProps.onDayClick(dayProps.date, { selected: dayProps.selected })}
                            >
                              {dayProps.date.getDate()}
                            </div>
                          );
                        },
                      }}
                    />
                  </div>

                  <div className="p-6 pt-0 bg-black">
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300">Present</span>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <div className="mt-1 text-xl font-bold text-green-500">
                          {stats?.presentDays || 0}
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300">Absent</span>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                        <div className="mt-1 text-xl font-bold text-red-500">
                          {stats?.absentDays || 0}
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-300">Holiday</span>
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        </div>
                        <div className="mt-1 text-xl font-bold text-yellow-500">
                          {Math.floor((stats?.totalDays || 0) * 0.1)}
                        </div>
                      </div>
                    </div>

                    {selectedDate && (
                      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-200">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                          </h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-900/50 text-blue-400">
                            {format(selectedDate, 'PPP')}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            const dateStr = format(selectedDate, 'yyyy-MM-dd');
                            const record = stats?.attendanceRecords?.find(r => r.date === dateStr);
                            
                            if (!record) return (
                              <div className="text-center py-4">
                                <p className="text-gray-500 text-sm">
                                  No attendance record for this day
                                </p>
                              </div>
                            );
                            
                            return (
                              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white">
                                    {record.subject || 'General Attendance'}
                                  </p>
                                  <p className={`text-sm font-medium ${
                                    record.status === 'present' 
                                      ? 'text-green-400' 
                                      : record.status === 'absent' 
                                        ? 'text-red-400' 
                                        : 'text-yellow-400'
                                  }`}>
                                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                  </p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${
                                  record.status === 'present' 
                                    ? 'bg-green-500' 
                                    : record.status === 'absent' 
                                      ? 'bg-red-500' 
                                      : 'bg-yellow-500'
                                }`}></div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start text-left hover:bg-accent/50 transition-colors"
                onClick={() => setIsCalendarOpen(true)}
              >
                <CalendarIcon className="w-5 h-5 mr-3 text-primary" />
                <div>
                  <p className="font-medium">View Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    Check your attendance history
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start text-left hover:bg-accent/50 transition-colors"
                onClick={downloadReport}
                disabled={!stats}
              >
                <Download className="w-5 h-5 mr-3 text-primary" />
                <div>
                  <p className="font-medium">Download Report</p>
                  <p className="text-xs text-muted-foreground">
                    Get detailed attendance summary
                  </p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
