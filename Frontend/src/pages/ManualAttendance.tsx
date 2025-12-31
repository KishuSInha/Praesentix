import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, Clock, Check, Filter, Download } from "lucide-react";
import { mockAPI, Student } from "../utils/mockData";
import { useToast } from "../hooks/useToast";
import govEmblem from "../assets/government-emblem.svg";

interface AttendanceModal {
  student: Student;
  isOpen: boolean;
}

const ManualAttendance = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [modal, setModal] = useState<AttendanceModal>({ student: {} as Student, isOpen: false });
  const [bulkAttendance, setBulkAttendance] = useState({
    period: "",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadStudents();
  }, [classFilter, sectionFilter]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchStudents();
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await mockAPI.getStudents(classFilter, sectionFilter);
      setStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      showToast('error', 'Error loading students', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const searchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await mockAPI.searchStudents(searchQuery);
      setFilteredStudents(data);
    } catch (error) {
      showToast('error', 'Search failed', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const openAttendanceModal = (student: Student) => {
    setModal({ student, isOpen: true });
  };

  const closeAttendanceModal = () => {
    setModal({ student: {} as Student, isOpen: false });
  };

  const markIndividualAttendance = async (student: Student, period: string, date: string) => {
    try {
      await mockAPI.markAttendance([student.id], period, date);
      
      // Update student status optimistically
      setFilteredStudents(prev => 
        prev.map(s => s.id === student.id ? { ...s, isPresent: true, lastAttendance: new Date().toISOString() } : s)
      );
      
      showToast('success', 'Attendance Marked', `${student.name} marked present for ${period}`);
      closeAttendanceModal();
    } catch (error) {
      showToast('error', 'Failed to mark attendance', 'Please try again');
    }
  };

  const handleBulkAttendance = async () => {
    if (selectedStudents.size === 0) {
      showToast('warning', 'No students selected', 'Please select students first');
      return;
    }

    if (!bulkAttendance.period) {
      showToast('warning', 'Period required', 'Please select a period');
      return;
    }

    try {
      await mockAPI.markAttendance(Array.from(selectedStudents), bulkAttendance.period, bulkAttendance.date);
      
      // Update selected students optimistically
      setFilteredStudents(prev => 
        prev.map(s => selectedStudents.has(s.id) 
          ? { ...s, isPresent: true, lastAttendance: new Date().toISOString() } 
          : s
        )
      );
      
      showToast('success', 'Bulk Attendance Marked', `${selectedStudents.size} students marked present`);
      setSelectedStudents(new Set());
    } catch (error) {
      showToast('error', 'Failed to mark bulk attendance', 'Please try again');
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedStudents(new Set());
  };

  const periods = [
    "1st Period (9:00-10:00)",
    "2nd Period (10:00-11:00)",
    "3rd Period (11:00-12:00)",
    "4th Period (12:00-1:00)",
    "5th Period (2:00-3:00)",
    "6th Period (3:00-4:00)"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <img src={govEmblem} alt="Government Emblem" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-semibold">Manual Attendance Entry</h1>
                <p className="text-sm opacity-90">Praesentix</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                className="bg-white border border-gray-300 rounded-lg py-3 px-4 pl-10 w-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <select
                className="bg-white border border-gray-300 rounded-lg py-3 px-4 min-w-[120px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>

              <select
                className="bg-white border border-gray-300 rounded-lg py-3 px-4 min-w-[120px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Bulk Actions */}
        {selectedStudents.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedStudents.size} students selected</span>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAllVisible} className="btn-secondary text-sm py-2 px-4">
                  Select All
                </button>
                <button onClick={clearSelection} className="btn-secondary text-sm py-2 px-4">
                  Clear
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <select
                  className="input-field w-full"
                  value={bulkAttendance.period}
                  onChange={(e) => setBulkAttendance(prev => ({ ...prev, period: e.target.value }))}
                >
                  <option value="">Select Period</option>
                  {periods.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={bulkAttendance.date}
                  onChange={(e) => setBulkAttendance(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <button
                onClick={handleBulkAttendance}
                className="btn-success"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Present
              </button>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Students ({filteredStudents.length})
              </h2>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No students found
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="w-4 h-4 rounded border-border"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{student.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.rollNumber} • Class: {student.class}{student.section}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            student.isPresent ? 'status-present' : 'bg-muted'
                          }`}>
                            {student.isPresent ? 'Present Today' : `${student.attendancePercentage}% Overall`}
                          </div>
                        </div>

                        <button
                          onClick={() => openAttendanceModal(student)}
                          className="btn-primary py-2 px-4 text-sm"
                        >
                          Mark Present
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Attendance Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card rounded-lg shadow-lg max-w-md w-full animate-scale-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Mark Attendance</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{modal.student.name}</p>
                  <p className="text-sm text-muted-foreground">Roll: {modal.student.rollNumber}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Period</label>
                  <select
                    className="input-field w-full"
                    value={bulkAttendance.period}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, period: e.target.value }))}
                  >
                    <option value="">Select Period</option>
                    {periods.map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={bulkAttendance.date}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeAttendanceModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markIndividualAttendance(modal.student, bulkAttendance.period, bulkAttendance.date)}
                  className="btn-success flex-1"
                  disabled={!bulkAttendance.period}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark Present
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualAttendance;