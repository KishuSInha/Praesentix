import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Calendar, BarChart3, PieChart } from 'lucide-react';

interface AnalyticsData {
  totalStudents: number;
  averageAttendance: number;
  attendanceTrend: number;
  weeklyData: Array<{ day: string; attendance: number }>;
  classWiseData: Array<{ class: string; attendance: number }>;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    // Mock analytics data
    const mockData: AnalyticsData = {
      totalStudents: 450,
      averageAttendance: 87.5,
      attendanceTrend: 2.3,
      weeklyData: [
        { day: 'Mon', attendance: 85 },
        { day: 'Tue', attendance: 89 },
        { day: 'Wed', attendance: 87 },
        { day: 'Thu', attendance: 91 },
        { day: 'Fri', attendance: 83 },
      ],
      classWiseData: [
        { class: '10A', attendance: 92 },
        { class: '10B', attendance: 88 },
        { class: '11A', attendance: 85 },
        { class: '11B', attendance: 90 },
        { class: '12A', attendance: 84 },
      ]
    };
    setAnalytics(mockData);
  }, [timeRange]);

  if (!analytics) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold">{analytics.totalStudents}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Attendance</p>
              <p className="text-2xl font-bold">{analytics.averageAttendance}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Trend</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold">{analytics.attendanceTrend}%</p>
                {analytics.attendanceTrend > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500 ml-2" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500 ml-2" />
                )}
              </div>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Classes</p>
              <p className="text-2xl font-bold">{analytics.classWiseData.length}</p>
            </div>
            <PieChart className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Weekly Attendance</h3>
          <div className="space-y-3">
            {analytics.weeklyData.map((day) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm font-medium w-12">{day.day}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${day.attendance}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{day.attendance}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Class-wise Attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Class-wise Attendance</h3>
          <div className="space-y-3">
            {analytics.classWiseData.map((classData) => (
              <div key={classData.class} className="flex items-center justify-between">
                <span className="text-sm font-medium w-12">{classData.class}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        classData.attendance >= 90 ? 'bg-green-600' :
                        classData.attendance >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${classData.attendance}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{classData.attendance}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;