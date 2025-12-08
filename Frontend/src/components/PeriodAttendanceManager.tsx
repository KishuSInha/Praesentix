import { useState, useEffect } from 'react';
import { Download, Calendar, Clock, Users, FileText, AlertCircle, Filter } from 'lucide-react';
import apiService from '../utils/api';
import { useToast } from '../hooks/useToast';

interface PeriodAttendanceRecord {
  id: number;
  studentId: string;
  name: string;
  date: string;
  period: string;
  time: string;
  emotion: string;
  spoofingStatus: string;
  livenessConfidence: number;
  recognitionConfidence: number;
  timestamp: string;
}

interface AttendanceSummary {
  period: string;
  totalPresent: number;
  liveCount: number;
  spoofedCount: number;
}

const PeriodAttendanceManager = () => {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<PeriodAttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadDate, setDownloadDate] = useState(new Date().toISOString().split('T')[0]);
  const [downloadPeriod, setDownloadPeriod] = useState('');
  const [downloadPreview, setDownloadPreview] = useState<{count: number, loading: boolean}>({count: 0, loading: false});
  const [serverError, setServerError] = useState(false);

  const periods = [
    "1st Period (9:00-10:00)",
    "2nd Period (10:00-11:00)", 
    "3rd Period (11:00-12:00)",
    "4th Period (12:00-1:00)",
    "5th Period (2:00-3:00)",
    "6th Period (3:00-4:00)"
  ];

  useEffect(() => {
    loadAttendanceData();
    loadAttendanceSummary();
  }, [selectedDate, selectedPeriod]);

  useEffect(() => {
    loadDownloadPreview();
  }, [downloadDate, downloadPeriod]);

  const loadDownloadPreview = async () => {
    if (!downloadDate) return;
    
    setDownloadPreview({count: 0, loading: true});
    try {
      const response = await apiService.getPeriodAttendance(downloadDate, downloadPeriod);
      if (response && response.success) {
        setDownloadPreview({count: response.total || 0, loading: false});
      } else {
        setDownloadPreview({count: 0, loading: false});
      }
    } catch (error) {
      console.error('Preview load error:', error);
      // Show mock count when server is not available
      const mockCount = Math.floor(Math.random() * 50) + 20;
      setDownloadPreview({count: mockCount, loading: false});
    }
  };

  const generateMockAttendanceData = (date: string, period: string): PeriodAttendanceRecord[] => {
    const mockStudents = ['Avijit Chowdhury', 'Saanjh Nayak', 'Soumya Sagar Nayak', 'Sreyan Panda', 'Subham Sarangi', 'Utkarsh Sinha'];
    const emotions = ['Happy', 'Neutral', 'Focused', 'Calm', 'Confident'];
    const times = ['09:15', '10:30', '11:45', '12:30', '14:15', '15:30'];
    
    return mockStudents.map((name, index) => ({
      id: index + 1,
      studentId: `S${(index + 1).toString().padStart(3, '0')}`,
      name,
      date,
      period: period || periods[Math.floor(Math.random() * periods.length)],
      time: times[Math.floor(Math.random() * times.length)],
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      spoofingStatus: Math.random() > 0.1 ? 'LIVE' : 'SPOOFED',
      livenessConfidence: Math.random() * 20 + 80,
      recognitionConfidence: Math.random() * 15 + 85,
      timestamp: new Date().toISOString()
    }));
  };

  const generateMockSummaryData = (): AttendanceSummary[] => {
    return periods.map(period => ({
      period,
      totalPresent: Math.floor(Math.random() * 30) + 20,
      liveCount: Math.floor(Math.random() * 25) + 18,
      spoofedCount: Math.floor(Math.random() * 3)
    }));
  };

  const loadAttendanceData = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getPeriodAttendance(selectedDate, selectedPeriod);
      if (response && response.success) {
        setAttendanceRecords(response.data || []);
        setServerError(false);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error: any) {
      console.error('Load attendance error:', error);
      // Show mock data when server is not available
      const mockData = generateMockAttendanceData(selectedDate, selectedPeriod);
      setAttendanceRecords(mockData);
      setServerError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceSummary = async () => {
    try {
      const response = await apiService.getPeriodAttendanceSummary(selectedDate);
      if (response && response.success) {
        setAttendanceSummary(response.data || []);
      } else {
        setAttendanceSummary([]);
      }
    } catch (error: any) {
      console.error('Failed to load attendance summary:', error);
      // Show mock summary when server is not available
      const mockSummary = generateMockSummaryData();
      setAttendanceSummary(mockSummary);
    }
  };

  const handleExport = async () => {
    if (!downloadDate) {
      showToast('warning', 'Date Required', 'Please select a date for download');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await apiService.exportPeriodAttendance(downloadDate, downloadPeriod);
      
      if (!blob || blob.size === 0) {
        throw new Error('No data received from server');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      let filename = 'attendance';
      filename += `_${downloadDate}`;
      if (downloadPeriod) {
        const periodName = downloadPeriod.split(' ')[0] + '_' + downloadPeriod.split(' ')[1];
        filename += `_${periodName}`;
      } else {
        filename += '_all_periods';
      }
      filename += '.csv';
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      const periodText = downloadPeriod || 'all periods';
      showToast('success', 'Download Complete', `Attendance for ${downloadDate} (${periodText}) downloaded successfully`);
    } catch (error: any) {
      console.error('Export error:', error);
      if (error.message.includes('fetch')) {
        showToast('error', 'Server Error', 'Cannot connect to server. Please ensure the backend is running on port 5001.');
      } else {
        showToast('error', 'Download Failed', error.message || 'Failed to download attendance data');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {serverError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">Demo Mode</h3>
          </div>
          <p className="text-sm text-blue-700">
            Showing sample data. For live attendance tracking, start the backend server.
          </p>
        </div>
      )}
      {/* Download Section */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Download Attendance</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Select date and period to download attendance records as CSV file
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date *
            </label>
            <input
              type="date"
              value={downloadDate}
              onChange={(e) => setDownloadDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Select Period
            </label>
            <select
              value={downloadPeriod}
              onChange={(e) => setDownloadPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Periods</option>
              {periods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleExport}
            disabled={isExporting || !downloadDate}
            className="btn-primary flex items-center justify-center gap-2 h-10"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Downloading...' : 'Download CSV'}
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Download Preview</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Date:</strong> {downloadDate || 'Not selected'}</p>
            <p><strong>Period:</strong> {downloadPeriod || 'All periods'}</p>
            <p><strong>Records:</strong> {downloadPreview.loading ? 'Checking...' : `${downloadPreview.count} students`}</p>
            <p><strong>Format:</strong> CSV file with summary statistics</p>
            <p><strong>Includes:</strong> Student details, attendance time, emotion, confidence scores</p>
          </div>
        </div>
      </div>

      {/* View Section */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-secondary" />
          <h2 className="text-xl font-semibold">View Attendance Records</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Filter and view attendance records in the browser
        </p>

        {/* View Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              View Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              View Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Periods</option>
              {periods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {attendanceSummary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendanceSummary.map((summary) => (
            <div key={summary.period} className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{summary.period}</h3>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Present:</span>
                  <span className="font-medium">{summary.totalPresent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Live:</span>
                  <span className="font-medium text-green-600">{summary.liveCount}</span>
                </div>
                {summary.spoofedCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Spoofed:</span>
                    <span className="font-medium text-red-600">{summary.spoofedCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Attendance Records ({attendanceRecords.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No attendance records found</p>
            <p className="text-sm">Try selecting a different date or period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium">Student</th>
                  <th className="text-left py-3 px-2 font-medium">Period</th>
                  <th className="text-left py-3 px-2 font-medium">Time</th>
                  <th className="text-left py-3 px-2 font-medium">Emotion</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{record.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {record.studentId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm">{record.period}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm">{record.time}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm">{record.emotion}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {record.spoofingStatus === 'LIVE' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            ✓ Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Spoofed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm">
                        <div>Recognition: {record.recognitionConfidence.toFixed(1)}%</div>
                        <div className="text-muted-foreground">Liveness: {record.livenessConfidence.toFixed(1)}%</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodAttendanceManager;