import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, Clock, Check, Filter, Download, UserPlus, ChevronRight, X, Calendar, RefreshCw } from "lucide-react";
import apiService from "../utils/api";
import { useToast } from "../hooks/useToast";
import Logo from "../components/Logo";
import { motion, AnimatePresence } from "framer-motion";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  isPresent?: boolean;
  attendancePercentage?: number;
}

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
      const result = await apiService.getStudents(classFilter, sectionFilter);
      const data = result.data || result;
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
      const result = await apiService.searchStudents(searchQuery);
      const data = result.data || result;
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
      await apiService.markAttendance([student.id], period, date);
      setFilteredStudents(prev =>
        prev.map(s => s.id === student.id ? { ...s, isPresent: true } : s)
      );
      showToast('success', 'Attendance Marked', `${student.name} marked present`);
      closeAttendanceModal();
    } catch (error) {
      showToast('error', 'Failed to mark attendance', 'Please try again');
    }
  };

  const handleBulkAttendance = async () => {
    if (selectedStudents.size === 0) return;
    if (!bulkAttendance.period) {
      showToast('warning', 'Period required', 'Please select a period');
      return;
    }
    try {
      await apiService.markAttendance(Array.from(selectedStudents), bulkAttendance.period, bulkAttendance.date);
      setFilteredStudents(prev =>
        prev.map(s => selectedStudents.has(s.id) ? { ...s, isPresent: true } : s)
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
      if (newSet.has(studentId)) newSet.delete(studentId);
      else newSet.add(studentId);
      return newSet;
    });
  };

  const periods = [
    "1st Period", "2nd Period", "3rd Period", "4th Period", "5th Period", "6th Period"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-['Outfit'] antialiased">
      <header className="px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-950">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo size="sm" />
          <div className="h-6 w-px bg-slate-100 hidden md:block" />
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hidden md:block">
            Management <span className="text-slate-950 uppercase">Faculty Access</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 bg-slate-950 text-white rounded-full hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#C4F582] shadow-[0_0_10px_#C4F582]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure System</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
          <div className="flex-1 w-full space-y-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-950 transition-colors" />
              <input
                type="text"
                placeholder="Search Student Records..."
                className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-14 pr-4 text-sm font-bold focus:outline-none focus:border-slate-950 transition-all placeholder:text-slate-300 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                className="bg-white border border-slate-100 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-slate-950 transition-all cursor-pointer shadow-sm text-slate-500"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">Classes: All</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>
              <select
                className="bg-white border border-slate-100 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-slate-950 transition-all cursor-pointer shadow-sm text-slate-500"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="">Sections: All</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>
          <button className="bg-white border border-slate-100 h-fit py-4 px-8 rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-950 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <Download className="w-4 h-4" /> Export Data
          </button>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence mode="wait">
          {selectedStudents.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 border border-white/10"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-[#C4F582] rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-slate-950" />
                </div>
                <div>
                  <p className="label-caps-accent text-[#C4F582]/60">Batch Selection</p>
                  <p className="font-bold text-2xl text-white tracking-tight">{selectedStudents.size} Students</p>
                </div>
              </div>

              <div className="h-12 w-px bg-white/10 hidden md:block" />

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <p className="label-caps text-white/40 ml-1">Period Selection</p>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer hover:bg-white/10 transition-colors"
                    value={bulkAttendance.period}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, period: e.target.value }))}
                  >
                    <option value="" className="text-slate-900">Select Period</option>
                    {periods.map(p => <option key={p} value={p} className="text-slate-900">{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="label-caps text-white/40 ml-1">Attendance Date</p>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase text-white outline-none cursor-pointer hover:bg-white/10 transition-colors"
                    value={bulkAttendance.date}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={handleBulkAttendance}
                  className="bg-[#C4F582] text-slate-950 flex-1 md:px-12 py-4 rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-[#C4F582]/10"
                >
                  Confirm Attendance
                </button>
                <button
                  onClick={() => setSelectedStudents(new Set())}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directory Container */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-950 tracking-tight">Student Directory</h3>
              <p className="label-caps text-slate-400 mt-1">{filteredStudents.length} Records found</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-24 text-center">
                <RefreshCw className="w-10 h-10 animate-spin text-[#C4F582] mx-auto mb-6" />
                <p className="label-caps-accent">Fetching Records...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Users className="w-10 h-10 text-slate-200" />
                </div>
                <p className="label-caps text-slate-300">No students found matching search</p>
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div key={s.id} className="p-8 hover:bg-slate-50 transition-all group flex items-center gap-8">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(s.id)}
                      onChange={() => toggleStudentSelection(s.id)}
                      className="w-6 h-6 rounded-lg border-slate-200 bg-slate-100 checked:bg-slate-950 checked:border-slate-950 disabled:opacity-30 transition-all cursor-pointer accent-slate-950"
                    />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#C4F582] group-hover:text-slate-950 group-hover:border-[#C4F582] transition-colors">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-950 text-lg tracking-tight">{s.name}</h4>
                    <p className="label-caps text-slate-400 mt-1">ID: {s.rollNumber} · Class {s.class}{s.section}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className={`label-caps px-4 py-2 rounded-full border transition-all ${s.isPresent ? 'text-slate-950 border-[#C4F582] bg-[#C4F582]' : 'text-slate-400 border-slate-100 bg-slate-50'}`}>
                      {s.isPresent ? 'Verified' : `${s.attendancePercentage || 0}% Frequency`}
                    </div>
                  </div>
                  <button onClick={() => openAttendanceModal(s)} className="p-4 bg-white border border-slate-100 rounded-2xl group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white transition-all shadow-sm active:scale-95">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Manual Verification Modal */}
      <AnimatePresence mode="wait">
        {modal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white max-w-md w-full p-12 rounded-[4rem] border border-slate-100 shadow-2xl space-y-12"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 border border-slate-100">
                  <UserPlus className="w-12 h-12 text-slate-950" />
                </div>
                <h3 className="text-3xl font-bold text-slate-950 mb-2 tracking-tight leading-tight">Manual <br />Adjustment</h3>
                <p className="label-caps text-slate-400">Student: {modal.student.name}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="label-caps text-slate-400 ml-1">Period Selection</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-5 px-8 text-[10px] font-black uppercase tracking-widest outline-none focus:border-slate-950 transition-all cursor-pointer"
                    value={bulkAttendance.period}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, period: e.target.value }))}
                  >
                    <option value="">Select Period</option>
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="label-caps text-slate-400 ml-1">Attendance Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-5 px-8 text-[10px] font-black outline-none focus:border-slate-950 transition-all cursor-pointer"
                    value={bulkAttendance.date}
                    onChange={(e) => setBulkAttendance(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={closeAttendanceModal} className="flex-1 py-5 label-caps rounded-full border border-slate-100 hover:bg-slate-50 transition-colors text-slate-500 active:scale-95">Cancel</button>
                <button
                  onClick={() => markIndividualAttendance(modal.student, bulkAttendance.period, bulkAttendance.date)}
                  disabled={!bulkAttendance.period}
                  className="flex-1 bg-[#C4F582] py-5 label-caps rounded-full text-slate-950 shadow-xl shadow-[#C4F582]/10 disabled:opacity-50 active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManualAttendance;

