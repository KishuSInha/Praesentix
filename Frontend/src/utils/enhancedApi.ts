const API_URL = import.meta.env.VITE_API_URL;
console.log("API URL:", API_URL);
const ENHANCED_API_BASE = `${API_URL}/api`;

export const enhancedApi = {
  // Get student attendance data
  getStudentAttendance: async (studentId: string) => {
    try {
      const response = await fetch(`${ENHANCED_API_BASE}/student/${studentId}/attendance`);
      if (!response.ok) throw new Error('Failed to fetch attendance data');
      return await response.json();
    } catch (error) {
      console.error('Enhanced API Error:', error);
      throw error;
    }
  },

  // Get student calendar data
  getStudentCalendar: async (studentId: string) => {
    try {
      const response = await fetch(`${ENHANCED_API_BASE}/student/${studentId}/calendar`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      return await response.json();
    } catch (error) {
      console.error('Enhanced API Error:', error);
      throw error;
    }
  },

  // Get student analytics
  getStudentAnalytics: async (studentId: string) => {
    try {
      const response = await fetch(`${ENHANCED_API_BASE}/student/${studentId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      return await response.json();
    } catch (error) {
      console.error('Enhanced API Error:', error);
      throw error;
    }
  }
};