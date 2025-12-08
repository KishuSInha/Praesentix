import { API_CONFIG } from './mockData';
import { Student } from '../types/student';

// API service for connecting to the backend
const apiService = {
  // Face recognition
  recognizeFace: async (base64Image: string, options?: { period?: string; date?: string }) => {
    const requestBody: any = { image: base64Image };
    if (options?.period) requestBody.period = options.period;
    if (options?.date) requestBody.date = options.date;

    const response = await fetch(`${API_CONFIG.BASE_URL}/recognize`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
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
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`Failed to fetch period attendance: ${response.status}`);
    }
    
    return await response.json();
  },

  getPeriodAttendanceSummary: async (date?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/period-attendance/summary?${queryParams.toString()}`);
    
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
    console.log('Export URL:', url);
    
    const response = await fetch(url);
    console.log('Export response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Export error:', errorText);
      throw new Error(`Failed to export attendance: ${response.status} ${errorText}`);
    }
    
    return response.blob();
  },

  // Student operations
  getStudents: async (classFilter?: string, sectionFilter?: string) => {
    const queryParams = new URLSearchParams();
    if (classFilter) queryParams.append('class', classFilter);
    if (sectionFilter) queryParams.append('section', sectionFilter);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/students?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch students');
    }
    
    return await response.json();
  },

  searchStudents: async (query: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/students/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error('Failed to search students');
    }
    
    return await response.json();
  },

  markAttendance: async (studentIds: string[], period: string, date: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/attendance`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ studentIds, period, date })
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark attendance');
    }
    
    return await response.json();
  },

  // Get attendance records
  getAttendance: async (date?: string, classFilter?: string, sectionFilter?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    if (classFilter) queryParams.append('class', classFilter);
    if (sectionFilter) queryParams.append('section', sectionFilter);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/attendance?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch attendance records');
    }
    
    return await response.json();
  },
};

export default apiService;