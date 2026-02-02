import { API_CONFIG } from './mockData';
import { StudentResponse as Student } from '../types/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    ...API_CONFIG.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// API service for connecting to the backend
const apiService = {
  // Face recognition
  recognizeFace: async (image: string | string[], options?: { period?: string; date?: string }) => {
    const requestBody: any = {};
    if (Array.isArray(image)) {
      requestBody.images = image;
    } else {
      requestBody.image = image;
    }

    if (options?.period) requestBody.period = options.period;
    if (options?.date) requestBody.date = options.date;

    const response = await fetch(`${API_CONFIG.BASE_URL}/recognize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized: Please login again');
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to communicate with the recognition service');
    }

    return await response.json();
  },

  // Period-based attendance
  getPeriodAttendance: async (date?: string, period?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (period) queryParams.append('period', period);

    const url = `${API_CONFIG.BASE_URL}/period-attendance?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Failed to fetch period attendance: ${response.status}`);
    }

    return await response.json();
  },

  getPeriodAttendanceSummary: async (date?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);

    const response = await fetch(`${API_CONFIG.BASE_URL}/period-attendance/summary?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch attendance summary');
    }

    return await response.json();
  },

  exportPeriodAttendance: async (date?: string, period?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (period) queryParams.append('period', period);

    const url = `${API_CONFIG.BASE_URL}/period-attendance/export?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to export attendance: ${response.status}`);
    }

    return response.blob();
  },

  // Student operations
  getStudents: async (classFilter?: string, sectionFilter?: string) => {
    const queryParams = new URLSearchParams();
    if (classFilter) queryParams.append('class', classFilter);
    if (sectionFilter) queryParams.append('section', sectionFilter);

    const response = await fetch(`${API_CONFIG.BASE_URL}/students?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch students');
    }

    return await response.json();
  },

  searchStudents: async (query: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/students/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to search students');
    }

    return await response.json();
  },

  markAttendance: async (studentIds: string[], period: string, date: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/attendance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ studentIds, period, date })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to mark attendance');
    }

    return await response.json();
  },

  // Get attendance records
  getAttendance: async (date?: string, classFilter?: string, sectionFilter?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (classFilter) queryParams.append('class', classFilter);
    if (sectionFilter) queryParams.append('section', sectionFilter);

    const response = await fetch(`${API_CONFIG.BASE_URL}/attendance?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch attendance records');
    }

    return await response.json();
  },

  // Analytics & Stats
  getAdminStats: async () => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch admin stats');
    }
    return await response.json();
  },

  getTeacherStats: async () => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/teacher/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch teacher stats');
    }
    return await response.json();
  },

  getStudentStats: async (studentId: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/student/${studentId}/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch student stats');
    }
    return await response.json();
  },

  getStudentAttendance: async (studentId: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/student/${studentId}/attendance`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch student attendance');
    }
    return await response.json();
  },

  getStudentCalendar: async (studentId: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/student/${studentId}/calendar`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch student calendar');
    }
    return await response.json();
  },

  getStudentAnalytics: async (studentId: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/student/${studentId}/analytics`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch student analytics');
    }
    return await response.json();
  },

  getEducationStats: async () => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/education/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch education stats');
    }
    return await response.json();
  },

  // Notifications
  getNotifications: async () => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/notifications`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to fetch notifications');
    }
    return await response.json();
  },

  markNotificationRead: async (notificationId: number) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to mark notification as read');
    }
    return await response.json();
  },

  // Face Enrollment
  enrollFace: async (formData: FormData) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/enroll-face`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        // NOTE: Don't set Content-Type for FormData, browser does it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to enroll student');
    }
    return await response.json();
  }
};

export default apiService;