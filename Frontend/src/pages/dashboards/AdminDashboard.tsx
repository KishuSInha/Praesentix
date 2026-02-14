import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, UserPlus, Shield, Activity,
  Database, Download, Camera, UserCheck,
  Cpu, Server, Globe, Lock, Bell, Search, Terminal, Settings,
  History as LucideHistory
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FaceEnrollment } from "../../components/admin/FaceEnrollment";
import SystemHealth from "../../components/SystemHealth";
import NotificationCenter from "../../components/NotificationCenter";
import Logo from "../../components/Logo";
import LogoutButton from "../../components/LogoutButton";
import apiService from "../../utils/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const result = await apiService.getAdminStats();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-['Outfit'] antialiased">
      <header className="px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <div className="h-6 w-px bg-slate-100 hidden md:block" />
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hidden md:block">
            Admin <span className="text-slate-950">Management Control</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dash Search</span>
          </div>
          <NotificationCenter />
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden md:block">
              <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{user?.fullName || 'Administrator'}</span>
              <span className="text-[9px] text-[#C4F582] font-black uppercase tracking-[0.2em]">Management Access</span>
            </div>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

        {/* Admin Overview Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C4F582]/5 rounded-full blur-[100px] -mr-40 -mt-40 transition-all group-hover:bg-[#C4F582]/10" />
            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-transform group-hover:rotate-3">
                <Shield className="w-10 h-10 text-[#C4F582]" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter text-slate-950 leading-tight">
                  System <span className="text-slate-400">Control.</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-5 py-2 bg-slate-950 text-white rounded-full text-[10px] uppercase font-black tracking-widest">
                    <Activity className="w-3.5 h-3.5 text-[#C4F582]" /> System Operational
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full text-[10px] uppercase font-black tracking-widest text-slate-600">
                    <Server className="w-3.5 h-3.5" /> Database Sync Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-950 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="label-caps text-white/40">Data Integration</h3>
              <Database className="w-4 h-4 text-[#C4F582]" />
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-white/40">
                  <span>Server Health</span>
                  <span className="text-[#C4F582]">98%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} className="h-full bg-[#C4F582]" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-white/40">
                  <span>User Records</span>
                  <span className="text-white">Active</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-white/40" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: "Total Students", val: stats?.totalStudents, color: "text-slate-950", bg: "bg-white" },
            { label: "Verification Score", val: stats?.verificationScore ? `${stats.verificationScore}%` : "0%", color: "text-slate-950", bg: "bg-white" },
            { label: "Average Attendance", val: stats?.averageAttendance + "%", color: "text-slate-950", bg: "bg-white" },
            { label: "Verified Logins", val: stats?.activeUsers, color: "text-[#C4F582]", bg: "bg-slate-950" }
          ].map((m, i) => (
            <div key={i} className={`${m.bg} p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group transition-all hover:scale-[1.02]`}>
              <p className={`text-[10px] uppercase font-black tracking-[0.2em] ${m.bg === 'bg-white' ? 'text-slate-400' : 'text-white/40'} mb-2`}>{m.label}</p>
              <h3 className={`text-4xl font-bold ${m.color}`}>{m.val || '0'}</h3>
            </div>
          ))}
        </div>

        {/* Management Console Navigation */}
        <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex p-3 bg-slate-50/50 border-b border-slate-100 gap-2">
            {[
              { id: 'overview', label: 'Activity Log', icon: Activity },
              { id: 'users', label: 'User Control', icon: Users },
              { id: 'enrollment', label: 'Enrollment', icon: UserPlus },
              { id: 'settings', label: 'Security', icon: Lock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${selectedTab === tab.id
                  ? 'bg-slate-950 text-white shadow-xl'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-10 min-h-[400px]">
            <AnimatePresence mode="wait">
              {selectedTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center gap-3">
                      <LucideHistory className="w-6 h-6 text-slate-400" />
                      Recent Records
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: "System Backup Completed", time: "5m ago", type: "success" },
                        { label: "User Access Log Rotated", time: "1h ago", type: "info" },
                        { label: "Database Sync Verified", time: "4h ago", type: "success" }
                      ].map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-white transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-[#C4F582]' : 'bg-blue-400'}`} />
                            <p className="text-sm font-bold text-slate-900">{log.label}</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <SystemHealth />
                  </div>
                </motion.div>
              )}

              {selectedTab === 'enrollment' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <FaceEnrollment onClose={() => setSelectedTab('overview')} />
                </motion.div>
              )}

              {selectedTab === 'users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                    <Users className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-950 tracking-tight mb-2">User Directory</h4>
                  <p className="label-caps mb-8 text-slate-400">Management Access Portal</p>
                  <button
                    onClick={() => navigate('/user-management')}
                    className="bg-slate-950 text-white px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                  >
                    Enter Directory
                  </button>
                </motion.div>
              )}

              {selectedTab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-950 tracking-tight mb-2">Security Control</h4>
                  <p className="label-caps mb-6 text-slate-400">Institutional Access Protocols</p>
                  <div className="px-6 py-2 bg-[#C4F582] text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Multi-Layer Verification Active
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Master Control Footer */}
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-12 bg-slate-950 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Shield className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10 space-y-2">
            <h4 className="font-bold text-2xl text-white tracking-tight">System Notification Relay</h4>
            <p className="text-sm text-white/40 font-medium tracking-wide">Broadcast updates and manage access to the entire institutional network.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto relative z-10">
            <button className="bg-white text-slate-950 px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#C4F582] transition-colors active:scale-95 shadow-xl">
              Force Sync
            </button>
            <button className="bg-white/10 text-white border border-white/10 px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-colors active:scale-95">
              <Download className="w-4 h-4 inline-block mr-2" /> Export Database
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
