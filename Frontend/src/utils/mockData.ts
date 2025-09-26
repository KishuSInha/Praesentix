// Mock data for Smart Attend system

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  isPresent?: boolean;
  lastAttendance?: string;
  attendancePercentage: number;
}

export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  classes: string[];
  phone: string;
  email: string;
}

export interface School {
  id: string;
  name: string;
  location: string;
  totalStudents?: number;
  totalTeachers?: number;
  currentStudents?: number;
  dropoutRate?: number;
  attendanceRate?: number;
  lastUpdated?: string;
}


export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  period: string;
  status: 'present' | 'absent';
  markedBy: string;
  method: 'manual' | 'camera';
}

// Real Students Data
export const mockStudents: Student[] = [
  {
    id: "1",
    name: "Avijit Chowdhury",
    rollNumber: "101",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  },
  {
    id: "2",
    name: "Saanjh Nayak",
    rollNumber: "102",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  },
  {
    id: "3",
    name: "Soumya Sagar Nayak",
    rollNumber: "103",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  },
  {
    id: "4",
    name: "Sreyan Panda",
    rollNumber: "104",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  },
  {
    id: "5",
    name: "Subham Sarangi",
    rollNumber: "105",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  },
  {
    id: "6",
    name: "Utkarsh Sinha",
    rollNumber: "106",
    class: "XII",
    section: "A",
    attendancePercentage: 0
  }
];



// Mock Teachers Data
export const mockTeachers: Teacher[] = [
  {
    id: "t1",
    name: "Mrs. Sunita Devi",
    subjects: ["Mathematics", "Physics"],
    classes: ["10A", "10B", "11A"],
    phone: "+91-9876543210",
    email: "sunita.devi@school.edu"
  },
  {
    id: "t2",
    name: "Mr. Rajesh Kumar",
    subjects: ["English", "Hindi"],
    classes: ["9A", "9B", "10A"],
    phone: "+91-9876543211",
    email: "rajesh.kumar@school.edu"
  },
  {
    id: "t3",
    name: "Dr. Meera Joshi",
    subjects: ["Chemistry", "Biology"],
    classes: ["11A", "11B", "12A"],
    phone: "+91-9876543212",
    email: "meera.joshi@school.edu"
  }
];

// Mock Schools Data
export const mockSchools: School[] = [
  {
    id: "s1",
    name: "Government Girls Senior Secondary School",
    location: "Mall Road, Near Ebnoy Mall, Amritsar GPO, Amritsar - 143001",
    totalStudents: 450,
    totalTeachers: 18,
    currentStudents: 425,
    dropoutRate: 5.6,
    attendanceRate: 87.2,
    lastUpdated: "2024-01-15"
  },
  {
    id: "s2",
    name: "Senior Secondary School, Town Hall",
    location: "Town Hall, Grand Trunk Road, Mall Mandi, Golden Avenue, Amritsar - 143001",
    totalStudents: 500,
    totalTeachers: 15,
    currentStudents: 365,
    dropoutRate: 3.9,
    attendanceRate: 91.5,
    lastUpdated: "2024-01-15"
  },
  {
    id: "s3",
    name: "Senior Secondary School, Putlighar",
    location: "Pulti Ghar, Gwalmandi, G T Road, Amritsar - 143001",
    totalStudents: 180,
    totalTeachers: 8,
    currentStudents: 172,
    dropoutRate: 4.4,
    attendanceRate: 83.7,
    lastUpdated: "2024-01-14"
  },
  {
    id: "s4",
    name: "Girls Senior Secondary School, Mahna Singh Road",
    location: "Mahna Singh Road, Amritsar",
    totalStudents: 650,
    totalTeachers: 28,
    currentStudents: 642,
    dropoutRate: 1.2,
    attendanceRate: 95.3,
    lastUpdated: "2024-01-15"
  },
  {
    id: "s5",
    name: "Senior Secondary School, Daim Ganj",
    location: "Daim Ganj, Amritsar",
    totalStudents: 1480,
    totalTeachers: 200,
    currentStudents: 976,
    dropoutRate: 0.8,
    attendanceRate: 97.1,
    lastUpdated: "2024-01-15"
  }
];

// API Configuration
export const API_CONFIG = {
  // Set to false to use real API instead of mock data
  USE_MOCK: false,
  BASE_URL: "http://127.0.0.1:5001/api",
  // Add CORS headers to allow requests from port 8080
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:8080'
  }
};

// Mock attendance records
export const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: "a1",
    studentId: "1",
    date: "2024-01-15",
    period: "1st Period (9:00-10:00)",
    status: "present",
    markedBy: "Mrs. Sunita Devi",
    method: "manual"
  },
  {
    id: "a2",
    studentId: "2",
    date: "2024-01-15",
    period: "1st Period (9:00-10:00)",
    status: "present",
    markedBy: "Mrs. Sunita Devi",
    method: "manual"
  }
];

// Mock API functions
export const mockAPI = {
  // Student operations
  getStudents: async (classFilter?: string, sectionFilter?: string): Promise<Student[]> => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    let filtered = [...mockStudents];
    
    if (classFilter) {
      filtered = filtered.filter(s => s.class === classFilter);
    }
    
    if (sectionFilter) {
      filtered = filtered.filter(s => s.section === sectionFilter);
    }
    
    return filtered;
  },

  searchStudents: async (query: string): Promise<Student[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return mockStudents.filter(student => 
      student.name.toLowerCase().includes(query.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(query.toLowerCase())
    );
  },

  markAttendance: async (studentIds: string[], period: string, date: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Marked attendance for ${studentIds.length} students in ${period} on ${date}`);
    return true;
  },

  // School operations
  getSchools: async (): Promise<School[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...mockSchools];
  },

  getSchoolDetails: async (schoolId: string): Promise<School | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSchools.find(s => s.id === schoolId) || null;
  },

  // Dashboard stats
  getDashboardStats: async (userType: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (userType) {
      case 'student':
        return {
          attendancePercentage: 94,
          totalDays: 180,
          presentDays: 169,
          absentDays: 11,
          rank: 5
        };
      
      case 'teacher':
        return {
          totalClasses: 6,
          studentsTotal: 234,
          averageAttendance: 89.5,
          todayPresent: 213
        };
      
      case 'admin':
        return {
          totalStudents: 450,
          totalTeachers: 18,
          averageAttendance: 87.2,
          activeUsers: 445
        };
      
      case 'education':
        return {
          totalSchools: mockSchools.length,
          totalStudents: mockSchools.reduce((sum, s) => sum + s.currentStudents, 0),
          totalTeachers: mockSchools.reduce((sum, s) => sum + s.totalTeachers, 0),
          averageAttendance: mockSchools.reduce((sum, s) => sum + s.attendanceRate, 0) / mockSchools.length,
          averageDropoutRate: mockSchools.reduce((sum, s) => sum + s.dropoutRate, 0) / mockSchools.length
        };
      
      default:
        return {};
    }
  }
};