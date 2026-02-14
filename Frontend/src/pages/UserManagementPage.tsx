import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserX, Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';

const UserManagementPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [addStudentForm, setAddStudentForm] = useState({
    name: '',
    rollNumber: '',
    class: '',
    section: '',
    email: '',
  });
  const [addTeacherForm, setAddTeacherForm] = useState({
    name: '',
    subject: '',
    email: '',
  });
  const [deleteStudentId, setDeleteStudentId] = useState('');
  const [deleteTeacherId, setDeleteTeacherId] = useState('');

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Student Added', `${addStudentForm.name} has been added to the register.`);
    setAddStudentForm({ name: '', rollNumber: '', class: '', section: '', email: '' });
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Teacher Added', `${addTeacherForm.name} has been authorized.`);
    setAddTeacherForm({ name: '', subject: '', email: '' });
  };

  const handleDeleteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Student Deleted', `Student record ${deleteStudentId} removed.`);
    setDeleteStudentId('');
  };

  const handleDeleteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Teacher Deleted', `Teacher record ${deleteTeacherId} removed.`);
    setDeleteTeacherId('');
  };

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
            User <span className="text-slate-950">Management Control</span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-10"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm">
                <UserPlus className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Add Student</h3>
                <p className="label-caps text-slate-400">Register New Student Record</p>
              </div>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label-caps text-slate-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="Enter name..."
                    value={addStudentForm.name}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps text-slate-400 ml-1">Student ID</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="Unique identifier..."
                    value={addStudentForm.rollNumber}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, rollNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label-caps text-slate-400 ml-1">Class</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="e.g. 10"
                    value={addStudentForm.class}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, class: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-caps text-slate-400 ml-1">Section</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="e.g. A"
                    value={addStudentForm.section}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, section: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 pl-14 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="student@institution.edu"
                    value={addStudentForm.email}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#C4F582] text-slate-950 rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-[#C4F582]/10">
                Save Student Record
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-10"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Add Teacher</h3>
                <p className="label-caps text-slate-400">Authorize Faculty Access</p>
              </div>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-6">
              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Teacher Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                  placeholder="Enter teacher name..."
                  value={addTeacherForm.name}
                  onChange={(e) => setAddTeacherForm({ ...addTeacherForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Subject</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                  placeholder="e.g. Theoretical Physics"
                  value={addTeacherForm.subject}
                  onChange={(e) => setAddTeacherForm({ ...addTeacherForm, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Teacher Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 pl-14 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                    placeholder="teacher@institution.edu"
                    value={addTeacherForm.email}
                    onChange={(e) => setAddTeacherForm({ ...addTeacherForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-950 text-white rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-xl shadow-slate-950/10">
                Save Faculty Record
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-10"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                <UserX className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Remove Student</h3>
                <p className="label-caps text-slate-400">Delete Student Record Permanently</p>
              </div>
            </div>

            <form onSubmit={handleDeleteStudent} className="space-y-6">
              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Target Student ID</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-rose-500 transition-all outline-none"
                  placeholder="Paste student ID here..."
                  value={deleteStudentId}
                  onChange={(e) => setDeleteStudentId(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-rose-500 text-white rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all active:scale-95 shadow-xl shadow-rose-500/20">
                Delete Record
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-10"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                <UserX className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Remove Faculty</h3>
                <p className="label-caps text-slate-400">Revoke Administrative Rights</p>
              </div>
            </div>

            <form onSubmit={handleDeleteTeacher} className="space-y-6">
              <div className="space-y-2">
                <label className="label-caps text-slate-400 ml-1">Target Faculty ID</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:border-slate-950 transition-all outline-none"
                  placeholder="Paste teacher ID here..."
                  value={deleteTeacherId}
                  onChange={(e) => setDeleteTeacherId(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white rounded-full py-5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-950/10">
                Remove Access
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default UserManagementPage;
